import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { calculateMinDuration, lookupPrice, type VipPricingTable } from '@/lib/vipPricingEngine';
import { generateAccessToken } from '@/lib/token';

export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingConfidence = 'CONFIRMED' | 'NEEDS_CONFIRM' | 'RISKY';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get today's date in Vietnam timezone */
const getTodayVN = (): string =>
  new Date().toLocaleDateString('sv', { timeZone: 'Asia/Ho_Chi_Minh' });

/** Get localized warning messages */
function getWarningMessage(type: 'LEAVE_APPROVED' | 'LEAVE_PENDING' | 'BUSY' | 'NOT_CHECKED_IN', staffId: string, lang: string, extra?: string) {
  const msgs: Record<string, Record<string, string>> = {
    vi: {
      LEAVE_APPROVED: `KTV ${staffId} đã được duyệt nghỉ ngày ${extra}`,
      LEAVE_PENDING: `KTV ${staffId} đang chờ duyệt nghỉ ngày ${extra}`,
      BUSY: `KTV ${staffId} đang phục vụ khách${extra ? `, dự kiến rảnh lúc ${extra}` : ''}`,
      NOT_CHECKED_IN: `KTV ${staffId} chưa điểm danh hôm nay`
    },
    en: {
      LEAVE_APPROVED: `Therapist ${staffId} is on approved leave on ${extra}`,
      LEAVE_PENDING: `Therapist ${staffId} is pending leave approval on ${extra}`,
      BUSY: `Therapist ${staffId} is currently busy${extra ? `, expected free at ${extra}` : ''}`,
      NOT_CHECKED_IN: `Therapist ${staffId} has not checked in today`
    },
    kr: {
      LEAVE_APPROVED: `테라피스트 ${staffId} 님의 ${extra} 휴가가 승인되었습니다`,
      LEAVE_PENDING: `테라피스트 ${staffId} 님의 ${extra} 휴가 승인을 대기 중입니다`,
      BUSY: `테라피스트 ${staffId} 님은 현재 서비스 중입니다${extra ? ` (종료 예정: ${extra})` : ''}`,
      NOT_CHECKED_IN: `테라피스트 ${staffId} 님은 오늘 출근하지 않았습니다`
    },
    cn: {
      LEAVE_APPROVED: `技师 ${staffId} 已获批在 ${extra} 休假`,
      LEAVE_PENDING: `技师 ${staffId} 在 ${extra} 的休假申请待审批`,
      BUSY: `技师 ${staffId} 正在服务中${extra ? `，预计 ${extra} 结束` : ''}`,
      NOT_CHECKED_IN: `技师 ${staffId} 今日未打卡`
    },
    jp: {
      LEAVE_APPROVED: `セラピスト ${staffId} は ${extra} に休暇が承認されています`,
      LEAVE_PENDING: `セラピスト ${staffId} は ${extra} の休暇承認待ちです`,
      BUSY: `セラピスト ${staffId} は現在施術中です${extra ? `（終了予定: ${extra}）` : ''}`,
      NOT_CHECKED_IN: `セラピスト ${staffId} は本日出勤していません`
    }
  };
  return msgs[lang]?.[type] || msgs['en'][type];
}

