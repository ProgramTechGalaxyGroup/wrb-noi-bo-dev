import { SupabaseClient } from '@supabase/supabase-js';
import { ALL_VIP_SKILLS } from '@/lib/vipSkills.constants';

// =============================================
// 👑 VIP Items Handler
// Ported from /api/booking/vip-appointment/route.ts (Step 6.5)
// Handles: Build display name from skills, assign KTV per item,
// insert into BookingItems with VIP-specific options
// =============================================

const SKILL_MAP = Object.fromEntries(ALL_VIP_SKILLS.map(s => [s.id, s]));

export async function handleVipItems(
    supabase: SupabaseClient,
    bookingId: string,
    vipItems: any[],
    startIndex: number = 0
): Promise<void> {
    const itemsToInsert = vipItems.map((item: any, index: number) => {
        // Build display name from skill IDs
        const skillIds: string[] = item.vipSkillIds || [];
        const skillNames = skillIds.map((id: string) => {
            let name = SKILL_MAP[id]?.name?.vi || id;
            if (name.toLowerCase().includes('ráy')) name = 'Ráy';
            if (name.toLowerCase().includes('nail') || name.toLowerCase().includes('móng')) name = 'Nail';
            return name;
        });
        const uniqueSkillNames = [...new Set(skillNames)];
        const displayName = uniqueSkillNames.length > 0 ? uniqueSkillNames.join(' + ') : (item.vipDisplayName || 'Gói VIP');

        return {
            id: `${bookingId}-vip${startIndex + index + 1}`,
            bookingId: bookingId,
            serviceId: 'NHS0800', // VIP service code
            quantity: 1,
            price: item.priceVND || 0,
            technicianCodes: item.vipStaffId ? [item.vipStaffId] : [],
            status: 'WAITING',
            options: {
                displayName,
                vipDuration: item.vipDuration || item.timeValue || 60,
                selectedSkills: skillIds,
                customerNotes: item.vipCustomerNotes || '',
            }
        };
    });

    const { error } = await supabase
        .from('BookingItems')
        .insert(itemsToInsert);

    if (error) {
        console.error('[handleVipItems] BookingItems insert error:', error);
        throw error;
    }
}

