'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';

// =============================================
// ⏰ Flip Time Picker – iOS-style scroll wheel
// 2 columns: Hours (HH) + Minutes (MM)
// Scroll snap + gradient mask + gold highlight
// =============================================

// 🔧 UI CONFIGURATION
const ITEM_HEIGHT = 48; // Height of each item in px
const VISIBLE_ITEMS = 3; // 1 above + selected + 1 below
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // Total container height
const MINUTE_INTERVAL = 15; // 00, 15, 30, 45

interface FlipTimePickerProps {
  /** Earliest selectable time "HH:mm" */
  startTime: string;
  /** Latest selectable time "HH:mm" */
  endTime: string;
  /** Currently selected time "HH:mm" or null */
  value: string | null;
  /** Called when selection changes */
  onChange: (time: string) => void;
}

// --- Helper: parse "HH:mm" → { h, m } ---
const parseTime = (t: string): { h: number; m: number } => {
  const [h, m] = t.split(':').map(Number);
  return { h, m };
};

// --- Helper: format to "HH:mm" ---
const formatTime = (h: number, m: number): string =>
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

// --- Single Column Scroll Wheel ---
interface WheelColumnProps {
  items: number[];
  value: number;
  onChange: (val: number) => void;
  padDigits?: number;
}

const WheelColumn = ({ items, value, onChange, padDigits = 2 }: WheelColumnProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Padding: 1 blank top + 1 blank bottom
  const padding = Math.floor(VISIBLE_ITEMS / 2);

  // Scroll to selected value
  const scrollToIndex = useCallback((idx: number, smooth = true) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: idx * ITEM_HEIGHT,
      behavior: smooth ? 'smooth' : 'instant',
    });
  }, []);

  // Initial scroll to value
  useEffect(() => {
    const idx = items.indexOf(value);
    if (idx >= 0) {
      scrollToIndex(idx, false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When value prop changes externally
  useEffect(() => {
    if (isUserScrolling.current) return;
    const idx = items.indexOf(value);
    if (idx >= 0) {
      scrollToIndex(idx, true);
    }
  }, [value, items, scrollToIndex]);

  // Handle scroll end → snap to nearest item
  const handleScroll = useCallback(() => {
    isUserScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    scrollTimeout.current = setTimeout(() => {
      if (!scrollRef.current) return;
      const scrollTop = scrollRef.current.scrollTop;
      const idx = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIdx = Math.max(0, Math.min(idx, items.length - 1));

      // Snap
      scrollRef.current.scrollTo({
        top: clampedIdx * ITEM_HEIGHT,
        behavior: 'smooth',
      });

      // Notify parent
      if (items[clampedIdx] !== undefined) {
        onChange(items[clampedIdx]);
      }

      setTimeout(() => { isUserScrolling.current = false; }, 200);
    }, 80);
  }, [items, onChange]);

  return (
    <div className="relative" style={{ height: CONTAINER_HEIGHT }}>
      {/* Gradient mask top */}
      <div
        className="absolute top-0 left-0 right-0 z-10 pointer-events-none"
        style={{
          height: ITEM_HEIGHT * padding,
          background: 'linear-gradient(to bottom, #131315 0%, #131315cc 40%, transparent 100%)',
        }}
      />

      {/* Center highlight bar */}
      <div
        className="absolute left-0 right-0 z-10 pointer-events-none border-y border-[#e6c487]/30"
        style={{
          top: ITEM_HEIGHT * padding,
          height: ITEM_HEIGHT,
        }}
      />

      {/* Gradient mask bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none"
        style={{
          height: ITEM_HEIGHT * padding,
          background: 'linear-gradient(to top, #131315 0%, #131315cc 40%, transparent 100%)',
        }}
      />

      {/* Scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll scrollbar-hide [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Top padding */}
        {Array.from({ length: padding }).map((_, i) => (
          <div key={`pad-top-${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}

        {/* Items */}
        {items.map((item, idx) => {
          const isActive = item === value;
          return (
            <div
              key={`item-${item}-${idx}`}
              onClick={() => {
                onChange(item);
                scrollToIndex(idx, true);
              }}
              className="flex items-center justify-center cursor-pointer select-none transition-all duration-200"
              style={{
                height: ITEM_HEIGHT,
                scrollSnapAlign: 'center',
              }}
            >
              <span
                className={`text-3xl font-bold transition-all duration-200 ${
                  isActive
                    ? 'text-[#e6c487] scale-110'
                    : 'text-[#e4e2e4]/25'
                }`}
              >
                {String(item).padStart(padDigits, '0')}
              </span>
            </div>
          );
        })}

        {/* Bottom padding */}
        {Array.from({ length: padding }).map((_, i) => (
          <div key={`pad-bot-${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}
      </div>
    </div>
  );
};

// --- Main FlipTimePicker ---
const FlipTimePicker = ({ startTime, endTime, value, onChange }: FlipTimePickerProps) => {
  const start = parseTime(startTime);
  const end = parseTime(endTime);

  // Generate valid hours
  const hours = [];
  for (let h = start.h; h <= end.h; h++) {
    hours.push(h);
  }

  // Parse current value — snap minute to nearest interval
  const currentVal = value ? parseTime(value) : { h: hours[0] ?? start.h, m: 0 };
  const snappedMin = Math.round(currentVal.m / MINUTE_INTERVAL) * MINUTE_INTERVAL;
  const [selectedHour, setSelectedHour] = useState(currentVal.h);
  const [selectedMinute, setSelectedMinute] = useState(snappedMin >= 60 ? 60 - MINUTE_INTERVAL : snappedMin);

  // Generate valid minutes at 15-min intervals for selected hour
  const validIntervalMinutes = Array.from(
    { length: 60 / MINUTE_INTERVAL },
    (_, i) => i * MINUTE_INTERVAL
  ).filter(m => {
    const totalMins = selectedHour * 60 + m;
    const startMins = start.h * 60 + start.m;
    const endMins = end.h * 60 + end.m;
    return totalMins >= startMins && totalMins <= endMins;
  });

  // Sync selection back to parent
  useEffect(() => {
    const totalMins = selectedHour * 60 + selectedMinute;
    const startMins = start.h * 60 + start.m;
    const endMins = end.h * 60 + end.m;

    if (totalMins >= startMins && totalMins <= endMins) {
      onChange(formatTime(selectedHour, selectedMinute));
    }
  }, [selectedHour, selectedMinute]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clamp minute when hour changes — snap to nearest valid 15-min interval
  const handleHourChange = (h: number) => {
    setSelectedHour(h);

    // Round current minute to nearest MINUTE_INTERVAL
    let clampedMin = Math.round(selectedMinute / MINUTE_INTERVAL) * MINUTE_INTERVAL;
    if (clampedMin >= 60) clampedMin = 60 - MINUTE_INTERVAL;

    // If new hour is first hour, clamp min to at least start.m (rounded up)
    if (h === start.h) {
      const minStart = Math.ceil(start.m / MINUTE_INTERVAL) * MINUTE_INTERVAL;
      if (clampedMin < minStart) clampedMin = minStart;
    }
    // If new hour is last hour, clamp min to at most end.m (rounded down)
    if (h === end.h) {
      const maxEnd = Math.floor(end.m / MINUTE_INTERVAL) * MINUTE_INTERVAL;
      if (clampedMin > maxEnd) clampedMin = maxEnd;
    }

    if (clampedMin !== selectedMinute) setSelectedMinute(clampedMin);
  };

  const handleMinuteChange = (m: number) => {
    // Validate against boundaries
    const totalMins = selectedHour * 60 + m;
    const startMins = start.h * 60 + start.m;
    const endMins = end.h * 60 + end.m;
    if (totalMins >= startMins && totalMins <= endMins) {
      setSelectedMinute(m);
    }
  };

  if (hours.length === 0) {
    return (
      <div className="text-center py-6 text-[#998f81] text-sm">
        Không còn khung giờ trống
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Picker container */}
      <div className="flex items-center gap-3 bg-[#1b1b1d]/80 rounded-2xl px-8 py-2 border border-[#4d463a]/30">
        {/* Hours column */}
        <div className="w-24">
          <WheelColumn
            items={hours}
            value={selectedHour}
            onChange={handleHourChange}
          />
        </div>

        {/* Separator */}
        <div className="flex flex-col items-center justify-center" style={{ height: CONTAINER_HEIGHT }}>
          <span className="text-4xl font-bold text-[#e6c487]">:</span>
        </div>

        {/* Minutes column */}
        <div className="w-24">
          <WheelColumn
            items={validIntervalMinutes}
            value={selectedMinute}
            onChange={handleMinuteChange}
          />
        </div>
      </div>

      {/* Selected time display */}
      <div className="mt-3 text-center">
        <span className="text-sm text-[#998f81]">
          {formatTime(selectedHour, selectedMinute)}
        </span>
      </div>
    </div>
  );
};

export default FlipTimePicker;
