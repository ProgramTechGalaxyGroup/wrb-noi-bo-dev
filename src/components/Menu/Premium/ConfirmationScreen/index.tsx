import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type VipStaffInfo } from '@/lib/vipStaffUtils';

// =============================================
// ✅ Confirmation Screen – VIP Booking
// Thu thập thông tin khách hàng + gửi đặt lịch
// =============================================

// 🔧 UI CONFIGURATION
const CONFIRM_BG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCb8UBdrKfqj8bwY8Ol1VYYTqTv8p2T0yyEJVvcjF3qyw7yX04ejqe4a3Y0kwkxKdbhCaydf5_7Tq4g_nd1fY7QDPFsZtsJvIqP5_TRzNdwIVGQc9AOc0k9F2hcvptyAMmgQGFyW5qZUQJ7jpSI9O7j-KU-sDr_QO4ZnldJ-HZkos8uLs_8w4mj_pWWsFpTSVt-RI-FppnFxuwC3dt7TysAsA9a3uKN4dXLIHCyk9EqCFhNMiJxqm0UFNw88xvXYZe33yLT6N49M9k';
const INPUT_STYLE = 'w-full bg-[#1b1b1d] border border-[#4d463a]/40 rounded-2xl px-5 py-4 text-sm text-[#e4e2e4] placeholder:text-[#998f81]/50 focus:outline-none focus:border-[#e6c487]/60 transition-colors';

interface ConfirmationScreenProps {
  lang: string;
  selectedStaffIds: string[];
  selectedStaffInfoList: VipStaffInfo[];  // real data
  selectedSkillsMap: Record<string, string[]>;
  totalDuration: number;
  timeSlot: string | null;
  appointmentDate?: string | null;         // YYYY-MM-DD
  totalPrice: number;
  onConfirm: () => void;
}

