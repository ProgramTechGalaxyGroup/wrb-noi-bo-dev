import React, { useState } from 'react';
import { PencilLine, Wand2, Check, GripHorizontal, User, HeartPulse, Ban, Hand, Clock, Crown } from 'lucide-react';
import { CartItem } from '@/components/Menu/types';
import { formatCurrency } from '@/components/Menu/utils';
import { SKILL_MAP, type VipLang } from '@/lib/vipSkills.constants';
import { getSkillName } from '@/lib/vipStaffUtils';

interface InvoiceProps {
    cart: CartItem[];
    lang: string;
    dict: any;
    currency?: 'VND' | 'USD';
    onCustomRequest: (item: CartItem) => void;
}

export default function Invoice({ cart, lang, dict, currency = 'VND', onCustomRequest }: InvoiceProps) {
    const total = cart.reduce((sum, item) => sum + ((currency === 'USD' ? item.priceUSD : item.priceVND) * item.qty), 0);
    const vipLang = (lang || 'vi') as VipLang;

    return (
        <div className="space-y-4">

            <div className="bg-[#1c1c1e] text-white p-5 rounded-3xl shadow-sm border border-white/5">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-[#C9A96E] font-bold text-lg">{dict.checkout.invoice_details}</h2>
                    {/* Bỏ `#INV-001` placeholder theo yêu cầu của người dùng */}
                </div>

                {/* List Items */}
                <div className="space-y-8 mb-8">
                    {cart.map((item, idx) => {
                        // 1. Determine effective values (Defaults if missing)
                        const strength = item.options?.strength || 'medium';
                        const therapist = item.options?.therapist || 'random';

                        // 2. Strict Check for "Customized" status
                        const isStrengthCustom = strength !== 'medium';
                        const isTherapistCustom = therapist !== 'random';
                        const isBodyCustom = item.options?.bodyParts && (item.options.bodyParts.focus.length > 0 || item.options.bodyParts.avoid.length > 0);
                        const isNotesCustom = item.options?.notes && (item.options.notes.tag0 || item.options.notes.tag1 || item.options.notes.content);

                        const hasCustom = isStrengthCustom || isTherapistCustom || isBodyCustom || isNotesCustom;

                        // Total body parts count (must match BodyMap.tsx ALL_BODY_PARTS)
                        const TOTAL_BODY_PARTS = 8; // HEAD, NECK, SHOULDER, ARM, BACK, THIGH, CALF, FOOT

                        const formatParts = (parts: string[]) => {
                            // Task E1: Show "Full Body" if all parts selected
                            if (parts.length >= TOTAL_BODY_PARTS) {
                                return dict.custom_for_you?.full_body || 'Full Body';
                            }
                            return parts.map(p => {
                                const key = p.toLowerCase();
                                // @ts-ignore
                                return dict.body_parts?.[key] || dict.body_parts?.[p] || p;
                            }).join(', ');
                        };

                        // Helper for colors
                        const getStrengthColor = (s: string) => {
                            return 'text-[#C9A96E]';
                        };

                        const getTherapistColor = (t: string) => {
                            return 'text-[#C9A96E]';
                        };

                        const isVipItem = item.itemType === 'vip' || !!item.options?.vipDuration || !!item.options?.displayName;

                        // Fallbacks for restored items from history
                        const vipDisplayName = item.vipDisplayName || item.options?.displayName || 'VIP Bespoke';
                        const vipDuration = item.vipDuration || item.options?.vipDuration || item.timeValue || 60;
                        const vipStaffId = item.vipStaffId || item.options?.vipStaffId || 'N/A';
                        const vipSkillIds = item.vipSkillIds || item.options?.selectedSkills || [];

                        return (
                            <div key={item.cartId} className="border border-white/10 rounded-2xl p-4 shadow-sm bg-[#0d0d0d] mb-4">
                                {/* Row 1: Name + Price */}
                                <div className="flex justify-between items-start mb-1 gap-2">
                                    <h4 className="text-white font-bold text-lg truncate flex-1 flex items-center gap-2">
                                        {idx + 1}. {isVipItem ? vipDisplayName : (item.names[lang] || item.names.en)}
                                        {isVipItem && <Crown size={16} className="text-[#e6c487] shrink-0" />}
                                    </h4>
                                    <span className={`font-bold text-lg shrink-0 ${currency === 'USD' ? 'text-emerald-600' : 'text-white'}`}>
                                        {currency === 'USD'
                                            ? `${(item.priceUSD * item.qty)} USD`
                                            : `${formatCurrency(item.priceVND * item.qty)} VND`
                                        }
                                    </span>
                                </div>

                                {/* Clickable Customization Region */}
                                <div 
                                    className={`mt-2 p-3 bg-black/30 rounded-xl border border-white/5 space-y-2.5 text-sm mb-1 ${
                                        isVipItem ? 'cursor-default' : 'cursor-pointer hover:bg-black/40 active:scale-[0.99] transition-all'
                                    }`}
                                    onClick={() => !isVipItem && onCustomRequest(item)}
                                >
                                    {isVipItem ? (
                                        /* ─── VIP ITEM RENDER ─── */
                                        <>
                                            {/* KTV Info */}
                                            <div className="flex justify-between items-center">
                                                <div className="flex gap-2 items-center">
                                                    <div className="w-5 flex justify-center"><User size={16} className="text-[#e6c487]" /></div>
                                                    <span className="font-medium text-gray-400">KTV</span>
                                                </div>
                                                <span className="font-bold text-[#e6c487]">{vipStaffId}</span>
                                            </div>
                                            {/* Duration */}
                                            <div className="flex justify-between items-center">
                                                <div className="flex gap-2 items-center">
                                                    <div className="w-5 flex justify-center"><Clock size={16} className="text-gray-400" /></div>
                                                    <span className="font-medium text-gray-400">{dict.checkout?.time || 'Thời gian'}</span>
                                                </div>
                                                <span className="font-bold text-[#C9A96E]">
                                                    {vipDuration} {dict.checkout?.mins || 'phút'}
                                                </span>
                                            </div>
                                            {/* Skills Chips */}
                                            {vipSkillIds && vipSkillIds.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-1 pt-2 border-t border-white/5">
                                                    {vipSkillIds.map((skillId: string) => {
                                                        const skill = SKILL_MAP[skillId];
                                                        const name = skill ? getSkillName(skill, vipLang) : skillId;
                                                        const isChinhSkill = skill?.type === 'CHINH';
                                                        return (
                                                            <span key={skillId} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                                                                isChinhSkill
                                                                    ? 'bg-[#e6c487]/15 text-[#e6c487] border-[#e6c487]/30'
                                                                    : 'bg-white/5 text-[#d0c5b5] border-white/10'
                                                            }`}>
                                                                {name}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        /* ─── STANDARD ITEM RENDER (unchanged) ─── */
                                        <>
                                    {/* Duration */}
                                    {(item.timeValue > 0 || item.timeDisplay) && (
                                        <div className="flex justify-between items-center">
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
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-2 items-center">
                                            <div className="w-5 flex justify-center"><Hand size={16} className="text-gray-400" /></div>
                                            <span className="font-medium text-gray-400">{dict.checkout.strength_label}</span>
                                        </div>
                                        <span className={`font-bold capitalize ${getStrengthColor(strength)}`}>
                                            {dict.options?.strength_levels?.[strength?.toLowerCase()] || strength}
                                        </span>
                                    </div>

                                    {/* Therapist */}
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-2 items-center">
                                            <div className="w-5 flex justify-center"><User size={16} className="text-gray-400" /></div>
                                            <span className="font-medium text-gray-400">{dict.checkout.therapist_label}</span>
                                        </div>
                                        <span className={`font-bold capitalize ${getTherapistColor(therapist)}`}>
                                            {dict.options?.therapist_options?.[therapist?.toLowerCase()] || therapist}
                                        </span>
                                    </div>

                                    {/* Avoid */}
                                    {item.options?.bodyParts?.avoid && item.options.bodyParts.avoid.length > 0 && (
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-2 items-center shrink-0 mt-0.5">
                                                <div className="w-5 flex justify-center"><Ban size={16} className="text-gray-400" /></div>
                                                <span className="font-medium text-gray-400">{dict.checkout.avoid}</span>
                                            </div>
                                            <span className="text-[#C9A96E] font-bold leading-tight mt-0.5 text-right w-2/3">
                                                {formatParts(item.options.bodyParts.avoid)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Focus */}
                                    {item.options?.bodyParts?.focus && item.options.bodyParts.focus.length > 0 && (
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-2 items-center shrink-0 mt-0.5">
                                                <div className="w-5 flex justify-center"><HeartPulse size={16} className="text-gray-400" /></div>
                                                <span className="font-medium text-gray-400">{dict.checkout.focus}</span>
                                            </div>
                                            <span className="text-[#C9A96E] font-bold leading-tight mt-0.5 text-right w-2/3">
                                                {formatParts(item.options.bodyParts.focus)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Tags & Note Content - Footer */}
                                    {item.options?.notes && (item.options.notes.tag0 || item.options.notes.tag1 || item.options.notes.content) && (
                                        <div className="mt-2 pt-2 border-t border-white/5 flex flex-col gap-2">
                                            {/* Tags */}
                                            {(item.options.notes.tag0 || item.options.notes.tag1) && (
                                                <div className="flex justify-end gap-2">
                                                    {item.options.notes.tag0 && (
                                                        <span className="bg-[#C9A96E]/20 text-[#C9A96E] text-[10px] px-2 py-1 rounded border border-[#C9A96E]/30 font-bold uppercase">
                                                            {dict.tags?.pregnant || 'Pregnant'}
                                                        </span>
                                                    )}
                                                    {item.options.notes.tag1 && (
                                                        <span className="bg-[#C9A96E]/20 text-[#C9A96E] text-[10px] px-2 py-1 rounded border border-[#C9A96E]/30 font-bold uppercase">
                                                            {dict.tags?.allergy || 'Allergy'}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {/* Note Content */}
                                            {item.options.notes.content && (
                                                <div className="flex justify-between gap-4 text-xs italic text-gray-400 mt-1">
                                                    <span className="shrink-0">{dict.history?.note_label || 'Note'}</span>
                                                    <span className="text-right text-[#C9A96E] font-medium not-italic">{item.options.notes.content}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Total Divider */}
                <div className="h-0 border-t-2 border-dashed border-white/10 my-6"></div>

                {/* Total */}
                <div className="flex justify-between items-baseline">
                    <span className="text-white font-bold text-lg">{dict.checkout?.total_bill || 'Total'}</span>
                    <div className="text-right">
                        <span className={`block text-3xl font-black ${currency === 'USD' ? 'text-emerald-600' : 'text-[#C9A96E]'}`}>
                            {currency === 'USD'
                                ? `${total} USD`
                                : `${formatCurrency(total)} VND`
                            }
                        </span>
                        <div className="text-xs text-gray-500 italic mt-1">{dict.checkout?.price_includes_vat || '*Price includes VAT'}</div>
                    </div>
                </div>
            </div>

        </div >
    );
}
