export type LanguageCode = 'en' | 'vi' | 'jp' | 'kr' | 'cn';

export type BodyPartKey = 'HEAD' | 'NECK' | 'SHOULDER' | 'ARM' | 'BACK' | 'THIGH' | 'CALF' | 'FOOT';

// Cấu trúc Data của Service từ Database (như bạn cung cấp)
export interface ServiceData {
    ID: string;
    NAMES: Record<string, string>; // { EN: "...", VN: "..." }
    FOCUS_POSITION?: Record<BodyPartKey, boolean>; // Map<Part, boolean>
    TAGS?: Array<Record<string, string>>; // List các tag [0: Pregnant, 1: Allergy]
    SHOW_STRENGTH?: boolean;
    HINT?: Record<string, string>; // Placeholder cho Other Notes
    PRICE_VN?: number;
    PRICE_USD?: number;
    // UI Configuration Flags (Task E2+E3)
    SHOW_NOTES?: boolean;           // Show/hide Notes section
    SHOW_PREFERENCES?: boolean;     // Legacy
    SHOW_GENDER?: boolean;
    SHOW_STRENGTH?: boolean;
    SHOW_FOCUS?: boolean;
}

// Cấu trúc Data Lưu Trữ preferences của khách
export interface CustomPreferences {
    bodyParts: {
        focus: string[]; // List ID (HEAD, NECK...)
        avoid: string[];
    };
    notes: {
        tag0: boolean; // Trạng thái tag đầu tiên (Pregnant)
        tag1: boolean; // Trạng thái tag thứ hai (Allergy)
        content: string; // Nội dung ghi chú thêm
    };
    strength?: 'light' | 'medium' | 'strong';
    therapist: 'male' | 'female' | 'random';
}

export interface MultiLangText {
    en: string;
    vi: string;
    jp: string;
    kr: string;
    cn: string;
}

