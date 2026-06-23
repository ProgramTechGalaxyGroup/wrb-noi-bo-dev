'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Crown, User, Clock, FileText, Check, Loader2 } from 'lucide-react';
import { CartItem } from '@/components/Menu/types';
import { formatCurrency } from '@/components/Menu/utils';
import {
    ALL_VIP_SKILLS,
    BLOCKED_SKILL_IDS,
    SKILL_MAP,
    VIP_DURATION_TIERS,
    type VipSkill,
    type VipDuration,
    type VipLang,
} from '@/lib/vipSkills.constants';
import {
    getStaffVipSkills,
    groupSkillsByType,
    getSkillName,
    type VipStaffInfo,
} from '@/lib/vipStaffUtils';
import {
    calculateMinDuration,
    getAvailableDurations,
    lookupPrice,
    type VipPricingTable,
} from '@/lib/vipPricingEngine';

// =============================================
// 🔧 UI CONFIGURATION
// =============================================
const ANIMATION_DURATION = 300;
const FALLBACK_PRICING: VipPricingTable = {
    '1': { '60': 690000, '70': 805000, '90': 1035000, '120': 1380000, '150': 1725000, '180': 2070000, '240': 2760000 },
    '2': { '60': 1080000, '70': 1260000, '90': 1530000, '120': 2040000, '150': 2550000, '180': 3060000, '240': 4080000 },
};

// =============================================
// 📌 TYPES
// =============================================
export interface VipEditSaveData {
    vipSkillIds: string[];
    vipDuration: number;
    vipDisplayName: string;
    vipCustomerNotes: string;
    priceVND: number;
}

interface VipEditModalProps {
    item: CartItem | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (cartId: string, data: VipEditSaveData) => void;
    lang: string;
}

// =============================================
// 🔤 i18n (inline — nhỏ gọn)
// =============================================
const TEXT: Record<string, Record<string, string>> = {
    vi: {
        title: 'Chỉnh sửa dịch vụ VIP',
        ktv: 'KTV phụ trách',
        skills_chinh: '💪 Dịch vụ chính',
        skills_le: '✨ Dịch vụ lẻ (tùy chọn)',
        duration: '⏱ Thời gian',
        mins: 'phút',
        notes: '📝 Ghi chú đặc biệt',
        notes_placeholder: 'Dị ứng, chấn thương, yêu cầu đặc biệt...',
        price_label: 'Giá dịch vụ',
        cancel: 'Hủy',
        save: 'Lưu thay đổi',
        loading: 'Đang tải kỹ năng...',
        min_duration_hint: 'Thời gian tối thiểu với lựa chọn này:',
        no_chinh: 'Vui lòng chọn ít nhất 1 dịch vụ chính',
    },
    en: {
        title: 'Edit VIP Service',
        ktv: 'Assigned Therapist',
        skills_chinh: '💪 Main Service',
        skills_le: '✨ Add-on Services',
        duration: '⏱ Duration',
        mins: 'mins',
        notes: '📝 Special Notes',
        notes_placeholder: 'Allergies, injuries, special requests...',
        price_label: 'Service Price',
        cancel: 'Cancel',
        save: 'Save Changes',
        loading: 'Loading skills...',
        min_duration_hint: 'Minimum duration for this selection:',
        no_chinh: 'Please select at least 1 main service',
    },
};

const getT = (lang: string) => TEXT[lang] ?? TEXT.vi;

