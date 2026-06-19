import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { generateAccessToken } from '@/lib/token';
import { handleStandardItems } from '../orders/handleStandardItems';
import { handleVipItems } from '../orders/handleVipItems';

const DAY_CUTOFF_HOUR = 8; // Reset day at 8:00 AM

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        if (!supabaseAdmin) throw new Error("Supabase Admin client not initialized");
        const body = await request.json();
        
        const { 
            customer, 
            items, 
            paymentMethod, 
            totalVND, 
            lang, 
            appointmentDate, 
            timeSlot, 
            bookingSource 
        } = body;

        // Normalize language
        const VALID_LANGS = ['vi', 'en', 'kr', 'jp', 'cn'];
        const normalizedLang = (() => {
            const raw = (lang || '').toLowerCase().trim();
            return VALID_LANGS.includes(raw) ? raw : 'vi';
        })();
        console.log(`[POST /api/bookings] lang: "${normalizedLang}", appointmentDate: ${appointmentDate}, timeSlot: ${timeSlot}`);

        const now = new Date();
        const vnDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
        const currentHour = vnDate.getHours();

        const businessDate = new Date(vnDate);
        if (currentHour < DAY_CUTOFF_HOUR) {
            businessDate.setDate(businessDate.getDate() - 1);
        }

        const day = businessDate.getDate().toString().padStart(2, '0');
        const month = (businessDate.getMonth() + 1).toString().padStart(2, '0');
        const year = businessDate.getFullYear();
        const dateCode = `${day}${month}${year}`;

        // 1. Generate Bill Number
        const { count } = await supabaseAdmin
            .from('Bookings')
            .select('*', { count: 'exact', head: true })
            .ilike('billCode', `%-${dateCode}`);

        const nextNum = (count || 0) + 1;
        const billNum = `${String(nextNum).padStart(3, '0')}-${dateCode}`;
        const branchCode = '11NDK';
        const customId = `BK-${branchCode}-${billNum}`; // Prefix BK for bookings

        // 2. Separate items
        const standardItems = items.filter((i: any) => i.itemType !== 'vip');
        const vipItems = items.filter((i: any) => i.itemType === 'vip');
        const hasStandard = standardItems.length > 0;
        const hasVip = vipItems.length > 0;

        // Determine source
        const source = hasVip && hasStandard
            ? 'MIXED_BOOKING'
            : hasVip
                ? 'VIP_BOOKING'
                : 'STANDARD_BOOKING';

        const vnTimeStr = new Date().toISOString();

        // 3. Generate or find Customer ID
        let customerId = customer.id;

        if (!customerId && (customer.email || customer.phone)) {
            let query = supabaseAdmin.from('Customers').select('id');

            if (customer.email && customer.phone) {
                query = query.or(`email.eq.${customer.email},phone.eq.${customer.phone}`);
            } else if (customer.email) {
                query = query.eq('email', customer.email);
            } else if (customer.phone) {
                query = query.eq('phone', customer.phone);
            }

            const { data: existingCustomer } = await query.limit(1).maybeSingle();
            if (existingCustomer) {
                customerId = existingCustomer.id;
            }
        }

        if (!customerId) {
            customerId = `CUS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        }

        const fallbackId = Date.now().toString();
        const customerData: Record<string, any> = {
            id: customerId,
            fullName: customer.name || "Guest",
            phone: customer.phone?.trim() || `GUEST-${fallbackId}`,
            email: customer.email?.trim() || `guest-${fallbackId}@no-email.com`,
            createdAt: vnTimeStr,
            updatedAt: vnTimeStr
        };

        const { error: customerError } = await supabaseAdmin
            .from('Customers')
            .upsert(customerData, { onConflict: 'id', ignoreDuplicates: false });

        if (customerError) {
            console.error("⚠️ [API Booking] Lỗi lưu thông tin khách hàng:", customerError);
        }

        // 4. Create notes object
        const notesObj = {
            type: 'WEB_ADVANCE_BOOKING',
            appointmentDate,
            timeSlot,
            clientLang: normalizedLang,
            bookedAt: vnTimeStr,
        };

        // 5. Create Booking
        const accessToken = generateAccessToken();
        const { data: booking, error: bookingError } = await supabaseAdmin
            .from('Bookings')
            .insert({
                id: customId,
                customerId: customerId,
                customerName: customer.name || "Guest",
                customerPhone: customer.phone || "",
                customerEmail: customer.email || "",
                totalAmount: totalVND,
                paymentMethod: paymentMethod,
                createdAt: vnTimeStr,
                updatedAt: vnTimeStr,
                bookingDate: appointmentDate ? `${appointmentDate}T00:00:00.000Z` : vnTimeStr,
                timeBooking: timeSlot,
                status: 'NEW', // Keep NEW so reception can confirm it
                billCode: billNum,
                customerLang: normalizedLang,
                accessToken: accessToken,
                source: source,
                notes: JSON.stringify(notesObj)
            })
            .select()
            .single();

        if (bookingError) throw bookingError;

        // 6. Delegate to handlers
        if (hasStandard) {
            await handleStandardItems(supabaseAdmin, customId, standardItems, 0);
        }
        if (hasVip) {
            await handleVipItems(supabaseAdmin, customId, vipItems, standardItems.length);
        }

        // 7. Notification
        try {
            const notifMessage = 
                `📅 CÓ ĐƠN ĐẶT LỊCH WEB MỚI!\n` +
                `👤 Khách: ${customer.name || 'Guest'} - ${customer.phone || ''}\n` +
                `⏱️ Hẹn lúc: ${timeSlot} ngày ${appointmentDate}\n` +
                `💵 Tổng bill: ${totalVND.toLocaleString('vi-VN')} VND`;

            await supabaseAdmin.from('StaffNotifications').insert({
                bookingId: customId,
                employeeId: null, // Broadcast
                type: 'NEW_ORDER',
                message: notifMessage,
                isRead: false,
                createdAt: vnTimeStr,
            });
        } catch (notifErr) {
            console.error('[API Booking] Notification error:', notifErr);
        }

        return NextResponse.json({ success: true, billNum, bookingId: customId, accessToken });
    } catch (error: any) {
        console.error("❌ API Booking Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
