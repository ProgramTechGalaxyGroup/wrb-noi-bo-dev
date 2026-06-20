import { supabase } from '@/lib/supabase';
import { Service } from '@/components/Menu/types';

/**
 * Lấy danh sách dịch vụ từ Supabase (Server-side & Client-side)
 * Logic này đã được chuyển đổi từ Firebase sang PostgreSQL
 */
export const getMenuData = async (): Promise<Service[]> => {
    try {
        // Lấy dữ liệu services kèm theo thông tin của categories (JOIN)
        const { data, error } = await supabase
            .from('Services')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.error("❌ [Supabase] Lỗi lấy dữ liệu:", error.message);
            return [];
        }

        if (!data || data.length === 0) {
            console.warn("⚠️ [Supabase] Không tìm thấy dữ liệu trong bảng 'Services'");
            return [];
        }

        const services: Service[] = data.map((item: any) => {
            // Helper để xác định menuType
            const getMenuTypeFromId = (id: string): 'standard' | 'vip' | 'unknown' => {
                if (id.startsWith('NHS')) return 'standard';
                if (id.startsWith('NHP') || id.startsWith('VIP_')) return 'vip';
                return 'unknown';
            };

            return {
                id: item.id,
                cat: item.category || "Unknown",
                names: {
                    en: item.nameEN || "",
                    vi: item.nameVN || "",
                    cn: item.nameCN,
                    jp: item.nameJP,
                    kr: item.nameKR,
                },
                descriptions: {
                    en: item.description?.en || item.description?.EN || "",
                    vi: item.description?.vn || item.description?.VN || "",
                    cn: item.description?.cn || item.description?.CN,
                    jp: item.description?.jp || item.description?.JP,
                    kr: item.description?.kr || item.description?.KR,
                },
                img: item.imageUrl || "https://placehold.co/300x200?text=No+Image",
                priceVND: Number(item.priceVND) || 0,
                priceUSD: Number(item.priceUSD) || 0,
                timeValue: Number(item.duration) || 0,
                timeDisplay: `${item.duration || 0} mins`,
                menuType: getMenuTypeFromId(item.id) as 'standard' | 'vip',
                TAGS: item.tags || [],
                FOCUS_POSITION: item.focusConfig,
                comboTags: item.comboTags || [],
                // SHOW_STRENGTH removed here
                HINT: item.HINT, // Để lại nếu có map sau này

                // UI Configuration Flags (Task E2+E3)
                SHOW_CUSTOM_FOR_YOU: item.showCustomForYou !== false, // Default true
                SHOW_NOTES: item.showNotes !== false,                 // Default true
                SHOW_GENDER: item.showGender !== false, // Default true
                SHOW_STRENGTH: item.showStrength !== false, // Default true
                SHOW_FOCUS: item.showFocus !== false, // Default true
                SHOW_PREFERENCES: item.showPreferences !== false,     // Default true

                ACTIVE: item.isActive,
                BEST_SELLER: item.isBestSeller,
                BEST_CHOICE: item.isBestChoice
            };
        });

        return services;

    } catch (error) {
        console.error("❌ [Supabase] Lỗi không xác định:", error);
        return [];
    }
};


