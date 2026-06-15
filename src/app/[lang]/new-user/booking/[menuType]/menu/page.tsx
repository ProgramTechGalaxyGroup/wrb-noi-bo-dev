'use client';

import React, { use } from 'react';
import { useRouter, notFound } from 'next/navigation';

// --- IMPORT 2 GIAO DIỆN LỚN ---
import StandardMenu from '@/components/Menu/Standard';
import PremiumMenu from '@/components/Menu/Premium';

export default function BookingMenuPage({ params }: { params: Promise<{ lang: string; menuType: string }> }) {
    // 1. Lấy tham số từ URL
    const resolvedParams = use(params);
    const router = useRouter();

    const menuType = resolvedParams.menuType;
    const lang = resolvedParams.lang || 'en';

    // 2. Hàm xử lý quay lại
    const handleBack = () => {
        router.back();
    };

    // 3. Hàm xử lý Checkout (Nhảy sang booking checkout)
    const handleCheckout = () => {
        // Chuyển hướng sang trang booking checkout
        router.push(`/${lang}/new-user/booking/${menuType}/checkout`);
    };

    // 4. Cross-menu navigation (cart giữ nguyên qua MenuContext)
    const handleSwitchToVip = () => {
        router.push(`/${lang}/new-user/booking/vip/menu`);
    };
    const handleSwitchToStandard = () => {
        router.push(`/${lang}/new-user/booking/standard/menu`);
    };

    // 5. LOGIC ĐIỀU PHỐI (ROUTING)

    // Trường hợp 1: Menu Thường
    if (menuType === 'standard') {
        return <StandardMenu lang={lang} onBack={handleBack} onCheckout={handleCheckout} onSwitchToVip={handleSwitchToVip} />;
    }

    // Trường hợp 2: Menu VIP (Premium)
    if (menuType === 'vip') {
        return <PremiumMenu lang={lang} isBookingFlow={true} onBack={handleBack} onCheckout={handleCheckout} onSwitchToStandard={handleSwitchToStandard} />;
    }

    // Trường hợp 3: Người dùng nhập bậy bạ -> Trả về 404
    return notFound();
}
