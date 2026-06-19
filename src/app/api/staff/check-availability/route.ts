import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Helper: Convert UTC time string ("08:34:00") from Supabase to VN time ("15:34")
function formatTimeVn(timeStr: string | null): string | null {
  if (!timeStr) return null;
  if (timeStr.includes('T')) {
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return timeStr;
    }
  }
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1]}`;
  }
  return timeStr;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SHIFT_MAP: Record<string, { start: string; end: string }> = {
  SHIFT_1: { start: '09:00', end: '17:00' },
  SHIFT_2: { start: '11:00', end: '19:00' },
  SHIFT_3: { start: '17:00', end: '00:00' },
};

// ─── Types ───────────────────────────────────────────────────────────────────

type StaffStatus = 'AVAILABLE' | 'BUSY' | 'OFF' | 'OFF_DUTY' | 'NOT_YET' | 'UNKNOWN' | 'ON_CALL';
type BookingConfidence = 'CONFIRMED' | 'NEEDS_CONFIRM' | 'RISKY';

interface StaffAvailabilityResult {
  staffId: string;
  status: StaffStatus;
  reason?: string;
  availableAfter?: string;   // "HH:mm" — only when BUSY
  shiftType?: string;
  shiftStart?: string;       // "HH:mm"
  shiftEnd?: string;         // "HH:mm"
  travelTimeMins?: number;
  confidence: BookingConfidence;
}

interface CheckAvailabilityResponse {
  results: StaffAvailabilityResult[];
  overallConfidence: BookingConfidence;
  warnings: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Get today's date in Vietnam timezone as YYYY-MM-DD */
const getTodayVN = (): string =>
  new Date().toLocaleDateString('sv', { timeZone: 'Asia/Ho_Chi_Minh' });

/** Determine if a given date string (YYYY-MM-DD) is today in VN timezone */
const isToday = (dateStr: string): boolean => dateStr === getTodayVN();

/** Check if a date is in the future relative to VN today */
const isFuture = (dateStr: string): boolean => dateStr > getTodayVN();

// ─── GET Handler ─────────────────────────────────────────────────────────────

/**
 * GET /api/staff/check-availability
 *
 * Check KTV availability for a specific date + time.
 * Used by the VIP booking flow to determine if selected KTVs are available.
 *
 * Query params:
 *   staffIds  = "NH001,NH003"  (comma-separated, required)
 *   date      = "2026-05-20"   (YYYY-MM-DD, defaults to VN today)
 *   time      = "15:00"        (HH:mm, optional)
 *
 * Priority: TurnQueue status > LeaveRequests > fallback
 * (KTV may register OFF but show up anyway → TurnQueue wins)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // ─── Parse query params ──────────────────────────────────────────────
    const staffIdsRaw = searchParams.get('staffIds') ?? '';
    const dateParam = searchParams.get('date') ?? getTodayVN();
    const timeParam = searchParams.get('time') ?? null;

    const staffIds = staffIdsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (staffIds.length === 0) {
      return NextResponse.json(
        { error: 'staffIds is required (comma-separated)' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const checkingToday = isToday(dateParam);
    const checkingFuture = isFuture(dateParam);
    const warnings: string[] = [];

    // ─── Step 1: Check KTVLeaveRequests for target date ──────────────────
    const { data: leaveList, error: leaveError } = await supabase
      .from('KTVLeaveRequests')
      .select('employeeId, status')
      .eq('date', dateParam)
      .in('status', ['APPROVED', 'PENDING'])
      .in('employeeId', staffIds);

    if (leaveError) {
      console.error('[check-availability] LeaveRequests query error:', leaveError);
    }

    const onLeaveMap = new Map<string, 'APPROVED' | 'PENDING'>();
    for (const l of leaveList ?? []) {
      onLeaveMap.set(l.employeeId, l.status);
    }

    // ─── Step 2: Check TurnQueue (only relevant for today) ───────────────
    const turnQueueMap = new Map<
      string,
      { status: string; estimated_end_time: string | null }
    >();

    if (checkingToday) {
      const { data: tqList, error: tqError } = await supabase
        .from('TurnQueue')
        .select('employee_id, status, estimated_end_time')
        .eq('date', dateParam)
        .in('employee_id', staffIds);

      if (tqError) {
        console.error('[check-availability] TurnQueue query error:', tqError);
      }

      for (const tq of tqList ?? []) {
        turnQueueMap.set(tq.employee_id, {
          status: tq.status,
          estimated_end_time: formatTimeVn(tq.estimated_end_time),
        });
      }
    }

    // ─── Step 3: Fetch KTVShiftRecords for shift info ────────────────────
    const shiftInfoMap = new Map<
      string,
      { shiftType: string; shiftStart?: string; shiftEnd?: string }
    >();

    const { data: shiftList, error: shiftError } = await supabase
      .from('KTVShiftRecords')
      .select('employee_id, shift_type, estimatedEndTime')
      .eq('status', 'ACTIVE')
      .in('employee_id', staffIds);

    if (shiftError) {
      console.error('[check-availability] KTVShiftRecords query error:', shiftError);
    }

    for (const sr of shiftList ?? []) {
      const shiftType = sr.shift_type;
      const mapped = SHIFT_MAP[shiftType];

      shiftInfoMap.set(sr.employee_id, {
        shiftType,
        shiftStart: mapped?.start,
        shiftEnd: mapped?.end ?? sr.estimatedEndTime ?? undefined,
      });
    }

    // ─── Step 3.5: Fetch Staff Feature Flags for ON_CALL ────────────────
    const staffFeaturesMap = new Map<string, any>();
    const { data: staffList, error: staffError } = await supabase
      .from('Staff')
      .select('id, feature_flags')
      .in('id', staffIds);

    if (staffError) {
      console.error('[check-availability] Staff query error:', staffError);
    }
    for (const s of staffList ?? []) {
      staffFeaturesMap.set(s.id, s.feature_flags);
    }

    // ─── Step 4: Build per-staff availability results ────────────────────
    const results: StaffAvailabilityResult[] = [];

    for (const staffId of staffIds) {
      const leaveStatus = onLeaveMap.get(staffId);
      const tq = turnQueueMap.get(staffId);
      const shift = shiftInfoMap.get(staffId);

      let status: StaffStatus = 'UNKNOWN';
      let confidence: BookingConfidence = 'NEEDS_CONFIRM';
      let reason: string | undefined;
      let availableAfter: string | undefined;

      // ── Priority: TurnQueue (real check-in) > LeaveRequests > fallback ──

      if (checkingToday && tq) {
        // KTV has checked in today → TurnQueue status takes precedence
        switch (tq.status) {
          case 'waiting':
            status = 'AVAILABLE';
            confidence = 'CONFIRMED';
            break;

          case 'working':
          case 'assigned':
            status = 'BUSY';
            confidence = 'NEEDS_CONFIRM';
            availableAfter = tq.estimated_end_time ?? undefined;
            reason = tq.estimated_end_time
              ? `Đang phục vụ, dự kiến rảnh lúc ${tq.estimated_end_time}`
              : 'Đang phục vụ khách';
            warnings.push(
              `⏰ KTV ${staffId} đang bận` +
              (tq.estimated_end_time ? `, dự kiến rảnh lúc ${tq.estimated_end_time}` : '')
            );
            break;

          case 'off':
            if (staffFeaturesMap.get(staffId)?.allow_on_call && staffFeaturesMap.get(staffId)?.is_on_call) {
              status = 'ON_CALL';
              confidence = 'CONFIRMED';
              reason = 'Sẵn sàng nhận khách (Ngoài giờ)';
            } else {
              status = 'OFF_DUTY';
              confidence = 'NEEDS_CONFIRM';
              reason = 'Đã kết thúc ca làm việc';
            }
            break;

          default:
            if (staffFeaturesMap.get(staffId)?.allow_on_call && staffFeaturesMap.get(staffId)?.is_on_call) {
              status = 'ON_CALL';
              confidence = 'CONFIRMED';
              reason = 'Sẵn sàng nhận khách (Ngoài giờ)';
            } else {
              status = 'NOT_YET';
              confidence = 'NEEDS_CONFIRM';
              reason = 'Trạng thái không xác định';
            }
        }

        // If TurnQueue says available but there's a leave request → add warning only
        if (leaveStatus && status === 'AVAILABLE') {
          warnings.push(
            `ℹ️ KTV ${staffId} có đơn xin nghỉ (${leaveStatus}) nhưng đã điểm danh`
          );
        }
      } else if (leaveStatus) {
        // No TurnQueue record but has leave request
        if (staffFeaturesMap.get(staffId)?.allow_on_call && staffFeaturesMap.get(staffId)?.is_on_call) {
          status = 'ON_CALL';
          confidence = 'CONFIRMED';
          reason = 'Sẵn sàng nhận khách (Ngoài giờ, dù đang trong Ngày Nghỉ)';
        } else {
          status = 'OFF';
          confidence = 'RISKY';
          reason = leaveStatus === 'APPROVED'
            ? `Đã được duyệt nghỉ ngày ${dateParam}`
            : `Đang chờ duyệt nghỉ ngày ${dateParam}`;
          warnings.push(`⚠️ KTV ${staffId} ${reason}. Cần xác nhận lại.`);
        }
      } else if (checkingToday && !tq) {
        // Today, no TurnQueue, no leave → not checked in yet
        if (staffFeaturesMap.get(staffId)?.allow_on_call && staffFeaturesMap.get(staffId)?.is_on_call) {
          status = 'ON_CALL';
          confidence = 'CONFIRMED';
          reason = 'Sẵn sàng nhận khách (Ngoài giờ)';
        } else {
          status = 'NOT_YET';
          confidence = 'NEEDS_CONFIRM';
          reason = 'Chưa điểm danh hôm nay';
          warnings.push(`ℹ️ KTV ${staffId} chưa điểm danh.`);
        }
      } else if (checkingFuture) {
        // Future date → no TurnQueue data available
        status = 'UNKNOWN';
        confidence = 'NEEDS_CONFIRM';
        reason = `Lịch ngày ${dateParam} chưa được xác nhận`;
      }

      // Build result with shift info
      const result: StaffAvailabilityResult = {
        staffId,
        status,
        confidence,
      };

      if (reason) result.reason = reason;
      if (availableAfter) result.availableAfter = availableAfter;
      if (status === 'ON_CALL') result.travelTimeMins = staffFeaturesMap.get(staffId)?.travel_time_mins || 30;
      if (shift) {
        result.shiftType = shift.shiftType;
        if (shift.shiftStart) result.shiftStart = shift.shiftStart;
        if (shift.shiftEnd) result.shiftEnd = shift.shiftEnd;
      }

      results.push(result);
    }

    // ─── Step 5: Calculate overall confidence ────────────────────────────
    const CONFIDENCE_PRIORITY: Record<BookingConfidence, number> = {
      RISKY: 2,
      NEEDS_CONFIRM: 1,
      CONFIRMED: 0,
    };

    let overallConfidence: BookingConfidence = 'CONFIRMED';
    for (const r of results) {
      if (CONFIDENCE_PRIORITY[r.confidence] > CONFIDENCE_PRIORITY[overallConfidence]) {
        overallConfidence = r.confidence;
      }
    }

    // ─── Step 6: Return response ─────────────────────────────────────────
    const response: CheckAvailabilityResponse = {
      results,
      overallConfidence,
      warnings,
    };

    return NextResponse.json(response);

  } catch (error: unknown) {
    console.error('[check-availability] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
