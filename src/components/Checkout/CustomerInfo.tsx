'use client';
import React, { useState } from 'react';

interface CustomerInfoProps {
    lang: string;
    dict: any; // Accept dict
    info: { name: string; email: string; phone: string; gender: string; room?: string };
    onChange: (field: string, value: string) => void;
    isBookingFlow?: boolean;
}

export default function CustomerInfo({ lang, dict, info, onChange, isBookingFlow }: CustomerInfoProps) {
    // Determine which tab to show by default
    const [contactMethod, setContactMethod] = useState<'email' | 'phone'>(
        info.phone && !info.email ? 'phone' : 'email'
    );

    // Extract raw labels for buttons (removing the placeholder hints in parenthesis if any)
    const emailLabel = dict.checkout.email?.split('(')[0]?.trim() || 'Email';
    const phoneLabel = dict.checkout.phone?.split('(')[0]?.trim() || 'Phone';

    return (
        <div className="bg-[#1c1c1e] text-white p-5 rounded-3xl shadow-sm border border-white/5">
            <h2 className="text-[#C9A96E] font-bold uppercase tracking-widest text-xs mb-4">
                {dict.checkout.customer_info}
            </h2>

            <div className="space-y-4">
                {/* Hàng 1: Full Name + Gender */}
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={info.name}
                            onChange={(e) => onChange('name', e.target.value)}
                            placeholder={dict.checkout.full_name + (isBookingFlow ? ' *' : '')}
                            className="w-full min-w-0 bg-[#0d0d0d] border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A96E] transition-colors shadow-sm"
                        />
                    </div>

                    {/* Gender Dropdown */}
                    <div className="w-[100px] shrink-0 relative">
                        <select
                            value={info.gender}
                            onChange={(e) => onChange('gender', e.target.value)}
                            className="w-full h-full appearance-none bg-[#0d0d0d] border border-white/10 rounded-xl pl-4 pr-10 text-white focus:outline-none focus:border-[#C9A96E] transition-colors shadow-sm"
                        >
                            <option value="Male">{dict.checkout.male}</option>
                            <option value="Female">{dict.checkout.female}</option>
                            <option value="Other">{dict.checkout.other}</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                        </div>
                    </div>
                </div>

                {isBookingFlow ? (
                    // Hiển thị cả 2 ô nếu là luồng đặt lịch
                    <div className="space-y-4 animate-[fade-in-up_0.2s_ease-out]">
                        <div className="relative">
                            <input
                                type="tel"
                                value={info.phone}
                                onChange={(e) => onChange('phone', e.target.value)}
                                placeholder={dict.checkout.phone + ' *'}
                                className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A96E] transition-colors shadow-sm"
                            />
                        </div>
                        <div className="relative">
                            <input
                                type="email"
                                value={info.email}
                                onChange={(e) => onChange('email', e.target.value)}
                                placeholder={dict.checkout.email + ' *'}
                                className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A96E] transition-colors shadow-sm"
                            />
                        </div>
                    </div>
                ) : (
                    // Hiển thị dạng tabs nếu là luồng walk-in
                    <>
                        {/* Hàng 2: Navigation Tabs cho Contact Method */}
                        <div className="flex bg-[#0d0d0d] p-1.5 rounded-2xl border border-white/5 space-x-1">
                            <button
                                onClick={() => setContactMethod('email')}
                                className={`flex-1 py-3 text-xs font-bold uppercase rounded-xl transition-all ${
                                    contactMethod === 'email' 
                                        ? 'bg-[#1c1c1e] text-[#C9A96E] shadow-sm border border-white/5' 
                                        : 'text-gray-500 hover:text-gray-300 bg-transparent'
                                }`}
                            >
                                {emailLabel}
                            </button>
                            <button
                                onClick={() => setContactMethod('phone')}
                                className={`flex-1 py-3 text-xs font-bold uppercase rounded-xl transition-all ${
                                    contactMethod === 'phone' 
                                        ? 'bg-[#1c1c1e] text-[#C9A96E] shadow-sm border border-white/5' 
                                        : 'text-gray-500 hover:text-gray-300 bg-transparent'
                                }`}
                            >
                                {phoneLabel}
                            </button>
                        </div>

                        {/* Hàng 3: Input tuỳ theo phương thức đã chọn */}
                        <div className="animate-[fade-in-up_0.2s_ease-out]">
                            {contactMethod === 'email' ? (
                                <input
                                    type="email"
                                    value={info.email}
                                    onChange={(e) => onChange('email', e.target.value)}
                                    placeholder={dict.checkout.email}
                                    className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A96E] transition-colors shadow-sm"
                                />
                            ) : (
                                <input
                                    type="tel"
                                    value={info.phone}
                                    onChange={(e) => onChange('phone', e.target.value)}
                                    placeholder={dict.checkout.phone}
                                    className="w-full bg-[#0d0d0d] border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A96E] transition-colors shadow-sm"
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
