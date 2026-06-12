'use client';

import React, { useState, useEffect } from 'react';
import { Search, Building2, MapPin, Loader2, AlertCircle, CheckCircle2, X, Mail, Phone } from 'lucide-react';

// 🔧 UI CONFIGURATION
const ANIMATION_DURATION = '300ms';
const INPUT_DEBOUNCE_MS = 0; // No debounce, user clicks button manually

export interface VatInvoiceData {
    taxCode: string;
    companyName: string;
    companyAddress: string;
    companyEmail?: string;
    companyPhone?: string;
}

interface VatInvoiceSectionProps {
    lang: string;
    dict: any;
    invoiceData: VatInvoiceData | null;
    onInvoiceChange: (data: VatInvoiceData | null) => void;
}

const VatInvoiceSection = ({ lang, dict, invoiceData, onInvoiceChange }: VatInvoiceSectionProps) => {
    // Derive checkbox state from parent data (5B persist)
    const [wantInvoice, setWantInvoice] = useState(!!invoiceData);
    const [taxCodeInput, setTaxCodeInput] = useState(invoiceData?.taxCode || '');
    const [isLooking, setIsLooking] = useState(false);
    const [lookupError, setLookupError] = useState('');
    const [lookupResult, setLookupResult] = useState<VatInvoiceData | null>(invoiceData);
    const [emailInput, setEmailInput] = useState(invoiceData?.companyEmail || '');
    const [phoneInput, setPhoneInput] = useState(invoiceData?.companyPhone || '');

    // i18n with fallbacks
    const t = dict.vat_invoice || {};
    const label = t.checkbox_label || (lang === 'vi' ? 'Bạn có muốn xuất hoá đơn?' : 'Do you want a VAT invoice?');
    const placeholder = t.tax_code_placeholder || (lang === 'vi' ? 'Nhập mã số thuế (VD: 0316794479)' : 'Enter Tax Code (e.g. 0316794479)');
    const lookupBtn = t.lookup_btn || (lang === 'vi' ? 'Tra cứu' : 'Look up');
    const lookingUp = t.looking_up || (lang === 'vi' ? 'Đang tra cứu...' : 'Looking up...');
    const companyLabel = t.company_name || (lang === 'vi' ? 'Tên công ty' : 'Company Name');
    const addressLabel = t.address || (lang === 'vi' ? 'Địa chỉ' : 'Address');
    const emailLabel = t.email || (lang === 'vi' ? 'Email công ty *' : 'Company Email *');
    const phoneLabel = t.phone || (lang === 'vi' ? 'SĐT công ty *' : 'Company Phone *');
    const notFound = t.not_found || (lang === 'vi' ? 'Không tìm thấy MST. Vui lòng kiểm tra lại.' : 'Tax code not found. Please check and try again.');
    const errorMsg = t.error || (lang === 'vi' ? 'Tra cứu thất bại. Vui lòng thử lại.' : 'Lookup failed. Please try again.');

    // Sync with parent data when re-opening modal (5B persist)
    useEffect(() => {
        if (invoiceData) {
            setWantInvoice(true);
            setTaxCodeInput(invoiceData.taxCode);
            setLookupResult(invoiceData);
            setEmailInput(invoiceData.companyEmail || '');
            setPhoneInput(invoiceData.companyPhone || '');
        }
    }, [invoiceData]);

    const handleToggle = () => {
        const next = !wantInvoice;
        setWantInvoice(next);
        if (!next) {
            // Clear everything when unchecked
            setTaxCodeInput('');
            setLookupResult(null);
            setLookupError('');
            setEmailInput('');
            setPhoneInput('');
            onInvoiceChange(null);
        }
    };

    const handleClearResult = () => {
        setLookupResult(null);
        setTaxCodeInput('');
        setLookupError('');
        setEmailInput('');
        setPhoneInput('');
        onInvoiceChange(null);
    };

    // Update parent whenever email/phone changes
    const handleEmailChange = (val: string) => {
        setEmailInput(val);
        if (lookupResult) {
            onInvoiceChange({ ...lookupResult, companyEmail: val, companyPhone: phoneInput });
        }
    };

    const handlePhoneChange = (val: string) => {
        setPhoneInput(val);
        if (lookupResult) {
            onInvoiceChange({ ...lookupResult, companyEmail: emailInput, companyPhone: val });
        }
    };

    const handleLookup = async () => {
        const code = taxCodeInput.trim();
        if (!code) return;

        setIsLooking(true);
        setLookupError('');
        setLookupResult(null);

        try {
            const res = await fetch(`/api/tax-lookup?taxCode=${encodeURIComponent(code)}`);
            const data = await res.json();

            if (data.success && data.data) {
                // Auto-fill phone from Esgoo API if available
                const autoPhone = data.data.phone || '';
                if (autoPhone) setPhoneInput(autoPhone);

                const result: VatInvoiceData = {
                    taxCode: data.data.taxCode,
                    companyName: data.data.companyName,
                    companyAddress: data.data.address,
                    companyEmail: emailInput || '',
                    companyPhone: autoPhone || phoneInput || '',
                };
                setLookupResult(result);
                onInvoiceChange(result);
            } else {
                setLookupError(res.status === 404 ? notFound : (data.message || errorMsg));
                onInvoiceChange(null);
            }
        } catch {
            setLookupError(errorMsg);
            onInvoiceChange(null);
        } finally {
            setIsLooking(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLookup();
        }
    };

    const isValidTaxCode = /^\d{10,14}$/.test(taxCodeInput.trim());

    return (
        <div className="space-y-3">
            {/* Checkbox */}
            <label className="flex items-center gap-3 cursor-pointer group py-1">
                <div
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 shrink-0 ${
                        wantInvoice
                            ? 'bg-[#C9A96E] border-[#C9A96E]'
                            : 'border-white/20 group-hover:border-white/40'
                    }`}
                    onClick={handleToggle}
                >
                    {wantInvoice && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12l5 5L20 7" />
                        </svg>
                    )}
                </div>
                <span
                    className={`text-sm font-medium transition-colors ${
                        wantInvoice ? 'text-[#C9A96E]' : 'text-gray-400 group-hover:text-gray-300'
                    }`}
                    onClick={handleToggle}
                >
                    {label}
                </span>
            </label>

            {/* Expandable Form */}
            <div
                className="overflow-hidden transition-all"
                style={{
                    maxHeight: wantInvoice ? '700px' : '0px',
                    opacity: wantInvoice ? 1 : 0,
                    transitionDuration: ANIMATION_DURATION,
                }}
            >
                <div className="space-y-3 pt-1">
                    {/* Tax Code Input + Lookup Button */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            inputMode="numeric"
                            value={taxCodeInput}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setTaxCodeInput(val);
                                setLookupError('');
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholder}
                            maxLength={14}
                            className="flex-1 bg-[#0d0d0d] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A96E] transition-colors text-sm"
                        />
                        <button
                            onClick={handleLookup}
                            disabled={!isValidTaxCode || isLooking}
                            className={`px-4 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all shrink-0 flex items-center gap-2 ${
                                isValidTaxCode && !isLooking
                                    ? 'bg-[#C9A96E] text-white hover:bg-[#b09461] active:scale-[0.97]'
                                    : 'bg-[#C9A96E]/30 text-white/40 cursor-not-allowed'
                            }`}
                        >
                            {isLooking ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span className="hidden sm:inline">{lookingUp}</span>
                                </>
                            ) : (
                                <>
                                    <Search size={16} />
                                    <span className="hidden sm:inline">{lookupBtn}</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Error Message */}
                    {lookupError && (
                        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 animate-in fade-in duration-200">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{lookupError}</span>
                        </div>
                    )}

                    {/* Success Result Card */}
                    {lookupResult && (
                        <div className="bg-[#0d0d0d] border border-green-500/20 rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-green-400" />
                                    <span className="text-green-400 text-xs font-bold uppercase tracking-widest">
                                        {dict.vat_invoice?.invoice_info_title || (lang === 'vi' ? 'Thông tin doanh nghiệp' : 'Business Info')}
                                    </span>
                                </div>
                                <button
                                    onClick={handleClearResult}
                                    className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Company Name */}
                            <div className="space-y-1">
                                <span className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">{companyLabel}</span>
                                <div className="flex items-start gap-2">
                                    <Building2 size={16} className="text-[#C9A96E] mt-0.5 shrink-0" />
                                    <p className="text-white font-semibold text-sm leading-snug">{lookupResult.companyName}</p>
                                </div>
                            </div>

                            {/* Address */}
                            {lookupResult.companyAddress && (
                                <div className="space-y-1">
                                    <span className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">{addressLabel}</span>
                                    <div className="flex items-start gap-2">
                                        <MapPin size={16} className="text-[#C9A96E] mt-0.5 shrink-0" />
                                        <p className="text-gray-300 text-sm leading-snug">{lookupResult.companyAddress}</p>
                                    </div>
                                </div>
                            )}

                            {/* Tax Code Badge */}
                            <div className="flex items-center gap-2 pt-1">
                                <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">MST</span>
                                <span className="text-[#C9A96E] text-sm font-mono font-bold bg-[#C9A96E]/10 px-2.5 py-1 rounded-lg">
                                    {lookupResult.taxCode}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Email & Phone inputs (shown after lookup success) */}
                    {lookupResult && (
                        <div className="space-y-2 animate-in fade-in duration-200">
                            <div className="relative">
                                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="email"
                                    value={emailInput}
                                    onChange={(e) => handleEmailChange(e.target.value)}
                                    placeholder={emailLabel}
                                    className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A96E] transition-colors text-sm"
                                />
                            </div>
                            <div className="relative">
                                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="tel"
                                    inputMode="tel"
                                    value={phoneInput}
                                    onChange={(e) => handlePhoneChange(e.target.value)}
                                    placeholder={phoneLabel}
                                    className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A96E] transition-colors text-sm"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VatInvoiceSection;
