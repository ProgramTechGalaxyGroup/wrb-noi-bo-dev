'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FlipTimePicker from './FlipTimePicker';

interface BookingTimePickerProps {
  lang: string;
  selectedDateStr: string | null;
  selectedSlot: string | null;
  onChangeDate: (dateStr: string) => void;
  onChangeSlot: (slot: string | null) => void;
  bufferMinutes?: number;
  t: Record<string, string>; // i18n object passed from parent
}

// Helper: parse "HH:mm" → minutes from midnight
const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Helper: minutes from midnight → "HH:mm"
const minutesToTime = (mins: number): string => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const DEFAULT_SHIFT_START = '09:00';
const DEFAULT_SHIFT_END = '22:00';
const TIME_SLOT_INTERVAL_MINUTES = 15;

const DAY_KEYS: Record<number, string> = {
  0: 'bc_sun',
  1: 'bc_mon',
  2: 'bc_tue',
  3: 'bc_wed',
  4: 'bc_thu',
  5: 'bc_fri',
  6: 'bc_sat',
};

export default function BookingTimePicker({
  lang,
  selectedDateStr,
  selectedSlot,
  onChangeDate,
  onChangeSlot,
  bufferMinutes = 30,
  t
}: BookingTimePickerProps) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date().getMonth());
  const [currentCalendarYear, setCurrentCalendarYear] = useState(new Date().getFullYear());

  // Generate Day Chips (Next 5 days)
  const dayChips = useMemo(() => {
    const days = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push({
        label: t[DAY_KEYS[d.getDay()]] || d.toLocaleDateString(lang, { weekday: 'short' }),
        date: d.getDate(),
        isoDate: d.toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 10)
      });
    }
    return days;
  }, [t, lang]);

  // If no date selected, select today
  React.useEffect(() => {
    if (!selectedDateStr) {
      onChangeDate(dayChips[0].isoDate);
    }
  }, [selectedDateStr, dayChips, onChangeDate]);

  // Calendar logic
  const calendarDays = useMemo(() => {
    const year = currentCalendarYear;
    const month = currentCalendarMonth;
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
    const adjustedFirstDayIndex = (firstDayIndex + 6) % 7; // Monday start
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

  // Generate available time range
  const pickerTimeRange = useMemo(() => {
    const shiftStart = DEFAULT_SHIFT_START;
    const shiftEnd = DEFAULT_SHIFT_END;
    const isToday = selectedDateStr === dayChips[0]?.isoDate;

    let startMins = timeToMinutes(shiftStart);
    let endMins = timeToMinutes(shiftEnd);
    if (endMins <= startMins) endMins += 24 * 60; // cross-midnight

    if (isToday) {
      const now = new Date();
      const nowMins = now.getHours() * 60 + now.getMinutes() + bufferMinutes;
      startMins = Math.max(startMins, nowMins);
      // Round up to nearest 15 mins
      startMins = Math.ceil(startMins / TIME_SLOT_INTERVAL_MINUTES) * TIME_SLOT_INTERVAL_MINUTES;
    }

    if (startMins > endMins) {
      return { startTime: '', endTime: '', hasSlots: false };
    }

    return {
      startTime: minutesToTime(startMins),
      endTime: endMins >= 1440 ? '23:59' : minutesToTime(endMins),
      hasSlots: true,
    };
  }, [selectedDateStr, dayChips, bufferMinutes]);

  return (
    <div className="space-y-5">
      {/* Day chips */}
      <section>
        <h3 className="text-[11px] tracking-[0.2em] uppercase text-[#d0c5b5] flex items-center mb-3">
          <span className="w-6 h-px bg-[#4d463a] mr-2" />
          {t.bc_selectDate || 'Chọn Ngày'}
        </h3>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center">
          {dayChips.map((day, idx) => {
            const isSelected = selectedDateStr === day.isoDate;
            return (
              <button
                key={idx}
                onClick={() => { onChangeDate(day.isoDate); onChangeSlot(null); }}
                className={`flex flex-col items-center justify-center min-w-[52px] h-16 rounded-2xl transition-all duration-200 ${
                  isSelected
                    ? 'bg-[#c9a96e]/20 border border-[#e6c487]/30 text-[#e6c487]'
                    : 'bg-[#1b1b1d] text-[#d0c5b5] border border-transparent'
                }`}
              >
                <span className="text-[9px] uppercase tracking-tighter opacity-70">{day.label}</span>
                <span className="text-lg font-bold mt-0.5">{day.date}</span>
              </button>
            );
          })}

          {/* Custom Calendar Button */}
          {(() => {
            const isCustomDate = selectedDateStr && !dayChips.some(d => d.isoDate === selectedDateStr);
            let displayLabel = t.bc_moreDate || 'Khác';
            if (isCustomDate && selectedDateStr) {
              const [_, m, d] = selectedDateStr.split('-');
              displayLabel = `${d}/${m}`;
            }
            return (
              <button
                onClick={() => setShowCalendar(true)}
                className={`flex flex-col items-center justify-center min-w-[70px] h-16 rounded-2xl transition-all duration-200 border ${
                  isCustomDate
                    ? 'bg-[#c9a96e]/20 border-[#e6c487] text-[#e6c487]'
                    : 'bg-[#1b1b1d] border-dashed border-[#4d463a]/50 text-[#998f81]'
                }`}
              >
                <span className="text-[9px] uppercase tracking-tighter opacity-70">{t.bc_calendar || 'Lịch'}</span>
                <span className="text-xs font-bold mt-1.5">{displayLabel}</span>
              </button>
            );
          })()}
        </div>
      </section>

      {/* Time Picker */}
      <section>
        <h3 className="text-[11px] tracking-[0.2em] uppercase text-[#d0c5b5] flex items-center mb-3">
          <span className="w-6 h-px bg-[#4d463a] mr-2" />
          {t.bc_availableTimes || 'Thời Gian'}
        </h3>
        {pickerTimeRange.hasSlots ? (
          <FlipTimePicker
            startTime={pickerTimeRange.startTime}
            endTime={pickerTimeRange.endTime}
            value={selectedSlot}
            onChange={(time) => onChangeSlot(time)}
          />
        ) : (
          <p className="text-[#998f81] text-sm text-center py-4">
            {t.bc_noTimeSlots || 'Đã hết giờ nhận khách trong ngày'}
          </p>
        )}
        <p className="text-[9px] text-[#998f81] text-center mt-2">
          {t.bc_timeNote || 'Nếu chọn sai, vui lòng vuốt để chọn lại giờ hợp lệ.'}
        </p>
      </section>

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
                  {t.bc_month || 'Tháng '}{currentCalendarMonth + 1}, {currentCalendarYear}
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
                <div>{t.cal_t2 || 'T2'}</div>
                <div>{t.cal_t3 || 'T3'}</div>
                <div>{t.cal_t4 || 'T4'}</div>
                <div>{t.cal_t5 || 'T5'}</div>
                <div>{t.cal_t6 || 'T6'}</div>
                <div>{t.cal_t7 || 'T7'}</div>
                <div className="text-red-400">{t.cal_cn || 'CN'}</div>
              </div>

              {/* Grid Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} />;
                  
                  const isoStr = day.toLocaleString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).slice(0, 10);
                  const isSelected = selectedDateStr === isoStr;
                  const disabled = isDateDisabled(day);
                  const isSunday = day.getDay() === 0;

                  return (
                    <button
                      key={idx}
                      disabled={disabled}
                      onClick={() => {
                        onChangeDate(isoStr);
                        onChangeSlot(null);
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
                  {t.bc_close || 'Đóng'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
