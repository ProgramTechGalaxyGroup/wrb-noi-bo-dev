/* File: src/app/[lang]/customer-type/page.tsx */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { UserCheck, ArrowRight, X, Loader2, ArrowLeft, History, Search, Calendar } from "lucide-react";
import { useCustomerTypeLogic } from "./CustomerType.logic";
import { GoogleLoginBtn } from '@/components/Auth/GoogleLoginBtn';

// ============================================================================
// 👇 KHU VỰC CHỈNH SỬA GIAO DIỆN (SỬA SỐ Ở ĐÂY) 👇
// ============================================================================
const LAYOUT_CONFIG = {
  // 1. CẤU HÌNH LOGO
  logo: {
    size: "180px",           // Kích thước Logo (Vuông)
    marginBottom: "20px",    // Khoảng cách từ Logo xuống Tiêu đề
  },

  // 2. CẤU HÌNH TIÊU ĐỀ
  text: {
    titleSize: "28px",       // Cỡ chữ tiêu đề chính (WELCOME...)
    marginBottom: "30px",    // Khoảng cách từ chữ xuống nút đầu tiên
  },

  // 3. CẤU HÌNH NÚT BẤM (BUTTONS)
  buttons: {
    height: "70px",          // Chiều cao của 2 nút chính
    gap: "16px",             // Khoảng cách giữa 2 nút
    fontSizeTitle: "16px",   // Cỡ chữ tiêu đề trong nút
    fontSizeDesc: "11px",    // Cỡ chữ mô tả (nhỏ) trong nút KH mới
    iconSize: 22,            // Kích thước Icon (số, không phải px)
  }
};
// ============================================================================

