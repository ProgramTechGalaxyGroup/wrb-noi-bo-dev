import React, { useEffect, useState } from 'react';
import { X, ClipboardList, Clock, ArrowRight, Check, User, HeartPulse, Ban, GripHorizontal, AlertCircle, Phone, Mail, Hand, Building2, MapPin } from 'lucide-react';
import { CartItem } from '@/components/Menu/types';
import { formatCurrency } from '@/components/Menu/utils';
import { createClient } from '@/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import AlertModal from '@/components/Shared/AlertModal';
import { type VatInvoiceData } from '@/components/Checkout/VatInvoiceSection';

// 🔧 UI CONFIGURATION
const UI_CONFIG = {
    MODAL_MAX_WIDTH: '480px',
    SUCCESS_MODAL_MAX_WIDTH: '400px',
    BORDER_RADIUS: '32px',
    REDIRECT_DELAY: 1500,
    COUNTDOWN_INTERVAL: 700,
    ESTIMATED_START_OFFSET: 15, // minutes
    ANIMATION_DURATION: '300ms',
    TABLET_RESET_SECONDS: 180, // Auto-reset countdown for tablet (3 phút)
    QR_SIZE: 200,
    JOURNEY_BASE_URL: 'https://nganha.vercel.app',
};

// 🔧 Payment method → emoji icon mapping (language-agnostic for receptionist)
const PAYMENT_ICONS: Record<string, string> = {
    cash_vnd: '💵',
    cash_usd: '💲',
    card: '💳',
    transfer: '📱',
};
const getPaymentIcon = (method: string): string => PAYMENT_ICONS[method] || '💰';

interface OrderConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: any) => any;
    lang: string;
    dict: any; // Accept dict
    cart: CartItem[];
    customerInfo: {
        name: string;
        email: string;
        phone: string;
        gender: string;
    };
    paymentMethod: string; // code (e.g. 'cash_vnd')
    amountPaid: number;
    vatInvoice?: VatInvoiceData | null;
}

