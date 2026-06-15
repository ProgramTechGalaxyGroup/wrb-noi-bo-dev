'use client';

import React, { use, useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMenuData } from '@/components/Menu/MenuContext';
import { useAuthStore } from '@/lib/authStore.logic';

import CheckoutHeader from '@/components/Checkout/CheckoutHeader';
import CustomerInfo from '@/components/Checkout/CustomerInfo';
import Invoice from '@/components/Checkout/Invoice';
import PaymentModal from '@/components/Checkout/PaymentModal';
import CustomForYouModal from '@/components/CustomForYou';
import AlertModal from '@/components/Shared/AlertModal';
import { ServiceOptions, CartItem } from '@/components/Menu/types';
import { getDictionary } from '@/lib/dictionaries';

import BookingTimePicker from '@/components/Booking/BookingTimePicker';
import BookingTermsModal from '@/components/Booking/BookingTermsModal';
import BookingConfirmModal from '@/components/Booking/BookingConfirmModal';
import { getBookingT } from '@/components/Booking/BookingCheckout.i18n';

// 🔧 UI CONFIGURATION
const PAGE_CONFIG = {
    BOTTOM_PADDING: 'pb-32',
    ANIMATION_DURATION: 'duration-500',
    MAX_WIDTH: 'max-w-6xl',
    BG_COLOR: 'bg-[#0d0d0d]',
    TEXT_COLOR: 'text-white'
};

