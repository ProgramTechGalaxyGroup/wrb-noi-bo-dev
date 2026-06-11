import React, { useState, useEffect, useMemo } from 'react';
import { X, Minus, Plus, Hand, User, Heart, Ban, Tag, MessageSquare, Clock } from 'lucide-react';
import { useMenuData } from '@/components/Menu/MenuContext';
import { Service, CartState, CartItem, ServiceOptions } from '@/components/Menu/types';
import { formatCurrency as formatMoney, formatCurrency } from '@/components/Menu/utils'; // Alias formatMoney to formatCurrency
import CustomForYouModal from '@/components/CustomForYou';
import { ServiceData, CustomPreferences, LanguageCode } from '@/components/CustomForYou/types';
import { getDictionary } from '@/lib/dictionaries';
import AlertModal from '@/components/Shared/AlertModal';

interface CartDrawerProps {
    cart: CartState;
    services: Service[];
    lang: string;
    isOpen: boolean;
    onClose: () => void;
    onUpdateCart: (id: string, quantity: number) => void;
    onCheckout: () => void; // New prop for checkout navigation
}

// 🔧 UI CONFIGURATION
const CONFIG = {
    ANIMATION_DURATION: 300,
    BORDER_RADIUS: '30px',
    MAX_HEIGHT: '85vh',
    OVERLAY_COLOR: 'bg-black/60',
    BG_COLOR: 'bg-[#0d0d0d]',
    FOOTER_BG: 'bg-[#1c1c1e]',
};

// Translate Text
const TEXT = {
    title: { vi: 'Dịch vụ đã chọn', en: 'Services Selected', cn: '已选服务', jp: '選択されたサービス', kr: '선택된 서비스' },
    mins: { vi: 'phút', en: 'mins', cn: '分钟', jp: '分', kr: '分' },
    total: { vi: 'TỔNG CỘNG', en: 'TOTAL', cn: '总计', jp: '合計', kr: '합계' },
    close: { vi: 'ĐÓNG', en: 'CLOSE', cn: '关闭', jp: '閉じる', kr: '닫기' },
    continue: { vi: 'TIẾP TỤC', en: 'CONTINUE', cn: '继续', jp: '継続する', kr: '계속' },
    empty: { vi: 'Giỏ hàng trống', en: 'Your cart is empty', cn: '购物车为空', jp: 'カートは空です', kr: '장바구니가 비어 있습니다' },
    alert_empty: { vi: 'Vui lòng chọn ít nhất 1 dịch vụ!', en: 'Please select at least 1 service!', cn: '请 ít nhất 1 dịch vụ!', jp: '少なくとも1つのサービスを選択してください！', kr: '최소 1개의 서비스를 chuyên vụ!' },
    qty: { vi: 'Số lượng (Qty)', en: 'Quantity (Qty)', cn: '数量 (Qty)', jp: '数量 (Qty)', kr: '수량 (Qty)' },
};

/**
 * [NEW] CustomizationSummary Component
 * Displays the details of "Custom For You" options.
 */