const OrderConfirmModal: React.FC<OrderConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    lang,
    dict,
    cart,
    customerInfo,
    paymentMethod,
    amountPaid,
    vatInvoice,
}) => {
    // 1. Move all hooks to the top (React requirement)
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [bookingId, setBookingId] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(2); // Countdown display
    const [isTabletDevice, setIsTabletDevice] = useState(false);
    const [tabletResetCountdown, setTabletResetCountdown] = useState(UI_CONFIG.TABLET_RESET_SECONDS);
    const [alertState, setAlertState] = useState<{ isOpen: boolean; message: string; type?: 'error' | 'success' | 'info' }>({ isOpen: false, message: '' });

    // Check if current device is a registered Tablet
    useEffect(() => {
        const checkDevice = async () => {
            const deviceId = localStorage.getItem('REGISTERED_DEVICE_ID');
            if (!deviceId) return;
            try {
                const supabase = createClient();
                const { data } = await supabase
                    .from('RegisteredDevices')
                    .select('id')
                    .eq('device_id', deviceId)
                    .eq('is_active', true)
                    .single();
                if (data) setIsTabletDevice(true);
            } catch { /* not a tablet */ }
        };
        checkDevice();
    }, []);

    // --- Helper Functions (Hoisted or defined before use) ---
    const handleDone = () => {
        if (bookingId) {
            window.location.href = `/${lang}/journey/${bookingId}`;
        } else {
            window.location.reload();
        }
    };

    const handleTabletReset = () => {
        // Reset tablet to home page for next customer
        window.location.href = '/';
    };

    // Auto-redirect effect (for NON-tablet devices)
    useEffect(() => {
        if (success && bookingId && !isTabletDevice) {
            const timer = setTimeout(() => {
                handleDone();
            }, UI_CONFIG.REDIRECT_DELAY);

            const interval = setInterval(() => {
                setCountdown(prev => Math.max(0, prev - 1));
            }, UI_CONFIG.COUNTDOWN_INTERVAL);

            return () => {
                clearTimeout(timer);
                clearInterval(interval);
            };
        }
    }, [success, bookingId, lang, isTabletDevice]);

    // Auto-reset countdown for TABLET devices
    useEffect(() => {
        if (success && bookingId && isTabletDevice) {
            const interval = setInterval(() => {
                setTabletResetCountdown(prev => {
                    if (prev <= 1) {
                        handleTabletReset();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [success, bookingId, isTabletDevice]);

    // Prevent interaction if closed - This MUST be after hooks but before JSX
    if (!isOpen) return null;

    // Calculations
    const totalVND = cart.reduce((sum, item) => sum + item.priceVND * item.qty, 0);
    const changeAmount = amountPaid - totalVND;
    const totalTime = cart.reduce((sum, item) => sum + item.timeValue * item.qty, 0);

    // Collect all tags for General Notes
    const allTags = cart.reduce((acc: string[], item) => {
        const itemTags = [
            item.options?.notes?.tag0 ? 'Pregnant' : null,
            item.options?.notes?.tag1 ? 'Allergy' : null
        ].filter(Boolean) as string[];
        return [...acc, ...itemTags];
    }, []);
    const uniqueTags = Array.from(new Set(allTags));

    // Times (Estimated)
    const now = new Date();
    const startTimeComp = new Date(now.getTime() + UI_CONFIG.ESTIMATED_START_OFFSET * 60000);
    const endTimeComp = new Date(startTimeComp.getTime() + totalTime * 60000);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); // 24h format HH:mm
    };

    const handleConfirm = async () => {
        setSuccess(true); // Switch to success UI immediately
        setIsSubmitting(true);
        try {
            const returnedId = await onConfirm({});
            if (returnedId) setBookingId(returnedId);
            // SUCCESS is already true
        } catch (error) {
            console.error("Submit error", error);
            setAlertState({
                isOpen: true,
                message: dict.checkout.alerts?.order_error || "Error sending order. Please try again.",
                type: 'error'
            });
            setIsSubmitting(false);
            setSuccess(false); // Revert if error
        }
    };
    if (success) {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : UI_CONFIG.JOURNEY_BASE_URL;
        const journeyUrl = `${baseUrl}/${lang}/journey/${bookingId}`;

        // === TABLET MODE: Show QR Code ===
        if (isTabletDevice && bookingId) {
            return (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
                    <div
                        className="w-full max-w-lg p-8 flex flex-col items-center text-center space-y-6 m-4 animate-in zoom-in-95 duration-300"
                        style={{ borderRadius: UI_CONFIG.BORDER_RADIUS }}
                    >
                        {/* Success Check */}
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center border-4 border-green-500/30">
                            <Check size={40} className="text-green-400" strokeWidth={4} />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {dict.checkout.order_submitted || 'Order Submitted!'}
                            </h2>
                            <p className="text-indigo-300 text-sm">
                                {dict.checkout.scan_qr || 'Scan QR code to track your service on your phone'}
                            </p>
                        </div>

                        {/* QR Code */}
                        <div className="bg-white p-6 rounded-3xl shadow-2xl shadow-indigo-500/20">
                            <QRCodeSVG
                                value={journeyUrl}
                                size={UI_CONFIG.QR_SIZE}
                                level="H"
                                includeMargin={true}
                                imageSettings={{
                                    src: '/logo.png',
                                    x: undefined,
                                    y: undefined,
                                    height: 40,
                                    width: 40,
                                    excavate: true,
                                }}
                            />
                        </div>

                        {/* Timer Reminder for Customer */}
                        <p className="text-indigo-200/80 text-xs text-center leading-relaxed max-w-sm px-2 mt-1">
                            {dict.checkout.qr_timer_reminder || 'Scan the QR code above to track your journey.'}
                        </p>

                        {/* Info */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-indigo-300">{dict.checkout.total_bill || 'Total'}</span>
                                <span className="font-bold text-amber-400 text-lg">{formatCurrency(totalVND)} VND</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex gap-2 items-center text-indigo-300">
                                    <Clock size={16} />
                                    <span>{dict.checkout?.time || (lang === 'en' ? 'Time' : 'Thời gian')}</span>
                                </div>
                                <span className="font-bold text-white">{totalTime} {dict.checkout?.mins || (lang === 'vi' ? 'phút' : 'mins')}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm pt-2 mt-2 border-t border-white/10">
                                <span className="text-indigo-300">{dict.checkout?.payment_method || (lang === 'en' ? 'Payment Method' : 'Thanh toán')}</span>
                                <span className="font-bold text-white uppercase flex items-center gap-1.5">
                                    <span className="text-base">{getPaymentIcon(paymentMethod)}</span>
                                    {dict.payment_methods?.[paymentMethod] || paymentMethod || 'Cash'}
                                </span>
                            </div>
                        </div>

                        {/* Auto-reset countdown */}
                        <div className="space-y-3 w-full">
                            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-linear"
                                    style={{ width: `${(tabletResetCountdown / UI_CONFIG.TABLET_RESET_SECONDS) * 100}%` }}
                                />
                            </div>
                            <p className="text-xs text-indigo-400">
                                {dict.checkout.screen_resets_in || 'Screen resets in'} <span className="font-bold text-white">{tabletResetCountdown}s</span>
                            </p>
                        </div>

                        <button
                            onClick={handleTabletReset}
                            className="text-indigo-400 text-sm font-medium hover:text-white transition-colors"
                        >
                            {dict.checkout.reset_now || '<- Reset now'}
                        </button>
                    </div>
                </div>
            );
        }

        // === NORMAL MODE: Auto-redirect to Journey ===
        return (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                <div 
                    className="bg-[#1c1c1e] border border-white/5 w-full p-8 shadow-2xl flex flex-col items-center text-center space-y-6 m-4 relative overflow-hidden animate-in zoom-in-95 duration-300"
                    style={{ maxWidth: UI_CONFIG.SUCCESS_MODAL_MAX_WIDTH, borderRadius: UI_CONFIG.BORDER_RADIUS }}
                >
                    {/* Gold Glow Background */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#C9A96E]/20 rounded-full blur-3xl -z-10 opacity-50"></div>

                    <div className="w-20 h-20 bg-[#0d0d0d] rounded-full flex items-center justify-center mb-2 animate-in zoom-in duration-500 border-4 border-[#C9A96E]/30 shadow-inner">
                        <Check size={40} className="text-[#C9A96E]" strokeWidth={4} />
                    </div>

                    <h2 className="text-2xl font-bold text-white">
                        {dict.checkout.order_submitted}
                    </h2>

                    <div className="w-full space-y-4">
                        {/* Summary Card for Success - LIST ALL ITEMS */}
                        <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-4 shadow-sm space-y-3 text-left max-h-[30vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-3">
                                {cart.map((item, idx) => (
                                    <div key={item.cartId || idx} className="flex justify-between items-start border-b border-white/5 pb-2 last:border-0 last:pb-0">
                                        <div className="font-bold text-white pr-4">
                                            {idx + 1}. {item.names?.[lang] || item.names?.en || 'Service'}
                                            {item.qty > 1 && <span className="text-gray-500 text-xs ml-2">x{item.qty}</span>}
                                        </div>
                                        <div className="font-bold text-[#C9A96E] shrink-0">{formatCurrency(item.priceVND * item.qty)} VND</div>
                                    </div>
                                ))}
                            </div>

                            {/* Payment Totals */}
                            <div className="pt-2 mt-2 border-t border-white/5 space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-400 font-medium">{dict.checkout.payment_method}</span>
                                    <span className="font-bold text-white uppercase flex items-center gap-1">
                                        <span>{getPaymentIcon(paymentMethod)}</span>
                                        {dict.payment_methods?.[paymentMethod] || 'Cash'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400 font-bold">{dict.checkout.total_bill}</span>
                                    <span className="font-bold text-[#C9A96E] text-lg">{formatCurrency(totalVND)} VND</span>
                                </div>
                            </div>
                        </div>
                        {/* Expected Time Card */}
                        <div className="bg-[#0d0d0d] border border-[#C9A96E]/30 rounded-2xl p-4 space-y-2">
                            <div className="text-[10px] font-bold text-[#C9A96E] uppercase tracking-wider mb-2">{dict.checkout.expected_time}</div>
                            <div className="flex justify-between text-sm font-bold text-[#C9A96E] opacity-90">
                                <span>{dict.checkout.start_time}</span>
                                <span>{formatTime(startTimeComp)}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold text-[#C9A96E] opacity-90">
                                <span>{dict.checkout.end_time}</span>
                                <span>{formatTime(endTimeComp)}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleDone}
                        disabled={!bookingId}
                        className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest shadow-lg transition-all active:scale-95 text-sm flex items-center justify-center gap-2 ${bookingId ? 'bg-[#C9A96E] text-black shadow-[0_0_15px_rgba(201,169,110,0.3)] hover:bg-[#b09461]' : 'bg-[#1c1c1e] text-gray-500 border border-white/5 opacity-90'}`}
                    >
                        <span>
                            {!bookingId 
                                ? (dict.checkout.alerts?.submitting || 'Submitting...') 
                                : (dict.checkout.alerts?.redirecting || 'Redirecting...')
                            }
                        </span>
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    </button>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        {!bookingId 
                            ? (dict.checkout.alerts?.processing_wait || 'Please wait while we process your order')
                            : (dict.checkout.alerts?.auto_redirect || 'Auto-redirecting in a few seconds')
                        }
                    </p>

                </div>
            </div>
        );
    }

    const formatParts = (parts: string[]) => {
        if (parts.length >= 8) {
            return dict.custom_for_you?.full_body || 'Full Body';
        }
        return parts.map(p => {
            // @ts-ignore
            return dict.body_parts?.[p.toLowerCase()] || dict.body_parts?.[p] || p;
        }).join(', ');
    };

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
                    <h2 className="text-2xl font-bold text-white">
                        {dict.checkout.modal_title}
                    </h2>
                    <p className="text-sm text-gray-400 mt-1 font-medium">
                        {dict.checkout.review_text}
                    </p>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar space-y-6 min-h-0">

                    {/* Customer Details */}
                    <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-4 space-y-2">
                        <div className="text-[11px] font-bold text-[#C9A96E] uppercase tracking-wider mb-2">{dict.checkout.customer_details}</div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400 font-medium">{dict.checkout.name}</span>
                                <span className="font-bold text-[#C9A96E]">{customerInfo.name || 'Guest'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400 font-medium">{dict.checkout.email_label}</span>
                                <span className="font-bold text-[#C9A96E] truncate max-w-[200px]">{customerInfo.email || '-'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400 font-medium">{dict.checkout.gender_label}</span>
                                <span className="font-bold text-[#C9A96E]">{customerInfo.gender || 'Unknown'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div>
                        <div className="flex justify-between items-center mb-3 px-1">
                            <span className="text-[11px] font-bold text-[#C9A96E] uppercase tracking-wider">{dict.checkout.order_summary}</span>
                            <span className="bg-white/10 text-white text-[10px] font-bold px-2 py-1 rounded-full border border-white/5">{cart.length} {dict.checkout.items}</span>
                        </div>

                        <div className="space-y-3">
                            {cart.map((item, idx) => {
                                const strength = item.options?.strength;
                                const therapist = item.options?.therapist;
                                const focus = item.options?.bodyParts?.focus || [];
                                const avoid = item.options?.bodyParts?.avoid || [];
                                // ...

                                const tags = [
                                    item.options?.notes?.tag0 ? (dict.tags?.pregnant || 'Pregnant') : null,
                                    item.options?.notes?.tag1 ? (dict.tags?.allergy || 'Allergy') : null
                                ].filter(Boolean) as string[];

                                const getStrengthColor = (s: string) => {
                                    return 'text-[#C9A96E]';
                                };
                                const getTherapistColor = (t: string) => {
                                    return 'text-[#C9A96E]';
                                };

                                return (
                                    <div key={item.cartId} className="border border-white/5 rounded-2xl p-4 shadow-sm bg-[#0d0d0d]">
                                        {/* Name & Price */}
                                        <div className="flex justify-between items-start mb-1 gap-2">
                                            <span className="font-bold text-white text-[15px] truncate flex-1">{idx + 1}. {item.names[lang] || item.names.en}</span>
                                            <span className="font-bold text-white text-[15px] shrink-0">{formatCurrency(item.priceVND * item.qty)} VND</span>
                                        </div>
                                        {/* Attributes */}
                                        <div className="space-y-2">
                                            {/* Duration */}
                                            {(item.timeValue > 0 || item.timeDisplay) && (
                                                <div className="flex justify-between items-center text-sm">
                                                    <div className="flex gap-2 items-center">
                                                        <div className="w-5 flex justify-center"><Clock size={16} className="text-gray-400" /></div>
                                                        <span className="font-medium text-gray-400">{dict.checkout?.time || (lang === 'en' ? 'Time' : 'Thời gian')}</span>
                                                    </div>
                                                    <span className="font-bold text-[#C9A96E]">
                                                        {item.timeDisplay 
                                                            ? item.timeDisplay.replace('mins', dict.checkout?.mins || (lang === 'vi' ? 'phút' : 'mins'))
                                                            : `${item.timeValue} ${dict.checkout?.mins || (lang === 'vi' ? 'phút' : 'mins')}`
                                                        }
                                                    </span>
                                                </div>
                                            )}

                                            {/* Strength */}
                                            <div className="flex justify-between items-center text-sm">
                                                <div className="flex gap-2 items-center">
                                                    <div className="w-5 flex justify-center"><Hand size={16} className="text-gray-400" /></div>
                                                    <span className="font-medium text-gray-400">{dict.checkout.strength}</span>
                                                </div>
                                                <span className={`font-bold capitalize ${getStrengthColor(strength || '')}`}>
                                                    {/* @ts-ignore */}
                                                    {dict.options?.strength_levels?.[strength?.toLowerCase()] || strength || 'Medium'}
                                                </span>
                                            </div>
                                            {/* Therapist */}
                                            <div className="flex justify-between items-center text-sm">
                                                <div className="flex gap-2 items-center">
                                                    <div className="w-5 flex justify-center"><User size={16} className="text-gray-400" /></div>
                                                    <span className="font-medium text-gray-400">{dict.checkout.therapist}</span>
                                                </div>
                                                <span className={`font-bold capitalize ${getTherapistColor(therapist || '')}`}>
                                                    {/* @ts-ignore */}
                                                    {dict.options?.therapist_options?.[therapist?.toLowerCase()] || therapist || 'Random'}
                                                </span>
                                            </div>
                                            {/* Avoid */}
                                            {avoid.length > 0 && (
                                                <div className="flex justify-between items-start text-sm">
                                                    <div className="flex gap-2 items-center shrink-0 mt-0.5">
                                                        <div className="w-5 flex justify-center"><Ban size={16} className="text-gray-400" /></div>
                                                        <span className="font-medium text-gray-400">{dict.checkout.avoid}</span>
                                                    </div>
                                                    <span className="text-[#C9A96E] font-bold leading-tight mt-0.5 text-right w-2/3">
                                                        {formatParts(avoid)}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Focus */}
                                            {focus.length > 0 && (
                                                <div className="flex justify-between items-start text-sm">
                                                    <div className="flex gap-2 items-center shrink-0 mt-0.5">
                                                        <div className="w-5 flex justify-center"><HeartPulse size={16} className="text-gray-400" /></div>
                                                        <span className="font-medium text-gray-400">{dict.checkout.focus}</span>
                                                    </div>
                                                    <span className="text-[#C9A96E] font-bold leading-tight mt-0.5 text-right w-2/3">
                                                        {formatParts(focus)}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Tags & Note Content - Footer */}
                                            {(tags.length > 0 || item.options?.notes?.content) && (
                                                <div className="mt-2 pt-2 border-t border-white/5 flex flex-col gap-2">
                                                    {/* Tags */}
                                                    {tags.length > 0 && (
                                                        <div className="flex justify-end gap-2">
                                                            {tags.map(tag => (
                                                                <span key={tag} className="bg-[#C9A96E]/20 text-[#C9A96E] text-[10px] px-2 py-1 rounded border border-[#C9A96E]/30 font-bold uppercase">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* Note Content */}
                                                    {item.options?.notes?.content && (
                                                        <div className="flex justify-between gap-4 text-xs italic text-gray-400 mt-1">
                                                            <span className="shrink-0">{dict.history?.note_label || 'Note'}</span>
                                                            <span className="text-right text-[#C9A96E] font-medium not-italic">{item.options.notes.content}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-5 space-y-3">
                        <div className="flex justify-between text-sm text-gray-400 mb-2">
                            <span>{dict.checkout.payment_method}</span>
                            <span className="font-bold text-[#C9A96E] uppercase flex items-center gap-1.5">
                                <span className="text-base">{getPaymentIcon(paymentMethod)}</span>
                                {dict.payment_methods?.[paymentMethod] || dict.payment_methods?.cash_vnd || 'Cash (VND)'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-gray-400 mb-4 border-b border-white/5 pb-3">
                            <div className="flex gap-2 items-center">
                                <Clock size={16} className="text-gray-400" />
                                <span>{dict.checkout?.time || (lang === 'en' ? 'Time' : 'Thời gian')}</span>
                            </div>
                            <span className="font-bold text-[#C9A96E]">{totalTime} {dict.checkout?.mins || (lang === 'vi' ? 'phút' : 'mins')}</span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="font-bold text-white text-lg">{dict.checkout.total_bill}</span>
                            <span className="font-bold text-[#C9A96E] text-xl">{formatCurrency(totalVND)} VND</span>
                        </div>
                        {amountPaid > 0 && (
                            <>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-400">{dict.checkout.amount_paid}</span>
                                    <span className="font-bold text-[#b09461]">{formatCurrency(amountPaid)} VND</span>
                                </div>
                                <div className="flex justify-between items-center text-base pt-1">
                                    <span className="font-bold text-gray-400">{dict.checkout.change_due}</span>
                                    <span className={`font-bold ${changeAmount >= 0 ? 'text-[#C9A96E]' : 'text-red-500'}`}>
                                        {changeAmount >= 0
                                            ? <span>{formatCurrency(changeAmount)} VND</span>
                                            : <span>{dict.checkout.missing} {formatCurrency(Math.abs(changeAmount))} VND</span>
                                        }
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* General Notes Alert */}
                    {uniqueTags.length > 0 && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-3">
                            <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <span className="font-bold text-red-500 block mb-1">{dict.checkout.general_notes}</span>
                                <div className="flex flex-wrap gap-2">
                                    {uniqueTags.map(tag => (
                                        <span key={tag} className="text-red-600 font-medium flex items-center gap-1">
                                            {/* Look up tag name again to be safe/consistent */}
                                            {(tag === 'Pregnant' || tag === (dict.tags?.pregnant)) ? (dict.tags?.pregnant) : (dict.tags?.allergy)} {tag.includes('Pregnant') || tag === dict.tags?.pregnant ? '🤰' : '⚠️'}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VAT Invoice Info */}
                    {vatInvoice && (
                        <div className="bg-[#0d0d0d] border border-[#C9A96E]/20 rounded-2xl p-4 space-y-3">
                            <div className="text-[11px] font-bold text-[#C9A96E] uppercase tracking-wider">
                                {dict.vat_invoice?.invoice_info_title || (lang === 'vi' ? 'Thông tin xuất hoá đơn' : 'VAT Invoice Info')}
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-start gap-2">
                                    <Building2 size={16} className="text-[#C9A96E] mt-0.5 shrink-0" />
                                    <span className="text-white font-semibold text-sm">{vatInvoice.companyName}</span>
                                </div>
                                {vatInvoice.companyAddress && (
                                    <div className="flex items-start gap-2">
                                        <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                        <span className="text-gray-300 text-sm">{vatInvoice.companyAddress}</span>
                                    </div>
                                )}
                                {vatInvoice.companyEmail && (
                                    <div className="flex items-start gap-2">
                                        <Mail size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                        <span className="text-gray-300 text-sm">{vatInvoice.companyEmail}</span>
                                    </div>
                                )}
                                {vatInvoice.companyPhone && (
                                    <div className="flex items-start gap-2">
                                        <Phone size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                        <span className="text-gray-300 text-sm">{vatInvoice.companyPhone}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 pt-1">
                                    <span className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">MST</span>
                                    <span className="text-[#C9A96E] text-sm font-mono font-bold bg-[#C9A96E]/10 px-2 py-0.5 rounded-lg">
                                        {vatInvoice.taxCode}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Expected Time (Bottom Location) */}
                    <div className="bg-[#0d0d0d] border border-[#C9A96E]/30 rounded-2xl p-4 space-y-2">
                        <div className="text-[10px] font-bold text-[#C9A96E] uppercase tracking-wider mb-2">{dict.checkout.expected_time}</div>
                        <div className="flex justify-between text-sm font-bold text-[#C9A96E] opacity-90">
                            <span>{dict.checkout.start_time}</span>
                            <span>{formatTime(startTimeComp)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-bold text-[#C9A96E] opacity-90">
                            <span>{dict.checkout.end_time}</span>
                            <span>{formatTime(endTimeComp)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-[#1c1c1e] border-t border-white/10 flex gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 py-3.5 rounded-xl border border-[#3f3f46] text-gray-400 font-bold uppercase text-sm tracking-widest hover:bg-white/5 transition-colors"
                    >
                        {dict.checkout.cancel}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                        className="flex-[1.5] bg-[#C9A96E] text-white py-3.5 rounded-xl font-bold uppercase text-sm tracking-widest shadow-[0_0_15px_rgba(201,169,110,0.3)] hover:bg-[#b09461] transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                    >
                        <span>{dict.checkout.submit}</span>
                        {!isSubmitting && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" strokeWidth={3} />}
                    </button>
                </div>
            </div>

            {/* Alert Modal Overlay */}
            <AlertModal
                isOpen={alertState.isOpen}
                message={alertState.message}
                type={alertState.type}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                lang={lang}
            />
        </div>
    );
};

export default OrderConfirmModal;
