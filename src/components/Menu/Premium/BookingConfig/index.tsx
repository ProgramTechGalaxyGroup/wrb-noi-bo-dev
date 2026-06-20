import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  type VipStaffInfo,
  getIntersectionSkills,
  getStaffVipSkills,
  groupSkillsByType,
  getSkillName,
} from '@/lib/vipStaffUtils';
import { type VipLang } from '@/lib/vipSkills.constants';
import {
  calculateMinDuration,
  getAvailableDurations,
  lookupPrice,
  type VipPricingTable,
  type VipDuration,
} from '@/lib/vipPricingEngine';
import { getT, tpl, DAY_KEYS } from '../Premium.i18n';
import FlipTimePicker from '@/components/Booking/FlipTimePicker';
import { useMenuData } from '@/components/Menu/MenuContext';

// =============================================
// 📅 Booking Config – REAL DATA (Pha 3)
// Skills thực từ Staff DB, pricing từ SystemConfigs
// Time slots ĐỘNG theo ca KTV (shiftStart/shiftEnd)
// UI compact: horizontal scroll + grid layout
// =============================================

// 🔧 UI CONFIGURATION
const FALLBACK_PRICING_TABLE: VipPricingTable = {
  '1': { '60': 690000, '70': 805000, '90': 1035000, '120': 1380000, '150': 1725000, '180': 2070000, '240': 2760000 },
  '2': { '60': 1080000, '70': 1260000, '90': 1530000, '120': 2040000, '150': 2550000, '180': 3060000, '240': 4080000 },
};
const TIME_SLOT_INTERVAL_MINUTES = 15;
const DEFAULT_SHIFT_START = '09:00';
const DEFAULT_SHIFT_END = '22:00';
const SKILLS_VISIBLE_COUNT = 8; // Hiện tối đa 8 skills, có nút "Xem thêm"

// --- Helper: parse "HH:mm" → minutes from midnight ---
const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// --- Helper: minutes from midnight → "HH:mm" ---
const minutesToTime = (mins: number): string => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// --- Generate time slots based on shift + day + duration ---
const generateTimeSlots = (
  shiftStart: string | null,
  shiftEnd: string | null,
  isToday: boolean,
  serviceDuration: number,
  bufferMinutes: number = 30,
): string[] => {
  const start = shiftStart || DEFAULT_SHIFT_START;
  const end = shiftEnd || DEFAULT_SHIFT_END;

  let startMins = timeToMinutes(start);
  // Ca 3 (00:00) = midnight = 0 → convert to 1440 (24:00)
  let endMins = timeToMinutes(end);
  if (endMins <= startMins) endMins += 24 * 60; // cross-midnight

  // Trừ buffer cuối ca: slot cuối = shiftEnd - serviceDuration
  const lastSlotMins = endMins - serviceDuration;

  // Nếu hôm nay: start từ now + bufferMinutes, round lên bội 30
  if (isToday) {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes() + bufferMinutes;
    const roundedNow = Math.ceil(nowMins / TIME_SLOT_INTERVAL_MINUTES) * TIME_SLOT_INTERVAL_MINUTES;
    startMins = Math.max(startMins, roundedNow);
  }

  const slots: string[] = [];
  for (let m = startMins; m <= lastSlotMins; m += TIME_SLOT_INTERVAL_MINUTES) {
    slots.push(minutesToTime(m));
  }
  return slots;
};
const useSpaPolicies = (lang: string = 'vi') => {
  const [policies, setPolicies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();
        const { data, error } = await supabase
          .from('SpaPolicies')
          .select('contentVN, contentEN, contentCN, contentJP, contentKR')
          .eq('is_active', true)
          .order('order_index', { ascending: true });

        if (data && !error) {
          const mapLangToColumn = (l: string) => {
            switch (l) {
              case 'en': return 'contentEN';
              case 'kr': return 'contentKR';
              case 'jp': return 'contentJP';
              case 'cn': return 'contentCN';
              default: return 'contentVN';
            }
          };
          const colName = mapLangToColumn(lang);
          setPolicies(data.map((r: any) => r[colName]).filter(Boolean));
        }
      } catch (err) {
        console.error('Failed to fetch SpaPolicies:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicies();
  }, [lang]);

  return { policies, loading };
};