// =============================================
// 🎯 COMPONENT
// =============================================
const VipEditModal = ({ item, isOpen, onClose, onSave, lang }: VipEditModalProps) => {
    const t = getT(lang);
    const vipLang = (lang || 'vi') as VipLang;

    // --- State ---
    const [staffInfo, setStaffInfo]           = useState<VipStaffInfo | null>(null);
    const [pricingTable, setPricingTable]     = useState<VipPricingTable>(FALLBACK_PRICING);
    const [isLoading, setIsLoading]           = useState(false);

    const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
    const [selectedDuration, setSelectedDuration] = useState<VipDuration | null>(null);
    const [notes, setNotes]                       = useState('');

    // Number of KTV: count VIP items with the same set of staffIds sharing this item group
    // Simplified: use item.vipStaffId; for multi-KTV, caller should handle price=0 items
    const numStaff = 1; // price is only on the first item, so we always calc as 1 for edit

    // --- Load data when modal opens ---
    useEffect(() => {
        if (!isOpen || !item) return;

        // Pre-fill from current item
        setSelectedSkillIds(item.vipSkillIds || (item.options as any)?.selectedSkills || []);
        setSelectedDuration((
            item.vipDuration || (item.options as any)?.vipDuration || item.timeValue || 60
        ) as VipDuration);
        setNotes(item.vipCustomerNotes || (item.options as any)?.notes?.content || '');

        // Fetch staff skills + pricing
        const loadData = async () => {
            setIsLoading(true);
            try {
                const staffId = item.vipStaffId || (item.options as any)?.vipStaffId;

                // Fetch skills & pricing in parallel
                const [skillsRes, pricingRes] = await Promise.all([
                    // [PRIMARY] API nhẹ — không cần TurnQueue, luôn trả về skills
                    staffId ? fetch(`/api/staff/${staffId}/skills`) : Promise.resolve(null),
                    fetch('/api/config/menu-vip'),
                ]);

                // Skills
                if (skillsRes && skillsRes.ok) {
                    const skillsData = await skillsRes.json();
                    // Build VipStaffInfo minimal shape để getStaffVipSkills() hoạt động
                    setStaffInfo({
                        id: skillsData.id,
                        fullName: skillsData.fullName,
                        avatarUrl: skillsData.avatarUrl,
                        skills: skillsData.skills ?? {},
                        gender: null,
                        height: null,
                        availability: 'AVAILABLE',
                        estimatedEndTime: null,
                        currentOrderId: null,
                        shiftType: null,
                        shiftStart: null,
                        shiftEnd: null,
                    });
                } else if (staffId) {
                    // [FALLBACK] Thử lại với vip-available endpoint
                    try {
                        const fallbackRes = await fetch('/api/staff/vip-available');
                        if (fallbackRes.ok) {
                            const fallbackData = await fallbackRes.json();
                            const found = (fallbackData.staff as VipStaffInfo[])?.find(s => s.id === staffId);
                            if (found) setStaffInfo(found);
                        }
                    } catch {
                        // Cả 2 API lỗi → dùng selectedSkills cũ (đã pre-fill ở trên)
                        console.warn('[VipEditModal] Could not load staff skills, using cached selection');
                    }
                }

                // Pricing
                if (pricingRes.ok) {
                    const pricingData = await pricingRes.json();
                    if (pricingData.pricing && typeof pricingData.pricing === 'object') {
                        setPricingTable(pricingData.pricing as VipPricingTable);
                    }
                }
            } catch (err) {
                console.error('[VipEditModal] Failed to load data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [isOpen, item]);

    // --- Derived: available skills from this KTV ---
    const availableSkills = useMemo((): VipSkill[] => {
        if (!staffInfo) return [];
        let skills = getStaffVipSkills(staffInfo.skills);
        const hasEarChuyen  = skills.some(s => s.id === 'earChuyen');
        const hasNailChuyen = skills.some(s => s.id === 'nailChuyen');
        if (hasEarChuyen)  skills = skills.filter(s => s.id !== 'earCombo');
        if (hasNailChuyen) skills = skills.filter(s => s.id !== 'nailCombo');
        return skills;
    }, [staffInfo]);

    const { chinh: chinhSkills, le: leSkills } = useMemo(
        () => groupSkillsByType(availableSkills),
        [availableSkills]
    );

    // --- Derived: min duration + available durations ---
    const { minDuration } = useMemo(
        () => calculateMinDuration(selectedSkillIds),
        [selectedSkillIds]
    );

    const availableDurations = useMemo(
        () => getAvailableDurations(minDuration),
        [minDuration]
    );

    // Auto-clamp duration if below minDuration
    const effectiveDuration = useMemo((): VipDuration | null => {
        if (!selectedDuration) return null;
        return selectedDuration >= minDuration ? selectedDuration : minDuration;
    }, [selectedDuration, minDuration]);

    // --- Derived: realtime price ---
    const realtimePrice = useMemo(() => {
        if (!effectiveDuration) return 0;
        return lookupPrice(pricingTable, numStaff, effectiveDuration);
    }, [pricingTable, effectiveDuration, numStaff]);

    // --- Derived: display name from selected skills ---
    const computedDisplayName = useMemo(() => {
        if (selectedSkillIds.length === 0) return item?.vipDisplayName || 'VIP Bespoke';
        const names = selectedSkillIds.map(id => {
            const skill = SKILL_MAP[id];
            return skill ? getSkillName(skill, vipLang) : id;
        });
        const unique = [...new Set(names)];
        return unique.join(' + ');
    }, [selectedSkillIds, vipLang, item]);

    // --- Handlers ---
    const toggleSkill = (skillId: string) => {
        setSelectedSkillIds(prev =>
            prev.includes(skillId)
                ? prev.filter(id => id !== skillId)
                : [...prev, skillId]
        );
        // If duration becomes invalid after skill toggle, reset to null
        setSelectedDuration(prev => prev);
    };

    const handleDurationSelect = (dur: VipDuration) => {
        setSelectedDuration(dur);
    };

    const handleSave = () => {
        if (!item) return;
        const chinhCount = selectedSkillIds.filter(id => SKILL_MAP[id]?.type === 'CHINH').length;
        if (chinhCount === 0) {
            alert(t.no_chinh);
            return;
        }

        onSave(item.cartId, {
            vipSkillIds: selectedSkillIds,
            vipDuration: effectiveDuration ?? minDuration,
            vipDisplayName: computedDisplayName,
            vipCustomerNotes: notes,
            priceVND: realtimePrice,
        });
        onClose();
    };

    // --- Do not render if closed ---
    if (!isOpen || !item) return null;

    const staffName = staffInfo?.fullName || item.vipStaffName || item.vipStaffId || 'KTV';

    return (
        // Backdrop
        <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center">
            {/* Dim overlay */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                className="relative bg-[#131315] border border-[#2a2a2e] w-full max-w-lg max-h-[92dvh] flex flex-col
                           rounded-t-[32px] sm:rounded-[32px] shadow-2xl shadow-black/50
                           animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ─────────────────────────────────── */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-[#e6c487]/10 border border-[#e6c487]/20 flex items-center justify-center">
                            <Crown size={18} className="text-[#e6c487]" />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-base leading-tight">{t.title}</h3>
                            <p className="text-[#e6c487]/70 text-xs mt-0.5 flex items-center gap-1">
                                <User size={11} /> {staffName}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/5"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── Scrollable Body ─────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5 min-h-0 custom-scrollbar">

                    {/* Loading state */}
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <Loader2 size={28} className="text-[#e6c487] animate-spin" />
                            <p className="text-gray-400 text-sm">{t.loading}</p>
                        </div>
                    )}

                    {!isLoading && (
                        <>
                            {/* ── DỊCH VỤ CHÍNH ──────────────────────── */}
                            {chinhSkills.length > 0 && (
                                <section>
                                    <p className="text-[11px] font-bold text-[#e6c487] uppercase tracking-widest mb-3">
                                        {t.skills_chinh}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {chinhSkills.map(skill => {
                                            const selected = selectedSkillIds.includes(skill.id);
                                            return (
                                                <button
                                                    key={skill.id}
                                                    onClick={() => toggleSkill(skill.id)}
                                                    className={`px-3.5 py-2 rounded-xl border text-sm font-semibold transition-all active:scale-95 flex items-center gap-1.5 ${
                                                        selected
                                                            ? 'bg-[#e6c487]/15 border-[#e6c487]/50 text-[#e6c487] shadow-[0_0_8px_rgba(230,196,135,0.15)]'
                                                            : 'bg-white/4 border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200'
                                                    }`}
                                                >
                                                    {selected && <Check size={13} strokeWidth={3} />}
                                                    {getSkillName(skill, vipLang)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* ── DỊCH VỤ LẺ ─────────────────────────── */}
                            {leSkills.length > 0 && (
                                <section>
                                    <p className="text-[11px] font-bold text-[#d0c5b5]/60 uppercase tracking-widest mb-3">
                                        {t.skills_le}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {leSkills.map(skill => {
                                            const selected = selectedSkillIds.includes(skill.id);
                                            return (
                                                <button
                                                    key={skill.id}
                                                    onClick={() => toggleSkill(skill.id)}
                                                    className={`px-3.5 py-2 rounded-xl border text-sm font-medium transition-all active:scale-95 flex items-center gap-1.5 ${
                                                        selected
                                                            ? 'bg-white/10 border-white/30 text-white'
                                                            : 'bg-white/4 border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-400'
                                                    }`}
                                                >
                                                    {selected && <Check size={13} strokeWidth={3} />}
                                                    {getSkillName(skill, vipLang)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* Fallback: nếu không load được skills thì hiện skills cũ */}
                            {chinhSkills.length === 0 && leSkills.length === 0 && (
                                <div className="bg-[#1c1c1e] border border-white/5 rounded-2xl p-4">
                                    <p className="text-gray-500 text-sm text-center">
                                        Không thể tải danh sách kỹ năng. Đang dùng lựa chọn hiện tại.
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-3 justify-center">
                                        {selectedSkillIds.map(id => {
                                            const skill = SKILL_MAP[id];
                                            return (
                                                <span key={id} className="text-xs px-2.5 py-1 rounded-full bg-[#e6c487]/15 text-[#e6c487] border border-[#e6c487]/30 font-medium">
                                                    {skill ? getSkillName(skill, vipLang) : id}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── DIVIDER ─────────────────────────────── */}
                            <div className="h-px bg-white/5" />

                            {/* ── DURATION ────────────────────────────── */}
                            <section>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[11px] font-bold text-[#e6c487] uppercase tracking-widest">
                                        {t.duration}
                                    </p>
                                    {minDuration > 60 && (
                                        <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                            {t.min_duration_hint} {minDuration} {t.mins}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {(VIP_DURATION_TIERS as unknown as number[]).map(dur => {
                                        const d = dur as VipDuration;
                                        const isAvailable = availableDurations.includes(d);
                                        const isSelected  = effectiveDuration === d;
                                        return (
                                            <button
                                                key={d}
                                                disabled={!isAvailable}
                                                onClick={() => handleDurationSelect(d)}
                                                className={`px-3.5 py-2 rounded-xl border text-sm font-bold transition-all active:scale-95 ${
                                                    isSelected
                                                        ? 'bg-[#e6c487] text-black border-[#e6c487] shadow-[0_0_12px_rgba(230,196,135,0.25)]'
                                                        : isAvailable
                                                            ? 'bg-white/4 border-white/10 text-gray-300 hover:border-[#e6c487]/40 hover:text-[#e6c487]'
                                                            : 'bg-white/2 border-white/5 text-gray-600 cursor-not-allowed opacity-40'
                                                }`}
                                            >
                                                {d}{t.mins.charAt(0) === 'p' ? '' : ''}<span className="text-[10px] font-normal ml-0.5">{t.mins}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Realtime price */}
                                {realtimePrice > 0 && (
                                    <div className="mt-3 flex items-center justify-between bg-[#1c1c1e] border border-[#e6c487]/20 rounded-xl px-4 py-3">
                                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                                            <Clock size={15} />
                                            <span>{effectiveDuration} {t.mins}</span>
                                        </div>
                                        <span className="text-[#e6c487] font-black text-lg tracking-tight">
                                            {formatCurrency(realtimePrice)} VND
                                        </span>
                                    </div>
                                )}
                            </section>

                            {/* ── DIVIDER ─────────────────────────────── */}
                            <div className="h-px bg-white/5" />

                            {/* ── NOTES ───────────────────────────────── */}
                            <section>
                                <p className="text-[11px] font-bold text-[#e6c487] uppercase tracking-widest mb-3">
                                    {t.notes}
                                </p>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder={t.notes_placeholder}
                                    rows={3}
                                    className="w-full bg-[#1c1c1e] border border-white/8 rounded-xl p-3.5 text-white text-sm
                                               placeholder-gray-600 focus:outline-none focus:border-[#e6c487]/40
                                               resize-none transition-colors"
                                />
                            </section>
                        </>
                    )}
                </div>

                {/* ── Footer ─────────────────────────────────── */}
                <div className="px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-white/8 shrink-0 flex gap-3 bg-[#131315]">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 rounded-xl border border-white/10 text-gray-400 font-bold text-sm uppercase tracking-widest hover:bg-white/5 transition-colors"
                    >
                        {t.cancel}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="flex-[1.5] py-3.5 rounded-xl bg-[#e6c487] text-black font-bold text-sm uppercase tracking-widest
                                   hover:bg-[#d4b278] transition-all active:scale-[0.98] shadow-[0_0_15px_rgba(230,196,135,0.2)]
                                   disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {t.save}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VipEditModal;
