'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type VipStaffInfo, getStaffVipSkills, groupSkillsByType } from '@/lib/vipStaffUtils';
import { getT, tpl } from '../Premium.i18n';

// =============================================
// 🧑 Staff Selector – REAL DATA (Pha 3)
// Fetch từ GET /api/staff/vip-available
// Hiển thị trạng thái thực AVAILABLE/BUSY/OFF/ON_LEAVE
// =============================================

// 🔧 UI CONFIGURATION
const MAX_SELECTABLE_STAFF = 2;
const SKILL_PREVIEW_COUNT = 3;

interface StaffSelectorProps {
  lang: string;
  preferredCategoryId?: string;
  onConfirmSelection: (selectedStaffIds: string[], staffInfoList: VipStaffInfo[]) => void;
}

// --- Status badge style config (text from i18n) ---
const STATUS_STYLES: Record<string, { style: string; textStyle: string; i18nKey: string }> = {
  AVAILABLE: {
    style: 'bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20',
    textStyle: 'text-[10px] tracking-[0.1em] text-emerald-400 font-bold uppercase',
    i18nKey: 'status_available',
  },
  BUSY: {
    style: 'bg-amber-500/15 backdrop-blur-md border border-amber-400/20',
    textStyle: 'text-[10px] tracking-[0.1em] text-amber-300 font-bold uppercase',
    i18nKey: 'status_busy',
  },
  NOT_YET: {
    style: 'bg-blue-500/15 backdrop-blur-md border border-blue-400/20',
    textStyle: 'text-[10px] tracking-[0.1em] text-blue-300 font-bold uppercase',
    i18nKey: 'status_notYet',
  },
  OFF_DUTY: {
    style: 'bg-zinc-500/20 backdrop-blur-md border border-zinc-400/20',
    textStyle: 'text-[10px] tracking-[0.1em] text-zinc-400 font-bold uppercase',
    i18nKey: 'status_offDuty',
  },
  ON_LEAVE: {
    style: 'bg-[#93000a]/20 backdrop-blur-md border border-[#ffb4ab]/20',
    textStyle: 'text-[10px] tracking-[0.1em] text-[#ffb4ab] font-bold uppercase',
    i18nKey: 'status_onLeave',
  },
};

