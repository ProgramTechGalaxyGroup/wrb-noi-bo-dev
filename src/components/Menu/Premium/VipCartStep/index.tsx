'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Crown, Plus, ShoppingBag, Trash2, Pencil, Clock,
    ChevronRight, User, Sparkles, X,
} from 'lucide-react';
import { CartItem } from '@/components/Menu/types';
import { formatCurrency } from '@/components/Menu/utils';
import { SKILL_MAP, type VipLang } from '@/lib/vipSkills.constants';
import { getSkillName } from '@/lib/vipStaffUtils';
import VipEditModal, { type VipEditSaveData } from '@/components/Checkout/VipEditModal';

// =============================================
// 🔧 UI CONFIGURATION
// =============================================
const SHEET_MAX_HEIGHT  = '88dvh';
const ANIMATION_DURATION = 300; // ms — must match Tailwind duration
const STAGGER_DELAY      = 0.06;

// =============================================
// 📌 TYPES
// =============================================
interface VipBookingGroup {
    groupId: string;
    primaryItem: CartItem;
    companions: CartItem[];
    totalPrice: number;
    allStaffNames: string[];
}

export interface VipCartStepProps {
    cart: CartItem[];
    lang: string;
    isOpen: boolean;
    onClose: () => void;
    onCheckout: () => void;
    onAddAnother: () => void;
    onUpdateItem: (cartId: string, data: VipEditSaveData) => void;
    onRemoveGroup: (groupId: string) => void;
}

// =============================================
// 📌 i18n
// =============================================
const TEXT: Record<string, Record<string, string>> = {
    vi: {
        title:          'Giỏ hàng VIP',
        empty:          'Chưa có gói nào',
        empty_sub:      'Hãy chọn KTV và cấu hình dịch vụ',
        add_another:    'Thêm gói VIP khác',
        checkout_btn:   'Tiến hành thanh toán',
        total:          'TỔNG CỘNG',
        close:          'ĐÓNG',
        ktv_label:      'KTV:',
        skills_label:   'Kỹ năng:',
        duration_label: 'Thời gian:',
        mins:           'phút',
        notes_label:    'Ghi chú:',
        edit:           'Chỉnh sửa',
        delete:         'Xóa',
        delete_confirm: 'Xóa gói này?',
        delete_sub:     'Hành động này không thể hoàn tác',
        cancel:         'Hủy',
        pkg:            'Gói',
    },
    en: {
        title:          'VIP Cart',
        empty:          'No packages yet',
        empty_sub:      'Select a therapist and configure your service',
        add_another:    'Add another VIP package',
        checkout_btn:   'Proceed to Checkout',
        total:          'TOTAL',
        close:          'CLOSE',
        ktv_label:      'Therapist:',
        skills_label:   'Services:',
        duration_label: 'Duration:',
        mins:           'mins',
        notes_label:    'Notes:',
        edit:           'Edit',
        delete:         'Remove',
        delete_confirm: 'Remove this package?',
        delete_sub:     'This action cannot be undone',
        cancel:         'Cancel',
        pkg:            'Package',
    },
};
const getT = (lang: string) => TEXT[lang] ?? TEXT.vi;

// =============================================
// 🔧 HELPER: Group VIP cart items by booking
// =============================================
const groupVipItems = (cart: CartItem[]): VipBookingGroup[] => {
    const vipItems = cart.filter(i => i.itemType === 'vip');
    const groupMap = new Map<string, CartItem[]>();

    for (const item of vipItems) {
        const name     = item.vipDisplayName || (item.options as any)?.displayName || 'VIP';
        const duration = item.vipDuration    || (item.options as any)?.vipDuration  || item.timeValue || 0;
        const key = `${name}||${duration}`;
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key)!.push(item);
    }

    const groups: VipBookingGroup[] = [];
    for (const [, items] of groupMap) {
        const primary    = items.find(i => i.priceVND > 0) ?? items[0];
        const companions = items.filter(i => i.cartId !== primary.cartId);
        const allStaffNames = [
            primary.vipStaffName || primary.vipStaffId || 'KTV',
            ...companions.map(c => c.vipStaffName || c.vipStaffId || 'KTV'),
        ].filter(Boolean);
        groups.push({ groupId: primary.cartId, primaryItem: primary, companions, totalPrice: primary.priceVND, allStaffNames });
    }
    return groups;
};

