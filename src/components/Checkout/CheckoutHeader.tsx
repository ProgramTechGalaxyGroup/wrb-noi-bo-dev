import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface CheckoutHeaderProps {
    title: string;
    backLabel?: string;
    onBack: () => void;
    rightAction?: React.ReactNode;
}

export default function CheckoutHeader({ title, backLabel = "Menu", onBack, rightAction }: CheckoutHeaderProps) {
    return (
        <div className="sticky top-0 z-50 bg-[#0d0d0d]/95 backdrop-blur-sm pb-4 mb-6 shadow-sm border-b border-white/10 transition-all pt-[calc(env(safe-area-inset-top))]">
            {/* Top Bar: Back + Title */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 mb-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1 text-[#C9A96E] font-medium text-sm hover:text-[#E2C285] transition-colors"
                >
                    <ChevronLeft size={20} />
                    <span>{backLabel}</span>
                </button>
                <h1 className="text-[#C9A96E] font-bold text-base absolute left-1/2 -translate-x-1/2">
                    {title}
                </h1>
                {rightAction ? (
                    rightAction
                ) : (
                    <div className="w-10"></div> /* Spacer for alignment */
                )}
            </div>

            {/* Branding Row */}
            <div className="px-5 flex items-center justify-between">
                <h2 className="text-white text-2xl font-bold tracking-tight">
                    Ngan Ha Spa
                </h2>
                {/* Logo Placeholder */}
                <img
                    src="/assets/logos/spavang.png"
                    alt="Ngan Ha Spa Logo"
                    className="w-12 h-12 object-contain opacity-90"
                    onError={(e) => { e.currentTarget.src = '/assets/logos/spaden.png' }}
                />
            </div>
        </div>
    );
}
