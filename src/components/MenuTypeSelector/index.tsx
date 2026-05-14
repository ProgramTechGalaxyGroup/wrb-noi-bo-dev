"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./style.module.css";
import { ArrowLeft, X } from "lucide-react";

// ============================================================================
// 👇 KHU VỰC CẤU HÌNH ẢNH SÁCH (SỬA LINK ẢNH Ở ĐÂY) 👇
// ============================================================================
const BOOK_IMAGES = {
    standard: "/assets/logos/menu-standard.webp",
    vip: "/assets/logos/menu-premium.webp",
    homespa: "/assets/logos/menu-premium.webp" // Thay link sách HomeSpa tại đây
};
// ============================================================================

// ============================================================================
// 👇 KHU VỰC CHỈNH SỬA GIAO DIỆN (CHỈ CẦN SỬA SỐ Ở ĐÂY) 👇
// ============================================================================
const LAYOUT_CONFIG = {
    // 1. CẤU HÌNH LOGO & TIÊU ĐỀ
    header: {
        marginTop: "10px",       // Đẩy xuống một chút để không bị cắt Logo
        gapLogoText: "5px",      // Khoảng cách Logo - Chữ gần hơn
        marginBottom: "15px",    // Khoảng cách Chữ - Sách gần hơn
        logoHeight: "80px",      // Giảm chiều cao Logo cho đỡ chiếm chỗ
        logoWidth: "260px",      // Giảm chiều rộng tương ứng
        titleSize: "18px",       // Giảm cỡ chữ tiêu đề 1 chút
    },

    // 2. CẤU HÌNH CUỐN SÁCH MENU
    books: {
        width: "155px",          // Giảm chiều rộng một chút để vừa 3 sách
        height: "195px",         // Giảm chiều cao một chút để vừa màn hình điện thoại
        gap: "20px",             // Giảm khoảng cách giữa 2 sách
        titleSize: "20px",       // Cỡ chữ tên gói
        descSize: "11px",        // Cỡ chữ mô tả
    }
};
// ============================================================================

interface Props {
    lang: string;
    onSelect: (type: 'standard' | 'vip' | 'homespa') => void;
    onBack?: () => void;
}

const texts: Record<string, any> = {
    en: { title: "Select Service Menu", std: "Standard", std_desc: "(Random Staff & Room)", vip: "Premium", vip_desc: "(Design your own journey)", hms: "HomeSpa", hms_desc: "(Spa at your place)", btn_back: "Back" },
    vi: { title: "Chọn Thực Đơn", std: "Tiêu Chuẩn", std_desc: "(KTV & Phòng Ngẫu nhiên)", vip: "Cao Cấp", vip_desc: "(Tự chọn KTV & Dịch vụ)", hms: "HomeSpa", hms_desc: "(Spa tận nhà)", btn_back: "Quay lại" },
    kr: { title: "서비스 메뉴 선택", std: "스탠다드", std_desc: "(직원 및 객실 무작위)", vip: "프리미엄", vip_desc: "(나만의 코스 설계)", hms: "홈스파", hms_desc: "(출장 스파)", btn_back: "돌아가기" },
    cn: { title: "选择服务菜单", std: "标准", std_desc: "(随机员工和房间)", vip: "高级", vip_desc: "(定制您的旅程)", hms: "上门水疗", hms_desc: "(在家享受水疗)", btn_back: "返回" },
    jp: { title: "サービスメニュー", std: "標準", std_desc: "(スタッフ・部屋おまかせ)", vip: "プレミアム", vip_desc: "(カスタムコース)", hms: "ホームスパ", hms_desc: "(出張スパ)", btn_back: "戻る" }
};

