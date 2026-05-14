import React from 'react';
import { motion } from 'framer-motion';
import { mockStaff, mockSkills } from '../mockData';

// =============================================
// ✅ Confirmation Screen – CELESTIAL Design
// Xác nhận lại KTV, ngày giờ và các Skill
// =============================================

const CONFIRM_BG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCb8UBdrKfqj8bwY8Ol1VYYTqTv8p2T0yyEJVvcjF3qyw7yX04ejqe4a3Y0kwkxKdbhCaydf5_7Tq4g_nd1fY7QDPFsZtsJvIqP5_TRzNdwIVGQc9AOc0k9F2hcvptyAMmgQGFyW5qZUQJ7jpSI9O7j-KU-sDr_QO4ZnldJ-HZkos8uLs_8w4mj_pWWsFpTSVt-RI-FppnFxuwC3dt7TysAsA9a3uKN4dXLIHCyk9EqCFhNMiJxqm0UFNw88xvXYZe33yLT6N49M9k';

interface ConfirmationScreenProps {
  lang: string;
  selectedStaffIds: string[];
  selectedSkillsMap: Record<string, string[]>;
  totalDuration: number;
  timeSlot: string | null;
  totalPrice: number;
  onConfirm: () => void;
}

const ConfirmationScreen = ({
  lang,
  selectedStaffIds,
  selectedSkillsMap,
  totalDuration,
  timeSlot,
  totalPrice,
  onConfirm,
}: ConfirmationScreenProps) => {
  const isVi = lang === 'vi';
  const staffList = mockStaff.filter(s => selectedStaffIds.includes(s.id));

  const isBranch = timeSlot === 'BRANCH_DECIDE';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col pb-32"
    >
      {/* Hero Banner */}
      <div className="relative h-[200px] w-full overflow-hidden">
        <img src={CONFIRM_BG} alt="" className="w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#131315] via-[#131315]/60 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <span className="text-[10px] tracking-[0.3em] uppercase text-[#ffb597]">
            {isVi ? 'Trải nghiệm đẳng cấp' : 'Premium Experience'}
          </span>
          <h2 className="text-2xl font-serif italic text-[#e4e2e4] mt-1">
            {isVi ? 'Hành Trình Chữa Lành' : 'Healing Journey'}
          </h2>
        </div>
      </div>

      {/* Booking Details */}
      <div className="px-6 mt-6 space-y-6">
        {/* Section header */}
        <h3 className="text-[11px] tracking-[0.2em] uppercase text-[#d0c5b5] flex items-center">
          <span className="w-8 h-px bg-[#4d463a] mr-3" />
          {isVi ? 'THÔNG TIN ĐẶT LỊCH' : 'BOOKING DETAILS'}
        </h3>

        {/* Therapist */}
        <div className="flex items-center gap-4 bg-[#1b1b1d] p-4 rounded-2xl border border-[#4d463a]/20">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex -space-x-2">
              {staffList.map(s => (
                <img key={s.id} src={s.avatar} alt={s.name} className="w-10 h-10 rounded-full border-2 border-[#131315] object-cover" />
              ))}
            </div>
            <div>
              <div className="text-[10px] text-[#998f81] tracking-wider uppercase">{isVi ? 'Chuyên viên' : 'Therapists'}</div>
              <div className="text-sm font-medium text-[#e4e2e4]">
                {staffList.map(s => s.name).join(' & ')}
              </div>
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div className="flex items-center gap-4 bg-[#1b1b1d] p-4 rounded-2xl border border-[#4d463a]/20">
          <div className="w-10 h-10 rounded-full bg-[#2a2a2c] flex items-center justify-center">
            <svg className="w-5 h-5 text-[#e6c487]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <div className="text-[10px] text-[#998f81] tracking-wider uppercase">{isVi ? 'Thời gian' : 'Schedule'}</div>
            <div className="text-sm font-medium text-[#e4e2e4]">
              {isBranch
                ? (isVi ? 'Đến chi nhánh lấy vé trực tiếp' : 'Walk-in at branch')
                : `${timeSlot} (${totalDuration} ${isVi ? 'phút' : 'mins'})`
              }
            </div>
          </div>
        </div>

        {/* Services Group by Staff */}
        <div className="flex items-start gap-4 bg-[#1b1b1d] p-4 rounded-2xl border border-[#4d463a]/20">
          <div className="w-10 h-10 rounded-full bg-[#2a2a2c] flex items-center justify-center mt-0.5 shrink-0">
            <svg className="w-5 h-5 text-[#e6c487]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
          </div>
          <div className="flex-1">
            <div className="text-[10px] text-[#998f81] tracking-wider uppercase mb-2">{isVi ? 'Dịch vụ đã chọn' : 'Selected Services'}</div>
            
            <div className="space-y-3">
              {staffList.map(staff => {
                const skillsOfStaff = mockSkills.filter(s => (selectedSkillsMap[staff.id] || []).includes(s.id));
                if (skillsOfStaff.length === 0) return null;
                
                return (
                  <div key={staff.id}>
                    {staffList.length > 1 && (
                      <div className="text-[10px] text-[#e6c487] font-bold mb-1 opacity-90">{staff.name}</div>
                    )}
                    <div className="space-y-1">
                      {skillsOfStaff.map(s => (
                        <div key={s.id} className={`flex justify-between items-center ${staffList.length > 1 ? 'pl-2 border-l border-[#4d463a]/30' : ''}`}>
                          <span className="text-sm text-[#e4e2e4]">{isVi ? s.name.vi : s.name.en}</span>
                          <span className="text-[10px] text-[#998f81]">{s.duration}p</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Price Summary */}
        <div className="bg-[#1b1b1d] p-5 rounded-2xl border border-[#e6c487]/20">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-[10px] text-[#998f81] tracking-wider uppercase">{isVi ? 'Tổng thời gian' : 'Total Duration'}</div>
              <div className="text-lg font-bold text-[#e4e2e4] mt-0.5">{totalDuration} {isVi ? 'phút' : 'minutes'}</div>
              {staffList.length > 1 && (
                <div className="text-[10px] text-[#998f81]">x {staffList.length} {isVi ? 'KTV' : 'Therapists'}</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#e6c487] tracking-wider uppercase font-bold">Bespoke Pricing</div>
              <div className="text-xl font-bold text-[#e6c487] mt-0.5">{totalPrice.toLocaleString('vi-VN')}đ</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating CTA */}
      <div className="fixed bottom-6 left-6 right-6 z-40">
        <button
          onClick={onConfirm}
          className="w-full py-5 rounded-full bg-[#e6c487] text-[#412d00] font-bold tracking-[0.12em] text-sm shadow-[0_15px_30px_rgba(0,0,0,0.4)] flex items-center justify-center gap-3 active:scale-95 duration-200 uppercase"
        >
          <span>{isVi ? 'HOÀN TẤT ĐẶT LỊCH' : 'COMPLETE BOOKING'}</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </motion.div>
  );
};

export default ConfirmationScreen;
