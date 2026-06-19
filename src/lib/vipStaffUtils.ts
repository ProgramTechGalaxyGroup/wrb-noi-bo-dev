// =============================================
// 👥 VIP MENU — STAFF UTILITIES
// Handles: composite foot skill, skill intersection,
// blocked filter, and skill availability check.
// =============================================

import {
  ALL_VIP_SKILLS,
  BLOCKED_SKILL_IDS,
  CHINH_SKILLS,
  hasSkill,
  type VipSkill,
  type VipLang,
} from './vipSkills.constants';

// --- Staff skills shape from DB ---
export type StaffSkills = Record<string, boolean | string>;

/**
 * Check if a staff member has a specific VIP skill.
 * Handles composite skills (foot = oilFoot OR hotStoneFoot OR acupressureFoot).
 * Handles both boolean and string-level formats from DB.
 *
 * @param staffSkills - the Staff.skills jsonb object from DB
 * @param skill - the VipSkill definition to check
 * @returns true if the staff member can perform this skill
 */
export const staffHasSkill = (
  staffSkills: StaffSkills | null | undefined,
  skill: VipSkill
): boolean => {
  if (!staffSkills) return false;

  // Composite skill: check ANY of the composite keys OR the main skill id itself
  if (skill.composite && skill.compositeKeys) {
    return hasSkill(staffSkills[skill.id]) || skill.compositeKeys.some((key) => hasSkill(staffSkills[key]));
  }

  // Regular skill: direct lookup
  return hasSkill(staffSkills[skill.id]);
};

/**
 * Get all VIP skills that a single staff member can do.
 * Excludes blocked skills.
 *
 * @param staffSkills - the Staff.skills jsonb object
 * @returns array of VipSkill that this staff can perform
 */
export const getStaffVipSkills = (
  staffSkills: StaffSkills | null | undefined
): VipSkill[] => {
  if (!staffSkills) return [];

  return ALL_VIP_SKILLS.filter((skill) => {
    // Skip blocked skills
    if (BLOCKED_SKILL_IDS.includes(skill.id)) return false;
    return staffHasSkill(staffSkills, skill);
  });
};

/**
 * Calculate the INTERSECTION of VIP skills across multiple staff members.
 * Only returns skills that ALL staff can do.
 * Used when customer selects 2+ KTV.
 *
 * @param staffSkillsList - array of Staff.skills objects
 * @returns skills that every staff member can perform
 */
export const getIntersectionSkills = (
  staffSkillsList: (StaffSkills | null | undefined)[]
): VipSkill[] => {
  if (staffSkillsList.length === 0) return [];
  if (staffSkillsList.length === 1) return getStaffVipSkills(staffSkillsList[0]);

  // Start with first staff's skills, then intersect with each subsequent staff
  return ALL_VIP_SKILLS.filter((skill) => {
    if (BLOCKED_SKILL_IDS.includes(skill.id)) return false;
    return staffSkillsList.every((staffSkills) => staffHasSkill(staffSkills, skill));
  });
};

/**
 * Group skills by type for UI display.
 *
 * @param skills - array of VipSkill to group
 * @returns { le: VipSkill[], chinh: VipSkill[] }
 */
export const groupSkillsByType = (
  skills: VipSkill[]
): { le: VipSkill[]; chinh: VipSkill[] } => {
  return {
    le: skills.filter((s) => s.type === 'LE'),
    chinh: skills.filter((s) => s.type === 'CHINH'),
  };
};

/**
 * Get localized skill name.
 *
 * @param skill - VipSkill definition
 * @param lang - language code
 * @returns localized name string
 */
export const getSkillName = (skill: VipSkill, lang: VipLang = 'vi'): string => {
  return skill.name[lang] || skill.name.vi;
};

/**
 * Count how many CHINH (body/foot) skills a staff member has.
 * Useful for sorting KTV by specialization level.
 */
export const countChinhSkills = (
  staffSkills: StaffSkills | null | undefined
): number => {
  if (!staffSkills) return 0;
  return CHINH_SKILLS.filter(
    (skill) => !BLOCKED_SKILL_IDS.includes(skill.id) && staffHasSkill(staffSkills, skill)
  ).length;
};

// --- Staff availability status (from TurnQueue + KTVShifts + KTVLeaveRequests) ---
export type StaffAvailability =
  | 'AVAILABLE'     // TurnQueue status='waiting'
  | 'BUSY'          // TurnQueue status='working'/'assigned'
  | 'NOT_YET'       // No TurnQueue record (chưa vô ca / chưa check-in)
  | 'OFF_DUTY'      // TurnQueue status='off' (đã tan ca)
  | 'ON_LEAVE'      // Has KTVLeaveRequests record
  | 'ON_CALL';      // KTV is NOT_YET or OFF_DUTY but feature_flags->is_on_call is true

// --- Shift type definitions ---
export type ShiftType = 'SHIFT_1' | 'SHIFT_2' | 'SHIFT_3' | 'FREE' | 'REQUEST';

export const SHIFT_MAP: Record<string, { start: string; end: string }> = {
  SHIFT_1: { start: '09:00', end: '17:00' },
  SHIFT_2: { start: '11:00', end: '19:00' },
  SHIFT_3: { start: '17:00', end: '00:00' },
};

export interface VipStaffInfo {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  gender: string | null;
  skills: StaffSkills;
  height: number | null;
  availability: StaffAvailability;
  estimatedEndTime: string | null; // HH:mm — only when BUSY
  currentOrderId: string | null;
  // Shift info (from KTVShifts)
  shiftType: ShiftType | null;
  shiftStart: string | null;  // HH:mm — shift start time
  shiftEnd: string | null;    // HH:mm — shift end time
  queuePosition?: number;     // KTV position in the turn queue (số tua)
  turnsCompleted?: number;    // Number of completed turns today (số tua đã làm)
  travelTimeMins?: number;    // Only available when availability === 'ON_CALL'
}