export default function MenuTypeSelector({ lang, onSelect, onBack }: Props) {
    const t = texts[lang] || texts['en'];
    const [comingSoon, setComingSoon] = useState<string | null>(null);
    const [vipEnabled, setVipEnabled] = useState(false);

    // Fetch VIP config from SystemConfigs
    useEffect(() => {
        fetch('/api/config/menu-vip')
            .then(res => res.json())
            .then(data => setVipEnabled(data.enabled === true))
            .catch(() => setVipEnabled(false));
    }, []);

    // Coming Soon text
    const csText: Record<string, { title: string; desc: string; close: string }> = {
        en: { title: 'Coming Soon', desc: 'This service is being prepared. Stay tuned!', close: 'Close' },
        vi: { title: 'Sắp Ra Mắt', desc: 'Dịch vụ đang được chuẩn bị. Hãy đón chờ nhé!', close: 'Đóng' },
        kr: { title: '곧 출시', desc: '서비스를 준비 중입니다. 기대해 주세요!', close: '닫기' },
        cn: { title: '即将推出', desc: '服务正在筹备中，敬请期待！', close: '关闭' },
        jp: { title: '近日公開', desc: 'サービス準備中です。お楽しみに！', close: '閉じる' },
    };
    const cs = csText[lang] || csText['en'];

    return (
    <>
        <div className="flex flex-col items-center justify-between h-full w-full max-h-full py-2 relative">

            {/* MŨI TÊN QUAY LẠI (GÓC TRÁI TRÊN) */}
            {onBack && (
                <button
                    onClick={onBack}
                    className="absolute top-4 left-2 z-30 p-2 cursor-pointer opacity-50 hover:opacity-100 transition-opacity flex items-center"
                >
                    <ArrowLeft className="text-white w-6 h-6" strokeWidth={1.5} />
                </button>
            )}

            {/* 1. HEADER */}
            <div
                className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700 shrink-0"
                style={{
                    marginTop: LAYOUT_CONFIG.header.marginTop,
                    marginBottom: LAYOUT_CONFIG.header.marginBottom // Áp dụng khoảng cách xuống sách
                }}
            >
                <div
                    className="mx-auto relative animate-pulse z-10"
                    style={{ height: LAYOUT_CONFIG.header.logoHeight, width: LAYOUT_CONFIG.header.logoWidth }}
                >
                    <div className="relative w-full h-full">
                        <Image
                            src="/assets/logos/logo-gold.webp"
                            alt="Ngan Ha Spa"
                            fill
                            className="object-contain drop-shadow-[0_0_25px_rgba(234,179,8,0.6)]"
                            priority
                            sizes="(max-width: 768px) 100vw, 450px"
                        />
                    </div>
                </div>
                <p
                    className="gold-text-shiny font-bold text-yellow-500/90 mt-0 italic"
                    style={{
                        fontSize: LAYOUT_CONFIG.header.titleSize,
                        marginTop: LAYOUT_CONFIG.header.gapLogoText // Áp dụng khoảng cách Logo - Text
                    }}
                >
                    {t.title}
                </p>
            </div>

            {/* 2. BOOKS CONTAINER */}
            <div
                className="flex flex-col md:flex-row justify-center items-center w-full flex-1 min-h-0"
                style={{ gap: LAYOUT_CONFIG.books.gap }}
            >

                {/* === BOOK 1: STANDARD === */}
                <div
                    onClick={() => onSelect('standard')}
                    className={`group ${styles.bookWrapper} cursor-pointer active:scale-95 transition-transform duration-300 animate-in fade-in slide-in-from-left-8 delay-150 fill-mode-forwards relative`}
                >
                    <div
                        className={`${styles.bookCover} ${styles.perspective1000} relative`}
                        style={{ width: LAYOUT_CONFIG.books.width, height: LAYOUT_CONFIG.books.height }}
                    >
                        <div className={`${styles.bgCover} relative overflow-hidden`}>
                            <Image
                                src={BOOK_IMAGES.standard}
                                alt="Standard Menu Book"
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 500px"
                            />
                        </div>

                        {/* TEXT ON STANDARD BOOK */}
                        <div className="absolute left-[14%] top-[26%] w-[78%] h-[55%] z-20 flex flex-col items-center justify-center text-center">
                            <h3
                                className="font-bold -luxury text-[#4a3800] drop-shadow-sm leading-tight mb-1 w-full"
                                style={{ fontSize: LAYOUT_CONFIG.books.titleSize }}
                            >
                                {t.std}
                            </h3>
                            <p
                                className="font-bold-body text-[#5c4000] font-semibold w-full px-1"
                                style={{ fontSize: LAYOUT_CONFIG.books.descSize }}
                            >
                                {t.std_desc}
                            </p>
                            <div className="mt-2 w-20 bg-[#000000] opacity-50 rounded-full" />
                        </div>
                    </div>
                </div>

                {/* === BOOK 2: PREMIUM === */}
                <div
                    onClick={() => vipEnabled ? onSelect('vip') : setComingSoon('vip')}
                    className={`group ${styles.bookWrapper} cursor-pointer active:scale-95 transition-transform duration-300 animate-in fade-in slide-in-from-right-8 delay-300 fill-mode-forwards relative`}
                >
                    <div
                        className={`${styles.bookCover} ${styles.perspective1000} relative`}
                        style={{ width: LAYOUT_CONFIG.books.width, height: LAYOUT_CONFIG.books.height }}
                    >
                        <div className={`${styles.bgCover} relative overflow-hidden`}>
                            <Image
                                src={BOOK_IMAGES.vip}
                                alt="Premium Menu Book"
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 500px"
                            />
                        </div>
                        <div className={styles.shineEffect} />

                        {/* TEXT ON PREMIUM BOOK */}
                        <div className="absolute left-[14%] top-[34%] w-[78%] h-[50%] z-20 flex flex-col items-center justify-center text-center">
                            <h3
                                className="gold-text-shiny font-bold uppercase tracking-wider group-hover:brightness-125 mb-1"
                                style={{ fontSize: LAYOUT_CONFIG.books.titleSize }}
                            >
                                {t.vip}
                            </h3>
                            <p
                                className="gold-text-shiny font-bold uppercase tracking-wider group-hover:brightness-125"
                                style={{ fontSize: LAYOUT_CONFIG.books.descSize }}
                            >
                                {t.vip_desc}
                            </p>
                            <div className="mt-3 w-12 bg-yellow-500 opacity-60 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
                        </div>
                    </div>
                </div>

                {/* === BOOK 3: HOMESPA (NEW) === */}
                <div
                    onClick={() => setComingSoon('homespa')}
                    className={`group ${styles.bookWrapper} cursor-pointer active:scale-95 transition-transform duration-300 animate-in fade-in slide-in-from-right-8 delay-500 fill-mode-forwards relative`}
                >
                    <div
                        className={`${styles.bookCover} ${styles.perspective1000} relative`}
                        style={{ width: LAYOUT_CONFIG.books.width, height: LAYOUT_CONFIG.books.height }}
                    >
                        <div className={`${styles.bgCover} relative overflow-hidden`}>
                            <Image
                                src={BOOK_IMAGES.homespa}
                                alt="HomeSpa Menu Book"
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 500px"
                            />
                        </div>
                        <div className={styles.shineEffect} />

                        {/* TEXT ON HOMESPA BOOK */}
                        <div className="absolute left-[14%] top-[34%] w-[78%] h-[50%] z-20 flex flex-col items-center justify-center text-center">
                            <h3
                                className="gold-text-shiny font-bold uppercase tracking-wider group-hover:brightness-125 mb-1"
                                style={{ fontSize: LAYOUT_CONFIG.books.titleSize }}
                            >
                                {t.hms}
                            </h3>
                            <p
                                className="gold-text-shiny font-bold uppercase tracking-wider group-hover:brightness-125"
                                style={{ fontSize: LAYOUT_CONFIG.books.descSize }}
                            >
                                {t.hms_desc}
                            </p>
                            <div className="mt-3 w-12 bg-yellow-500 opacity-60 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
                        </div>
                    </div>
                </div>

            </div>


        </div>

            {/* Coming Soon Modal */}
            {comingSoon && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setComingSoon(null)}
                >
                    <div
                        className="relative bg-[#0f1218] border border-[#B38728]/30 rounded-3xl p-8 max-w-[340px] w-[90%] text-center animate-in zoom-in-95 duration-300 shadow-[0_0_40px_rgba(179,135,40,0.15)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setComingSoon(null)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        {/* Coming Soon icon */}
                        <div className="flex items-center justify-center mb-5">
                            <div className="relative">
                                <div className="absolute inset-0 bg-[#D4AF37] blur-2xl opacity-20 rounded-full" />
                                <div className="w-16 h-16 rounded-full border-2 border-[#B38728]/40 flex items-center justify-center bg-[#B38728]/10">
                                    <span className="text-3xl">⏳</span>
                                </div>
                            </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl font-black uppercase tracking-[0.15em] gold-text-shiny mb-2">
                            {cs.title}
                        </h3>

                        {/* Book name */}
                        <p className="text-white/80 font-bold text-base mb-1">
                            {comingSoon === 'vip' ? t.vip : t.hms}
                        </p>

                        {/* Description */}
                        <p className="text-sm text-gray-400 mb-6 font-medium">
                            {cs.desc}
                        </p>

                        {/* Animated dots */}
                        <div className="flex gap-2 justify-center mb-6">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce"
                                    style={{ animationDelay: `${i * 0.2}s` }}
                                />
                            ))}
                        </div>

                        {/* Close button */}
                        <button
                            onClick={() => setComingSoon(null)}
                            className="px-8 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-[#B38728]/40 text-[#D4AF37] font-bold text-sm uppercase tracking-widest transition-all active:scale-95"
                        >
                            {cs.close}
                        </button>
                    </div>
                </div>
            )}
    </>
    );
};