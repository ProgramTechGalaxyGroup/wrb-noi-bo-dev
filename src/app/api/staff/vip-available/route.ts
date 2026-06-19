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
      .select('id, full_name, avatar_url, gender, skills, height, feature_flags')
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
      .select('employee_id, status, estimated_end_time, current_order_id, queue_position, turns_completed')
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
      { status: string; estimated_end_time: string | null; current_order_id: string | null; queue_position: number | null; turns_completed: number | null }
    >();
    for (const tq of turnQueueList ?? []) {
      turnQueueMap.set(tq.employee_id, {
        status: tq.status,
        estimated_end_time: tq.estimated_end_time,
        current_order_id: tq.current_order_id,
        queue_position: tq.queue_position ?? null,
        turns_completed: tq.turns_completed ?? null,
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
      let availability: StaffAvailability = 'NOT_YET';
      let estimatedEndTime: string | null = null;
      let currentOrderId: string | null = null;
      let queuePosition: number = 999;
      let turnsCompleted: number = 0;
      let travelTimeMins: number | undefined;

      // Check Feature Flags for On-Call
      const featureFlags = s.feature_flags as Record<string, any> | null;
      const isAllowedOnCall = featureFlags?.allow_on_call === true;
      const isOnCallEnabled = featureFlags?.is_on_call === true;
      const isStaffOnCall = isAllowedOnCall && isOnCallEnabled;

      if (tq) {
        // Đã check-in → TurnQueue wins (kể cả có LeaveRequest)
        if (tq.status === 'waiting') {
          availability = 'AVAILABLE';
        } else if (tq.status === 'working' || tq.status === 'assigned') {
          availability = 'BUSY';
          estimatedEndTime = formatTimeVn(tq.estimated_end_time);
          currentOrderId = tq.current_order_id;
        } else if (tq.status === 'off') {
          availability = isStaffOnCall ? 'ON_CALL' : 'OFF_DUTY';
          if (availability === 'ON_CALL') {
            travelTimeMins = featureFlags?.travel_time_mins || 30; // Default 30 mins
          }
        } else {
          availability = isStaffOnCall ? 'ON_CALL' : 'NOT_YET';
          if (availability === 'ON_CALL') {
            travelTimeMins = featureFlags?.travel_time_mins || 30;
          }
        }
        queuePosition = tq.queue_position ?? 999;
        turnsCompleted = tq.turns_completed ?? 0;
      } else if (isOnLeave) {
        // Chưa check-in + có đơn OFF → ON_LEAVE (trừ khi chủ động bật ON_CALL)
        availability = isStaffOnCall ? 'ON_CALL' : 'ON_LEAVE';
        if (availability === 'ON_CALL') {
          travelTimeMins = featureFlags?.travel_time_mins || 30;
        }
      } else {
        // Chưa check-in + không có đơn OFF → chưa vô ca
        availability = isStaffOnCall ? 'ON_CALL' : 'NOT_YET';
        if (availability === 'ON_CALL') {
          travelTimeMins = featureFlags?.travel_time_mins || 30;
        }
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
        turnsCompleted,
        travelTimeMins,
      };
    });

    const SORT_ORDER: Record<StaffAvailability, number> = {
      AVAILABLE: 0,
      ON_CALL: 1,
      BUSY: 2,
      NOT_YET: 3,
      OFF_DUTY: 4,
      ON_LEAVE: 5,
    };

    result.sort((a, b) => {
      const diff = SORT_ORDER[a.availability] - SORT_ORDER[b.availability];
      if (diff !== 0) return diff;

      // 1. Sort by turnsCompleted (số tua đã làm) ascending
      const aTurns = a.turnsCompleted ?? 0;
      const bTurns = b.turnsCompleted ?? 0;
      if (aTurns !== bTurns) return aTurns - bTurns;

      // 2. Sort by queuePosition (vị trí xếp hàng) ascending
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
