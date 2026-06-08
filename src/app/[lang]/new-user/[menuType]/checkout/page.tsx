'use client';

import React, { use, useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMenuData } from '@/components/Menu/MenuContext';
import { useAuthStore } from '@/lib/authStore.logic';

import CheckoutHeader from '@/components/Checkout/CheckoutHeader';
import CustomerInfo from '@/components/Checkout/CustomerInfo';
import Invoice from '@/components/Checkout/Invoice';
import PaymentModal from '@/components/Checkout/PaymentModal';
import OrderConfirmModal from '@/components/Checkout/OrderConfirmModal';
import CustomForYouModal from '@/components/CustomForYou';
import AlertModal from '@/components/Shared/AlertModal';
import { ServiceOptions, CartItem } from '@/components/Menu/types';
import { getDictionary } from '@/lib/dictionaries';

// 🔧 UI CONFIGURATION
const PAGE_CONFIG = {
    BOTTOM_PADDING: 'pb-32',
    ANIMATION_DURATION: 'duration-500',
    MAX_WIDTH: 'max-w-6xl',
    BG_COLOR: 'bg-[#0d0d0d]',
    TEXT_COLOR: 'text-white'
};

export default function CheckoutPage({ params }: { params: Promise<{ lang: string }> }) {
    const router = useRouter();
    const { cart, updateAllCartItemOptions, updateCartItemOptions, customerInfo, updateCustomerInfo, resetCustomerInfo } = useMenuData();
    const { user, isAuthUser } = useAuthStore();

    // Unwrap params
    const { lang: rawLang } = use(params);
    const [activeLang, setActiveLang] = useState(rawLang);
    const [originalLang] = useState(rawLang);

    console.log('[CheckoutPage] resolved lang:', activeLang);
    const dict = getDictionary(activeLang);
    console.log('[CheckoutPage] dict title:', dict?.checkout?.title);

    // Helper to translate options (strength, therapist)
    const tOption = (category: string, value: string) => {
        if (!value) return '';
        // @ts-ignore
        return dict.options?.[category]?.[value.toLowerCase()] || value;
    };

    // --- STATE ---

    // Payment
    const [paymentMethod, setPaymentMethod] = useState('');
    const [amountPaid, setAmountPaid] = useState<string>('');

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);
    const [changeDenominations, setChangeDenominations] = useState<number[]>([]);
    const [alertState, setAlertState] = useState<{ isOpen: boolean; message: string; type?: 'error' | 'success' | 'info' }>({ isOpen: false, message: '' });

    // --- COMPUTED ---
    const currency = useMemo(() => paymentMethod === 'cash_usd' ? 'USD' : 'VND', [paymentMethod]);

    const totalVND = useMemo(() => cart.reduce((sum, item) => sum + item.priceVND * item.qty, 0), [cart]);
    const totalUSD = useMemo(() => cart.reduce((sum, item) => sum + item.priceUSD * item.qty, 0), [cart]);

    const changeAmount = useMemo(() => {
        const rawPaid = parseInt(amountPaid.replace(/\./g, '') || '0', 10);
        if (currency === 'USD') {
            return rawPaid - totalUSD;
        }
        return rawPaid - totalVND;
    }, [amountPaid, totalVND, totalUSD, currency]);

    // --- EFFECTS ---
    // Ngăn truy cập trái phép nếu không có giỏ hàng
    useEffect(() => {
        if (!cart || cart.length === 0) {
            router.push('/');
        }
    }, [cart, router]);

    // [NEW] Auto-fill Customer Info từ tài khoản đã đăng nhập
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

    // Cleanup obsolete handlers

    // ... (Custom Request Handlers remain same) ...
    const handleCustomRequest = (item: CartItem) => {
        // VIP items don't have Custom For You options (strength, therapist, focus, avoid)
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

    const handleConfirmOrder = () => {
        // Validation 1: Name is required
        if (!customerInfo.name.trim()) {
            setAlertState({
                isOpen: true,
                message: dict.checkout.alerts?.fill_name || 'Please enter your Full Name',
                type: 'error'
            });
            return;
        }

        // Validation 2: Either Phone or Email is required
        if (!customerInfo.email.trim() && !customerInfo.phone.trim()) {
            setAlertState({
                isOpen: true,
                message: dict.checkout.alerts?.fill_phone_or_email || 'Please enter Phone Number or Email',
                type: 'error'
            });
            return;
        }
        setIsPaymentModalOpen(true);
    };

    const handlePaymentNext = (data: { paymentMethod: string; amountPaid: string; changeDenominations: number[] }) => {
        setPaymentMethod(data.paymentMethod);
        setAmountPaid(data.amountPaid);
        setChangeDenominations(data.changeDenominations);
        setIsPaymentModalOpen(false);
        setTimeout(() => setIsConfirmOpen(true), 300);
    };


    // ... (Final Submit remains same) ...
    const handleFinalSubmit = async () => {
        const payload = {
            customer: customerInfo,
            items: cart,
            paymentMethod,
            amountPaid: parseInt(amountPaid.replace(/\./g, '') || '0', 10),
            changeDenominations,
            totalVND, // Keep for legacy backend compatibility
            lang: rawLang
        };

        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Failed to submit");
        }

        const data = await res.json();
        resetCustomerInfo();
        return data.accessToken || data.bookingId;
    };

    if (!cart) return null;

    // Quick Suggestions Logic
    const quickSuggestions = currency === 'USD'
        ? [totalUSD, 50, 100, 200]
        : [totalVND, 500000, 1000000];

    return (
        <div className={`min-h-screen ${PAGE_CONFIG.BG_COLOR} ${PAGE_CONFIG.TEXT_COLOR} font-sans animate-in fade-in ${PAGE_CONFIG.ANIMATION_DURATION} ${PAGE_CONFIG.BOTTOM_PADDING}`}>
            <CheckoutHeader
                title={dict.checkout.title}
                backLabel={dict.common?.back_to_menu}
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

                    {/* 1. Customer Info (Mobile: Item 1, Desktop: Left Col Row 1) */}
                    <div className="w-full lg:col-span-7 lg:row-start-1">
                        <CustomerInfo
                            lang={activeLang}
                            dict={dict}
                            info={customerInfo}
                            onChange={handleCustomerChange}
                        />
                    </div>

                    {/* 2. Invoice (Mobile: Item 2, Desktop: Right Col Row 1-Span-2) */}
                    {/* Moved UP in DOM to ensure it appears 2nd on mobile */}
                    <div className="w-full lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:row-span-2 space-y-6">
                        <div className="lg:sticky lg:top-4">
                            {/* 2. Invoice */}
                            <Invoice
                                cart={cart}
                                lang={activeLang}
                                dict={dict}
                                currency={currency} // Pass currency
                                onCustomRequest={handleCustomRequest}
                            />

                            {/* Desktop Confirm Button (Hidden on Mobile) */}
                            <div className="hidden lg:block mt-6">
                                <button
                                    onClick={handleConfirmOrder}
                                    className="w-full py-4 bg-[#C9A96E] text-white font-bold uppercase rounded-xl shadow-[0_0_15px_rgba(201,169,110,0.3)] hover:bg-[#b09461] transition-colors text-lg"
                                >
                                    {dict.checkout.confirm_order_btn}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom Bar - Confirm (Hidden on Desktop) */}
            <div className="fixed bottom-0 left-0 w-full bg-[#1c1c1e] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-white/10 z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] lg:hidden">
                <div className="max-w-2xl mx-auto">
                    <button
                        onClick={handleConfirmOrder}
                        className="w-full py-4 bg-[#C9A96E] text-white font-bold uppercase rounded-xl shadow-[0_0_15px_rgba(201,169,110,0.3)] hover:bg-[#b09461] transition-colors text-lg"
                    >
                        {dict.checkout.confirm_order_btn}
                    </button>
                </div>
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
            />

            <OrderConfirmModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleFinalSubmit}
                lang={activeLang}
                dict={dict}
                cart={cart}
                customerInfo={customerInfo}
                paymentMethod={paymentMethod}
                amountPaid={parseInt(amountPaid.replace(/\./g, '') || '0', 10)}
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
