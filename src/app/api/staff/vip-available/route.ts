import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { type VipStaffInfo, type StaffAvailability, type ShiftType, SHIFT_MAP } from '@/lib/vipStaffUtils';

export const dynamic = 'force-dynamic';

// Helper: Convert UTC time string ("08:34:00") from Supabase to VN time ("15:34")
function formatTimeVn(timeStr: string | null): string | null {
  if (!timeStr) return null;
  // If it's an ISO string, parse properly
  if (timeStr.includes('T')) {
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return timeStr;
    }
  }
  
  // If it's a direct time string from Supabase (e.g. "15:34:00")
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1]}`;
  }
  
  return timeStr;
}

/**
 * GET /api/staff/vip-available
 *
 * Returns all active KTV with their real-time availability status.
 * Combines: Staff + TurnQueue + KTVShifts + KTVLeaveRequests
 *
 * Response shape: { staff: VipStaffInfo[] }
 *
 * Availability logic (priority order):
 *   ON_LEAVE    → Has KTVLeaveRequests record (APPROVED/PENDING) for today
 *   AVAILABLE   → TurnQueue status = 'waiting'
 *   BUSY        → TurnQueue status = 'working' or 'assigned'
 *   OFF_DUTY    → TurnQueue status = 'off' (đã tan ca)
 *   NOT_YET     → No TurnQueue record (chưa vô ca / chưa check-in)
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // ─── Step 1: Fetch all active staff ─────────────────────────────────────
    const { data: staffList, error: staffError } = await supabase
      .from('Staff')
      .select('id, full_name, avatar_url, gender, skills, height')
      .eq('status', 'ĐANG LÀM')
      .eq('is_active_vip_menu', true) // Chỉ lấy nhân viên cho VIP Menu
      .order('full_name');

    if (staffError) {
      console.error('[vip-available] Staff query error:', staffError);
      return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
    }

    if (!staffList || staffList.length === 0) {
      return NextResponse.json({ staff: [] });
    }

    // ─── Step 2: Fetch TurnQueue for today ──────────────────────────────────
    const staffIds = staffList.map((s) => s.id);

    const { data: turnQueueList, error: tqError } = await supabase
      .from('TurnQueue')
      .select('employee_id, status, estimated_end_time, current_order_id, queue_position')
      .eq('date', today)
      .in('employee_id', staffIds);

    if (tqError) {
      console.error('[vip-available] TurnQueue query error:', tqError);
    }

    // ─── Step 3: Fetch leave requests for today ──────────────────────────────
    const { data: leaveList, error: leaveError } = await supabase
      .from('KTVLeaveRequests')
      .select('employeeId, status, is_sudden_off')
      .eq('date', today)
      .in('status', ['APPROVED', 'PENDING'])
      .in('employeeId', staffIds);

    if (leaveError) {
      console.error('[vip-available] LeaveRequests query error:', leaveError);
    }

    // ─── Step 3.5: Fetch KTVShifts (ACTIVE) ─────────────────────────────────
    const { data: shiftList, error: shiftError } = await supabase
      .from('KTVShifts')
      .select('employeeId, shiftType, estimatedEndTime')
      .eq('status', 'ACTIVE')
      .in('employeeId', staffIds);

    if (shiftError) {
      console.error('[vip-available] KTVShifts query error:', shiftError);
    }

    // ─── Step 4: Build lookup maps ───────────────────────────────────────────
    const turnQueueMap = new Map<
      string,
      { status: string; estimated_end_time: string | null; current_order_id: string | null; queue_position: number | null }
    >();
    for (const tq of turnQueueList ?? []) {
      turnQueueMap.set(tq.employee_id, {
        status: tq.status,
        estimated_end_time: tq.estimated_end_time,
        current_order_id: tq.current_order_id,
        queue_position: tq.queue_position ?? null,
      });
    }

    const onLeaveSet = new Set<string>();
    for (const leave of leaveList ?? []) {
      onLeaveSet.add(leave.employeeId);
    }

    const shiftMap = new Map<
      string,
      { shiftType: ShiftType; estimatedEndTime: string | null }
    >();
    for (const shift of shiftList ?? []) {
      shiftMap.set(shift.employeeId, {
        shiftType: shift.shiftType as ShiftType,
        estimatedEndTime: shift.estimatedEndTime ?? null,
      });
    }

    // ─── Step 5: Merge into VipStaffInfo[] ──────────────────────────────────
    const result: VipStaffInfo[] = staffList.map((s) => {
      const tq = turnQueueMap.get(s.id);
      const isOnLeave = onLeaveSet.has(s.id);
      const shift = shiftMap.get(s.id);

      // --- Shift schedule ---
      const shiftType = shift?.shiftType ?? null;
      let shiftStart: string | null = null;
      let shiftEnd: string | null = null;

      if (shiftType && SHIFT_MAP[shiftType]) {
        shiftStart = SHIFT_MAP[shiftType].start;
        shiftEnd = SHIFT_MAP[shiftType].end;
      } else if (shiftType === 'FREE' && shift?.estimatedEndTime) {
        shiftEnd = shift.estimatedEndTime;
      }

      // --- Availability logic ---
      // Priority: TurnQueue (check-in thật) > LeaveRequests > NOT_YET
      // Nếu KTV đã check-in (có TurnQueue) → trạng thái thực tế thắng đơn OFF
      let availability: StaffAvailability;
      let estimatedEndTime: string | null = null;
      let currentOrderId: string | null = null;

      let queuePosition = 999;

      if (tq) {
        // Đã check-in → TurnQueue wins (kể cả có LeaveRequest)
        if (tq.status === 'waiting') {
          availability = 'AVAILABLE';
        } else if (tq.status === 'working' || tq.status === 'assigned') {
          availability = 'BUSY';
          estimatedEndTime = formatTimeVn(tq.estimated_end_time);
          currentOrderId = tq.current_order_id;
        } else if (tq.status === 'off') {
          availability = 'OFF_DUTY';
        } else {
          availability = 'NOT_YET';
        }
        queuePosition = tq.queue_position ?? 999;
      } else if (isOnLeave) {
        // Chưa check-in + có đơn OFF → ON_LEAVE
        availability = 'ON_LEAVE';
      } else {
        // Chưa check-in + không có đơn OFF → chưa vô ca
        availability = 'NOT_YET';
      }

      return {
        id: s.id,
        fullName: s.full_name,
        avatarUrl: s.avatar_url ?? null,
        gender: s.gender ?? null,
        skills: s.skills ?? {},
        height: s.height ?? null,
        availability,
        estimatedEndTime,
        currentOrderId,
        shiftType,
        shiftStart,
        shiftEnd,
        queuePosition,
      };
    });

    // ─── Step 6: Sort — AVAILABLE first & queuePosition ───────────────────
    const SORT_ORDER: Record<StaffAvailability, number> = {
      AVAILABLE: 0,
      BUSY: 1,
      NOT_YET: 2,
      OFF_DUTY: 3,
      ON_LEAVE: 4,
    };

    result.sort((a, b) => {
      const diff = SORT_ORDER[a.availability] - SORT_ORDER[b.availability];
      if (diff !== 0) return diff;

      const aPos = a.queuePosition ?? 999;
      const bPos = b.queuePosition ?? 999;
      if (aPos !== bPos) return aPos - bPos;

      return a.id.localeCompare(b.id);
    });

    return NextResponse.json({ staff: result });

  } catch (error: any) {
    console.error('[vip-available] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
