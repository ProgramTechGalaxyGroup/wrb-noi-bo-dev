import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/staff/[staffId]/skills
 *
 * Lấy thông tin skills của 1 nhân viên theo ID.
 * Không cần TurnQueue, không cần is_active_vip_menu.
 * Dùng cho VipEditModal tại checkout — đảm bảo luôn load được skills
 * dù KTV chưa check-in hoặc nghỉ hôm nay.
 *
 * Response: { id, fullName, avatarUrl, skills }
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ staffId: string }> }
) {
    try {
        const { staffId } = await params;

        if (!staffId) {
            return NextResponse.json({ error: 'staffId is required' }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        if (!supabase) {
            return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
        }

        const { data, error } = await supabase
            .from('Staff')
            .select('id, full_name, avatar_url, skills')
            .eq('id', staffId)
            .single();

        if (error || !data) {
            console.error('[staff/skills] Query error:', error);
            return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
        }

        return NextResponse.json({
            id: data.id,
            fullName: data.full_name,
            avatarUrl: data.avatar_url,
            skills: data.skills ?? {},
        });
    } catch (err) {
        console.error('[staff/skills] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
