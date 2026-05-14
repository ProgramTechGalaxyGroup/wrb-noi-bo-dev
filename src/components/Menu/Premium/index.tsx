'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import StaffSelector from './StaffSelector';
import BookingConfig from './BookingConfig';
import ConfirmationScreen from './ConfirmationScreen';

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

interface VipPricing {
  duration: number;
  price: number;
  label: string;
}

interface PremiumMenuProps {
  lang: string;
  onBack: () => void;
  onCheckout: () => void;
}

type MenuStep = 'STAFF' | 'BOOKING_CONFIG' | 'CONFIRMATION';

const PremiumMenu = ({ lang, onBack, onCheckout }: PremiumMenuProps) => {
  const isVi = lang === 'vi';
  const [step, setStep] = useState<MenuStep>('STAFF');

  // VIP pricing from SystemConfigs
  const [vipPricing, setVipPricing] = useState<VipPricing[]>([]);

  // Flow state
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [selectedSkillsMap, setSelectedSkillsMap] = useState<Record<string, string[]>>({});
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [timeSlot, setTimeSlot] = useState<string | null>(null);
  const [totalPrice, setTotalPrice] = useState<number>(0);

  // Fetch VIP pricing from SystemConfigs
  useEffect(() => {
    fetch('/api/config/menu-vip')
      .then(res => res.json())
      .then(data => {
        if (data.pricing && Array.isArray(data.pricing)) {
          setVipPricing(data.pricing);
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
      case 'STAFF': return isVi ? 'CHỌN CHUYÊN GIA' : 'SELECT EXPERT';
      case 'BOOKING_CONFIG': return isVi ? 'TÙY CHỌN DỊCH VỤ' : 'CUSTOMIZE';
      case 'CONFIRMATION': return isVi ? 'XÁC NHẬN' : 'CONFIRM';
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

          {/* Right spacer */}
          <div className="w-6" />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait">
          {step === 'STAFF' && (
            <motion.div
              key="staff"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <StaffSelector
                lang={lang}
                onConfirmSelection={(ids) => {
                  setSelectedStaffIds(ids);
                  setStep('BOOKING_CONFIG');
                }}
              />
            </motion.div>
          )}

          {step === 'BOOKING_CONFIG' && (
            <motion.div
              key="booking"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <BookingConfig
                lang={lang}
                selectedStaffIds={selectedStaffIds}
                vipPricing={vipPricing}
                onConfirm={(data) => {
                  setSelectedSkillsMap(data.skillsMap);
                  setTotalDuration(data.totalDuration);
                  setTimeSlot(data.timeSlot);
                  setTotalPrice(data.totalPrice || 0);
                  setStep('CONFIRMATION');
                }}
              />
            </motion.div>
          )}

          {step === 'CONFIRMATION' && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <ConfirmationScreen
                lang={lang}
                selectedStaffIds={selectedStaffIds}
                selectedSkillsMap={selectedSkillsMap}
                totalDuration={totalDuration}
                timeSlot={timeSlot}
                totalPrice={totalPrice}
                onConfirm={() => {
                  // TODO: Push data to backend then redirect
                  onCheckout();
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PremiumMenu;
