'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import PaymentMethods from '@/components/Checkout/PaymentMethods';
import ChangeDenominationSelector from '@/components/Checkout/ChangeDenominationSelector';
import AlertModal from '@/components/Shared/AlertModal';
import VatInvoiceSection, { type VatInvoiceData } from '@/components/Checkout/VatInvoiceSection';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNext: (data: { paymentMethod: string; amountPaid: string; changeDenominations: number[]; vatInvoice?: VatInvoiceData | null }) => void;
    lang: string;
    dict: any;
    totalVND: number;
    totalUSD: number;
    initialVatInvoice?: VatInvoiceData | null; // 5B persist
}

export default function PaymentModal({
    isOpen,
    onClose,
    onNext,
    lang,
    dict,
    totalVND,
    totalUSD,
    initialVatInvoice
}: PaymentModalProps) {
    const [isClosing, setIsClosing] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // State for payment picking
    const [paymentMethod, setPaymentMethod] = useState('');
    const [amountPaid, setAmountPaid] = useState<string>('');
    const [changeDenominations, setChangeDenominations] = useState<number[]>([]);
    const [alertState, setAlertState] = useState<{ isOpen: boolean; message: string; type?: 'error' | 'success' | 'info' }>({ isOpen: false, message: '' });
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [isWarningClosing, setIsWarningClosing] = useState(false);
    const [vatInvoice, setVatInvoice] = useState<VatInvoiceData | null>(initialVatInvoice || null);

    const currency = useMemo(() => paymentMethod === 'cash_usd' ? 'USD' : 'VND', [paymentMethod]);

    const changeAmount = useMemo(() => {
        const rawPaid = parseInt(amountPaid.replace(/\./g, '') || '0', 10);
        if (currency === 'USD') {
            return rawPaid - totalUSD;
        }
        return rawPaid - totalVND;
    }, [amountPaid, totalVND, totalUSD, currency]);

    const quickSuggestions = currency === 'USD'
        ? [totalUSD, 50, 100, 200]
        : [totalVND, 500000, 1000000];

    // Reset amount when changing method
    useEffect(() => {
        setAmountPaid('');
    }, [paymentMethod]);

    // Reset denominations when amount changes
    useEffect(() => {
        setChangeDenominations([]);
    }, [amountPaid]);

    // Modal Animation logic
    useEffect(() => {
        if (isOpen) {
            setIsVisible(false);
            setIsClosing(false);
            const timer = setTimeout(() => setIsVisible(true), 10);
            return () => clearTimeout(timer);
        } else {
            // reset on real close
            setPaymentMethod('');
            setAmountPaid('');
            setChangeDenominations([]);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    const handleAmountPaidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, '');
        if (!raw) {
            setAmountPaid('');
            return;
        }

        if (currency === 'USD') {
            setAmountPaid(raw);
        } else {
            setAmountPaid(Number(raw).toLocaleString('vi-VN'));
        }
    };

    const setQuickAmount = (amount: number) => {
        if (currency === 'USD') {
            setAmountPaid(amount.toString());
        } else {
            setAmountPaid(amount.toLocaleString('vi-VN'));
        }
    };

    const handleConfirmNext = () => {
        console.log('[PaymentModal] handleConfirmNext called. vatInvoice:', JSON.stringify(vatInvoice));
        if (!paymentMethod) {
            setAlertState({
                isOpen: true,
                message: dict.checkout?.alerts?.select_payment || 'Please select a payment method',
                type: 'error'
            });
            return;
        }

        // Validate VAT invoice: if checked and looked up, email + phone are required
        if (vatInvoice && (!vatInvoice.companyEmail?.trim() || !vatInvoice.companyPhone?.trim())) {
            setAlertState({
                isOpen: true,
                message: dict.vat_invoice?.required_fields || (dict.vat_invoice ? 'Vui lòng nhập Email và SĐT công ty' : 'Please enter company Email and Phone'),
                type: 'error'
            });
            return;
        }
        
        // Pass data up to Checkout Page state
        console.log('[PaymentModal] Calling onNext with vatInvoice:', vatInvoice ? 'HAS DATA' : 'NULL');
        onNext({
            paymentMethod,
            amountPaid,
            changeDenominations,
            vatInvoice,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div 
                className={`fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
                onClick={handleClose}
            />

            {/* Modal Content */}
            <div className={`
                relative w-full max-w-lg bg-[#1c1c1e] border border-white/5 sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col
                transform transition-transform duration-300
                pb-safe max-h-[90vh]
                ${(isClosing || !isVisible) ? 'translate-y-full sm:scale-95 sm:translate-y-0 sm:opacity-0' : 'translate-y-0 sm:scale-100 sm:opacity-100'}
            `}>
                
                {/* Header handle bar (Mobile) */}
                <div className="w-full flex justify-center pt-3 pb-2 sm:hidden bg-[#1c1c1e] rounded-t-3xl">
                    <div className="w-12 h-1.5 bg-[#3f3f46] rounded-full"></div>
                </div>

                <div className="flex justify-between items-center p-4 border-b border-white/10 bg-[#1c1c1e]">
                    <h2 className="text-xl font-bold text-[#C9A96E] uppercase tracking-widest">{dict.checkout?.payment_method_title || (lang === 'vi' ? 'Thanh toán' : 'Payment')}</h2>
                    <button 
                        onClick={handleClose}
                        className="w-8 h-8 rounded-full bg-[#0d0d0d] flex items-center justify-center text-gray-400 hover:text-[#C9A96E] hover:bg-white/5 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {/* Pay Warning Banner */}
                    <div
                        className="bg-[#0d0d0d] border border-white/10 p-3 rounded-xl flex items-center justify-center text-center cursor-pointer hover:bg-white/5 transition-colors"
                        onClick={() => setShowWarningModal(true)}
                    >
                        <span className="text-[#C9A96E] font-bold text-sm">*{dict.checkout?.pay_warning}</span>
                    </div>

                    <PaymentMethods
                        lang={lang}
                        dict={dict}
                        selected={paymentMethod}
                        onChange={setPaymentMethod}
                    />

                    {/* Cash Payment Input Block */}
                    {(paymentMethod === 'cash_vnd' || paymentMethod === 'cash_usd') && (
                        <div className="bg-[#0d0d0d] p-5 rounded-3xl shadow-sm border border-white/5 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-[#C9A96E] font-bold uppercase tracking-widest text-xs">
                                    {dict.checkout?.amount_paid_title || 'Amount Paid'}
                                </h3>
                                <button
                                    onClick={() => setAmountPaid('0')}
                                    className="text-red-500/80 text-xs font-bold border border-red-500/20 px-3 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                                >
                                    {dict.checkout?.reset || 'Reset'}
                                </button>
                            </div>

                            {/* Input Large */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={amountPaid}
                                    onChange={handleAmountPaidChange}
                                    placeholder="0"
                                    className="w-full text-center text-4xl font-bold text-white border-b-2 border-white/10 py-4 focus:outline-none focus:border-[#C9A96E] transition-colors bg-transparent placeholder-[#3f3f46]"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C9A96E] font-bold bg-[#1c1c1e] border border-white/5 px-2 py-1 rounded">
                                    {currency}
                                </span>
                            </div>

                            {/* Quick Suggestions */}
                            <div className="flex gap-2 justify-center flex-wrap">
                                {quickSuggestions.map(amt => (
                                    amt > 0 && (
                                        <button
                                            key={amt}
                                            onClick={() => setQuickAmount(amt)}
                                            className="px-4 py-2 bg-[#1c1c1e] border border-white/5 rounded-xl text-gray-300 font-bold text-sm hover:border-[#C9A96E] hover:text-[#C9A96E] transition-all"
                                        >
                                            {currency === 'USD' ? amt : amt.toLocaleString('vi-VN')}
                                        </button>
                                    )
                                ))}
                            </div>

                            {/* Change Display */}
                            <div className="bg-[#1c1c1e] rounded-xl p-4 flex justify-between items-center border border-white/5">
                                <span className="text-gray-400 text-sm font-medium">{dict.checkout?.change_title || 'Change:'}</span>
                                {changeAmount >= 0 ? (
                                    <div className="text-right">
                                        <span className="text-xl font-bold text-[#C9A96E] block">
                                            {changeAmount.toLocaleString('vi-VN')} {currency}
                                        </span>
                                        {currency === 'USD' && (
                                            <span className="text-[#b09461] font-bold text-lg block mt-1">
                                                = {(changeAmount * 24000).toLocaleString('vi-VN')} VND
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-xl font-bold text-red-500">
                                        {dict.checkout?.insufficient || 'Insufficient'}
                                    </span>
                                )}
                            </div>

                            {/* Change Denomination Selector */}
                            {changeAmount > 0 && (
                                <ChangeDenominationSelector
                                    changeAmount={changeAmount}
                                    currency={currency as 'VND' | 'USD'}
                                    dict={dict}
                                    onSelect={setChangeDenominations}
                                />
                            )}
                        </div>
                    )}

                    {/* VAT Invoice Section */}
                    <div className="bg-[#0d0d0d] p-4 rounded-2xl border border-white/5">
                        <VatInvoiceSection
                            lang={lang}
                            dict={dict}
                            invoiceData={vatInvoice}
                            onInvoiceChange={setVatInvoice}
                        />
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-[#1c1c1e] border-t border-white/10">
                    <button
                        onClick={handleConfirmNext}
                        className="w-full py-4 bg-[#C9A96E] text-white font-bold uppercase rounded-xl shadow-[0_0_15px_rgba(201,169,110,0.3)] hover:bg-[#b09461] active:scale-[0.98] transition-all text-lg"
                    >
                        {dict.checkout?.continue || (lang === 'vi' ? 'TIẾP TỤC' : 'CONTINUE')}
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

            {/* Payment Regulation Popup */}
            {showWarningModal && (
                <div
                    className={`fixed inset-0 z-[140] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 ${isWarningClosing ? 'animate-out fade-out' : 'animate-in fade-in duration-200'}`}
                    onClick={() => {
                        setIsWarningClosing(true);
                        setTimeout(() => { setShowWarningModal(false); setIsWarningClosing(false); }, 200);
                    }}
                >
                    <div
                        className={`bg-[#1c1c1e] w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border border-white/5 p-6 flex flex-col items-center text-center gap-4 ${isWarningClosing ? 'animate-out zoom-out-95' : 'animate-in zoom-in-95 duration-200'}`}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-16 h-16 rounded-full bg-[#C9A96E]/10 flex items-center justify-center mb-1">
                            <AlertCircle size={32} className="text-[#C9A96E]" />
                        </div>
                        <h3 className="text-xl font-bold text-[#C9A96E] leading-tight">
                            {dict.payment_methods?.payment_regulation?.title || "Payment Regulation"}
                        </h3>
                        <p className="text-gray-400 text-[15px] leading-relaxed">
                            {dict.payment_methods?.payment_regulation?.content || "We collect fees before service."}
                        </p>
                        <button
                            onClick={() => {
                                setIsWarningClosing(true);
                                setTimeout(() => { setShowWarningModal(false); setIsWarningClosing(false); }, 200);
                            }}
                            className="w-full bg-[#C9A96E] hover:bg-[#b09461] text-white font-bold py-3.5 rounded-xl uppercase tracking-wider transition-colors shadow-lg shadow-[#C9A96E]/20 mt-2"
                        >
                            {dict.payment_methods?.payment_regulation?.btn || "UNDERSTOOD"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
