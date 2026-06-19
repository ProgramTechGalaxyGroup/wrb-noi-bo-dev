import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'node:crypto';
import { generateAccessToken } from '@/lib/token';
import { handleStandardItems } from './handleStandardItems';
import { handleVipItems } from './handleVipItems';

const DAY_CUTOFF_HOUR = 8; // Reset day at 8:00 AM

export async function POST(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        if (!supabaseAdmin) throw new Error("Supabase Admin client not initialized");
        const body = await request.json();
        const { customer, items, paymentMethod, amountPaid, totalVND, lang, vatInvoice } = body;

        // Normalize language code to prevent mismatch (e.g. 'VN' → 'vi', 'vn' → 'vi')
        const VALID_LANGS = ['vi', 'en', 'kr', 'jp', 'cn'];
        const normalizedLang = (() => {
            const raw = (lang || '').toLowerCase().trim();
            return VALID_LANGS.includes(raw) ? raw : 'vi';
        })();
        console.log(`[POST /api/orders] lang from body: "${lang}", normalized: "${normalizedLang}"`);

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
        const customId = `${branchCode}-${billNum}`;

        // 2. Separate items by type
        const standardItems = items.filter((i: any) => i.itemType !== 'vip');
        const vipItems = items.filter((i: any) => i.itemType === 'vip');
        const hasStandard = standardItems.length > 0;
        const hasVip = vipItems.length > 0;

        // Determine source
        const source = hasVip && hasStandard
            ? 'MIXED_WALK_IN'
            : hasVip
                ? 'VIP_WALK_IN'
                : 'STANDARD_WALK_IN';

        console.log(`[POST /api/orders] source: ${source}, standard: ${standardItems.length}, vip: ${vipItems.length}`);

        const vnTimeStr = new Date().toISOString();

        // 2.5 Generate or find Customer ID
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

        // Add VAT invoice info if provided
        console.log('[API Order] vatInvoice received:', JSON.stringify(vatInvoice));
        if (vatInvoice && vatInvoice.taxCode) {
            customerData.taxCode = vatInvoice.taxCode;
            customerData.companyName = vatInvoice.companyName || null;
            customerData.companyAddress = vatInvoice.companyAddress || null;
            customerData.companyEmail = vatInvoice.companyEmail || null;
            customerData.companyPhone = vatInvoice.companyPhone || null;
            console.log('[API Order] VAT data added to customerData:', {
                taxCode: customerData.taxCode,
                companyName: customerData.companyName,
                companyAddress: customerData.companyAddress,
                companyEmail: customerData.companyEmail,
                companyPhone: customerData.companyPhone
            });
        }

        console.log('[API Order] Final customerData keys:', Object.keys(customerData));
        const { error: customerError } = await supabaseAdmin
            .from('Customers')
            .upsert(customerData, { onConflict: 'id', ignoreDuplicates: false });

        if (customerError) {
            console.error("⚠️ [API Order] Lỗi lưu thông tin khách hàng:", customerError);
        }

        // 3. Create Booking (1 booking for all items)
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
                status: 'NEW',
                billCode: billNum,
                customerLang: normalizedLang,
                accessToken: accessToken,
                source: source
            })
            .select()
            .single();

        if (bookingError) throw bookingError;

        // 4. Delegate to handlers (separated for isolation)
        if (hasStandard) {
            await handleStandardItems(supabaseAdmin, customId, standardItems, 0);
        }
        if (hasVip) {
            await handleVipItems(supabaseAdmin, customId, vipItems, standardItems.length);
        }

        return NextResponse.json({ success: true, billNum, bookingId: customId, accessToken });
    } catch (error: any) {
        console.error("❌ API Order Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        if (!supabaseAdmin) throw new Error("Supabase Admin client not initialized");
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');
        const phone = searchParams.get('phone');

        if (!email && !phone) {
            return NextResponse.json({ success: false, error: 'Email or phone required' }, { status: 400 });
        }

        // Build query with email OR phone
        let query = supabaseAdmin
            .from('Bookings')
            .select(`
                id,
                billCode,
                totalAmount,
                bookingDate,
                status,
                rating,
                technicianCode,
                accessToken,
                BookingItems!BookingItems_bookingId_fkey (
                    id,
                    serviceId,
                    quantity,
                    price,
                    options
                )
            `);

        if (email && phone) {
            query = query.or(`customerEmail.eq.${email},customerPhone.eq.${phone}`);
        } else if (email) {
            query = query.eq('customerEmail', email);
        } else if (phone) {
            query = query.eq('customerPhone', phone);
        }

        const { data: bookings, error } = await query
            .order('bookingDate', { ascending: false });

        if (error) throw error;

        // Fetch all services to map names
        const { data: allServices } = await supabaseAdmin
            .from('Services')
            .select('id, nameVN, nameEN, nameCN, nameKR, nameJP, duration')
            .limit(1000);

        const svcMap = new Map();
        if (allServices) {
            allServices.forEach((s: any) => {
                if (s.id) svcMap.set(String(s.id).trim().toLowerCase(), s);
            });
        }

        // Fetch staff names for technicianCodes
        const techCodes = [...new Set(bookings.map((b: any) => b.technicianCode).filter(Boolean))];
        const staffMap = new Map<string, string>();
        if (techCodes.length > 0) {
            const { data: staffList } = await supabaseAdmin
                .from('Staff')
                .select('id, fullName')
                .in('id', techCodes);

            if (staffList) {
                staffList.forEach((s: any) => {
                    if (s.id) staffMap.set(s.id, s.fullName || s.id);
                });
            }
        }

        const result = bookings.map((b: any) => ({
            id: b.id,
            date: new Date(b.bookingDate).toISOString().split('T')[0],
            total: b.totalAmount,
            status: b.status,
            rating: b.rating,
            technicianCode: b.technicianCode || null,
            staffName: b.technicianCode ? (staffMap.get(b.technicianCode) || b.technicianCode) : null,
            items: b.BookingItems.map((i: any) => {
                const sId = String(i.serviceId || '').trim().toLowerCase();
                const svc = svcMap.get(sId);
                
                const finalName = i.options?.displayName || svc?.nameVN || svc?.nameEN || `Dịch vụ ${i.serviceId}`;
                const finalDuration = i.options?.vipDuration || svc?.duration || null;

                return {
                    id: i.serviceId,
                    name: finalName,
                    names: {
                        vi: i.options?.displayName || svc?.nameVN || '',
                        en: i.options?.displayName || svc?.nameEN || '',
                        cn: i.options?.displayName || svc?.nameCN || '',
                        kr: i.options?.displayName || svc?.nameKR || '',
                        jp: i.options?.displayName || svc?.nameJP || '',
                    },
                    duration: finalDuration,
                    qty: i.quantity,
                    price: i.price,
                    options: i.options
                };
            }),
            note: 'Supabase Booking',
            accessToken: b.accessToken || null
        }));

        return NextResponse.json({ success: true, orders: result });
    } catch (error: any) {
        console.error("❌ API GET Order Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
