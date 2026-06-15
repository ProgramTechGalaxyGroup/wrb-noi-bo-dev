import React, { useState } from 'react';
import { ClipboardList, Clock, ArrowRight, Check, User, HeartPulse, Ban, AlertCircle, Calendar } from 'lucide-react';
import { CartItem } from '@/components/Menu/types';
import { formatCurrency } from '@/components/Menu/utils';
import { getBookingT } from './BookingCheckout.i18n';

interface BookingConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<string | void>;
    lang: string;
    dict: any; // Legacy dict for generic terms
    cart: CartItem[];
    customerInfo: {
        name: string;
        email: string;
        phone: string;
        gender: string;
    };
    paymentMethod: string;
    amountPaid: number;
    appointmentDate: string;
    timeSlot: string;
}

const UI_CONFIG = {
    MODAL_MAX_WIDTH: '480px',
    SUCCESS_MODAL_MAX_WIDTH: '400px',
    BORDER_RADIUS: '32px',
};

const getPaymentIcon = (method: string): string => {
    const icons: Record<string, string> = { cash_vnd: '💵', cash_usd: '💲', card: '💳', transfer: '📱' };
    return icons[method] || '💰';
};

export default function BookingConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    lang,
    dict,
    cart,
    customerInfo,
    paymentMethod,
    amountPaid,
    appointmentDate,
    timeSlot,
}: BookingConfirmModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const t = getBookingT(lang);

    if (!isOpen) return null;

    const totalVND = cart.reduce((sum, item) => sum + item.priceVND * item.qty, 0);
    const totalTime = cart.reduce((sum, item) => sum + item.timeValue * item.qty, 0);

    const handleConfirm = async () => {
        setIsSubmitting(true);
        try {
            await onConfirm();
            setSuccess(true);
            setIsSubmitting(false);
        } catch (error) {
            console.error("Submit error", error);
            setIsSubmitting(false);
        }
    };

    const handleDone = () => {
        window.location.href = `/${lang}`;
    };

    if (success) {
        return (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                <div 
                    className="bg-[#1c1c1e] border border-white/5 w-full p-8 shadow-2xl flex flex-col items-center text-center space-y-6 m-4 relative overflow-hidden animate-in zoom-in-95 duration-300"
                    style={{ maxWidth: UI_CONFIG.SUCCESS_MODAL_MAX_WIDTH, borderRadius: UI_CONFIG.BORDER_RADIUS }}
                >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#C9A96E]/20 rounded-full blur-3xl -z-10 opacity-50"></div>
                    <div className="w-20 h-20 bg-[#0d0d0d] rounded-full flex items-center justify-center mb-2 border-4 border-[#C9A96E]/30 shadow-inner">
                        <Check size={40} className="text-[#C9A96E]" strokeWidth={4} />
                    </div>
                    <h2 className="text-2xl font-bold text-white">
                        {lang === 'en' ? 'Booking Confirmed!' : 'Đặt Lịch Thành Công!'}
                    </h2>
                    <p className="text-[#998f81] text-sm">
                        {lang === 'en' ? 'We have received your appointment.' : 'Chúng tôi đã nhận được thông tin hẹn của bạn.'}
                    </p>

                    <div className="bg-[#0d0d0d] border border-[#C9A96E]/30 rounded-2xl p-4 space-y-2 w-full text-left">
                        <div className="flex items-center gap-2 text-[#C9A96E] font-bold mb-1 border-b border-white/10 pb-2">
                            <Calendar size={18} />
                            <span>{appointmentDate} | {timeSlot}</span>
                        </div>
                        <div className="flex justify-between text-sm text-white pt-1">
                            <span className="text-gray-400">{dict.checkout?.name || 'Name'}</span>
                            <span className="font-bold">{customerInfo.name}</span>
                        </div>
                        <div className="flex justify-between text-sm text-white">
                            <span className="text-gray-400">{dict.checkout?.total_bill || 'Total'}</span>
                            <span className="font-bold text-[#C9A96E]">{formatCurrency(totalVND)} VND</span>
                        </div>
                    </div>

                    <button
                        onClick={handleDone}
                        className="w-full py-4 rounded-xl font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(201,169,110,0.3)] hover:bg-[#b09461] transition-all active:scale-95 text-sm bg-[#C9A96E] text-black"
                    >
                        {lang === 'en' ? 'Return Home' : 'Về Trang Chủ'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in pb-0 sm:pb-0">
            <div
                className="bg-[#1c1c1e] border border-white/10 w-full max-h-[90vh] sm:h-auto rounded-t-[32px] shadow-2xl flex flex-col overflow-hidden relative animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300"
                style={{ maxWidth: UI_CONFIG.MODAL_MAX_WIDTH, borderRadius: UI_CONFIG.BORDER_RADIUS }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="pt-8 pb-4 flex flex-col items-center text-center px-6 bg-[#1c1c1e] shrink-0 z-10">
                    <div className="w-16 h-16 bg-[#0d0d0d] rounded-full flex items-center justify-center text-[#C9A96E] mb-4 border border-[#C9A96E]/30">
                        <ClipboardList size={32} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-wider">
                        {t.step_invoice_title}
                    </h2>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar space-y-6">
                    {/* Booking Time */}
                    <div className="bg-[#e6c487]/10 border border-[#e6c487]/30 rounded-2xl p-4 flex justify-between items-center">
                        <div className="flex items-center gap-3 text-[#e6c487]">
                            <Calendar size={24} />
                            <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">{t.invoice_time}</div>
                                <div className="text-lg font-bold">{appointmentDate}</div>
                            </div>
                        </div>
                        <div className="text-2xl font-black text-[#e6c487]">{timeSlot}</div>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-4 space-y-2">
                        <div className="text-[11px] font-bold text-[#C9A96E] uppercase tracking-wider mb-2">{dict.checkout?.customer_details || 'Customer Details'}</div>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-gray-400 font-medium">{dict.checkout?.name || 'Name'}</span><span className="font-bold text-[#C9A96E]">{customerInfo.name}</span></div>
                            <div className="flex justify-between"><span className="text-gray-400 font-medium">{dict.checkout?.phone || 'Phone'}</span><span className="font-bold text-[#C9A96E]">{customerInfo.phone || '-'}</span></div>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-4">
                        <div className="text-[11px] font-bold text-[#C9A96E] uppercase tracking-wider mb-3">
                            {dict.checkout?.order_summary || 'Order Summary'}
                        </div>
                        <div className="space-y-3">
                            {cart.map((item, idx) => (
                                <div key={item.cartId} className="flex justify-between items-start border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                    <div className="font-bold text-white text-[14px]">
                                        {idx + 1}. {item.names[lang] || item.names.en} {item.qty > 1 && `(x${item.qty})`}
                                    </div>
                                    <div className="font-bold text-[#C9A96E] text-[14px]">{formatCurrency(item.priceVND * item.qty)}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-5 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-white text-lg">{dict.checkout?.total_bill || 'Total'}</span>
                            <span className="font-bold text-[#C9A96E] text-xl">{formatCurrency(totalVND)} VND</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-[#1c1c1e] border-t border-white/10 flex gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 py-3.5 rounded-xl border border-[#3f3f46] text-gray-400 font-bold uppercase text-sm tracking-widest hover:bg-white/5 transition-colors"
                    >
                        {dict.checkout?.cancel || 'Cancel'}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className="flex-[1.5] bg-[#C9A96E] text-white py-3.5 rounded-xl font-bold uppercase text-sm tracking-widest shadow-[0_0_15px_rgba(201,169,110,0.3)] hover:bg-[#b09461] transition-all flex items-center justify-center gap-2"
                    >
                        <span>
                            {isSubmitting ? (lang === 'en' ? 'Processing...' : 'Đang Xử Lý...') : t.btn_confirm}
                        </span>
                        {!isSubmitting && <ArrowRight size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
}
