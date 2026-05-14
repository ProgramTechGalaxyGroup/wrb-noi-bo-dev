import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/config/menu-vip
 * Returns VIP menu config: enabled status + pricing tiers
 */
export async function GET() {
    try {
        const supabase = getSupabaseAdmin();
        if (!supabase) {
            return NextResponse.json({ enabled: false, pricing: [] });
        }

        // Fetch both configs in parallel
        const [enabledRes, pricingRes] = await Promise.all([
            supabase
                .from('SystemConfigs')
                .select('value')
                .eq('key', 'menu_vip_enabled')
                .maybeSingle(),
            supabase
                .from('SystemConfigs')
                .select('value')
                .eq('key', 'menu_vip_pricing')
                .maybeSingle(),
        ]);

        // Parse enabled flag
        const rawEnabled = enabledRes.data?.value;
        const enabled = rawEnabled === true || rawEnabled === 'true';

        // Parse pricing tiers
        let pricing: { duration: number; price: number; label: string }[] = [];
        if (pricingRes.data?.value) {
            const raw = pricingRes.data.value;
            pricing = typeof raw === 'string' ? JSON.parse(raw) : raw;
        }

        return NextResponse.json({ enabled, pricing });
    } catch (error: any) {
        console.error('[API] GET /api/config/menu-vip error:', error);
        return NextResponse.json({ enabled: false, pricing: [] });
    }
}
