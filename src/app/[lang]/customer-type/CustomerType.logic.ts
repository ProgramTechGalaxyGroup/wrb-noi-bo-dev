/*
 * File: src/app/[lang]/customer-type/CustomerType.logic.ts
 * Chức năng: Logic xử lý chọn khách hàng, Popup check mail & Animation
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { translations, TranslationKey } from "./CustomerType.i18n";
// Animation imports
import { getPopupOverlayClass, getPopupContentClass } from "./CustomerType.animation";
// ✅ Import hàm check từ Service theo chuẩn Barrel File
import { checkUserEmail } from "@/services/user";
import { useAuthStore } from "@/lib/authStore.logic";
import { useGoogleLogin } from "@/components/Auth/GoogleLoginBtn.logic";

import { useMenuData } from "@/components/Menu/MenuContext";

export const useCustomerTypeLogic = (lang: string) => {
  const router = useRouter();
  const { user } = useAuthStore();
  const { handleLogout } = useGoogleLogin(lang);
  const { clearCart } = useMenuData();

  // --- 1. CÁC STATE QUẢN LÝ ---
  const [isExiting, setIsExiting] = useState(false); // Animation chuyển trang
  const [showPopup, setShowPopup] = useState(false); // Bật/Tắt Popup
  const [popupStep, setPopupStep] = useState<'input' | 'error'>('input'); // Bước của popup
  const [isLoading, setIsLoading] = useState(false); // Loading khi gọi Firebase

  // --- 2. HÀM DỊCH NGÔN NGỮ ---
  const t = (key: TranslationKey) => {
    if (translations[lang] && translations[lang][key]) {
      return translations[lang][key];
    }
    if (translations['en'] && translations['en'][key]) {
      return translations['en'][key];
    }
    return key;
  };

  // --- 3. LOGIC XỬ LÝ ĐẶT ĐƠN TẠI TIỆM (Walk-in) ---
  const onSelectWalkIn = () => {
    setShowPopup(false);
    clearCart();
    setIsExiting(true);

    setTimeout(() => {
      router.push(`/${lang}/new-user/select-menu`);
    }, 500);
  };

  // --- 4. LOGIC XỬ LÝ ĐẶT LỊCH (Advance Booking) ---
  const onSelectAdvance = () => {
    setShowPopup(false);
    clearCart();
    setIsExiting(true);

    setTimeout(() => {
      router.push(`/${lang}/new-user/booking/select-menu`);
    }, 500);
  };

  // --- 4. LOGIC XỬ LÝ KHÁCH HÀNG CŨ (XEM LỊCH SỬ) ---
  const onSelectOldUser = () => {
    if (user?.email) {
      // Nếu đã có email từ Google Login -> Check luôn, bỏ qua popup
      handleCheckUserEmail(user.email);
    } else {
      // Nếu không có email (Guest) -> Hiện popup kêu nhập email
      setPopupStep('input');
      setShowPopup(true);
    }
  };

  // --- 5. LOGIC CHECK EMAIL VỚI FIREBASE ---
  const handleCheckUserEmail = async (email: string) => {
    if (!email.trim()) return;

    setIsLoading(true);

    const result = await checkUserEmail(email);

    setIsLoading(false);

    if (result.exists && result.customer) {
      localStorage.setItem('currentUserEmail', email);
      // Save full info for Auto-fill
      localStorage.setItem('currentUserInfo', JSON.stringify(result.customer));

      setIsExiting(true);
      setTimeout(() => {
        router.push(`/${lang}/old-user/history`);
      }, 500);
    } else {
      setPopupStep('error');
    }
  };

  // --- 6. CÁC HÀM PHỤ TRỢ ---
  const handleRetry = () => setPopupStep('input');
  const closePopup = () => setShowPopup(false);

  const handleBack = () => {
    setIsExiting(true);
    setTimeout(() => router.push('/'), 500);
  };

  const handleLogoutClick = () => {
    setIsExiting(true);
    setTimeout(async () => {
      await handleLogout();
      router.push(`/`);
    }, 500);
  };

  const getCommonAnimationClass = () =>
    `transition-all duration-700 ease-out transform ${isExiting ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`;

  // --- 7. TRẢ VỀ ---
  return {
    // State
    isExiting,
    showPopup,
    popupStep,
    isLoading,

    // Functions
    t,
    onSelectWalkIn,
    onSelectAdvance,
    onSelectOldUser,
    handleCheckUserEmail,
    handleRetry,
    closePopup,
    handleBack,
    handleLogoutClick,
    user,

    // Animation Helpers
    getCommonAnimationClass,
    getPopupOverlayClass,
    getPopupContentClass
  };
};