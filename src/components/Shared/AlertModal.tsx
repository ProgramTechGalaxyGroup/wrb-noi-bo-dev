'use client';
import React from 'react';

// 🔧 UI CONFIGURATION
const DEFAULT_AUTO_CLOSE_MS = 0; // 0 means no auto-close

interface AlertModalProps {
    isOpen: boolean;
    title?: string;
    message: string;
    type?: 'info' | 'error' | 'success';
    onClose: () => void;
    lang?: string;
}

/**
 * AlertModal — A customized replacement for window.alert()
 * Adheres to the Deep Black & Gold theme.
 */
export default function AlertModal({ isOpen, title, message, type = 'error', onClose, lang = 'vi' }: AlertModalProps) {
    if (!isOpen) return null;

    let icon = null;
    let iconColors = '';
    let btnColors = '';

    if (type === 'error') {
        iconColors = 'bg-[#FF3B30]/10 text-[#FF3B30] border border-[#FF3B30]/20 shadow-[0_0_15px_rgba(255,59,48,0.2)]';
        btnColors = 'bg-[#FF3B30] text-white hover:bg-red-700 shadow-[#FF3B30]/20';
        icon = (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
        );
    } else if (type === 'success') {
        iconColors = 'bg-green-500/10 text-green-500 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]';
        btnColors = 'bg-green-500 text-white hover:bg-green-600 shadow-green-500/20';
        icon = (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
        );
    } else {
        iconColors = 'bg-[#C9A96E]/10 text-[#C9A96E] border border-[#C9A96E]/20 shadow-[0_0_15px_rgba(201,169,110,0.2)]';
        btnColors = 'bg-[#C9A96E] text-black hover:bg-[#b09461] shadow-[#C9A96E]/20';
        icon = (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
        );
    }

    const alertI18n: Record<string, { error: string; info: string; button: string }> = {
        vi: { error: 'Thông báo', info: 'Thông tin', button: 'Đã hiểu' },
        en: { error: 'Alert', info: 'Information', button: 'Got it' },
        kr: { error: '알림', info: '안내', button: '확인' },
        cn: { error: '提示', info: '信息', button: '知道了' },
        jp: { error: 'お知らせ', info: '情報', button: '了解' },
    };
    const langTexts = alertI18n[lang] || alertI18n['en'];
    const defaultTitle = type === 'error' ? langTexts.error : langTexts.info;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#1c1c1e] w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-white/5 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${iconColors}`}>
                    {icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{title || defaultTitle}</h3>
                <p className="text-gray-400 text-[15px] mb-8 leading-relaxed bg-[#0d0d0d] p-4 rounded-2xl w-full border border-white/5">
                    {message}
                </p>
                <div className="flex w-full">
                    <button onClick={onClose} className={`w-full py-4 rounded-xl font-bold border-none shadow-lg transition-colors ${btnColors}`}>
                        {langTexts.button}
                    </button>
                </div>
            </div>
        </div>
    );
}