// Multi-language text map
const i18n: Record<string, Record<string, string>> = {
  vi: {
    heroSub: 'Trải nghiệm đẳng cấp',
    heroTitle: 'Hành Trình Chữa Lành',
    bookingDetails: 'THÔNG TIN ĐẶT LỊCH',
    therapists: 'Chuyên viên',
    schedule: 'Thời gian',
    walkIn: 'Đến chi nhánh lấy vé trực tiếp',
    services: 'Dịch vụ đã chọn',
    totalDuration: 'Tổng thời gian',
    mins: 'phút',
    ktv: 'KTV',
    pricing: 'Giá dịch vụ',
    customerInfo: 'THÔNG TIN LIÊN HỆ',
    customerInfoDesc: 'Spa sẽ liên hệ xác nhận lịch hẹn qua thông tin bên dưới',
    name: 'Họ và tên *',
    namePlaceholder: 'Nhập họ và tên...',
    phone: 'Số điện thoại *',
    phonePlaceholder: 'VD: 0901234567',
    email: 'Email (tùy chọn)',
    emailPlaceholder: 'email@example.com',
    note: 'Ghi chú',
    notePlaceholder: 'Yêu cầu đặc biệt (nếu có)...',
    submitBtn: 'XÁC NHẬN ĐẶT LỊCH',
    submitting: 'ĐANG GỬI...',
    errorName: 'Vui lòng nhập họ và tên',
    errorPhone: 'Vui lòng nhập số điện thoại',
    successTitle: 'Đặt lịch thành công!',
    successMsg: 'Cảm ơn bạn! Spa sẽ liên hệ xác nhận trong thời gian sớm nhất.',
    successBtn: 'VỀ TRANG CHỦ',
  },
  en: {
    heroSub: 'Premium Experience',
    heroTitle: 'Healing Journey',
    bookingDetails: 'BOOKING DETAILS',
    therapists: 'Therapists',
    schedule: 'Schedule',
    walkIn: 'Walk-in at branch',
    services: 'Selected Services',
    totalDuration: 'Total Duration',
    mins: 'minutes',
    ktv: 'Therapists',
    pricing: 'Service Price',
    customerInfo: 'CONTACT INFORMATION',
    customerInfoDesc: 'We will contact you to confirm the appointment',
    name: 'Full Name *',
    namePlaceholder: 'Enter your name...',
    phone: 'Phone Number *',
    phonePlaceholder: 'e.g. +84901234567',
    email: 'Email (optional)',
    emailPlaceholder: 'email@example.com',
    note: 'Note',
    notePlaceholder: 'Special requests (if any)...',
    submitBtn: 'CONFIRM BOOKING',
    submitting: 'SUBMITTING...',
    errorName: 'Please enter your name',
    errorPhone: 'Please enter your phone number',
    successTitle: 'Booking Confirmed!',
    successMsg: 'Thank you! Our spa will contact you shortly to confirm.',
    successBtn: 'BACK TO HOME',
  },
  kr: {
    heroSub: '프리미엄 경험',
    heroTitle: '힐링 여정',
    bookingDetails: '예약 정보',
    therapists: '전문가',
    schedule: '일정',
    walkIn: '지점 방문',
    services: '선택한 서비스',
    totalDuration: '총 시간',
    mins: '분',
    ktv: '테라피스트',
    pricing: '서비스 가격',
    customerInfo: '연락처 정보',
    customerInfoDesc: '예약 확인을 위해 연락드리겠습니다',
    name: '성함 *',
    namePlaceholder: '이름을 입력하세요...',
    phone: '전화번호 *',
    phonePlaceholder: '예: 010-1234-5678',
    email: '이메일 (선택)',
    emailPlaceholder: 'email@example.com',
    note: '메모',
    notePlaceholder: '특별 요청 사항...',
    submitBtn: '예약 확인',
    submitting: '전송 중...',
    errorName: '이름을 입력해주세요',
    errorPhone: '전화번호를 입력해주세요',
    successTitle: '예약 완료!',
    successMsg: '감사합니다! 곧 연락드리겠습니다.',
    successBtn: '홈으로',
  },
  cn: {
    heroSub: '尊享体验',
    heroTitle: '疗愈之旅',
    bookingDetails: '预约详情',
    therapists: '专家',
    schedule: '时间',
    walkIn: '到店取号',
    services: '已选服务',
    totalDuration: '总时长',
    mins: '分钟',
    ktv: '技师',
    pricing: '服务价格',
    customerInfo: '联系方式',
    customerInfoDesc: '我们将通过以下信息确认预约',
    name: '姓名 *',
    namePlaceholder: '请输入姓名...',
    phone: '电话 *',
    phonePlaceholder: '例：13800138000',
    email: '邮箱（选填）',
    emailPlaceholder: 'email@example.com',
    note: '备注',
    notePlaceholder: '特殊要求...',
    submitBtn: '确认预约',
    submitting: '提交中...',
    errorName: '请输入姓名',
    errorPhone: '请输入电话号码',
    successTitle: '预约成功！',
    successMsg: '感谢您！我们将尽快联系您确认。',
    successBtn: '返回首页',
  },
  jp: {
    heroSub: 'プレミアム体験',
    heroTitle: 'ヒーリングの旅',
    bookingDetails: '予約詳細',
    therapists: 'セラピスト',
    schedule: 'スケジュール',
    walkIn: '店舗で受付',
    services: '選択したサービス',
    totalDuration: '合計時間',
    mins: '分',
    ktv: 'セラピスト',
    pricing: 'サービス料金',
    customerInfo: '連絡先情報',
    customerInfoDesc: 'ご予約確認のためご連絡いたします',
    name: 'お名前 *',
    namePlaceholder: 'お名前を入力...',
    phone: '電話番号 *',
    phonePlaceholder: '例：090-1234-5678',
    email: 'メール（任意）',
    emailPlaceholder: 'email@example.com',
    note: 'メモ',
    notePlaceholder: '特別なご要望...',
    submitBtn: '予約確認',
    submitting: '送信中...',
    errorName: 'お名前を入力してください',
    errorPhone: '電話番号を入力してください',
    successTitle: '予約完了！',
    successMsg: 'ありがとうございます！近日中にご連絡いたします。',
    successBtn: 'ホームへ',
  },
};

