'use client';

import React from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import StandardMenu from '@/components/Menu/Standard';
import PremiumMenu from '@/components/Menu/Premium';

export default function OldUserMenuPage() {
    const params = useParams();
    const router = useRouter();

    const menuType = params.menuType as string;
    const lang = (params.lang as string) || 'en';

    const handleBack = () => {
        router.back();
    };

    const handleCheckout = () => {
        // Redirect to OLD USER checkout
        router.push(`/${lang}/old-user/${menuType}/checkout`);
    };

    if (menuType === 'standard') {
        return <StandardMenu lang={lang} onBack={handleBack} onCheckout={handleCheckout} />;
    }

    if (menuType === 'vip' || menuType === 'premium') {
        return <PremiumMenu lang={lang} onBack={handleBack} onCheckout={handleCheckout} />;
    }

    return notFound();
}