const CustomizationSummary = ({ item, lang, onClick }: { item: CartItem & { totalQty: number }; lang: string; onClick?: () => void }) => {
    const dict = getDictionary(lang);
    const options = item.options;

    const translatePart = (key: string) => {
        const bodyPartsDict = dict.body_parts as Record<string, string>;
        return bodyPartsDict[key] || key;
    };

    const getStrengthColor = (s?: string) => 'text-[#C9A96E]';
    const getTherapistColor = (t?: string) => 'text-[#C9A96E]';

    return (
        <div 
            onClick={onClick}
            className="mt-1 p-3 bg-black/30 rounded-xl border border-white/5 space-y-2.5 cursor-pointer hover:bg-black/40 active:scale-[0.99] transition-all"
        >
            {/* Time */}
            {(item.timeValue > 0 || item.timeDisplay) && (
                <div className="flex justify-between items-center text-[12px]">
                    <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-gray-400" />
                        <span className="text-gray-400">{dict.checkout?.time || (lang === 'en' ? 'Time' : 'Thời gian')}</span>
                    </div>
                    <span className="font-bold text-[#C9A96E]">
                        {item.timeDisplay 
                            ? item.timeDisplay.replace('mins', dict.checkout?.mins || (lang === 'vi' ? 'phút' : 'mins'))
                            : `${item.timeValue} ${dict.checkout?.mins || (lang === 'vi' ? 'phút' : 'mins')}`
                        }
                    </span>
                </div>
            )}

            {/* Strength */}
            {options?.strength && (
                <div className="flex justify-between items-center text-[12px]">
                    <div className="flex items-center gap-1.5">
                        <Hand size={13} className="text-gray-400" />
                        <span className="text-gray-400">{dict.checkout?.strength}</span>
                    </div>
                    <span className={`font-bold ${getStrengthColor(options.strength)}`}>
                        {dict.options?.strength_levels?.[options.strength] || options.strength}
                    </span>
                </div>
            )}

            {/* Therapist */}
            {options?.therapist && (
                <div className="flex justify-between items-center text-[12px]">
                    <div className="flex items-center gap-1.5">
                        <User size={13} className="text-gray-400" />
                        <span className="text-gray-400">{dict.checkout?.therapist}</span>
                    </div>
                    <span className={`font-bold ${getTherapistColor(options.therapist)}`}>
                        {dict.options?.therapist_options?.[options.therapist] || options.therapist}
                    </span>
                </div>
            )}

            {/* Avoid */}
            {options?.bodyParts?.avoid && options.bodyParts.avoid.length > 0 && (
                <div className="flex justify-between items-start text-[12px]">
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        <Ban size={13} className="text-gray-400" />
                        <span className="text-gray-400">{dict.checkout?.avoid}</span>
                    </div>
                    <span className="font-bold text-[#C9A96E] text-right">
                        {options.bodyParts.avoid.length === 8 
                            ? (dict.custom_for_you?.full_body || 'Full Body')
                            : options.bodyParts.avoid.map(translatePart).join(', ')}
                    </span>
                </div>
            )}

            {/* Focus - Xếp cuối cùng trong nhóm thuộc tính */}
            {options?.bodyParts?.focus && options.bodyParts.focus.length > 0 && (
                <div className="flex justify-between items-start text-[12px]">
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        <Heart size={13} className="text-gray-400" />
                        <span className="text-gray-400">{dict.checkout?.focus}</span>
                    </div>
                    <span className="font-bold text-[#C9A96E] text-right">
                        {options.bodyParts.focus.length === 8 
                            ? (dict.custom_for_you?.full_body || 'Full Body')
                            : options.bodyParts.focus.map(translatePart).join(', ')}
                    </span>
                </div>
            )}

            {/* Tags & Content */}
            {(options?.notes?.tag0 || options?.notes?.tag1 || options?.notes?.content) && (
                <div className="space-y-2 pt-1 border-t border-white/5">
                    <div className="flex flex-wrap justify-end gap-2">
                        {options.notes?.tag0 && (
                            <span className="bg-[#C9A96E]/20 text-[#C9A96E] text-[9px] font-bold px-2 py-0.5 rounded uppercase border border-[#C9A96E]/30">
                                {dict.tags?.pregnant}
                            </span>
                        )}
                        {options.notes?.tag1 && (
                            <span className="bg-[#C9A96E]/20 text-[#C9A96E] text-[9px] font-bold px-2 py-0.5 rounded uppercase border border-[#C9A96E]/30">
                                {dict.tags?.allergy}
                            </span>
                        )}
                    </div>
                    {options.notes?.content && (
                        <div className="flex justify-between gap-4 text-[11px] italic text-gray-400">
                            <span className="shrink-0">{dict.history?.note_label || 'Note'}</span>
                            <span className="text-right text-[#C9A96E] font-medium not-italic">{options.notes.content}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function CartDrawer({ cart, services, lang, isOpen, onClose, onUpdateCart, onCheckout }: CartDrawerProps) {
    const [isClosing, setIsClosing] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    // [LOGIC NEW] Customization State
    const [editingItem, setEditingItem] = useState<CartItem | null>(null);
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
    const [alertState, setAlertState] = useState<{ isOpen: boolean; message: string; type?: 'error' | 'success' | 'info' }>({ isOpen: false, message: '' });

    const { addToCart, removeFromCart, updateCartItemOptions } = useMenuData();

    useEffect(() => {
        if (isOpen) {
            setIsVisible(false); // Reset trước
            setIsClosing(false);
            const timer = setTimeout(() => setIsVisible(true), 10);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    /**
     * Group items logic:
     * Now group by ID AND Options to ensure unique customizations are shown separately.
     */
    const groupedCart = useMemo(() => {
        const groups: { [key: string]: CartItem & { totalQty: number; displayKey: string } } = {};

        cart.forEach(item => {
            // Create a unique key based on ID and serialized options
            const optionsKey = JSON.stringify(item.options || {});
            const displayKey = `${item.id}-${optionsKey}`;

            if (!groups[displayKey]) {
                groups[displayKey] = { ...item, totalQty: 0, displayKey };
            }
            groups[displayKey].totalQty += item.qty;
        });

        return Object.values(groups);
    }, [cart]);

    const handleOpenCustomModal = (item: CartItem) => {
        setEditingItem(item);
        setIsCustomModalOpen(true);
    };

    const handleSaveCustom = (prefs: CustomPreferences) => {
        if (!editingItem) return;

        // Map CustomPreferences back to ServiceOptions
        const options: ServiceOptions = {
            strength: prefs.strength as any,
            therapist: prefs.therapist as any,
            bodyParts: prefs.bodyParts,
            notes: prefs.notes
        };

        updateCartItemOptions(editingItem.cartId, options);
        setIsCustomModalOpen(false);
        setEditingItem(null);
    };

    const mapCartItemToServiceData = (item: CartItem): ServiceData => {
        return {
            ID: item.id,
            NAMES: item.names as any,
            FOCUS_POSITION: item.FOCUS_POSITION as any,
            TAGS: item.TAGS as any,
            SHOW_STRENGTH: item.SHOW_STRENGTH,
            SHOW_GENDER: item.SHOW_GENDER,
            SHOW_FOCUS: item.SHOW_FOCUS,
            SHOW_NOTES: item.SHOW_NOTES,
            SHOW_PREFERENCES: item.SHOW_PREFERENCES,
            HINT: item.HINT as any,
            PRICE_VN: item.priceVND,
            PRICE_USD: item.priceUSD
        };
    };

    const handlePlus = (item: CartItem) => {
        // [MODIFIED] Preserve options when adding quantity
        addToCart(item as any, 1, item.options);
    };

    const handleMinus = (displayKey: string) => {
        // Find the last instance in the cart that matches this group's displayKey
        // In grouped view, the "displayKey" identifies items with same ID and Options.
        const instance = cart.find(c => {
            const optionsKey = JSON.stringify(c.options || {});
            return `${c.id}-${optionsKey}` === displayKey;
        });

        if (instance) {
            removeFromCart(instance.cartId);
        }
    };

    // Restore missing logic
    const { totalVND, totalUSD } = useMemo(() => {
        return cart.reduce((acc, item) => ({
            totalVND: acc.totalVND + (item.priceVND || 0) * item.qty,
            totalUSD: acc.totalUSD + (item.priceUSD || 0) * item.qty
        }), { totalVND: 0, totalUSD: 0 });
    }, [cart]);

    const t = (key: keyof typeof TEXT) => TEXT[key][lang as keyof typeof TEXT['title']] || TEXT[key]['en'];

    const handleContinue = () => {
        if (cart.length === 0) {
            setAlertState({
                isOpen: true,
                message: t('alert_empty'),
                type: 'error'
            });
            return;
        }
        onCheckout();
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 ${CONFIG.OVERLAY_COLOR} z-40 transition-opacity duration-${CONFIG.ANIMATION_DURATION} ${isClosing ? 'opacity-0' : 'opacity-100'}`}
                onClick={handleClose}
            />

            {/* Drawer Container */}
            <div className={`
                fixed bottom-0 left-0 w-full ${CONFIG.BG_COLOR} rounded-t-[${CONFIG.BORDER_RADIUS}] z-50 overflow-hidden flex flex-col shadow-2xl
                transform transition-transform duration-${CONFIG.ANIMATION_DURATION} ease-out pb-safe
                ${(isClosing || !isVisible) ? 'translate-y-full' : 'translate-y-0'}
            `} style={{ maxHeight: CONFIG.MAX_HEIGHT }}>

                {/* Header handle bar */}
                <div className="w-full flex justify-center pt-3 pb-1">
                    <div className="w-12 h-1.5 bg-gray-600 rounded-full opacity-50"></div>
                </div>

                {/* Title */}
                <div className="text-center pb-6 pt-2">
                    <h2 className="text-xl font-bold text-[#C9A96E] uppercase tracking-widest">{t('title')}</h2>
                    <div className="w-10 h-0.5 bg-[#b6965b] mx-auto mt-2"></div>
                </div>

                {/* 3. Danh sách món (Grouped) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {groupedCart.length === 0 ? (
                        <div className="text-center text-gray-500 italic mt-10">
                            {t('empty')}
                        </div>
                    ) : (
                        groupedCart.map((item) => (
                            <div key={item.displayKey} className="flex flex-col gap-3 bg-[#1c1c1e] p-4 rounded-2xl border border-white/5 shadow-lg relative">
                                <div className="flex gap-4">
                                    {/* Info Middle */}
                                    <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0">
                                        {/* Row 1: Name and Price */}
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-white leading-tight text-[16px] pr-2">{item.names[lang]}</h4>
                                            <div className="font-bold text-white text-[15px] shrink-0">
                                                {formatMoney(item.priceVND * item.totalQty)} VND
                                            </div>
                                        </div>

                                        {/* Row 2: Quantity Only */}
                                        <div className="flex justify-between items-center mt-2 border-t border-white/5 pt-2">
                                            <span className="text-xs text-gray-400 font-medium">{t('qty')}</span>
                                            {/* Quantity Controls (Condensed Pill Shape) */}
                                            <div className="flex items-center gap-2 bg-white/5 rounded-full px-2 py-0.5 border border-white/5">
                                                <button
                                                    onClick={() => handleMinus(item.displayKey)}
                                                    className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                                                >
                                                    <Minus size={12} />
                                                </button>
                                                <span className="font-bold text-white w-4 text-center text-[13px]">{item.totalQty}</span>
                                                <button
                                                    onClick={() => handlePlus(item)}
                                                    className="w-7 h-7 flex items-center justify-center text-[#C9A96E] hover:text-[#dfc599] transition-colors"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* [LOGIC NEW] Customization Summary (Clickable to Edit) */}
                                <CustomizationSummary 
                                    item={item} 
                                    lang={lang} 
                                    onClick={() => handleOpenCustomModal(item)}
                                />
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Totals & Actions */}
                <div className={`p-5 ${CONFIG.FOOTER_BG} border-t border-white/5`}>

                    {/* Total Row */}
                    <div className="flex justify-between items-end mb-6">
                        <span className="text-gray-400 font-bold tracking-widest text-sm mb-1 uppercase">{t('total')}</span>
                        <div className="text-right">
                            <div className="text-xl font-bold text-[#C9A96E]">
                                {formatCurrency(totalVND)} VND <span className="text-sm font-normal text-gray-400">/</span> <span className="text-emerald-600 font-bold">{totalUSD} USD</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button
                            onClick={handleClose}
                            className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 font-bold uppercase hover:bg-white/5 hover:text-white transition-all active:scale-95"
                        >
                            {t('close')}
                        </button>
                        <button
                            onClick={handleContinue}
                            className="flex-[1.5] py-4 rounded-2xl bg-[#b6965b] text-white font-bold uppercase shadow-lg shadow-[#b6965b]/20 hover:bg-[#C9A96E] transition-all active:scale-95"
                        >
                            {t('continue')}
                        </button>
                    </div>
                </div>

            </div>

            {/* Custom For You Modal */}
            {editingItem && (
                <CustomForYouModal
                    isOpen={isCustomModalOpen}
                    onClose={() => {
                        setIsCustomModalOpen(false);
                        setEditingItem(null);
                    }}
                    onSave={handleSaveCustom}
                    serviceData={mapCartItemToServiceData(editingItem)}
                    lang={lang as LanguageCode}
                    initialData={editingItem.options as any}
                />
            )}

            <AlertModal
                isOpen={alertState.isOpen}
                message={alertState.message}
                type={alertState.type}
                onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                lang={lang}
            />
        </>
    );
}