export default function CustomerTypePage() {
  const params = useParams();
  const lang = (params?.lang as string) || "en";
  const [inputEmail, setInputEmail] = useState("");

  const {
    t,                    // <-- Lấy hàm dịch
    showPopup,
    popupStep,
    isLoading,
    onSelectOldUser,
    onSelectWalkIn,
    onSelectAdvance,
    handleCheckUserEmail,
    handleRetry,
    closePopup,
    handleBack,           // <-- Lấy hàm quay lại
    handleLogoutClick,    // <-- Lấy hàm đăng xuất
    user,                 // <-- Lấy thông tin user đăng nhập
    getCommonAnimationClass,
    getPopupOverlayClass, // <-- Lấy animation popup
    getPopupContentClass  // <-- Lấy animation content
  } = useCustomerTypeLogic(lang);

  return (
    <div className="w-full h-[100dvh] flex flex-col justify-center items-center px-6 relative overflow-hidden bg-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">

      {/* --- NỀN --- */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-black/0 z-0" />
        <img
          src="/assets/backgrounds/galaxy.webp"
          alt="Spa Background"
          className="w-full h-full object-cover opacity-100"
        />
        <div className="absolute inset-0 bg-black/40 z-10" />
        <img src="/assets/backgrounds/galaxy.webp" alt="Background" className="bg-image" />
        <div className="shooting-star star-1"></div>
        <div className="shooting-star star-2"></div>
        <div className="shooting-star star-3"></div>

      </div>

      {/* --- MŨI TÊN QUAY LẠI (GÓC TRÁI TRÊN) --- */}
      <button
        onClick={user ? handleLogoutClick : handleBack}
        className="absolute top-4 left-4 z-20 p-2 cursor-pointer opacity-50 hover:opacity-100 transition-opacity flex items-center"
        style={{ top: 'calc(16px + env(safe-area-inset-top))' }}
      >
        <ArrowLeft className="text-white w-6 h-6" strokeWidth={1.5} />
      </button>

      <div className={`z-10 w-full max-w-md flex flex-col ${getCommonAnimationClass()}`} style={{ gap: LAYOUT_CONFIG.buttons.gap }}>

        {/* --- LOGO --- */}
        <div
          className="mx-auto relative flex items-center justify-center"
          style={{
            width: LAYOUT_CONFIG.logo.size,
            height: LAYOUT_CONFIG.logo.size,
            marginBottom: LAYOUT_CONFIG.logo.marginBottom
          }}
        >
          <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl animate-pulse"></div>
          <img src="/assets/logos/logo-only-gold.webp" alt="Logo" className="w-full h-full object-contain relative z-10 drop-shadow-lg" />
        </div>

        {/* --- TIÊU ĐỀ (Dùng t() để dịch) --- */}
        <div className="text-center flex flex-col items-center" style={{ marginBottom: LAYOUT_CONFIG.text.marginBottom }}>
          <h1
            className="font-bold uppercase tracking-[0.1em] mb-2 font-luxury gold-text-shiny drop-shadow-md"
            style={{ fontSize: LAYOUT_CONFIG.text.titleSize }}
          >
            {t('wc_title')}
          </h1>

        </div>

        {/* --- NÚT ĐẶT ĐƠN TẠI TIỆM --- */}
        <button
          onClick={onSelectWalkIn}
          style={{ height: LAYOUT_CONFIG.buttons.height }}
          className="w-full h-auto py-4 bg-white/10 hover:bg-white/20 border-2 border-[#B38728]/60 rounded-[1.5rem] flex items-center justify-between px-8 transition-all active:scale-[0.98] backdrop-blur-sm"
        >
          <div className="flex flex-col items-start text-left">
            <span
              className="gold-text-shiny font-bold uppercase tracking-wider"
              style={{ fontSize: LAYOUT_CONFIG.buttons.fontSizeTitle }}
            >
              {t('btn_walkin_title')}
            </span>
            <span
              className="text-gray-400 font-normal tracking-tight italic"
              style={{ fontSize: LAYOUT_CONFIG.buttons.fontSizeDesc }}
            >
              {t('btn_walkin_desc')}
            </span>
          </div>
          <div className="w-10 h-10 bg-[#B38728]/30 rounded-full flex items-center justify-center backdrop-blur-sm">
            <ArrowRight size={LAYOUT_CONFIG.buttons.iconSize} className="text-[#D4AF37]" />
          </div>
        </button>

        {/* --- NÚT ĐẶT LỊCH TRƯỚC --- */}
        <button
          onClick={onSelectAdvance}
          style={{ height: LAYOUT_CONFIG.buttons.height }}
          className="w-full h-auto py-4 bg-white/10 hover:bg-white/20 border-2 border-[#B38728]/60 rounded-[1.5rem] flex items-center justify-between px-8 transition-all active:scale-[0.98] backdrop-blur-sm"
        >
          <div className="flex flex-col items-start text-left">
            <span
              className="gold-text-shiny font-bold uppercase tracking-wider"
              style={{ fontSize: LAYOUT_CONFIG.buttons.fontSizeTitle }}
            >
              {t('btn_booking_title')}
            </span>
            <span
              className="text-gray-400 font-normal tracking-tight italic"
              style={{ fontSize: LAYOUT_CONFIG.buttons.fontSizeDesc }}
            >
              {t('btn_booking_desc')}
            </span>
          </div>
          <div className="w-10 h-10 bg-[#B38728]/30 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Calendar size={LAYOUT_CONFIG.buttons.iconSize} className="text-[#D4AF37]" />
          </div>
        </button>

        {/* --- NÚT KHÁCH HÀNG CŨ --- */}
        <button
          onClick={onSelectOldUser}
          style={{ height: LAYOUT_CONFIG.buttons.height }}
          className="w-full h-auto py-4 bg-white/10 hover:bg-white/20 border-2 border-[#B38728]/60 rounded-[1.5rem] flex items-center justify-between px-8 transition-all active:scale-[0.98] backdrop-blur-sm"
        >
          <span className="gold-text-shiny font-bold uppercase tracking-widest" style={{ fontSize: LAYOUT_CONFIG.buttons.fontSizeTitle }}>
            {t('btn_old_title')}
          </span>
          <div className="w-10 h-10 bg-[#B38728]/30 rounded-full flex items-center justify-center backdrop-blur-sm">
            <History size={LAYOUT_CONFIG.buttons.iconSize} className="text-[#D4AF37]" />
          </div>
        </button>


      </div>

      {/* --- POPUP --- */}
      {/* Áp dụng class animation từ Logic */}
      <div className={getPopupOverlayClass(showPopup)}>
        <div className={`${getPopupContentClass(showPopup)} !bg-[#0f1218] !border-[#2a2f3e] !rounded-[32px] !p-8 !max-w-[400px]`}>
          {/* Note: Override styles for dark theme look */}

          {popupStep === 'input' ? (
            <div className="flex flex-col items-center text-center">
              {/* Icon Clock Gold */}
              <div className="mb-6 relative">
                <div className="w-20 h-20 rounded-full border-4 border-[#8B6E40]/30 flex items-center justify-center">
                  <History size={48} className="text-[#D4AF37]" strokeWidth={2.5} />
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 bg-[#D4AF37] blur-3xl opacity-20 rounded-full"></div>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">
                {t('find_history')}
              </h3>
              <p className="text-sm text-gray-400 mb-6 font-medium">
                {t('desc_enter_email')}
              </p>

              {/* Google Login */}
              <div className="w-full mb-4 shadow-lg rounded-[8px]">
                <GoogleLoginBtn lang={lang} />
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 w-full mb-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{t('or_manual')}</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <div className="w-full space-y-4">
                <input
                  type="email"
                  placeholder={t('input_placeholder')}
                  className="w-full bg-[#161b26] border border-[#2a3040] rounded-2xl p-4 text-white text-center font-bold text-lg focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] outline-none transition-all placeholder-gray-600"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckUserEmail(inputEmail)}
                  autoFocus
                />

                <button
                  onClick={() => handleCheckUserEmail(inputEmail)}
                  disabled={isLoading}
                  className="w-full bg-[#EAB308] hover:bg-[#d9a507] text-black font-extrabold text-[15px] py-4 rounded-2xl uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98]"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>
                      {t('search')} <Search size={18} strokeWidth={3} />
                    </>
                  )}
                </button>

                <button
                  onClick={closePopup}
                  className="text-gray-500 hover:text-white text-sm font-medium underline-offset-4 hover:underline transition-colors mt-2"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 text-center animate-in zoom-in duration-300">
              {/* Not Found State - Keep somewhat consistent but dark */}
              <div className="mx-auto w-20 h-20 rounded-full bg-red-500/10 border-4 border-red-500/20 flex items-center justify-center text-red-500 mb-2">
                <X size={40} strokeWidth={3} />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-1">{t('error_not_found')}</h3>
                <p className="text-sm text-gray-400">{t('error_desc')}</p>
              </div>

              <div className="flex flex-col gap-3 mt-4">
                <button onClick={handleRetry} className="w-full bg-[#2a2f3e] hover:bg-[#353b4d] text-white font-bold py-3.5 rounded-xl border border-white/5 transition-colors">
                  {t('btn_retry')}
                </button>
                <button onClick={closePopup} className="w-full bg-[#EAB308] hover:bg-[#d9a507] text-black font-bold py-3.5 rounded-xl uppercase tracking-wide shadow-md transition-colors">
                  {t('btn_register_new')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}