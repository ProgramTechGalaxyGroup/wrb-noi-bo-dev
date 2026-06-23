'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import StaffSelector from './StaffSelector';
import BookingConfig from './BookingConfig';
import VipCartStep from './VipCartStep';
import { type VipStaffInfo } from '@/lib/vipStaffUtils';
import { type VipPricingTable } from '@/lib/vipPricingEngine';
import { SKILL_MAP, type VipLang } from '@/lib/vipSkills.constants';
import { getSkillName } from '@/lib/vipStaffUtils';
import { useMenuData } from '@/components/Menu/MenuContext';
import { getT } from './Premium.i18n';
import { type VipEditSaveData } from '@/components/Checkout/VipEditModal';

// =============================================
// 👑 Premium Menu – VIP Booking Flow
// Luồng: STAFF → BOOKING_CONFIG (→ Cart sheet overlay)
// Cart sheet: review, edit, xóa, thêm gói khác
// =============================================

// 🔧 UI CONFIGURATION
const PROGRESS_MAP: Record<string, string> = {
    STAFF:          '25%',
    BOOKING_CONFIG: '60%',
};

interface PremiumMenuProps {
    lang: string;
    isBookingFlow?: boolean;
    onBack: () => void;
    onCheckout: () => void;
    onSwitchToStandard?: () => void;
}

type MenuStep = 'STAFF' | 'BOOKING_CONFIG';

