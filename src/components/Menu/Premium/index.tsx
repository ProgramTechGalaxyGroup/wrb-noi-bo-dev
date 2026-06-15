'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import StaffSelector from './StaffSelector';
import BookingConfig from './BookingConfig';
import ConfirmationScreen from './ConfirmationScreen';
import { type VipStaffInfo } from '@/lib/vipStaffUtils';
import { type VipPricingTable } from '@/lib/vipPricingEngine';
import { SKILL_MAP, type VipLang } from '@/lib/vipSkills.constants';
import { getSkillName } from '@/lib/vipStaffUtils';
import { useMenuData } from '@/components/Menu/MenuContext';
import { getT } from './Premium.i18n';

// =============================================
// 👑 Premium Menu – VIP Booking Flow
// Luồng mới: STAFF → BOOKING_CONFIG → CONFIRMATION
// Skip Intent + Category (đi thẳng chọn nhân viên)
// =============================================

// 🔧 UI CONFIGURATION
const PROGRESS_MAP: Record<string, string> = {
  STAFF: '25%',
  BOOKING_CONFIG: '60%',
  CONFIRMATION: '100%',
};

interface PremiumMenuProps {
  lang: string;
  isBookingFlow?: boolean;
  onBack: () => void;
  onCheckout: () => void;
  onSwitchToStandard?: () => void;
}

type MenuStep = 'STAFF' | 'BOOKING_CONFIG' | 'CONFIRMATION';

const PremiumMenu = ({ lang, isBookingFlow, onBack, onCheckout, onSwitchToStandard }: PremiumMenuProps) => {
  const t = getT(lang);
  const { addVipToCart } = useMenuData();
  const [step, setStep] = useState<MenuStep>('STAFF');

  // VIP pricing table from SystemConfigs (2D: numStaff → duration → price)
  const [vipPricingTable, setVipPricingTable] = useState<VipPricingTable | undefined>(undefined);

  // Flow state
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [selectedStaffInfoList, setSelectedStaffInfoList] = useState<VipStaffInfo[]>([]);
  const [selectedSkillsMap, setSelectedSkillsMap] = useState<Record<string, string[]>>({});
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [timeSlot, setTimeSlot] = useState<string | null>(null);
  const [appointmentDate, setAppointmentDate] = useState<string | null>(null);
  const [bufferMinutes, setBufferMinutes] = useState<number>(30);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [customerNotes, setCustomerNotes] = useState<string>('');

  // Fetch VIP pricing table from SystemConfigs
  useEffect(() => {
    fetch('/api/config/menu-vip')
      .then(res => res.json())
      .then(data => {
        // API trả { pricing: VipPricingTable } dạng object 2 chiều
        if (data.pricing && typeof data.pricing === 'object' && !Array.isArray(data.pricing)) {
          setVipPricingTable(data.pricing as VipPricingTable);
        }
        if (typeof data.bufferMinutes === 'number') {
          setBufferMinutes(data.bufferMinutes);
        }
      })
      .catch(err => console.error('[VIP] Failed to fetch pricing:', err));
  }, []);

  const handleBack = () => {
    switch (step) {
      case 'STAFF': onBack(); break;
      case 'BOOKING_CONFIG': setStep('STAFF'); break;
      case 'CONFIRMATION': setStep('BOOKING_CONFIG'); break;
    }
  };
  // Step title for header
  const getStepTitle = () => {
    switch (step) {
      case 'STAFF': return t.step_staff;
      case 'BOOKING_CONFIG': return t.step_config;
      case 'CONFIRMATION': return t.step_confirm;
    }
  };

  return (
    <div className="w-full h-full bg-[#131315] text-[#e4e2e4] flex flex-col relative overflow-hidden">
      {/* Progress Bar (top edge) */}
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

          {/* Right: Switch to Standard menu (only on STAFF step) */}
          {step === 'STAFF' && onSwitchToStandard ? (
            <button
              onClick={onSwitchToStandard}
              className="text-[10px] font-bold text-[#d0c5b5] tracking-wider px-3 py-1.5 rounded-full border border-[#4d463a]/50 hover:bg-white/5 transition-colors"
            >
              ☰ MENU
            </button>
          ) : (
            <div className="w-6" />
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
        <div className="w-full lg:max-w-5xl lg:mx-auto lg:px-8 pb-32">
          <AnimatePresence mode="wait">
            {step === 'STAFF' && (
              <motion.div key="staff" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="w-full">
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

            {step === 'BOOKING_CONFIG' && (
              <motion.div key="booking" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="w-full">
                <BookingConfig
                  lang={lang}
                  isBookingFlow={isBookingFlow}
                  selectedStaffIds={selectedStaffIds}
                  selectedStaffInfoList={selectedStaffInfoList}
                  vipPricingTable={vipPricingTable}
                  bufferMinutes={bufferMinutes}
                  onConfirm={(data) => {
                    // Check if walk-in → add to cart → checkout
                    if (!isBookingFlow) {
                      // Build display name from skills
                      const allSkillIds = Object.values(data.skillsMap).flat();
                      const skillNames = allSkillIds.map((id: string) => {
                        const skill = SKILL_MAP[id];
                        return skill ? getSkillName(skill, lang as VipLang) : id;
                      });
                      const uniqueNames = [...new Set(skillNames)];
                      const displayName = uniqueNames.length > 0 ? uniqueNames.join(' + ') : 'VIP Bespoke';

                      // Add to shared cart
                      addVipToCart({
                        staffIds: selectedStaffIds,
                        staffInfoList: selectedStaffInfoList,
                        skillIds: allSkillIds,
                        displayName,
                        duration: data.totalDuration,
                        totalPrice: data.totalPrice || 0,
                        customerNotes: data.customerNotes,
                      });

                      // Navigate to shared checkout page
                      onCheckout();
                    } else {
                      // Advance booking → go to ConfirmationScreen (future feature)
                      setSelectedSkillsMap(data.skillsMap);
                      setTotalDuration(data.totalDuration);
                      setTimeSlot(data.timeSlot);
                      setTotalPrice(data.totalPrice || 0);
                      setAppointmentDate(data.appointmentDate);
                      setCustomerNotes(data.customerNotes || '');
                      setStep('CONFIRMATION');
                    }
                  }}
                />
              </motion.div>
            )}

            {step === 'CONFIRMATION' && (
              <motion.div key="confirmation" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="w-full">
                <ConfirmationScreen
                  lang={lang}
                  selectedStaffIds={selectedStaffIds}
                  selectedStaffInfoList={selectedStaffInfoList}
                  selectedSkillsMap={selectedSkillsMap}
                  totalDuration={totalDuration}
                  timeSlot={timeSlot}
                  appointmentDate={appointmentDate}
                  totalPrice={totalPrice}
                  initialCustomerNotes={customerNotes}
                  onConfirm={() => { onBack(); }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default PremiumMenu;
