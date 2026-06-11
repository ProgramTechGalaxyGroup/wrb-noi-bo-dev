import React, { useState, useEffect, useRef } from "react";
import { X, Check, ChevronDown } from "lucide-react";
import { ServiceData, CustomPreferences, LanguageCode } from "./types";
import { getText } from "./utils";
import { getDictionary } from "@/lib/dictionaries"; // Import getDictionary
import BodyMap from "./BodyMap";
import NoteSection from "./NoteSection";
import Preferences from "./Preferences";

interface CustomForYouModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (prefs: CustomPreferences) => void;
    serviceData: ServiceData;
    lang: LanguageCode;
    initialData?: CustomPreferences;
}

export default function CustomForYouModal({
    isOpen,
    onClose,
    onSave,
    serviceData,
    lang,
    initialData
}: CustomForYouModalProps) {
    const dict = getDictionary(lang); // Get dictionary

    // Default State
    const [prefs, setPrefs] = useState<CustomPreferences>({
        bodyParts: { focus: [], avoid: [] },
        notes: { tag0: false, tag1: false, content: "" },
        strength: serviceData.SHOW_STRENGTH ? 'medium' : undefined,
        therapist: 'random'
    });

    // Tracking scroll to show/hide bottom indicator
    const [isAtBottom, setIsAtBottom] = useState(false);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop - clientHeight < 20) {
            setIsAtBottom(true);
        } else {
            setIsAtBottom(false);
        }
    };

    // Reset or Load initial data when modal opens
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Safely merge initialData with defaults to prevent undefined errors
                setPrefs({
                    bodyParts: {
                        focus: initialData.bodyParts?.focus || [],
                        avoid: initialData.bodyParts?.avoid || []
                    },
                    notes: {
                        tag0: initialData.notes?.tag0 || false,
                        tag1: initialData.notes?.tag1 || false,
                        content: initialData.notes?.content || ""
                    },
                    strength: initialData.strength || (serviceData.SHOW_STRENGTH ? 'medium' : undefined),
                    therapist: initialData.therapist || 'random'
                });
            } else {
                // Reset to default
                setPrefs({
                    bodyParts: { focus: [], avoid: [] },
                    notes: { tag0: false, tag1: false, content: "" },
                    strength: serviceData.SHOW_STRENGTH ? 'medium' : undefined,
                    therapist: 'random'
                });
            }
        }
    }, [isOpen, initialData, serviceData]);

    if (!isOpen) return null;

    // handlers
    const handleBodyToggle = (type: 'focus' | 'avoid', area: string) => {
        setPrefs(prev => {
            let newFocus = [...prev.bodyParts.focus];
            let newAvoid = [...prev.bodyParts.avoid];

            if (area === 'CLEAR_ALL') {
                return { ...prev, bodyParts: { focus: [], avoid: [] } };
            }

            if (area === 'FULL_BODY' && type === 'focus') {
                const allParts = Object.keys(serviceData.FOCUS_POSITION || {}).filter(k => serviceData.FOCUS_POSITION?.[k as keyof typeof serviceData.FOCUS_POSITION]);
                return { ...prev, bodyParts: { focus: allParts, avoid: [] } };
            }

            // Normal toggle
            if (type === 'focus') {
                if (newFocus.includes(area)) {
                    newFocus = newFocus.filter(k => k !== area);
                } else {
                    newFocus.push(area);
                    newAvoid = newAvoid.filter(k => k !== area);
                }
            } else { // avoid
                if (newAvoid.includes(area)) {
                    newAvoid = newAvoid.filter(k => k !== area);
                } else {
                    newAvoid.push(area);
                    newFocus = newFocus.filter(k => k !== area);
                }
            }

            return { ...prev, bodyParts: { focus: newFocus, avoid: newAvoid } };
        });
    };

    const handleNoteChange = (key: string, value: any) => {
        setPrefs(prev => ({ ...prev, notes: { ...prev.notes, [key]: value } }));
    };

    const handlePrefChange = (key: string, value: any) => {
        setPrefs(prev => ({ ...prev, [key]: value }));
    };

    // Check if we should render Body Map
    const showBodyMap = !serviceData.FOCUS_POSITION || Object.values(serviceData.FOCUS_POSITION).some(v => v === true);

    // Task E3: Check visibility flags (default true for backward compatibility)
    const showNotes = serviceData.SHOW_NOTES !== false;
    const showPreferences = serviceData.SHOW_PREFERENCES !== false && (!!serviceData.SHOW_STRENGTH || serviceData.SHOW_GENDER !== false);
    const showGender = serviceData.SHOW_GENDER !== false;
    const showFocus = serviceData.SHOW_FOCUS !== false;

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content - Fixed Height for no scroll */}
            <div className="relative w-full sm:w-[95vw] max-w-2xl bg-[#0d0d0d] rounded-t-[32px] rounded-b-none sm:rounded-[32px] overflow-hidden flex flex-col h-[90vh] sm:h-[85vh] animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 border border-white/10 shadow-2xl">

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between z-20">
                    <div>
                        <h2 className="text-xl font-serif tracking-wide text-[#C9A96E]">{dict.custom_for_you?.title}</h2>
                        <p className="text-sm text-gray-400 font-medium mt-0.5">
                            {getText(serviceData.NAMES, lang)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content Area - Hidden overflow and flex to fit */}
                <div className="flex-1 overflow-hidden relative">
                    <div 
                        className="absolute inset-0 overflow-y-auto px-6 py-2 custom-scrollbar"
                        onScroll={handleScroll}
                    >
                        <div className="space-y-4 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            
                            {/* 1. Therapist & Strength (Now on Top) */}
                            {showPreferences && (
                                <Preferences
                                    lang={lang}
                                    showStrength={!!serviceData.SHOW_STRENGTH}
                                    showGender={showGender}
                                    values={{ strength: prefs.strength, therapist: prefs.therapist }}
                                    onChange={handlePrefChange}
                                />
                            )}

                            {/* 2. Body Map & Focus Areas */}
                            {showBodyMap && showFocus && (
                                <div>
                                    <BodyMap
                                        focus={prefs.bodyParts?.focus || []}
                                        avoid={prefs.bodyParts?.avoid || []}
                                        lang={lang}
                                        serviceData={serviceData}
                                        onToggle={handleBodyToggle}
                                    />
                                </div>
                            )}

                            {/* 3. Notes Section */}
                            {showNotes && (
                                <NoteSection
                                    lang={lang}
                                    serviceData={serviceData}
                                    notes={prefs.notes}
                                    onChange={handleNoteChange}
                                />
                            )}
                        </div>
                    </div>

                    {/* Lớp chặn Gradient nhạt (tuỳ chọn thêm để đẹp hơn) kết hợp Mũi tên */}
                    <div className={`absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0d0d0d] to-transparent pointer-events-none transition-opacity duration-300 ${isAtBottom ? 'opacity-0' : 'opacity-100'}`} />
                    
                    {/* Scroll Indicator: Mũi tên nhấp nháy */}
                    <div className={`absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none z-30 transition-opacity duration-300 ${isAtBottom ? 'opacity-0' : 'opacity-100'}`}>
                        <div className="bg-[#1c1c1e]/80 rounded-full p-1.5 backdrop-blur-sm border border-[#C9A96E]/30 shadow-xl animate-bounce">
                            <ChevronDown className="w-5 h-5 text-[#C9A96E]" />
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="bg-[#0d0d0d] pb-[env(safe-area-inset-bottom)] z-20 p-4 border-t border-white/10">
                    <button
                        onClick={() => onSave(prefs)}
                        className="w-full bg-[#1c1c1e] hover:bg-[#2c2c2e] border border-[#C9A96E]/50 text-[#C9A96E] font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg"
                    >
                        <Check size={20} />
                        {getText({ en: 'SAVE', vi: 'LƯU', jp: '保存', kr: '저장', cn: '保存' }, lang)}
                    </button>
                </div>

            </div>
        </div>
    );
}

