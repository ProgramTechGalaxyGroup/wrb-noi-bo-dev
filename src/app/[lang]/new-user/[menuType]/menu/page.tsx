'use client';

import React from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';

// --- IMPORT 2 GIAO DIỆN LỚN ---
// Tự động tìm file index.tsx trong thư mục tương ứng
import StandardMenu from '@/components/Menu/Standard';
import PremiumMenu from '@/components/Menu/Premium';

export default function MenuPage() {
    // 1. Lấy tham số từ URL
    const params = useParams();
    const router = useRouter();

    // URL dạng: /en/new-user/standard/menu
    // -> lang = "en"
    // -> menuType = "standard"
    const menuType = params.menuType as string;
    const lang = (params.lang as string) || 'en';

    // 2. Hàm xử lý quay lại (truyền xuống cho con dùng)
    const handleBack = () => {
        router.back(); // Quay lại trang trước đó (Galaxy hoặc Home)
    };

    // 3. Hàm xử lý Checkout
    const handleCheckout = () => {
        // Chuyển hướng sang trang checkout
        router.push(`/${lang}/new-user/${menuType}/checkout`);
    };

    // 4. LOGIC ĐIỀU PHỐI (ROUTING)

    // Trường hợp 1: Menu Thường
    if (menuType === 'standard') {
        return <StandardMenu lang={lang} onBack={handleBack} onCheckout={handleCheckout} />;
    }

    // Trường hợp 2: Menu VIP (Premium)
    if (menuType === 'vip') {
        return <PremiumMenu lang={lang} onBack={handleBack} onCheckout={handleCheckout} />;
    }

    // Trường hợp 3: Người dùng nhập bậy bạ (vd: .../abc/menu) -> Trả về 404
    return notFound();
}