export default function BookingCheckoutPage({ params }: { params: Promise<{ lang: string }> }) {
    const router = useRouter();
    const { cart, updateCartItemOptions, customerInfo, updateCustomerInfo, resetCustomerInfo, clearCart } = useMenuData();
    const { user, isAuthUser } = useAuthStore();

    // Unwrap params
    const { lang: rawLang } = use(params);
    const [activeLang, setActiveLang] = useState(rawLang);
    const [originalLang] = useState(rawLang);

    const dict = getDictionary(activeLang);
    const t = getBookingT(activeLang);

    // --- STATE ---
    // Booking specific
    const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [isAgreedTerms, setIsAgreedTerms] = useState(false);

    // Payment
    const [paymentMethod, setPaymentMethod] = useState('');
    const [amountPaid, setAmountPaid] = useState<string>('');
    const [changeDenominations, setChangeDenominations] = useState<number[]>([]);

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);
    const [alertState, setAlertState] = useState<{ isOpen: boolean; message: string; type?: 'error' | 'success' | 'info' }>({ isOpen: false, message: '' });

    // --- COMPUTED ---
    const currency = useMemo(() => paymentMethod === 'cash_usd' ? 'USD' : 'VND', [paymentMethod]);
    const totalVND = useMemo(() => cart.reduce((sum, item) => sum + item.priceVND * item.qty, 0), [cart]);
    const totalUSD = useMemo(() => cart.reduce((sum, item) => sum + item.priceUSD * item.qty, 0), [cart]);

    // --- EFFECTS ---
    useEffect(() => {
        if (!cart || cart.length === 0) {
            router.push('/');
        }
    }, [cart, router]);

    useEffect(() => {
        if (isAuthUser && user) {
            const authName = user.user_metadata?.full_name || user.user_metadata?.name || '';
            if (!customerInfo.name && authName) updateCustomerInfo('name', authName);
            if (!customerInfo.email && user.email) updateCustomerInfo('email', user.email);
            if (!customerInfo.phone && user.phone) updateCustomerInfo('phone', user.phone);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthUser, user]);

    const handleBack = () => {
        router.back();
    };

    const handleCustomRequest = (item: CartItem) => {
        if (item.itemType === 'vip') return;
        setSelectedCartItem(item);
        setIsModalOpen(true);
    };

    const handleSaveCustomRequest = (options: ServiceOptions) => {
        if (selectedCartItem) {
            updateCartItemOptions(selectedCartItem.cartId, options);
            setIsModalOpen(false);
        }
    };

    const handleCustomerChange = (field: string, value: string) => {
        updateCustomerInfo(field, value);
    };

    const handleProceedToPayment = () => {
        // Validations
        if (!customerInfo.name.trim()) {
            setAlertState({ isOpen: true, message: t.error_incomplete || 'Vui lòng điền tên khách hàng', type: 'error' });
            return;
        }
        if (!customerInfo.phone.trim()) {
            setAlertState({ isOpen: true, message: t.error_incomplete || 'Vui lòng điền số điện thoại', type: 'error' });
            return;
        }
        if (!customerInfo.email.trim()) {
            setAlertState({ isOpen: true, message: t.error_incomplete || 'Vui lòng điền email', type: 'error' });
            return;
        }
        if (!selectedDateStr || !selectedSlot) {
            setAlertState({ isOpen: true, message: t.error_incomplete || 'Vui lòng chọn ngày và giờ hẹn', type: 'error' });
            return;
        }
        // Mở payment modal (có thể chọn thanh toán sau - cash)
        setIsPaymentModalOpen(true);
    };

    const handlePaymentNext = (data: { paymentMethod: string; amountPaid: string; changeDenominations: number[] }) => {
        setPaymentMethod(data.paymentMethod);
        setAmountPaid(data.amountPaid);
        setChangeDenominations(data.changeDenominations);
        setIsPaymentModalOpen(false);
        setTimeout(() => setIsConfirmOpen(true), 300);
    };

    const handleFinalSubmit = async () => {
        const payload = {
            customer: customerInfo,
            items: cart,
            paymentMethod,
            amountPaid: parseInt(amountPaid.replace(/\./g, '') || '0', 10),
            changeDenominations,
            totalVND,
            lang: rawLang,
            appointmentDate: selectedDateStr,
            timeSlot: selectedSlot,
            bookingSource: 'web',
            status: 'ADVANCE_BOOKING'
        };

        const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to submit booking");
        }

        const data = await res.json();
        clearCart();
        resetCustomerInfo();
        return data.bookingId;
    };

    if (!cart) return null;

    return (
        <div className={`min-h-screen ${PAGE_CONFIG.BG_COLOR} ${PAGE_CONFIG.TEXT_COLOR} font-sans animate-in fade-in ${PAGE_CONFIG.ANIMATION_DURATION} ${PAGE_CONFIG.BOTTOM_PADDING}`}>
            <CheckoutHeader
                title={activeLang === 'en' ? 'Advance Booking' : 'Đặt Lịch Hẹn'}
                backLabel={t.btn_back}
                onBack={handleBack}
                rightAction={
                    <button
                        type="button"
                        onClick={() => setActiveLang(activeLang === 'vi' ? originalLang : 'vi')}
                        className="bg-[#131315]/40 hover:bg-[#1b1b1d]/80 text-[#e6c487]/70 hover:text-[#e6c487] text-[9px] font-black tracking-widest uppercase px-2.5 py-1.5 rounded-lg border border-[#4d463a]/20 shadow-sm active:scale-95 transition-all flex items-center gap-1"
                    >
                        🌐 {activeLang === 'vi' ? `ORIG (${originalLang.toUpperCase()})` : 'DỊCH VN'}
                    </button>
                }
            />

            <main className={`p-4 lg:p-8 mx-auto min-h-screen ${PAGE_CONFIG.MAX_WIDTH}`}>
                <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:gap-8">

                    {/* Left Column */}
                    <div className="w-full lg:col-span-7 lg:row-start-1 space-y-6">
                        {/* 1. Customer Info */}
                        <CustomerInfo
                            lang={activeLang}
                            dict={dict}
                            info={customerInfo}
                            onChange={handleCustomerChange}
                            isBookingFlow={true}
                        />

                        {/* 2. Date & Time Picker */}
                        <div className="bg-[#131315] rounded-3xl p-6 border border-white/5">
                            <BookingTimePicker
                                lang={activeLang}
                                selectedDateStr={selectedDateStr}
                                selectedSlot={selectedSlot}
                                onChangeDate={setSelectedDateStr}
                                onChangeSlot={setSelectedSlot}
                                t={t}
                            />
                        </div>

                    </div>

                    {/* Right Column: Invoice & Submit */}
                    <div className="w-full lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:row-span-2 space-y-6">
                        <div className="lg:sticky lg:top-4 space-y-6">
                            <Invoice
                                cart={cart}
                                lang={activeLang}
                                dict={dict}
                                currency={currency}
                                onCustomRequest={handleCustomRequest}
                            />

                            {/* Desktop Submit Button */}
                            <div className="hidden lg:block">
                                <button
                                    onClick={handleProceedToPayment}
                                    className="w-full py-4 bg-[#C9A96E] text-white font-bold uppercase rounded-xl shadow-[0_0_15px_rgba(201,169,110,0.3)] hover:bg-[#b09461] transition-colors text-lg"
                                >
                                    {t.btn_next}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Bar */}
            <div className="fixed bottom-0 left-0 w-full bg-[#1c1c1e] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-white/10 z-40 lg:hidden shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                <button
                    onClick={handleProceedToPayment}
                    className="w-full py-4 bg-[#C9A96E] text-white font-bold uppercase rounded-xl shadow-[0_0_15px_rgba(201,169,110,0.3)] hover:bg-[#b09461] transition-colors text-lg"
                >
                    {t.btn_next}
                </button>
            </div>

            {/* Modals */}
            {selectedCartItem && (
                <CustomForYouModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveCustomRequest}
                    lang={activeLang as any}
                    serviceData={{
                        ID: selectedCartItem.id,
                        NAMES: selectedCartItem.names as any,
                        FOCUS_POSITION: selectedCartItem.FOCUS_POSITION as any,
                        TAGS: selectedCartItem.TAGS as any,
                        SHOW_STRENGTH: selectedCartItem.SHOW_STRENGTH,
                        SHOW_GENDER: selectedCartItem.SHOW_GENDER,
                        SHOW_FOCUS: selectedCartItem.SHOW_FOCUS,
                        SHOW_NOTES: selectedCartItem.SHOW_NOTES,
                        SHOW_PREFERENCES: selectedCartItem.SHOW_PREFERENCES,
                        HINT: selectedCartItem.HINT as any
                    }}
                    initialData={selectedCartItem.options as any}
                />
            )}

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onNext={handlePaymentNext}
                lang={activeLang}
                dict={dict}
                totalVND={totalVND}
                totalUSD={totalUSD}
                isBookingFlow={true}
                isAgreedTerms={isAgreedTerms}
                onAgreeTermsChange={setIsAgreedTerms}
                bookingReminder={t.booking_reminder}
                termsText={
                    <>
                        {t.terms_agree}
                        <button onClick={() => setIsTermsModalOpen(true)} className="text-[#e6c487] underline hover:text-[#d4b47a] ml-1">
                            {t.terms_link}
                        </button>
                    </>
                }
            />

            <BookingConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleFinalSubmit}
                lang={activeLang}
                dict={dict}
                cart={cart}
                customerInfo={customerInfo}
                paymentMethod={paymentMethod}
                amountPaid={parseInt(amountPaid.replace(/\./g, '') || '0', 10)}
                appointmentDate={selectedDateStr!}
                timeSlot={selectedSlot!}
            />

            <BookingTermsModal
                isOpen={isTermsModalOpen}
                onClose={() => setIsTermsModalOpen(false)}
                lang={activeLang}
            />

            <AlertModal
                isOpen={alertState.isOpen}
                message={alertState.message}
                type={alertState.type}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                lang={activeLang}
            />
        </div>
    );
}
