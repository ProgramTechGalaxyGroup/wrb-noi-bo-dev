'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBookingT, BookingTranslationKey } from './BookingCheckout.i18n';

interface BookingTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: string;
}

export default function BookingTermsModal({ isOpen, onClose, lang }: BookingTermsModalProps) {
  const t = getBookingT(lang);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center bg-black/60 backdrop-blur-sm p-4 sm:p-0">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-[#1b1b1d] w-full max-w-lg rounded-[32px] overflow-hidden border border-[#4d463a]/30 shadow-2xl flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-[#4d463a]/20 bg-[#131315]">
              <h2 className="text-xl font-bold text-[#e6c487] tracking-wider uppercase font-serif">
                {t.step_terms_title || 'Điều Khoản & Chính Sách'}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-[#d0c5b5] hover:bg-white/10 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar text-[#d0c5b5] space-y-6 text-sm leading-relaxed">
              <section>
                <h3 className="text-[#e6c487] font-bold mb-2 uppercase tracking-wide text-xs">1. {lang === 'en' ? 'Arrival Time' : 'Thời gian có mặt'}</h3>
                <p>{lang === 'en' ? 'Please arrive 10-15 minutes prior to your scheduled appointment to allow time for check-in and preparation.' : 'Quý khách vui lòng đến trước 10-15 phút so với giờ hẹn để làm thủ tục và chuẩn bị.'}</p>
              </section>
              <section>
                <h3 className="text-[#e6c487] font-bold mb-2 uppercase tracking-wide text-xs">2. {lang === 'en' ? 'Late Arrival' : 'Đến trễ'}</h3>
                <p>{lang === 'en' ? 'If you arrive late, your service time may be shortened to ensure the next customer is not delayed, and full charges will apply.' : 'Nếu quý khách đến trễ, thời gian dịch vụ có thể bị rút ngắn để đảm bảo không ảnh hưởng đến khách hàng tiếp theo. Phí dịch vụ vẫn tính đủ.'}</p>
              </section>
              <section>
                <h3 className="text-[#e6c487] font-bold mb-2 uppercase tracking-wide text-xs">3. {lang === 'en' ? 'Cancellation' : 'Hủy lịch'}</h3>
                <p>{lang === 'en' ? 'Please notify us at least 2 hours in advance if you need to cancel or reschedule your appointment.' : 'Vui lòng thông báo cho chúng tôi trước ít nhất 2 giờ nếu quý khách muốn hủy hoặc dời lịch.'}</p>
              </section>
              <section>
                <h3 className="text-[#e6c487] font-bold mb-2 uppercase tracking-wide text-xs">4. {lang === 'en' ? 'Payment' : 'Thanh toán'}</h3>
                <p>{lang === 'en' ? 'We accept cash and credit cards. Prices are subject to change without prior notice.' : 'Chúng tôi chấp nhận thanh toán bằng tiền mặt hoặc thẻ tín dụng. Giá dịch vụ có thể thay đổi mà không cần báo trước.'}</p>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 bg-[#131315] border-t border-[#4d463a]/20">
              <button
                onClick={onClose}
                className="w-full py-4 rounded-xl bg-[#e6c487] text-[#412d00] font-bold uppercase tracking-widest hover:bg-[#d4b47a] transition-colors"
              >
                {t.bc_close || 'Đóng'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