const ConfirmationScreen = ({
  lang,
  selectedStaffIds,
  selectedStaffInfoList,
  selectedSkillsMap,
  totalDuration,
  timeSlot,
  appointmentDate,
  totalPrice,
  onConfirm,
}: ConfirmationScreenProps) => {
  const t = i18n[lang] || i18n['en'];
  const isBranch = timeSlot === 'BRANCH_DECIDE';

  // All selected skill IDs (union across all staff)
  const allSelectedSkills = [...new Set(Object.values(selectedSkillsMap).flat())];

  // Customer info form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [bookingCode, setBookingCode] = useState('');
  // Server confidence after submit
  const [serverConfidence, setServerConfidence] = useState<'CONFIRMED' | 'NEEDS_CONFIRM' | 'RISKY' | null>(null);
  const [serverWarnings, setServerWarnings] = useState<string[]>([]);

  const handleSubmit = async () => {
    if (!customerName.trim()) { setFormError(t.errorName); return; }
    if (!customerPhone.trim()) { setFormError(t.errorPhone); return; }
    setFormError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/booking/vip-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          customerNote: customerNote.trim(),
          selectedStaffIds,
          selectedSkills: allSelectedSkills,   // ← NEW: pass skills to server
          duration: totalDuration,
          timeSlot,
          appointmentDate: appointmentDate || null,
          totalPrice,
          lang,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message || data.error || 'Failed to submit');
        setIsSubmitting(false);
        return;
      }

      setBookingCode(data.billCode || data.bookingId);
      setServerConfidence(data.confidence ?? 'NEEDS_CONFIRM');
      setServerWarnings(data.warnings ?? []);
      setIsSuccess(true);
    } catch (err) {
      setFormError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Success Screen ───────────────────────────────────────────────────────
  if (isSuccess) {
    const isConfirmed = serverConfidence === 'CONFIRMED';
    const isRisky = serverConfidence === 'RISKY';

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[80vh] px-8 text-center"
      >
        {/* Confidence Icon */}
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
          isConfirmed ? 'bg-emerald-500/20' : isRisky ? 'bg-red-500/20' : 'bg-amber-500/20'
        }`}>
          {isConfirmed ? (
            <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          ) : isRisky ? (
            <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
          ) : (
            <svg className="w-10 h-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
        </div>

        <h2 className="text-2xl font-serif italic text-[#e6c487] mb-2">{t.successTitle}</h2>

        {/* Confidence Badge */}
        <div className={`px-4 py-2 rounded-full text-xs font-bold tracking-wider uppercase mb-4 ${
          isConfirmed
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
            : isRisky
              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
        }`}>
          {isConfirmed ? '✅ Đặt lịch thành công' : isRisky ? '🔴 Cần xác nhận khẩn' : '⚠️ Tiệm sẽ liên hệ xác nhận'}
        </div>

        {bookingCode && (
          <div className="bg-[#1b1b1d] border border-[#e6c487]/30 rounded-2xl px-6 py-3 mb-4">
            <span className="text-[10px] text-[#998f81] uppercase tracking-wider block">Booking Code</span>
            <span className="text-lg font-bold text-[#e6c487] tracking-[0.1em]">{bookingCode}</span>
          </div>
        )}

        <p className="text-[#d0c5b5] text-sm mb-4 max-w-[300px]">{t.successMsg}</p>

        {/* Warnings */}
        {serverWarnings.length > 0 && (
          <div className="w-full max-w-[340px] bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 mb-6 text-left">
            {serverWarnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-300/80 leading-relaxed">{w}</p>
            ))}
          </div>
        )}

        <button onClick={onConfirm}
          className="px-10 py-4 rounded-full bg-[#e6c487] text-[#412d00] font-bold tracking-[0.1em] text-sm active:scale-95 duration-200 uppercase">
          {t.successBtn}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col pb-40"
    >
      {/* Hero Banner */}
      <div className="relative h-[160px] w-full overflow-hidden">
        <img src={CONFIRM_BG} alt="" className="w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#131315] via-[#131315]/60 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <span className="text-[10px] tracking-[0.3em] uppercase text-[#ffb597]">{t.heroSub}</span>
          <h2 className="text-2xl font-serif italic text-[#e4e2e4] mt-1">{t.heroTitle}</h2>
        </div>
      </div>

      {/* Booking Details */}
      <div className="px-6 mt-6 space-y-4">
        <h3 className="text-[11px] tracking-[0.2em] uppercase text-[#d0c5b5] flex items-center">
          <span className="w-8 h-px bg-[#4d463a] mr-3" />
          {t.bookingDetails}
        </h3>

        {/* Therapist */}
        <div className="flex items-center gap-4 bg-[#1b1b1d] p-4 rounded-2xl border border-[#4d463a]/20">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex -space-x-2">
              {selectedStaffInfoList.map(s => (
                s.avatarUrl
                  ? <img key={s.id} src={s.avatarUrl} alt={s.fullName} className="w-10 h-10 rounded-full border-2 border-[#131315] object-cover" />
                  : <div key={s.id} className="w-10 h-10 rounded-full border-2 border-[#131315] bg-[#2a2a2c] flex items-center justify-center text-[#e6c487] font-bold text-sm">{s.fullName.charAt(0)}</div>
              ))}
            </div>
            <div>
              <div className="text-[10px] text-[#998f81] tracking-wider uppercase">{t.therapists}</div>
              <div className="text-sm font-medium text-[#e4e2e4]">{selectedStaffInfoList.map(s => s.fullName).join(' & ')}</div>
            </div>
          </div>
        </div>

        {/* Duration & Price */}
        <div className="flex gap-3">
          <div className="flex-1 bg-[#1b1b1d] p-4 rounded-2xl border border-[#4d463a]/20 text-center">
            <div className="text-[10px] text-[#998f81] tracking-wider uppercase">{t.totalDuration}</div>
            <div className="text-lg font-bold text-[#e4e2e4] mt-1">{totalDuration} {t.mins}</div>
          </div>
          <div className="flex-1 bg-[#1b1b1d] p-4 rounded-2xl border border-[#e6c487]/20 text-center">
            <div className="text-[10px] text-[#e6c487] tracking-wider uppercase font-bold">{t.pricing}</div>
            <div className="text-lg font-bold text-[#e6c487] mt-1">{totalPrice.toLocaleString('vi-VN')}đ</div>
          </div>
        </div>

        {/* Schedule */}
        <div className="flex items-center gap-4 bg-[#1b1b1d] p-4 rounded-2xl border border-[#4d463a]/20">
          <div className="w-10 h-10 rounded-full bg-[#2a2a2c] flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-[#e6c487]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <div className="text-[10px] text-[#998f81] tracking-wider uppercase">{t.schedule}</div>
            <div className="text-sm font-medium text-[#e4e2e4]">
              {isBranch ? t.walkIn : `${timeSlot} (${totalDuration} ${t.mins})`}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Info Form */}
      <div className="px-6 mt-8 space-y-4">
        <h3 className="text-[11px] tracking-[0.2em] uppercase text-[#d0c5b5] flex items-center">
          <span className="w-8 h-px bg-[#4d463a] mr-3" />
          {t.customerInfo}
        </h3>
        <p className="text-[10px] text-[#998f81] -mt-2">{t.customerInfoDesc}</p>

        <input
          type="text"
          value={customerName}
          onChange={e => setCustomerName(e.target.value)}
          placeholder={t.namePlaceholder}
          className={INPUT_STYLE}
        />
        <input
          type="tel"
          value={customerPhone}
          onChange={e => setCustomerPhone(e.target.value)}
          placeholder={t.phonePlaceholder}
          className={INPUT_STYLE}
        />
        <input
          type="email"
          value={customerEmail}
          onChange={e => setCustomerEmail(e.target.value)}
          placeholder={t.emailPlaceholder}
          className={INPUT_STYLE}
        />
        <textarea
          value={customerNote}
          onChange={e => setCustomerNote(e.target.value)}
          placeholder={t.notePlaceholder}
          rows={3}
          className={`${INPUT_STYLE} resize-none`}
        />

        {/* Error message */}
        <AnimatePresence>
          {formError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm"
            >
              {formError}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Submit Button */}
      <div className="fixed bottom-6 left-6 right-6 z-40">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full py-5 rounded-full font-bold tracking-[0.12em] text-sm shadow-[0_15px_30px_rgba(0,0,0,0.4)] flex items-center justify-center gap-3 active:scale-95 duration-200 uppercase ${
            isSubmitting
              ? 'bg-[#998f81] text-[#412d00] cursor-wait'
              : 'bg-[#e6c487] text-[#412d00]'
          }`}
        >
          <span>{isSubmitting ? t.submitting : t.submitBtn}</span>
          {!isSubmitting && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          )}
        </button>
      </div>
    </motion.div>
  );
};

export default ConfirmationScreen;
