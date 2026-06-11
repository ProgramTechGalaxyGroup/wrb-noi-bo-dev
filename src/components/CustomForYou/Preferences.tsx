import React from 'react';
import { User, Activity } from 'lucide-react';
import { LanguageCode } from './types';
import { getText } from './utils';

interface PreferencesProps {
    lang: LanguageCode;
    showStrength: boolean;
    showGender: boolean;
    values: {
        strength?: 'light' | 'medium' | 'strong';
        therapist: 'male' | 'female' | 'random';
    };
    onChange: (key: string, value: any) => void;
}

const Preferences: React.FC<PreferencesProps> = ({ lang, showStrength, showGender, values, onChange }) => {
    const strengthOptions = [
        { value: 'light', label: { en: 'Light', vi: 'Nhẹ', jp: '弱い', kr: '약하게', cn: '轻' } },
        { value: 'medium', label: { en: 'Medium', vi: 'Vừa', jp: '普通', kr: '보통', cn: '中' } },
        { value: 'strong', label: { en: 'Strong', vi: 'Mạnh', jp: '強い', kr: '강하게', cn: '重' } },
    ];

    const therapistOptions = [
        { value: 'male', label: { en: 'Male', vi: 'Nam', jp: '男性', kr: '남성', cn: '男' } },
        { value: 'female', label: { en: 'Female', vi: 'Nữ', jp: '女性', kr: '여성', cn: '女' } },
        { value: 'random', label: { en: 'Random', vi: 'Ngẫu nhiên', jp: 'お任せ', kr: '랜덤', cn: '随机' } },
    ];

    return (
        <div className="w-full mt-4 space-y-4">
            {/* Strength Section */}
            {showStrength && (
                <div>
                    <h4 className="flex items-center gap-2 text-[10px] font-bold text-[#C9A96E]/80 uppercase tracking-widest mb-3">
                        <Activity size={14} />
                        {getText({ en: 'Strength', vi: 'Lực tay', jp: '強さ', kr: '강도', cn: '力度' }, lang)}
                    </h4>
                    <div className="flex gap-2">
                        {strengthOptions.map((opt) => {
                            let activeClass = '';
                            if (values.strength === opt.value) {
                                activeClass = 'bg-[#1c1c1e] border-[#C9A96E] text-[#C9A96E] shadow-sm shadow-[#C9A96E]/10';
                            } else {
                                activeClass = 'bg-[#1c1c1e] border-white/10 text-gray-400 hover:bg-[#2c2c2e]';
                            }
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() => onChange('strength', opt.value)}
                                    className={`flex-1 py-3 px-2 rounded-xl text-sm font-semibold border transition-all ${activeClass}`}
                                >
                                    {getText(opt.label, lang)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Therapist Section */}
            {showGender && (
                <div>
                <h4 className="flex items-center gap-2 text-[10px] font-bold text-[#C9A96E]/80 uppercase tracking-widest mb-3">
                    <User size={14} />
                    {getText({ en: 'Therapist', vi: 'Kỹ thuật viên', jp: 'セラピスト', kr: '테라피스트', cn: '技师' }, lang)}
                </h4>
                <div className="flex gap-2">
                    {therapistOptions.map((opt) => {
                        let activeClass = '';
                        if (values.therapist === opt.value) {
                            activeClass = 'bg-[#1c1c1e] border-[#C9A96E] text-[#C9A96E] shadow-sm shadow-[#C9A96E]/10';
                        } else {
                            activeClass = 'bg-[#1c1c1e] border-white/10 text-gray-400 hover:bg-[#2c2c2e]';
                        }
                        return (
                            <button
                                key={opt.value}
                                onClick={() => onChange('therapist', opt.value)}
                                className={`flex-1 py-3 px-2 rounded-xl text-sm font-semibold border transition-all ${activeClass}`}
                            >
                                {getText(opt.label, lang)}
                            </button>
                        );
                    })}
                </div>
            </div>
            )}
        </div>
    );
};

export default Preferences;

