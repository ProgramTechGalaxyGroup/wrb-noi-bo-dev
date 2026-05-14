import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockStaff, mockSkills, mockTimeSlots } from '../mockData';

// =============================================
// 📅 Booking Config – CELESTIAL Design
// Cấu hình KTV, Kỹ năng từng người, Thời gian động
// =============================================

interface VipPricing {
  duration: number;
  price: number;
  label: string;
}

interface BookingConfigProps {
  lang: string;
  selectedStaffIds: string[];
  vipPricing?: VipPricing[];
  onConfirm: (data: { skillsMap: Record<string, string[]>; totalDuration: number; timeSlot: string | null; totalPrice: number }) => void;
}

// Fallback durations if API hasn't loaded yet
const FALLBACK_VIP_PRICING: VipPricing[] = [
  { duration: 60, price: 690000, label: '60 phút' },
  { duration: 90, price: 1035000, label: '90 phút' },
  { duration: 120, price: 1380000, label: '120 phút' },
];

const BookingConfig = ({ lang, selectedStaffIds, vipPricing, onConfirm }: BookingConfigProps) => {
  const isVi = lang === 'vi';
  const staffList = mockStaff.filter(s => selectedStaffIds.includes(s.id));
  const primaryStaff = staffList[0];

  // State
  const [selectedSkillsMap, setSelectedSkillsMap] = useState<Record<string, string[]>>(
    Object.fromEntries(selectedStaffIds.map(id => [id, []]))
  );
  const [activeStaffTab, setActiveStaffTab] = useState<string>(selectedStaffIds[0]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingMethod, setBookingMethod] = useState<'advance' | 'branch' | null>(null);

  // Mock Day Chips (next 5 days)
  const dayChips = useMemo(() => {
    const days = [];
    const dayNames = isVi
      ? ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push({
        label: dayNames[d.getDay()],
        date: d.getDate(),
      });
    }
    return days;
  }, [isVi]);

  const toggleSkill = (staffId: string, skillId: string) => {
    setSelectedSkillsMap(prev => {
      const current = prev[staffId] || [];
      const updated = current.includes(skillId) 
        ? current.filter(s => s !== skillId) 
        : [...current, skillId];
      return { ...prev, [staffId]: updated };
    });
  };

  // VIP pricing tiers (from SystemConfigs or fallback)
  const pricingTiers = (vipPricing && vipPricing.length > 0) ? vipPricing : FALLBACK_VIP_PRICING;

  // Duration options are fixed VIP tiers
  const durationOptions = pricingTiers.map(t => t.duration);

  // Get price for selected duration
  const selectedTier = pricingTiers.find(t => t.duration === selectedDuration);
  const totalPrice = selectedTier ? selectedTier.price * staffList.length : 0;

  // No longer needed: duration options are fixed VIP tiers

  const isReady = selectedDuration !== null && 
                  bookingMethod !== null && 
                  (bookingMethod === 'branch' || (bookingMethod === 'advance' && selectedSlot !== null && selectedSlot !== 'BRANCH_DECIDE'));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col px-6 pt-2 pb-36"
    >
      {/* Cấu hình KTV (Hiển thị 1 hoặc Tabs nếu đi đông người) */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        {staffList.length > 1 ? (
          <div>
            <h3 className="text-[11px] tracking-[0.2em] uppercase text-[#d0c5b5] flex items-center mb-4">
              <span className="w-8 h-px bg-[#4d463a] mr-3" />
              {isVi ? 'CHỌN DỊCH VỤ CHO TỪNG KTV' : 'SERVICES BY THERAPIST'}
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
               {staffList.map(s => (
                 <button
                   key={s.id}
                   onClick={() => setActiveStaffTab(s.id)}
                   className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl min-w-max border transition-all ${
                     activeStaffTab === s.id 
                       ? 'bg-[#c9a96e]/10 border-[#e6c487] text-[#e6c487] shadow-lg shadow-[#e6c487]/5' 
                       : 'bg-[#1b1b1d] border-[#4d463a]/30 text-[#d0c5b5]'
                   }`}
                 >
                   <img src={s.avatar} alt={s.name} className="w-8 h-8 rounded-full border border-white/10 shrink-0" />
                   <div className="text-left leading-tight">
                     <span className="block text-xs font-bold">{s.name}</span>
                     <span className="block text-[9px] opacity-60">
                       {(selectedSkillsMap[s.id] || []).length} {isVi ? 'kỹ năng' : 'skills'}
                     </span>
                   </div>
                 </button>
               ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-5">
            <div className="w-20 h-28 rounded-[1.5rem] overflow-hidden shadow-2xl relative shrink-0">
              <img src={primaryStaff?.avatar} alt={primaryStaff?.name} className="w-full h-full object-cover" />
              <div className="absolute -bottom-1.5 -right-1.5 bg-[#e6c487] p-1 rounded-full shadow-lg">
                <svg className="w-3.5 h-3.5 text-[#412d00]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              </div>
            </div>
            <div>
              <span className="text-[10px] tracking-[0.3em] uppercase text-[#ffb597]">Expert Therapist</span>
              <h2 className="text-2xl font-serif italic text-[#e6c487] mt-0.5">{primaryStaff?.name}</h2>
              <div className="flex items-center gap-1 text-[#e6c487]/60 mt-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                <span className="text-xs">{primaryStaff?.rating} ({primaryStaff?.reviewCount} reviews)</span>
              </div>
            </div>
          </div>
        )}
      </motion.section>

      {/* Kỹ Năng Của KTV Đang Chọn */}
      <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
        {staffList.length === 1 && (
          <h3 className="text-[11px] tracking-[0.2em] uppercase text-[#d0c5b5] flex items-center mb-4">
            <span className="w-8 h-px bg-[#4d463a] mr-3" />
            {isVi ? 'KỸ NĂNG CHUYÊN BIỆT' : 'SPECIALTIES'}
          </h3>
        )}
        <div className="flex flex-wrap gap-2.5">
          {mockSkills.map(skill => {
            const isActive = selectedSkillsMap[activeStaffTab]?.includes(skill.id);
            return (
              <button
                key={skill.id}
                onClick={() => toggleSkill(activeStaffTab, skill.id)}
                className={`px-4 py-2.5 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#c9a96e] text-[#543d0c] shadow-lg shadow-[#e6c487]/10 font-bold border border-[#e6c487]'
                    : 'bg-[#2a2a2c] border border-[#4d463a]/30 text-[#d0c5b5] hover:border-[#998f81]/50'
                }`}
              >
                <span className="text-xs">{isVi ? skill.name.vi : skill.name.en}</span>
              </button>
            );
          })}
        </div>
      </motion.section>

      <AnimatePresence>
        {durationOptions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="p-5 rounded-2xl bg-[#c9a96e]/5 border border-[#e6c487]/20 relative">
              <h3 className="text-[11px] tracking-[0.2em] uppercase text-[#e6c487] font-bold mb-1">
                {isVi ? 'CHỌN THỜI LƯỢNG DỊCH VỤ' : 'SELECT DURATION'}
              </h3>
              <p className="text-[10px] text-[#998f81] mb-4">
                {isVi ? 'Giá đã bao gồm VAT' : 'Price includes VAT'}
              </p>
              
              <div className="flex flex-col gap-3">
                {pricingTiers.map(tier => (
                  <button
                    key={tier.duration}
                    onClick={() => setSelectedDuration(tier.duration)}
                    className={`py-4 px-5 rounded-2xl font-medium transition-all flex justify-between items-center ${
                      selectedDuration === tier.duration
                        ? 'bg-[#e6c487]/15 border-2 border-[#e6c487] text-[#e6c487] shadow-[0_0_20px_rgba(230,196,135,0.15)]'
                        : 'bg-[#1b1b1d] border-2 border-[#4d463a]/30 text-[#d0c5b5] hover:border-[#998f81]/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedDuration === tier.duration ? 'border-[#e6c487]' : 'border-[#4d463a]'
                      }`}>
                        {selectedDuration === tier.duration && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#e6c487]" />
                        )}
                      </div>
                      <span className="text-base font-bold">{tier.duration} {isVi ? 'phút' : 'mins'}</span>
                    </div>
                    <span className="text-base font-bold">{tier.price.toLocaleString('vi-VN')}đ</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Hình Thức Sử Dụng Dịch Vụ (hiện sau khi đã chọn thời lượng) */}
      <AnimatePresence>
        {selectedDuration && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            <section>
              <h3 className="text-[11px] tracking-[0.2em] uppercase text-[#d0c5b5] flex items-center mb-4">
                <span className="w-8 h-px bg-[#4d463a] mr-3" />
                {isVi ? 'HÌNH THỨC SỬ DỤNG' : 'SERVICE PREFERENCE'}
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setBookingMethod('branch');
                    setSelectedSlot('BRANCH_DECIDE');
                  }}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 ${
                    bookingMethod === 'branch'
                      ? 'bg-[#e6c487]/10 border-[#e6c487] text-[#e6c487] shadow-[0_0_15px_rgba(230,196,135,0.1)]'
                      : 'bg-[#1b1b1d] border-[#4d463a]/30 text-[#d0c5b5] hover:border-[#998f81]/50'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="text-sm font-medium">{isVi ? 'Đang Tại Chi Nhánh' : 'Walk-in Box'}</span>
                </button>

                <button
                  onClick={() => {
                    setBookingMethod('advance');
                    if (selectedSlot === 'BRANCH_DECIDE') setSelectedSlot(null);
                  }}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 ${
                    bookingMethod === 'advance'
                      ? 'bg-[#e6c487]/10 border-[#e6c487] text-[#e6c487] shadow-[0_0_15px_rgba(230,196,135,0.1)]'
                      : 'bg-[#1b1b1d] border-[#4d463a]/30 text-[#d0c5b5] hover:border-[#998f81]/50'
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-sm font-medium">{isVi ? 'Đặt Lịch Trước' : 'Book Advance'}</span>
                </button>
              </div>
            </section>

            <AnimatePresence>
              {bookingMethod === 'advance' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-8 overflow-hidden"
                >
                  {/* Section: Chọn Ngày */}
                  <section>
                    <h3 className="text-[11px] tracking-[0.2em] uppercase text-[#d0c5b5] flex items-center mb-4">
                      <span className="w-8 h-px bg-[#4d463a] mr-3" />
                      {isVi ? 'CHỌN NGÀY' : 'SELECT DATE'}
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {dayChips.map((day: { label: string; date: number }, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedDay(idx)}
                          className={`flex flex-col items-center justify-center min-w-[60px] h-20 rounded-full transition-all duration-200 ${
                            selectedDay === idx
                              ? 'bg-[#c9a96e]/20 border border-[#e6c487]/30 text-[#e6c487]'
                              : 'bg-[#1b1b1d] text-[#d0c5b5] border border-transparent'
                          }`}
                        >
                          <span className="text-[10px] uppercase tracking-tighter opacity-70">{day.label}</span>
                          <span className="text-xl font-bold mt-0.5">{day.date}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Section: Thời Gian Trống */}
                  <section>
                    <h3 className="text-[11px] tracking-[0.2em] uppercase text-[#d0c5b5] flex items-center mb-5">
                      <span className="w-8 h-px bg-[#4d463a] mr-3" />
                      {isVi ? 'THỜI GIAN TRỐNG' : 'AVAILABLE TIMES'}
                    </h3>

                    <div className="space-y-5">
                      {/* Morning */}
                      <div>
                        <div className="flex items-center text-[#ffb597] gap-2 mb-2.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                          <span className="text-[10px] tracking-[0.15em] uppercase">{isVi ? 'Buổi Sáng' : 'Morning'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2.5">
                          {mockTimeSlots.morning.map(slot => (
                            <button
                              key={slot.time}
                              disabled={!slot.available}
                              onClick={() => setSelectedSlot(slot.time)}
                              className={`py-3 text-center rounded-xl text-sm font-medium transition-all ${
                                !slot.available
                                  ? 'bg-[#1b1b1d]/50 text-[#998f81]/30 border border-transparent cursor-not-allowed line-through'
                                  : selectedSlot === slot.time
                                    ? 'bg-[#e6c487]/10 border border-[#e6c487] text-[#e6c487] font-bold shadow-[0_0_15px_rgba(230,196,135,0.1)]'
                                    : 'bg-[#1b1b1d] border border-[#4d463a]/20 text-[#e4e2e4]/60 hover:border-[#998f81]/40'
                              }`}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Afternoon */}
                      <div>
                        <div className="flex items-center text-[#ffb597] gap-2 mb-2.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                          <span className="text-[10px] tracking-[0.15em] uppercase">{isVi ? 'Buổi Chiều' : 'Afternoon'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2.5">
                          {mockTimeSlots.afternoon.map(slot => (
                            <button
                              key={slot.time}
                              disabled={!slot.available}
                              onClick={() => setSelectedSlot(slot.time)}
                              className={`py-3 text-center rounded-xl text-sm font-medium transition-all ${
                                !slot.available
                                  ? 'bg-[#1b1b1d]/50 text-[#998f81]/30 border border-transparent cursor-not-allowed line-through'
                                  : selectedSlot === slot.time
                                    ? 'bg-[#e6c487]/10 border border-[#e6c487] text-[#e6c487] font-bold shadow-[0_0_15px_rgba(230,196,135,0.1)]'
                                    : 'bg-[#1b1b1d] border border-[#4d463a]/20 text-[#e4e2e4]/60 hover:border-[#998f81]/40'
                              }`}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Evening */}
                      <div>
                        <div className="flex items-center text-[#ffb597] gap-2 mb-2.5">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                          <span className="text-[10px] tracking-[0.15em] uppercase">{isVi ? 'Buổi Tối' : 'Evening'}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2.5">
                          {mockTimeSlots.evening.map(slot => (
                            <button
                              key={slot.time}
                              disabled={!slot.available}
                              onClick={() => setSelectedSlot(slot.time)}
                              className={`py-3 text-center rounded-xl text-sm font-medium transition-all ${
                                !slot.available
                                  ? 'bg-[#1b1b1d]/50 text-[#998f81]/30 border border-transparent cursor-not-allowed line-through'
                                  : selectedSlot === slot.time
                                    ? 'bg-[#e6c487]/10 border border-[#e6c487] text-[#e6c487] font-bold shadow-[0_0_15px_rgba(230,196,135,0.1)]'
                                    : 'bg-[#1b1b1d] border border-[#4d463a]/20 text-[#e4e2e4]/60 hover:border-[#998f81]/40'
                              }`}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating CTA Bar */}
      <AnimatePresence>
        {isReady && selectedDuration && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-6 right-6 z-40"
          >
            {/* Summary Bar */}
            <div className="flex justify-between items-end mb-3 px-2">
              <div>
                <div className="text-[10px] text-[#998f81] uppercase tracking-wider">{isVi ? 'Đã chọn' : 'Selected'}</div>
                <div className="text-lg font-bold text-[#e4e2e4]">{selectedDuration} {isVi ? 'phút' : 'mins'}</div>
                {staffList.length > 1 && (
                  <div className="text-[9px] text-[#998f81]">x {staffList.length} KTV</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#e6c487] tracking-wider uppercase font-bold">Bespoke</div>
                <div className="text-lg font-bold text-[#e6c487]">{totalPrice.toLocaleString('vi-VN')}đ</div>
              </div>
            </div>
            <button
              onClick={() => onConfirm({ skillsMap: selectedSkillsMap, totalDuration: selectedDuration, timeSlot: selectedSlot, totalPrice })}
              className="w-full py-5 rounded-full bg-[#e6c487] text-[#412d00] font-bold tracking-[0.12em] text-sm shadow-[0_15px_30px_rgba(0,0,0,0.4)] flex items-center justify-center gap-3 active:scale-95 duration-200 uppercase"
            >
              <span>{isVi ? 'XÁC NHẬN LỰA CHỌN' : 'CONFIRM SELECTION'}</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default BookingConfig;