const StaffSelector = ({ lang, preferredCategoryId, onConfirmSelection }: StaffSelectorProps) => {
  const t = getT(lang);

  // State
  const [staffList, setStaffList] = useState<VipStaffInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch real staff from API
  useEffect(() => {
    setIsLoading(true);
    fetch('/api/staff/vip-available')
      .then((res) => res.json())
      .then((data) => {
        if (data.staff && Array.isArray(data.staff)) {
          setStaffList(data.staff);
        }
      })
      .catch((err) => console.error('[StaffSelector] Fetch error:', err))
      .finally(() => setIsLoading(false));
  }, []);

  // Filter by search query
  const filteredStaff = useMemo(() => {
    const query = searchQuery.trim().toUpperCase();
    if (!query) return staffList;
    return staffList.filter(
      (s) =>
        s.id.toUpperCase().includes(query) ||
        s.fullName.toUpperCase().includes(query)
    );
  }, [staffList, searchQuery]);

  // Sort: AVAILABLE → BUSY → NOT_YET → OFF_DUTY → ON_LEAVE
  // And within the same status, sort by queuePosition (sổ tua)
  const sortedStaff = useMemo(() => {
    return [...filteredStaff].sort((a, b) => {
      const ORDER: Record<string, number> = { AVAILABLE: 0, BUSY: 1, NOT_YET: 2, OFF_DUTY: 3, ON_LEAVE: 4 };
      const diff = (ORDER[a.availability] ?? 9) - (ORDER[b.availability] ?? 9);
      if (diff !== 0) return diff;

      const aPos = a.queuePosition ?? 999;
      const bPos = b.queuePosition ?? 999;
      if (aPos !== bPos) return aPos - bPos;

      return a.id.localeCompare(b.id);
    });
  }, [filteredStaff]);

  // OFF_DUTY + ON_LEAVE = không cho đặt. NOT_YET = vẫn cho đặt (đặt trước cho lúc vô ca)
  const isUnavailable = (staff: VipStaffInfo) =>
    staff.availability === 'OFF_DUTY' || staff.availability === 'ON_LEAVE';

  const handleToggle = (id: string) => {
    const staff = staffList.find((s) => s.id === id);
    if (!staff || isUnavailable(staff)) return;

    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= MAX_SELECTABLE_STAFF) return prev; // max 2
      return [...prev, id];
    });
  };

  const getStatusBadge = (staff: VipStaffInfo) => {
    const cfg = STATUS_STYLES[staff.availability];
    let label = t[cfg.i18nKey];

    // BUSY: show estimated end time
    if (staff.availability === 'BUSY' && staff.estimatedEndTime) {
      label = tpl(t.status_freeAfter, { time: staff.estimatedEndTime });
    }

    // NOT_YET: show shift start time if known (VD: "VÀO CA LÚC 17:00")
    if (staff.availability === 'NOT_YET' && staff.shiftStart) {
      label = tpl(t.status_startsAt, { time: staff.shiftStart });
    }

    return (
      <div className={`absolute top-5 left-5 ${cfg.style} px-3.5 py-1.5 rounded-full z-20`}>
        <span className={cfg.textStyle}>{label}</span>
      </div>
    );
  };

  // Preview top skills for a staff member
  const getSkillPreview = (staff: VipStaffInfo): string => {
    const skills = getStaffVipSkills(staff.skills);
    let names = skills.map((sk) => (sk.name as Record<string, string>)[lang] || sk.name.en);
    names = [...new Set(names)]; // Lọc trùng lặp do gộp Pro và Basic
    
    const top = names.slice(0, SKILL_PREVIEW_COUNT);
    if (names.length > SKILL_PREVIEW_COUNT) top.push(`+${names.length - SKILL_PREVIEW_COUNT}`);
    return top.join(' · ');
  };

  // On confirm: pass selected staff info list
  const handleConfirm = () => {
    const selectedStaff = staffList.filter((s) => selectedIds.includes(s.id));
    onConfirmSelection(selectedIds, selectedStaff);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col px-6 pt-2 pb-8"
    >
      {/* Section Header */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h2 className="text-3xl font-serif italic text-[#e6c487] leading-tight mb-2">
          {t.ss_title}
        </h2>
        <p className="text-[11px] tracking-[0.15em] uppercase text-[#d0c5b5]/80">
          {t.ss_subtitle}
        </p>
      </motion.section>

      {/* 🔍 Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-3 mb-8"
      >
        <div className="flex-1 bg-[#1b1b1d] rounded-full px-5 py-3 flex items-center gap-3 border border-[#4d463a]/30 focus-within:border-[#e6c487]/40 transition-colors">
          <svg className="w-4 h-4 text-[#e6c487]/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.ss_searchPlaceholder}
            className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm w-full placeholder:text-[#998f81]/50 text-[#e4e2e4]"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-[#998f81] hover:text-[#e4e2e4] transition-colors flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </motion.div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-[2rem] overflow-hidden bg-[#1b1b1d] h-[450px] md:h-[500px] animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sortedStaff.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[#998f81] text-sm">
            {t.ss_noResult}
          </p>
        </div>
      )}

      {/* Max selection hint */}
      {selectedIds.length >= MAX_SELECTABLE_STAFF && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 px-4 py-2.5 bg-[#e6c487]/10 border border-[#e6c487]/30 rounded-xl text-center"
        >
          <p className="text-xs text-[#e6c487]">
            {tpl(t.ss_maxHint, { max: MAX_SELECTABLE_STAFF })}
          </p>
        </motion.div>
      )}

      {/* Therapist Gallery */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {sortedStaff.map((staff, idx) => {
            const isSelected = selectedIds.includes(staff.id);
            const unavailable = isUnavailable(staff);
            const skillPreview = getSkillPreview(staff);

            return (
              <motion.div
                key={staff.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08, duration: 0.4 }}
                onClick={() => handleToggle(staff.id)}
                className={`group relative rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-300
                  ${unavailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
                  ${isSelected ? 'ring-2 ring-[#e6c487] ring-offset-2 ring-offset-[#131315]' : ''}
                `}
              >
                {/* Image Container */}
                <div className="relative h-[450px] md:h-[500px] w-full overflow-hidden bg-[#1b1b1d]">
                  {staff.avatarUrl ? (
                    <img
                      src={staff.avatarUrl}
                      alt={staff.fullName}
                      className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    /* Fallback avatar */
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2a2a2c] to-[#1b1b1d]">
                      <span className="text-3xl text-[#e6c487]/30 font-bold tracking-wider">
                        {staff.id}
                      </span>
                    </div>
                  )}

                  {/* Status Badge */}
                  {getStatusBadge(staff)}

                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute top-5 right-5 bg-[#e6c487] w-7 h-7 rounded-full flex items-center justify-center z-20 shadow-lg">
                      <svg className="w-4 h-4 text-[#412d00]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}

                  {/* Content Overlay */}
                  <div className="absolute bottom-0 left-0 w-full p-7 bg-gradient-to-t from-[#131315] via-[#131315]/60 to-transparent">
                    {/* Staff Code Badge — enlarged as primary identifier */}
                    <div className="inline-block bg-[#e6c487]/15 border border-[#e6c487]/30 px-5 py-2 rounded-full mb-3">
                      <span className="text-base tracking-[0.15em] text-[#e6c487] font-bold">{staff.id}</span>
                    </div>

                    {/* Skill preview chips */}
                    {skillPreview && (
                      <p className="text-xs text-[#d0c5b5]/90 mb-4 tracking-wide font-medium">{skillPreview}</p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <div className={`flex-1 py-4 rounded-full text-center text-sm font-bold tracking-[0.1em] uppercase transition-all shadow-[0_4px_15px_rgba(0,0,0,0.3)] ${
                        !unavailable
                          ? 'bg-[#e6c487] text-[#412d00]'
                          : 'bg-black/60 backdrop-blur-sm border border-[#4d463a] text-[#e4e2e4]'
                      }`}>
                        {!unavailable ? t.ss_bookNow : t.ss_unavailable}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Floating CTA Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 inset-x-6 lg:inset-x-0 mx-auto lg:w-[500px] z-40"
          >
            <button
              onClick={handleConfirm}
              className="w-full py-5 rounded-full bg-[#e6c487] text-[#412d00] font-bold tracking-[0.12em] text-sm shadow-[0_15px_30px_rgba(0,0,0,0.4)] flex items-center justify-center gap-3 active:scale-95 duration-200 uppercase"
            >
              <span>{tpl(t.ss_continueWith, { count: selectedIds.length })}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editorial Quote */}
      {!isLoading && sortedStaff.length > 0 && (
        <div className="mt-16 text-center px-4 opacity-40">
          <p className="font-serif italic text-base text-[#c9a96e] leading-relaxed">
            {t.ss_quote}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default StaffSelector;