const PremiumMenu = ({ lang, isBookingFlow, onBack, onCheckout, onSwitchToStandard }: PremiumMenuProps) => {
    const t = getT(lang);
    const { cart, addVipToCart, updateVipCartItem, removeVipGroup } = useMenuData();
    const [step, setStep]         = useState<MenuStep>('STAFF');
    const [isCartOpen, setIsCartOpen] = useState(false);

    // VIP pricing table from SystemConfigs
    const [vipPricingTable, setVipPricingTable] = useState<VipPricingTable | undefined>(undefined);

    // Selected staff for current booking flow
    const [selectedStaffIds, setSelectedStaffIds]           = useState<string[]>([]);
    const [selectedStaffInfoList, setSelectedStaffInfoList] = useState<VipStaffInfo[]>([]);
    const [bufferMinutes, setBufferMinutes]                 = useState<number>(30);

    // Số lượng gói VIP đã đặt (để hiển thị badge trên nút Cart)
    const vipGroupCount = cart.filter(i => i.itemType === 'vip' && i.priceVND > 0).length;

    // Fetch VIP pricing table
    useEffect(() => {
        fetch('/api/config/menu-vip')
            .then(res => res.json())
            .then(data => {
                if (data.pricing && typeof data.pricing === 'object' && !Array.isArray(data.pricing)) {
                    setVipPricingTable(data.pricing as VipPricingTable);
                }
                if (typeof data.bufferMinutes === 'number') {
                    setBufferMinutes(data.bufferMinutes);
                }
            })
            .catch(err => console.error('[VIP] Failed to fetch pricing:', err));
    }, []);

    // ── Navigation ──────────────────────────────────
    const handleBack = () => {
        switch (step) {
            case 'STAFF':          onBack(); break;
            case 'BOOKING_CONFIG': setStep('STAFF'); break;
        }
    };

    const getStepTitle = () => {
        switch (step) {
            case 'STAFF':          return t.step_staff;
            case 'BOOKING_CONFIG': return t.step_config;
        }
    };

    // ── BookingConfig confirm → thêm vào cart + mở sheet ──
    const handleBookingConfirm = (data: {
        skillsMap: Record<string, string[]>;
        totalDuration: number;
        timeSlot: string | null;
        totalPrice: number;
        appointmentDate: string | null;
        customerNotes?: string;
    }) => {
        const allSkillIds = Object.values(data.skillsMap).flat();
        const skillNames  = allSkillIds.map((id: string) => {
            const skill = SKILL_MAP[id];
            return skill ? getSkillName(skill, lang as VipLang) : id;
        });
        const uniqueNames = [...new Set(skillNames)];
        const displayName = uniqueNames.length > 0 ? uniqueNames.join(' + ') : 'VIP Bespoke';

        addVipToCart({
            staffIds:      selectedStaffIds,
            staffInfoList: selectedStaffInfoList,
            skillIds:      allSkillIds,
            displayName,
            duration:      data.totalDuration,
            totalPrice:    data.totalPrice || 0,
            customerNotes: data.customerNotes,
        });

        // Mở Cart sheet overlay thay vì navigate sang step mới
        setIsCartOpen(true);
    };

    // ── Cart Sheet handlers ──────────────────────────
    const handleCartUpdateItem = (cartId: string, saveData: VipEditSaveData) => {
        updateVipCartItem(cartId, {
            vipSkillIds:      saveData.vipSkillIds,
            vipDuration:      saveData.vipDuration,
            vipDisplayName:   saveData.vipDisplayName,
            vipCustomerNotes: saveData.vipCustomerNotes,
            priceVND:         saveData.priceVND,
        });
    };

    // "Thêm gói khác": đóng sheet → quay về STAFF, giữ cart
    const handleAddAnother = () => {
        setSelectedStaffIds([]);
        setSelectedStaffInfoList([]);
        setStep('STAFF');
    };

    return (
        <div className="w-full h-full bg-[#131315] text-[#e4e2e4] flex flex-col relative overflow-hidden">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 h-[2px] bg-[#1b1b1d] w-full z-30">
                <motion.div
                    className="h-full bg-[#e6c487]"
                    initial={{ width: '0%' }}
                    animate={{ width: PROGRESS_MAP[step] || '0%' }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-20 bg-[#0e0e10]/80 backdrop-blur-xl shadow-[0_0_40px_rgba(201,169,110,0.04)]">
                <div className="flex justify-between items-center px-6 py-3.5">
                    <button
                        onClick={handleBack}
                        className="text-[#e6c487] p-1 hover:bg-white/5 rounded-full transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <h1 className="text-lg font-serif italic tracking-[0.2em] text-[#e6c487]">
                        {getStepTitle()}
                    </h1>

                    {/* Right: Cart badge hoặc Switch to Standard */}
                    <div className="flex items-center gap-2">
                        {/* Cart badge — hiển thị khi có gói đã đặt */}
                        {vipGroupCount > 0 && (
                            <button
                                onClick={() => setIsCartOpen(true)}
                                className="relative w-9 h-9 rounded-full bg-[#e6c487]/15 border border-[#e6c487]/30 flex items-center justify-center hover:bg-[#e6c487]/25 transition-colors"
                            >
                                <span className="text-[#e6c487] font-black text-sm">{vipGroupCount}</span>
                                {/* Pulse indicator */}
                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#e6c487] animate-ping opacity-60" />
                                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#e6c487]" />
                            </button>
                        )}

                        {step === 'STAFF' && onSwitchToStandard ? (
                            <button
                                onClick={onSwitchToStandard}
                                className="text-[10px] font-bold text-[#d0c5b5] tracking-wider px-3 py-1.5 rounded-full border border-[#4d463a]/50 hover:bg-white/5 transition-colors"
                            >
                                ☰ MENU
                            </button>
                        ) : vipGroupCount === 0 ? (
                            <div className="w-6" />
                        ) : null}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
                <div className="w-full lg:max-w-5xl lg:mx-auto lg:px-8 pb-32">
                    <AnimatePresence mode="wait">
                        {/* STAFF STEP */}
                        {step === 'STAFF' && (
                            <motion.div
                                key="staff"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.3 }}
                                className="w-full"
                            >
                                <StaffSelector
                                    lang={lang}
                                    onConfirmSelection={(ids, staffInfoList) => {
                                        setSelectedStaffIds(ids);
                                        setSelectedStaffInfoList(staffInfoList);
                                        setStep('BOOKING_CONFIG');
                                    }}
                                />
                            </motion.div>
                        )}

                        {/* BOOKING CONFIG STEP */}
                        {step === 'BOOKING_CONFIG' && (
                            <motion.div
                                key="booking"
                                initial={{ opacity: 0, x: 30 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -30 }}
                                transition={{ duration: 0.3 }}
                                className="w-full"
                            >
                                <BookingConfig
                                    lang={lang}
                                    isBookingFlow={isBookingFlow}
                                    selectedStaffIds={selectedStaffIds}
                                    selectedStaffInfoList={selectedStaffInfoList}
                                    vipPricingTable={vipPricingTable}
                                    bufferMinutes={bufferMinutes}
                                    onConfirm={handleBookingConfirm}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── VIP Cart Bottom Sheet ──────────────── */}
            <VipCartStep
                cart={cart}
                lang={lang}
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                onCheckout={onCheckout}
                onAddAnother={handleAddAnother}
                onUpdateItem={handleCartUpdateItem}
                onRemoveGroup={removeVipGroup}
            />
        </div>
    );
};

export default PremiumMenu;
