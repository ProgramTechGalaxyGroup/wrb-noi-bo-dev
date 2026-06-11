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

export default function CheckoutPage({ params }: { params: Promise<{ lang: string }> }) {
    const router = useRouter();
    const { cart, updateAllCartItemOptions, updateCartItemOptions, customerInfo, updateCustomerInfo, resetCustomerInfo } = useMenuData();
    const { user, isAuthUser } = useAuthStore();

    // Unwrap params
    const { lang: rawLang } = use(params);
    const [activeLang, setActiveLang] = useState(rawLang);
    const [originalLang] = useState(rawLang);

    const dict = getDictionary(activeLang);

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
    useEffect(() => {
        if (!cart || cart.length === 0) {
            router.push('/');
        }
    }, [cart, router]);

    // [NEW] Auto-fill Customer Info (OLD USER SPECIFIC & Google Login)
    useEffect(() => {
        let authName = '';
        let authEmail = '';
        let authPhone = '';

        // Ưu tiên dữ liệu từ Provider (Google Login) nếu đang có session online
        if (isAuthUser && user) {
            authName = user.user_metadata?.full_name || user.user_metadata?.name || '';
            authEmail = user.email || '';
            authPhone = user.phone || '';
        }

        try {
            const storedInfoIdx = localStorage.getItem('currentUserInfo');
            if (storedInfoIdx) {
                const info = JSON.parse(storedInfoIdx);
                if (!customerInfo.name && (authName || info.name)) updateCustomerInfo('name', authName || info.name);
                if (!customerInfo.email && (authEmail || info.email)) updateCustomerInfo('email', authEmail || info.email);
                if (!customerInfo.phone && (authPhone || info.phone)) updateCustomerInfo('phone', authPhone || info.phone);
            } else {
                // Fallback: try email only
                const email = localStorage.getItem('currentUserEmail');
                if (!customerInfo.name && authName) updateCustomerInfo('name', authName);
                if (!customerInfo.email && (authEmail || email)) updateCustomerInfo('email', authEmail || email || '');
                if (!customerInfo.phone && authPhone) updateCustomerInfo('phone', authPhone);
            }
        } catch (e) {
            console.error("Failed to parse currentUserInfo", e);
            // Fallback to auth data if JSON parsing fails
            if (!customerInfo.name && authName) updateCustomerInfo('name', authName);
            if (!customerInfo.email && authEmail) updateCustomerInfo('email', authEmail);
            if (!customerInfo.phone && authPhone) updateCustomerInfo('phone', authPhone);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthUser, user]);

    // --- HANDLERS ---
    const handleBack = () => {
        router.back();
    };

    // Cleanup obsolete handlers

    const handleCustomRequest = (item: CartItem) => {
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


    const handleFinalSubmit = async () => {
        const payload = {
            customer: customerInfo,
            items: cart,
            paymentMethod,
            amountPaid: parseInt(amountPaid.replace(/\./g, '') || '0', 10),
            changeDenominations,
            totalVND,
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
        <div className="min-h-screen bg-[#0d0d0d] text-white pb-32 font-sans animate-in fade-in duration-500">
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

            <main className="p-4 lg:p-8 max-w-6xl mx-auto min-h-screen">
                <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:gap-8">

                    {/* 1. Customer Info (Mobile: Item 1, Desktop: Item 1 - Left Col) */}
                    <div className="w-full lg:col-span-7 lg:row-start-1">
                        <CustomerInfo
                            lang={activeLang}
                            dict={dict}
                            info={customerInfo}
                            onChange={handleCustomerChange}
                        />
                    </div>

                    {/* 2. Invoice (Mobile: Item 2, Desktop: Item 2 - Right Col) */}
                    {/* DOM Order ensures Mobile flow is Customer -> Invoice -> Payment */}
                    <div className="w-full lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:row-span-2 space-y-6">
                        <div className="lg:sticky lg:top-4">
                            <Invoice
                                cart={cart}
                                lang={activeLang}
                                dict={dict}
                                currency={currency}
                                onCustomRequest={handleCustomRequest}
                            />

                            {/* Desktop Confirm Button */}
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

            {/* Bottom Bar - Confirm (Mobile Only) */}
            <div className="fixed bottom-0 left-0 w-full bg-[#1c1c1e] p-4 border-t border-white/10 z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] lg:hidden">
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