// =============================================
// 🎯 COMPONENT — Bottom Sheet
// =============================================
const VipCartStep = ({
    cart, lang, isOpen, onClose, onCheckout, onAddAnother, onUpdateItem, onRemoveGroup,
}: VipCartStepProps) => {
    const t       = getT(lang);
    const vipLang = (lang || 'vi') as VipLang;

    // Sheet visibility animation
    const [isVisible, setIsVisible]   = useState(false);
    const [isClosing, setIsClosing]   = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setIsClosing(false);
        }
    }, [isOpen]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsVisible(false);
            setIsClosing(false);
            onClose();
        }, ANIMATION_DURATION);
    };

    // Edit modal state
    const [editItem, setEditItem]       = useState<CartItem | null>(null);
    const [isEditOpen, setIsEditOpen]   = useState(false);

    // Delete confirm state
    const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);

    const groups     = useMemo(() => groupVipItems(cart), [cart]);
    const grandTotal = useMemo(() => groups.reduce((s, g) => s + g.totalPrice, 0), [groups]);

    const handleEditSave = (cartId: string, data: VipEditSaveData) => {
        onUpdateItem(cartId, data);
        setIsEditOpen(false);
        setEditItem(null);
    };

    const handleDeleteConfirm = () => {
        if (deleteGroupId) {
            onRemoveGroup(deleteGroupId);
            setDeleteGroupId(null);
        }
    };

    if (!isOpen && !isVisible) return null;

    return (
        <>
            {/* ── Overlay ──────────────────────────── */}
            <div
                className={`fixed inset-0 bg-black/65 z-[90] transition-opacity duration-${ANIMATION_DURATION} ${isClosing ? 'opacity-0' : 'opacity-100'}`}
                onClick={handleClose}
            />

            {/* ── Sheet Container ───────────────────── */}
            <div
                className={`
                    fixed bottom-0 left-0 w-full bg-[#0d0d0d] rounded-t-[30px] z-[100]
                    overflow-hidden flex flex-col shadow-2xl
                    transform transition-transform duration-${ANIMATION_DURATION} ease-out
                    ${(isClosing || !isVisible) ? 'translate-y-full' : 'translate-y-0'}
                `}
                style={{ maxHeight: SHEET_MAX_HEIGHT }}
            >
                {/* Handle bar */}
                <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-12 h-1.5 bg-gray-600 rounded-full opacity-50" />
                </div>

                {/* Title */}
                <div className="flex items-center justify-between px-6 pb-4 pt-2 shrink-0 border-b border-white/6">
                    <div className="flex items-center gap-2.5">
                        <Crown size={18} className="text-[#e6c487]" />
                        <h2 className="text-lg font-bold text-[#e6c487] uppercase tracking-widest">
                            {t.title}
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition-colors border border-white/5"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* ── Scrollable Content ────────────── */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">

                    {/* Empty state */}
                    {groups.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-14 gap-4 text-center">
                            <div className="w-14 h-14 rounded-full bg-[#e6c487]/10 border border-[#e6c487]/20 flex items-center justify-center">
                                <ShoppingBag size={24} className="text-[#e6c487]/50" />
                            </div>
                            <div>
                                <p className="text-white font-bold">{t.empty}</p>
                                <p className="text-gray-600 text-sm mt-1">{t.empty_sub}</p>
                            </div>
                        </div>
                    )}

                    {/* Group Cards */}
                    <AnimatePresence mode="popLayout">
                        {groups.map((group, idx) => {
                            const item      = group.primaryItem;
                            const skillIds  = item.vipSkillIds || (item.options as any)?.selectedSkills || [];
                            const duration  = item.vipDuration || (item.options as any)?.vipDuration || item.timeValue;
                            const notes     = item.vipCustomerNotes || item.options?.notes?.content || '';
                            const skillNames = skillIds.map((id: string) => {
                                const s = SKILL_MAP[id];
                                return s ? getSkillName(s, vipLang) : id;
                            });

                            return (
                                <motion.div
                                    key={group.groupId}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -30, scale: 0.96 }}
                                    transition={{ duration: 0.28, delay: idx * STAGGER_DELAY }}
                                    className="bg-[#1c1c1e] rounded-2xl border border-white/5 overflow-hidden shadow-lg"
                                >
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-[#e6c487]/8 to-transparent border-b border-white/5">
                                        <div className="flex items-center gap-2">
                                            <Crown size={12} className="text-[#e6c487]" />
                                            <span className="text-[#e6c487] text-xs font-bold uppercase tracking-widest">
                                                {t.pkg} {idx + 1}
                                            </span>
                                        </div>
                                        <span className="text-[#e6c487] font-black text-[15px]">
                                            {formatCurrency(group.totalPrice)}
                                            <span className="text-[10px] font-normal ml-0.5 opacity-70">đ</span>
                                        </span>
                                    </div>

                                    {/* Card Body */}
                                    <div className="px-4 py-3 space-y-2.5">
                                        {/* KTV */}
                                        <div className="flex items-start gap-2">
                                            <User size={13} className="text-gray-600 mt-0.5 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <span className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">
                                                    {t.ktv_label}
                                                </span>
                                                <p className="text-white text-sm font-semibold leading-tight mt-0.5 truncate">
                                                    {group.allStaffNames.join(' & ')}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Skills */}
                                        {skillNames.length > 0 && (
                                            <div className="flex items-start gap-2">
                                                <Sparkles size={13} className="text-gray-600 mt-0.5 shrink-0" />
                                                <div>
                                                    <span className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">
                                                        {t.skills_label}
                                                    </span>
                                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                                        {skillNames.map((name: string, i: number) => (
                                                            <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-[#e6c487]/10 text-[#e6c487] border border-[#e6c487]/20 font-medium">
                                                                {name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Duration */}
                                        <div className="flex items-center gap-2">
                                            <Clock size={13} className="text-gray-600 shrink-0" />
                                            <span className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">{t.duration_label}</span>
                                            <span className="text-gray-200 text-sm font-bold">{duration} {t.mins}</span>
                                        </div>

                                        {/* Notes */}
                                        {notes && (
                                            <p className="text-gray-500 text-xs bg-white/4 rounded-xl px-3 py-2 leading-relaxed border border-white/5">
                                                {notes}
                                            </p>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-1 border-t border-white/5">
                                            <button
                                                onClick={() => { setEditItem(item); setIsEditOpen(true); }}
                                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/10 text-gray-400 text-xs font-bold uppercase tracking-wider hover:bg-white/5 hover:text-white transition-all active:scale-95"
                                            >
                                                <Pencil size={12} />
                                                {t.edit}
                                            </button>
                                            <button
                                                onClick={() => setDeleteGroupId(group.groupId)}
                                                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider hover:bg-red-500/10 transition-all active:scale-95"
                                            >
                                                <Trash2 size={12} />
                                                {t.delete}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {/* Add Another */}
                    <button
                        onClick={() => { handleClose(); setTimeout(onAddAnother, ANIMATION_DURATION + 50); }}
                        className="w-full py-3.5 rounded-2xl border border-dashed border-[#e6c487]/25 text-[#e6c487]/70 text-sm font-bold uppercase tracking-widest hover:border-[#e6c487]/50 hover:text-[#e6c487] hover:bg-[#e6c487]/4 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <Plus size={15} />
                        {t.add_another}
                    </button>
                </div>

                {/* ── Footer ───────────────────────── */}
                <div className="p-5 bg-[#1c1c1e] border-t border-white/5 shrink-0">
                    {/* Total */}
                    <div className="flex justify-between items-end mb-5">
                        <span className="text-gray-400 font-bold tracking-widest text-sm uppercase">{t.total}</span>
                        <div className="text-right">
                            <div className="text-xl font-black text-[#e6c487] tracking-tight">
                                {formatCurrency(grandTotal)}
                                <span className="text-sm font-normal ml-1 text-[#e6c487]/70">VND</span>
                            </div>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleClose}
                            className="flex-1 py-4 rounded-2xl border border-white/10 text-gray-400 font-bold uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all active:scale-95 text-sm"
                        >
                            {t.close}
                        </button>
                        <button
                            onClick={onCheckout}
                            className="flex-[1.5] py-4 rounded-2xl bg-[#e6c487] text-black font-black uppercase tracking-widest text-sm hover:bg-[#d4b278] transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(230,196,135,0.2)] flex items-center justify-center gap-2"
                        >
                            {t.checkout_btn}
                            <ChevronRight size={17} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Delete Confirm Sheet ────────────────── */}
            <AnimatePresence>
                {deleteGroupId && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-[110]"
                            onClick={() => setDeleteGroupId(null)}
                        />
                        <motion.div
                            initial={{ y: 80, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 80, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                            className="fixed bottom-0 left-0 right-0 z-[120] bg-[#1a1a1c] border-t border-white/8 rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
                        >
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                                    <Trash2 size={17} className="text-red-400" />
                                </div>
                                <div>
                                    <p className="text-white font-bold">{t.delete_confirm}</p>
                                    <p className="text-gray-500 text-xs mt-0.5">{t.delete_sub}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteGroupId(null)}
                                    className="flex-1 py-3.5 rounded-xl border border-white/10 text-gray-400 font-bold text-sm uppercase tracking-widest hover:bg-white/5 transition-colors"
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    onClick={handleDeleteConfirm}
                                    className="flex-[1.3] py-3.5 rounded-xl bg-red-500/90 text-white font-bold text-sm uppercase tracking-widest hover:bg-red-500 transition-all active:scale-[0.98]"
                                >
                                    {t.delete}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── VIP Edit Modal ──────────────────── */}
            <VipEditModal
                item={editItem}
                isOpen={isEditOpen}
                onClose={() => { setIsEditOpen(false); setEditItem(null); }}
                onSave={handleEditSave}
                lang={lang}
            />
        </>
    );
};

export default VipCartStep;