/**
 * POST /api/booking/vip-appointment
 *
 * Pha 4: Nâng cấp với server-side validation:
 * 1. Re-validate pricing (không tin client)
 * 2. Validate duration >= minDuration
 * 3. Check KTVLeaveRequests → set confidence
 * 4. Check TurnQueue (walk-in) → BUSY warning
 * 5. Set booking status theo confidence
 * 6. Notification message theo confidence level
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ─── Step 1: Parse & Validate Input ──────────────────────────────────────
    const {
      customerName,
      customerPhone,
      customerEmail,
      customerNote,
      selectedStaffIds,
      selectedSkills,   // string[] — skill IDs selected
      duration,         // number — minutes
      timeSlot,         // "HH:mm" | "BRANCH_DECIDE" | null
      appointmentDate,  // "YYYY-MM-DD" | null
      lang,
      // confidence from client — we re-validate server-side
      clientConfidence,
    } = body;

    if (!customerName?.trim())
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    if (!customerPhone?.trim())
      return NextResponse.json({ error: 'Customer phone is required' }, { status: 400 });
    if (!selectedStaffIds || selectedStaffIds.length === 0)
      return NextResponse.json({ error: 'At least one staff must be selected' }, { status: 400 });
    if (!duration || duration < 60)
      return NextResponse.json({ error: 'Duration is required (min 60 mins)' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    if (!supabase)
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });

    const now = new Date();
    const targetDate = appointmentDate || getTodayVN();

    // ─── Step 2: Server-side Pricing Validation ───────────────────────────────
    const skills: string[] = Array.isArray(selectedSkills) ? selectedSkills : [];
    const { minDuration } = calculateMinDuration(skills);

    if (duration < minDuration) {
      return NextResponse.json({
        error: 'DURATION_TOO_SHORT',
        message: `Với ${skills.length} dịch vụ đã chọn, thời gian tối thiểu là ${minDuration} phút.`,
        minDuration,
      }, { status: 400 });
    }

    // Fetch pricing table from SystemConfigs
    const { data: pricingConfig } = await supabase
      .from('SystemConfigs')
      .select('value')
      .eq('key', 'menu_vip_pricing')
      .maybeSingle();

    let pricingTable: VipPricingTable | null = null;
    if (pricingConfig?.value) {
      const raw = pricingConfig.value;
      pricingTable = typeof raw === 'string' ? JSON.parse(raw) : raw;
    }

    // Re-calculate server-side price (không tin client)
    const serverPrice = pricingTable
      ? lookupPrice(pricingTable, selectedStaffIds.length, duration)
      : 0;

    // ─── Step 3: Server-side Availability Check → Confidence ─────────────────
    const warnings: string[] = [];
    let confidence: BookingConfidence = 'CONFIRMED';

    // 3a: Check KTVLeaveRequests
    const { data: leaveList } = await supabase
      .from('KTVLeaveRequests')
      .select('employeeId, status')
      .eq('date', targetDate)
      .in('status', ['APPROVED', 'PENDING'])
      .in('employeeId', selectedStaffIds);

    const onLeaveIds = new Set((leaveList ?? []).map((l: any) => l.employeeId));

    for (const staffId of selectedStaffIds) {
      if (onLeaveIds.has(staffId)) {
        const leaveRecord = leaveList?.find((l: any) => l.employeeId === staffId);
        const isApproved = leaveRecord?.status === 'APPROVED';
        warnings.push(
          getWarningMessage(
            isApproved ? 'LEAVE_APPROVED' : 'LEAVE_PENDING',
            staffId,
            lang || 'vi',
            targetDate
          )
        );
        confidence = 'RISKY'; // Escalate to RISKY
      }
    }

    // 3b: Check TurnQueue (walk-in: if today + no timeSlot → check busy)
    const isToday = targetDate === getTodayVN();
    const isWalkIn = !timeSlot || timeSlot === 'BRANCH_DECIDE';

    if (isToday && confidence !== 'RISKY') {
      const { data: tqList } = await supabase
        .from('TurnQueue')
        .select('employee_id, status, estimated_end_time')
        .eq('date', targetDate)
        .in('employee_id', selectedStaffIds);

      for (const tq of tqList ?? []) {
        if (tq.status === 'working' || tq.status === 'assigned') {
          warnings.push(
            getWarningMessage('BUSY', tq.employee_id, lang || 'vi', tq.estimated_end_time)
          );
          if (confidence === 'CONFIRMED') confidence = 'NEEDS_CONFIRM';
        }
      }

      // If no TurnQueue record → staff not checked in yet
      const checkedInIds = new Set((tqList ?? []).map((t: any) => t.employee_id));
      for (const staffId of selectedStaffIds) {
        if (!checkedInIds.has(staffId) && !onLeaveIds.has(staffId)) {
          warnings.push(getWarningMessage('NOT_CHECKED_IN', staffId, lang || 'vi'));
          if (confidence === 'CONFIRMED') confidence = 'NEEDS_CONFIRM';
        }
      }
    }

    // 3c: Future date → always NEEDS_CONFIRM (can't verify TurnQueue)
    if (!isToday && confidence === 'CONFIRMED') {
      confidence = 'NEEDS_CONFIRM';
    }

    // ─── Step 4: Generate Booking ID & Status ────────────────────────────────
    const vnTimeStr = now.toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
    const vnTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    const dateCode = `${String(vnTime.getDate()).padStart(2, '0')}${String(vnTime.getMonth() + 1).padStart(2, '0')}${vnTime.getFullYear()}`;

    // Count to generate billCode
    const { count } = await supabase
      .from('Bookings')
      .select('*', { count: 'exact', head: true })
      .ilike('billCode', `%-${dateCode}`);

    const nextNum = (count || 0) + 1;
    const billCode = `${String(nextNum).padStart(3, '0')}-${dateCode}`;
    const branchCode = '11NDK'; // TODO: Dynamically pass this from frontend later
    const bookingId = `${branchCode}-${billCode}`;

    // Map confidence → booking status
    // DB enum chỉ có: NEW, PREPARING, READY, IN_PROGRESS, COMPLETED, FEEDBACK, CLEANING, DONE
    // Confidence level được lưu trong notes JSON để admin phân biệt
    const bookingStatus = 'NEW';

    // ─── Step 5: Build notes (rich metadata) ─────────────────────────────────
    const notesObj = {
      type: 'VIP_APPOINTMENT',
      confidence,
      warnings,
      selectedSkills: skills,
      selectedStaffIds,
      duration,
      timeSlot: timeSlot || 'BRANCH_DECIDE',
      appointmentDate: appointmentDate || null,
      serverPrice,          // validated server-side price
      clientLang: lang || 'vi',
      bookedAt: vnTimeStr,
      isRisky: confidence === 'RISKY',
      bufferWarning: false, // TODO Pha 4.5: check from timeline
      customerNotes: customerNote || '',
    };

    // ─── Step 6: Insert Booking ───────────────────────────────────────────────
    const { data: booking, error: bookingError } = await supabase
      .from('Bookings')
      .insert({
        id: bookingId,
        billCode,
        branchName: 'Ngan Ha Spa',
        bookingDate: appointmentDate ? `${appointmentDate}T00:00:00.000Z` : vnTimeStr,
        timeBooking: timeSlot && timeSlot !== 'BRANCH_DECIDE' ? timeSlot : null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail?.trim() || null,
        customerLang: lang || 'vi',
        technicianCode: selectedStaffIds[0] || null,
        totalAmount: serverPrice || 0,
        paymentMethod: 'CASH', // default payment method
        source: (timeSlot && timeSlot !== 'BRANCH_DECIDE') || (appointmentDate && appointmentDate !== getTodayVN())
          ? 'VIP_BOOKING'   // Khách hẹn giờ hoặc chọn ngày tương lai
          : 'VIP_WALK_IN',  // Khách tại tiệm, phục vụ ngay
        status: bookingStatus,
        notes: JSON.stringify(notesObj),
        accessToken: generateAccessToken(),
        createdAt: vnTimeStr,
        updatedAt: vnTimeStr,
      })
      .select('id, billCode')
      .single();

    if (bookingError) {
      console.error('[VIP-Appointment] Insert error:', bookingError);
      return NextResponse.json(
        { error: 'Failed to create appointment', detail: bookingError.message },
        { status: 500 }
      );
    }

    // ─── Step 6.5: Insert Booking Items ───────────────────────────────────────
    // Luật VIP Menu:
    // 1. Tên dịch vụ là tổng hợp các skills khách chọn (VD: Gội + Body). Thời gian = thời gian khách chọn.
    // 2. Nếu khách chọn 2 KTV (Tứ thủ), tạo ra 2 BookingItems riêng biệt (mỗi item 1 KTV) để Dispatch không bị chia đôi giờ.
    
    const { ALL_VIP_SKILLS } = await import('@/lib/vipSkills.constants');
    const SKILL_MAP = Object.fromEntries(ALL_VIP_SKILLS.map((s: any) => [s.id, s]));
    const skillNames = skills.map((id: string) => {
      let name = SKILL_MAP[id]?.name?.vi || id;
      if (name.toLowerCase().includes('ráy')) name = 'Ráy';
      if (name.toLowerCase().includes('nail') || name.toLowerCase().includes('móng')) name = 'Nail';
      return name;
    });
    // Remove duplicates in case they picked both Ráy Chuyên and Ráy Combo (unlikely but possible)
    const uniqueSkillNames = [...new Set(skillNames)];
    const displayName = uniqueSkillNames.length > 0 ? uniqueSkillNames.join(' + ') : 'Gói VIP';

    const itemsToInsert: any[] = [];
    
    selectedStaffIds.forEach((ktvId: string, index: number) => {
      itemsToInsert.push({
        id: `${bookingId}-item${index + 1}`,
        bookingId: bookingId,
        serviceId: 'NHS0800', // Mã Gói VIP Tổng Hợp
        quantity: 1,
        price: index === 0 ? (serverPrice || 0) : 0, // Tiền chỉ ghi nhận ở item đầu
        technicianCodes: [ktvId], // Gán ĐÚNG 1 KTV vào item này
        status: 'WAITING',
        options: {
           displayName: displayName, // Dispatch Board sẽ đọc field này để hiển thị thay vì tên gốc
           vipDuration: duration,    // Thời lượng VIP (bảng BookingItems không có cột duration)
           selectedSkills: skills,   // Danh sách skills khách chọn
        }
      });
    });

    const { error: itemsError } = await supabase
      .from('BookingItems')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('[VIP-Appointment] BookingItems Insert error:', itemsError);
    }

    // ─── Step 7: Notification theo Confidence ────────────────────────────────
    try {
      const ktvDisplay = selectedStaffIds.join(', ');
      const timeDisplay = timeSlot && timeSlot !== 'BRANCH_DECIDE'
        ? `Hẹn lúc ${timeSlot}` : 'Walk-in / Tiệm quyết định';
      const dateDisplay = appointmentDate || getTodayVN();
      const priceDisplay = serverPrice > 0 ? `${serverPrice.toLocaleString('vi-VN')}đ` : '—';

      let notifEmoji: string;
      let notifPrefix: string;

      if (confidence === 'RISKY') {
        notifEmoji = '🔴';
        notifPrefix = 'ĐẶT LỊCH VIP KHẨN';
      } else if (confidence === 'NEEDS_CONFIRM') {
        notifEmoji = '⚠️';
        notifPrefix = 'Đặt lịch VIP CẦN XÁC NHẬN';
      } else {
        notifEmoji = '📋';
        notifPrefix = 'Đặt lịch VIP mới';
      }

      let notifMessage =
        `${notifEmoji} ${notifPrefix}\n` +
        `👤 ${customerName.trim()} — ${customerPhone.trim()}\n` +
        `👨‍⚕️ KTV: ${ktvDisplay}\n` +
        `⏱️ ${duration} phút · ${priceDisplay}\n` +
        `📅 ${dateDisplay} — ${timeDisplay}`;

      if (customerNote && customerNote.trim()) {
        notifMessage += `\n📝 Ghi chú: ${customerNote.trim()}`;
      }

      // Append warnings for non-CONFIRMED
      if (warnings.length > 0) {
        notifMessage += `\n⚡ ${warnings.join(' | ')}`;
      }

      await supabase.from('StaffNotifications').insert({
        bookingId: bookingId,
        employeeId: null, // null = broadcast to all admin/reception
        type: 'NEW_ORDER',
        message: notifMessage,
        isRead: false,
        createdAt: now.toISOString(),
      });
    } catch (notifErr) {
      // Non-critical: log but don't fail
      console.error('[VIP-Appointment] Notification error:', notifErr);
    }

    // ─── Step 8: Return Response ──────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      billCode: booking.billCode,
      confidence,
      warnings,
      serverPrice,
      bookingStatus,
      message: confidence === 'CONFIRMED'
        ? 'Đặt lịch VIP thành công!'
        : 'Đặt lịch VIP đã ghi nhận — tiệm sẽ liên hệ xác nhận.',
    });

  } catch (error: any) {
    console.error('[VIP-Appointment] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