interface BookingConfigProps {
  lang: string;
  isBookingFlow?: boolean;
  selectedStaffIds: string[];
  selectedStaffInfoList: VipStaffInfo[];
  vipPricingTable?: VipPricingTable;
  vipPricing?: { duration: number; price: number; label: string }[];
  bufferMinutes?: number;
  onConfirm: (data: { skillsMap: Record<string, string[]>; totalDuration: number; timeSlot: string | null; totalPrice: number; appointmentDate: string | null; customerNotes?: string }) => void;
}

const BookingConfig = ({ lang, isBookingFlow, selectedStaffIds, selectedStaffInfoList, vipPricingTable, bufferMinutes = 30, onConfirm }: BookingConfigProps) => {
  const t = getT(lang);
  const primaryStaff = selectedStaffInfoList[0];
  const pricingTable = vipPricingTable ?? FALLBACK_PRICING_TABLE;
  const { services } = useMenuData();

  // Fetch policies
  const { policies, loading: loadingPolicies } = useSpaPolicies(lang);

  // State
  const [selectedSkillsMap, setSelectedSkillsMap] = useState<Record<string, string[]>>(
    Object.fromEntries(selectedStaffIds.map(id => [id, []]))
  );
  const [activeStaffTab, setActiveStaffTab] = useState<string>(selectedStaffIds[0]);

  // Day chips (next 5 days)
  const dayChips = useMemo(() => {
    const days = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push({ 
        label: t[DAY_KEYS[d.getDay()]], 
        date: d.getDate(), 
        isoDate: d.toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 10) 
      });
    }
    return days;
  }, [t]);

  const [selectedDateStr, setSelectedDateStr] = useState<string>(dayChips[0].isoDate);
  const [selectedDuration, setSelectedDuration] = useState<VipDuration | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [isAgreedTerms, setIsAgreedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showOnCallWarning, setShowOnCallWarning] = useState(false);
  const [customerNotes, setCustomerNotes] = useState('');

  // Calendar states
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date().getMonth());
  const [currentCalendarYear, setCurrentCalendarYear] = useState(new Date().getFullYear());

  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when duration is selected and it's booking flow
  useEffect(() => {
    if (isBookingFlow && selectedDuration) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 300);
    }
  }, [isBookingFlow, selectedDuration]);

  // Generate calendar month grid (Monday start)
  const calendarDays = useMemo(() => {
    const year = currentCalendarYear;
    const month = currentCalendarMonth;
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, ...
    const adjustedFirstDayIndex = (firstDayIndex + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < adjustedFirstDayIndex; i++) {
      days.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  }, [currentCalendarMonth, currentCalendarYear]);

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // --- Real skills: specific to the currently ACTIVE KTV tab ---
  const activeStaffInfo = useMemo(() =>
    selectedStaffInfoList.find(s => s.id === activeStaffTab) || primaryStaff,
    [selectedStaffInfoList, activeStaffTab, primaryStaff]
  );

  const availableSkills = useMemo(() => {
    let skills = getStaffVipSkills(activeStaffInfo?.skills);

    // Filter redundant "Combo" skills if "Chuyên" exists
    const hasEarChuyen = skills.some(s => s.id === 'earChuyen');
    const hasNailChuyen = skills.some(s => s.id === 'nailChuyen');

    if (hasEarChuyen) skills = skills.filter(s => s.id !== 'earCombo');
    if (hasNailChuyen) skills = skills.filter(s => s.id !== 'nailCombo');

    return skills;
  }, [activeStaffInfo]);

  const { le: leSkills, chinh: chinhSkills } = useMemo(() => groupSkillsByType(availableSkills), [availableSkills]);

  // All currently selected skill IDs
  const allSelectedSkillIds = useMemo(() =>
    Object.values(selectedSkillsMap).flat(), [selectedSkillsMap]
  );

  // --- Dynamic minDuration from PricingEngine ---
  const { minDuration, leCount, chinhCount } = useMemo(() =>
    calculateMinDuration(allSelectedSkillIds), [allSelectedSkillIds]
  );

  // Available durations (>= minDuration)
  const availableDurations = useMemo(() =>
    getAvailableDurations(minDuration), [minDuration]
  );

  // Auto-adjust selectedDuration if below minDuration
  const effectiveDuration = selectedDuration && selectedDuration >= minDuration
    ? selectedDuration : null;

  // Helper function: Get price from Services or Fallback to PricingEngine
  const getVipPrice = (duration: number) => {
    const staffCount = selectedStaffIds.length;
    const vipServiceId = `VIP_${staffCount}K_${duration}`;
    const vipService = services.find(s => s.id === vipServiceId);
    if (vipService) return vipService.priceVND;
    return lookupPrice(pricingTable, staffCount, duration);
  };

  // Price from real pricing table (now via Services DB)
  const totalPrice = effectiveDuration
    ? getVipPrice(effectiveDuration)
    : 0;

  // --- Dynamic time range for FlipTimePicker ---
  // Range = shiftStart → shiftEnd (full ca, tiệm xác nhận sau)
  const pickerTimeRange = useMemo(() => {
    const shiftStart = primaryStaff?.shiftStart ?? DEFAULT_SHIFT_START;
    const shiftEnd = primaryStaff?.shiftEnd ?? DEFAULT_SHIFT_END;
    const isToday = selectedDateStr === dayChips[0].isoDate;

    let startMins = timeToMinutes(shiftStart);
    let endMins = timeToMinutes(shiftEnd);
    if (endMins <= startMins) endMins += 24 * 60; // cross-midnight

    // Nếu hôm nay: start từ now + bufferMinutes
    if (isToday) {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes() + bufferMinutes;
      
      // Kiểm tra KTV bận
      let maxBusyMins = 0;
      selectedStaffInfoList.forEach(staff => {
        if (staff.availability === 'BUSY' && staff.estimatedEndTime) {
          const mins = timeToMinutes(staff.estimatedEndTime);
          if (mins > maxBusyMins) {
            maxBusyMins = mins;
          }
        }
      });

      if (maxBusyMins > 0) {
        startMins = Math.max(startMins, nowMins, maxBusyMins);
      } else {
        startMins = Math.max(startMins, nowMins);
      }
      // Bắt buộc làm tròn startMins lên bội số của 15 phút (ví dụ 10:46 -> 11:00)
      startMins = Math.ceil(startMins / TIME_SLOT_INTERVAL_MINUTES) * TIME_SLOT_INTERVAL_MINUTES;
    }

    // Clamp: nếu start > end → không còn slot
    if (startMins > endMins) {
      return { startTime: '', endTime: '', hasSlots: false };
    }

    return {
      startTime: minutesToTime(startMins),
      // Cross-midnight: endMins=1440 → minutesToTime="00:00" gây lỗi picker
      // Cap tại 23:59 để picker hiểu đúng (ca 3: 17→00 = 17→23:59)
      endTime: endMins >= 1440 ? '23:59' : minutesToTime(endMins),
      hasSlots: true,
    };
  }, [primaryStaff, selectedDateStr, dayChips, bufferMinutes]);

  const toggleSkill = (staffId: string, skillId: string) => {
    setSelectedSkillsMap(prev => {
      const current = prev[staffId] || [];
      const updated = current.includes(skillId)
        ? current.filter(s => s !== skillId)
        : [...current, skillId];
      return { ...prev, [staffId]: updated };
    });
    setSelectedDuration(null);
  };

  const isReady = effectiveDuration !== null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col px-5 pt-2 pb-10"
    >
      {/* KTV Header — compact */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        {selectedStaffInfoList.length > 1 ? (
          <div>
            <h3 className="text-[11px] tracking-[0.2em] uppercase text-[#d0c5b5] flex items-center mb-3">
              <span className="w-6 h-px bg-[#4d463a] mr-2" />
              {t.bc_servicesByKtv}
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {selectedStaffInfoList.map(s => (
                <button key={s.id} onClick={() => setActiveStaffTab(s.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl min-w-max border transition-all ${
                    activeStaffTab === s.id
                      ? 'bg-[#c9a96e]/10 border-[#e6c487] text-[#e6c487]'
                      : 'bg-[#1b1b1d] border-[#4d463a]/30 text-[#d0c5b5]'
                  }`}
                >
                  {s.avatarUrl
                    ? <img src={s.avatarUrl} alt={s.id} className="w-7 h-7 rounded-full border border-white/10 shrink-0" />
                    : <div className="w-7 h-7 rounded-full bg-[#2a2a2c] flex items-center justify-center text-[#e6c487] text-[9px] font-bold">{s.id}</div>
                  }
                  <div className="text-left leading-tight">
                    <span className="block text-xs font-bold text-[#e6c487]">{s.id}</span>
                    <span className="block text-[9px] opacity-60">
                      {(selectedSkillsMap[s.id] || []).length} {t.bc_skills}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Single KTV — compact inline */
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg relative shrink-0">
              {primaryStaff?.avatarUrl
                ? <img src={primaryStaff.avatarUrl} alt={primaryStaff?.id} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-[#2a2a2c] to-[#1b1b1d] flex items-center justify-center text-sm text-[#e6c487]/40 font-bold">{primaryStaff?.id}</div>
              }
            </div>
            <div>
              <p className="text-[10px] tracking-[0.15em] uppercase text-[#c9a96e]">{t.bc_expertTherapist}</p>
              <h2 className="text-xl font-bold tracking-wider text-[#e6c487]">{primaryStaff?.id}</h2>
            </div>
          </div>
        )}
      </motion.section>

      {/* Skills — compact with "show more" */}
      <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-5">


        {/* Chính */}
        {chinhSkills.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] sm:text-xs tracking-[0.15em] uppercase text-[#998f81] mb-2">— {t.bc_mainServices}</p>
            <div className="flex flex-wrap gap-2.5">
              {chinhSkills.map(skill => {
                const isSelected = (selectedSkillsMap[activeStaffTab] || []).includes(skill.id);
                return (
                  <button key={skill.id} onClick={() => toggleSkill(activeStaffTab, skill.id)}
                    className={`px-4 py-2.5 rounded-full text-sm sm:text-base font-medium transition-all border-2 ${
                      isSelected
                        ? 'bg-[#e6c487]/15 border-[#e6c487] text-[#e6c487]'
                        : 'bg-[#1b1b1d] border-[#4d463a]/30 text-[#d0c5b5] hover:border-[#998f81]/50'
                    }`}
                  >{getSkillName(skill, lang as VipLang)}</button>
                );
              })}
            </div>
          </div>
        )}

        {/* Lẻ — with show more logic */}
        {leSkills.length > 0 && (
          <div>
            <p className="text-[10px] sm:text-xs tracking-[0.15em] uppercase text-[#998f81] mb-2">— {t.bc_addons}</p>
            <div className="flex flex-wrap gap-2.5">
              {(showAllSkills ? leSkills : leSkills.slice(0, SKILLS_VISIBLE_COUNT)).map(skill => {
                const isSelected = (selectedSkillsMap[activeStaffTab] || []).includes(skill.id);
                return (
                  <button key={skill.id} onClick={() => toggleSkill(activeStaffTab, skill.id)}
                    className={`px-4 py-2.5 rounded-full text-sm sm:text-base font-medium transition-all border-2 ${
                      isSelected
                        ? 'bg-[#e6c487]/15 border-[#e6c487] text-[#e6c487]'
                        : 'bg-[#1b1b1d] border-[#4d463a]/30 text-[#d0c5b5] hover:border-[#998f81]/50'
                    }`}
                  >{getSkillName(skill, lang as VipLang)}</button>
                );
              })}
              {!showAllSkills && leSkills.length > SKILLS_VISIBLE_COUNT && (
                <button onClick={() => setShowAllSkills(true)}
                  className="px-4 py-2.5 rounded-full text-sm sm:text-base font-medium border-2 border-dashed border-[#998f81]/40 text-[#998f81] hover:border-[#e6c487]/50 hover:text-[#e6c487] transition-all"
                >+{leSkills.length - SKILLS_VISIBLE_COUNT}</button>
              )}
            </div>
          </div>
        )}

        {availableSkills.length === 0 && (
          <p className="text-[#998f81] text-sm">{t.bc_noSkills}</p>
        )}
      </motion.section>

      {/* Duration — HORIZONTAL SCROLL (Bug C fix) */}
      <AnimatePresence>
        {availableDurations.length > 0 && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 overflow-hidden"
          >
            <div className={`p-4 rounded-2xl bg-[#c9a96e]/5 border border-[#e6c487]/20 transition-all duration-500 ${
              allSelectedSkillIds.length === 0 ? 'opacity-30 grayscale blur-[1px] pointer-events-none' : ''
            }`}>
              <h3 className="text-[11px] tracking-[0.2em] uppercase text-[#e6c487] font-bold mb-1">
                {t.bc_selectDuration}
              </h3>
              <p className="text-[10px] text-[#998f81] mb-3">
                {t.bc_vatIncluded}
              </p>
              {/* Horizontal scroll row */}
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {availableDurations.map(dur => {
                  const price = getVipPrice(dur);
                  const isSelected = effectiveDuration === dur;
                  return (
                    <button
                      key={dur}
                      onClick={() => setSelectedDuration(dur)}
                      className={`flex flex-col items-center justify-center min-w-[85px] sm:min-w-[100px] py-3.5 px-2 sm:px-3 rounded-2xl transition-all shrink-0 border-2 ${
                        isSelected
                          ? 'bg-[#e6c487]/15 border-[#e6c487] text-[#e6c487] shadow-[0_0_15px_rgba(230,196,135,0.15)]'
                          : 'bg-[#1b1b1d] border-[#4d463a]/30 text-[#d0c5b5] hover:border-[#998f81]/50'
                      }`}
                    >
                      <span className="text-base sm:text-xl font-bold">{dur}</span>
                      <span className="text-[10px] sm:text-xs opacity-70">{t.bc_mins}</span>
                      <span className={`text-xs sm:text-sm font-bold mt-1.5 ${isSelected ? 'text-[#e6c487]' : 'text-[#c9a96e]'}`}>
                        {(price / 1000).toFixed(0)}k
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Booking Config Section (after duration selected) */}
      <AnimatePresence>
        {selectedDuration && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 mt-5">

            {/* Customer Notes */}
            <section className="mt-5 p-4 rounded-2xl bg-[#1b1b1d] border border-[#4d463a]/30">
              <h3 className="text-[11px] tracking-[0.2em] uppercase text-[#e6c487] font-bold mb-3 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e6c487] mr-2" />
                {t.bc_customerNotes}
              </h3>
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder={t.bc_notesPlaceholder}
                className="w-full h-24 p-3.5 rounded-xl bg-[#131315] border border-[#4d463a]/40 text-[#e4e2e4] placeholder:text-[#998f81]/40 text-sm focus:outline-none focus:border-[#e6c487]/60 transition-colors resize-none"
              />
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating CTA Bar */}
      <AnimatePresence>
        {isReady && effectiveDuration && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 inset-x-5 lg:inset-x-0 mx-auto lg:w-[500px] z-40"
          >
            <div className="flex justify-between items-end mb-2 px-1">
              <div>
                <div className="text-[10px] text-[#998f81] uppercase tracking-wider">{t.bc_selected}</div>
                <div className="text-lg font-bold text-[#e4e2e4]">{effectiveDuration} {t.bc_mins}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#e6c487] tracking-wider uppercase font-bold">Bespoke</div>
                <div className="text-lg font-bold text-[#e6c487]">{totalPrice.toLocaleString('vi-VN')}đ</div>
              </div>
            </div>
            <button
              onClick={() => {
                // Kiểm tra xem có KTV nào đang ON_CALL không
                const isToday = selectedDateStr === dayChips[0].isoDate;
                const onCallStaffs = selectedStaffInfoList.filter(s => s.availability === 'ON_CALL');
                
                if (isToday && onCallStaffs.length > 0) {
                  setShowOnCallWarning(true);
                } else {
                  onConfirm({ skillsMap: selectedSkillsMap, totalDuration: effectiveDuration, timeSlot: null, totalPrice, appointmentDate: selectedDateStr, customerNotes });
                }
              }}
              className="w-full py-4 rounded-full font-bold tracking-[0.12em] text-sm flex items-center justify-center gap-3 duration-200 uppercase bg-[#e6c487] text-[#412d00] shadow-[0_15px_30px_rgba(0,0,0,0.4)] active:scale-95"
            >
              <span>{t.bc_confirmSelection}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar Modal */}
      <AnimatePresence>
        {showCalendar && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#131315] border border-[#e6c487]/30 rounded-3xl p-5 w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={() => {
                    if (currentCalendarMonth === 0) {
                      setCurrentCalendarMonth(11);
                      setCurrentCalendarYear(prev => prev - 1);
                    } else {
                      setCurrentCalendarMonth(prev => prev - 1);
                    }
                  }}
                  className="text-[#e6c487] p-2 hover:bg-white/5 rounded-full"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                
                <h4 className="font-serif italic text-lg text-[#e6c487]">
                  {t.bc_month}{currentCalendarMonth + 1}, {currentCalendarYear}
                </h4>

                <button
                  onClick={() => {
                    if (currentCalendarMonth === 11) {
                      setCurrentCalendarMonth(0);
                      setCurrentCalendarYear(prev => prev + 1);
                    } else {
                      setCurrentCalendarMonth(prev => prev + 1);
                    }
                  }}
                  className="text-[#e6c487] p-2 hover:bg-white/5 rounded-full"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>

              {/* Grid Header */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#998f81] font-bold mb-2">
                <div>{t.cal_t2}</div>
                <div>{t.cal_t3}</div>
                <div>{t.cal_t4}</div>
                <div>{t.cal_t5}</div>
                <div>{t.cal_t6}</div>
                <div>{t.cal_t7}</div>
                <div className="text-red-400">{t.cal_cn}</div>
              </div>

              {/* Grid Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} />;
                  
                  const isSelected = selectedDateStr === day.toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 10);
                  const disabled = isDateDisabled(day);
                  const isSunday = day.getDay() === 0;

                  return (
                    <button
                      key={idx}
                      disabled={disabled}
                      onClick={() => {
                        const isoStr = day.toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 10);
                        setSelectedDateStr(isoStr);
                        setSelectedSlot(null);
                        setShowCalendar(false);
                      }}
                      className={`h-9 w-9 rounded-xl flex items-center justify-center text-xs transition-all ${
                        isSelected
                          ? 'bg-[#e6c487] text-[#412d00] font-bold'
                          : disabled
                            ? 'text-[#e4e2e4]/10 cursor-not-allowed'
                            : isSunday
                              ? 'text-red-400/80 hover:bg-white/5 cursor-pointer'
                              : 'text-[#d0c5b5] hover:bg-white/5 cursor-pointer'
                      }`}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>

              {/* Close button */}
              <div className="mt-4 pt-2 border-t border-[#4d463a]/30 flex justify-end">
                <button
                  onClick={() => setShowCalendar(false)}
                  className="px-4 py-2 text-xs font-bold text-[#e6c487] hover:bg-[#e6c487]/10 rounded-xl transition-colors"
                >
                  {t.bc_close}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Terms Modal */}
      <AnimatePresence>
        {showTermsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-[#131315] border border-[#e6c487]/30 rounded-3xl p-6 w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center mb-5 pb-4 border-b border-[#4d463a]/30">
                <h4 className="font-serif italic text-xl text-[#e6c487]">
                  {t.bc_terms_title || 'Điều khoản & Chính sách'}
                </h4>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="text-[#998f81] hover:text-[#e4e2e4] p-1"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              
              <div className="overflow-y-auto pr-2 space-y-4 text-sm text-[#d0c5b5] leading-relaxed custom-scrollbar">
                {loadingPolicies ? (
                  <div className="text-center py-4 text-[#e6c487]/50">Đang tải...</div>
                ) : policies.length > 0 ? (
                  policies.map((policy, idx) => (
                    <div key={idx} className="flex gap-3">
                      <span className="text-[#e6c487] font-bold">{idx + 1}.</span>
                      <p>{policy}</p>
                    </div>
                  ))
                ) : (
                  // Fallback khi chưa có DB
                  <>
                    <div className="flex gap-3">
                      <span className="text-[#e6c487] font-bold">1.</span>
                      <p>Đối với đặt lịch tự do (chưa chọn thời gian cụ thể), hệ thống sẽ ghi nhận và bộ phận CSKH của Spa sẽ trực tiếp xác nhận, liên hệ chốt giờ với Quý khách.</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-[#e6c487] font-bold">2.</span>
                      <p>Quý khách vui lòng đến đúng giờ hẹn. Trong trường hợp đến sớm hoặc trễ hơn dự kiến, Quý khách có thể sẽ phải chờ để nhân viên sắp xếp chỗ.</p>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-[#4d463a]/30">
                <button
                  onClick={() => {
                    setIsAgreedTerms(true);
                    setShowTermsModal(false);
                  }}
                  className="w-full py-3 rounded-xl bg-[#e6c487]/10 text-[#e6c487] border border-[#e6c487]/30 font-bold text-sm hover:bg-[#e6c487]/20 transition-colors"
                >
                  ĐỒNG Ý
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* On-Call Warning Popup */}
      <AnimatePresence>
        {showOnCallWarning && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-[#131315] border border-[#e6c487]/30 rounded-3xl p-6 w-full max-w-sm shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
            >
              <div className="text-center mb-5">
                <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4 text-purple-400">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h4 className="font-serif italic text-xl text-[#e6c487] mb-2">
                  Lưu ý thời gian di chuyển
                </h4>
                <p className="text-sm text-[#d0c5b5] leading-relaxed">
                  Chuyên viên bạn chọn hiện đang ở ngoài Spa. Sẽ cần khoảng <span className="font-bold text-purple-400">{Math.max(...selectedStaffInfoList.filter(s => s.availability === 'ON_CALL').map(s => s.travelTimeMins || 30))} phút</span> để chuyên viên di chuyển đến nơi.
                </p>
                <p className="text-sm text-[#d0c5b5] leading-relaxed mt-2">
                  Bạn có đồng ý chờ không?
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowOnCallWarning(false)}
                  className="flex-1 py-3.5 rounded-xl bg-[#1b1b1d] border border-[#4d463a]/40 text-[#998f81] font-bold text-sm hover:bg-[#2a2a2c] transition-colors"
                >
                  Chọn lại
                </button>
                <button
                  onClick={() => {
                    setShowOnCallWarning(false);
                    onConfirm({ skillsMap: selectedSkillsMap, totalDuration: effectiveDuration!, timeSlot: null, totalPrice, appointmentDate: selectedDateStr, customerNotes });
                  }}
                  className="flex-1 py-3.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold text-sm hover:bg-purple-500/30 transition-colors"
                >
                  Đồng ý chờ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div ref={bottomRef} className="h-[280px] w-full" />
    </motion.div>
  );
};

export default BookingConfig;
