import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

// 🔧 EGRESS OPTIMIZATION: Cache Services in module scope (fetch once per session)
let cachedServices: any[] | null = null;
let servicesCacheTimestamp = 0;
const SERVICES_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export type JourneyStatus = 'NEW' | 'PREPARING' | 'IN_PROGRESS' | 'CLEANING' | 'COMPLETED' | 'FEEDBACK' | 'DONE';

// Enriched service item with computed fields for per-service timer
export interface ServiceItem {
    id: string;
    serviceId: string;
    service_name: string;
    service_name_en?: string;
    service_names?: Record<string, string>; // { vi, en, cn, jp, kr }
    duration: number; // in minutes
    technicianCode: string;
    staffName: string;
    staffAvatar: string;
    computedTimeStart: string | null;
    quantity: number;
    price: number;
    options?: any;
    // Per-item completion & rating fields
    status: string | null;
    itemRating: number | null;
    itemFeedback: string | null;
    // Per-KTV rating (when 2+ KTVs share 1 service)
    ktvRatings?: Record<string, number>;
    // Per-item room/bed (multi-tech multi-room)
    roomName: string | null;
    bedId: string | null;
    segments: any[];
}

export interface JourneyData {
    id: string;
    status: JourneyStatus;
    timeStart: string | null;
    timeEnd: string | null;
    rating: number | null;
    violations: number[] | null;
    tipAmount: number | null;
    staffName?: string;
    staffAvatar?: string;
    createdAt?: string;
    totalDuration: number; // Phút
    items: ServiceItem[];
    roomName?: string;
    bedId?: string;
}


export function useJourneyRealtime(bookingId: string) {
    const [data, setData] = useState<JourneyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // booking.id thật (có thể khác bookingId URL param nếu user dùng billCode)
    const [resolvedId, setResolvedId] = useState<string>(bookingId);

    const fetchState = useCallback(async () => {
        if (!bookingId) {
            setLoading(false);
            return;
        }

        const supabase = createClient();
        try {
            const { data: booking, error: fetchError } = await supabase
                .from('Bookings')
                .select('*')
                .eq('accessToken', bookingId)
                .maybeSingle();

            if (fetchError) {
                console.error('Supabase fetch error:', fetchError);
                throw fetchError;
            }

            if (!booking) {
                setError('Không tìm thấy đơn hàng hoặc đơn hàng đã bị xóa.');
                setLoading(false);
                return;
            }

            if (booking) {
                // Lưu booking.id thật để dùng cho realtime + items query
                const realId = booking.id;
                setResolvedId(realId);

                // 🔧 EGRESS FIX: Select only needed columns instead of select('*')
                const { data: items } = await supabase
                    .from('BookingItems')
                    .select('*')
                    .eq('bookingId', realId); // Dùng booking.id thật, KHÔNG dùng URL param

                // ⚠️ NO Staff query — khách hàng KHÔNG biết tên nhân viên

                // 🔧 EGRESS FIX: Cache services — only fetch once per session (saves ~50KB per poll)
                let svcs = cachedServices;
                const now = Date.now();
                if (!svcs || (now - servicesCacheTimestamp > SERVICES_CACHE_TTL)) {
                    const { data: freshSvcs } = await supabase
                        .from('Services')
                        .select('id, nameVN, nameEN, nameCN, nameJP, nameKR, duration')
                        .limit(1000);
                    svcs = freshSvcs;
                    cachedServices = freshSvcs;
                    servicesCacheTimestamp = now;
                }

                const svcMap = new Map();
                if (svcs) {
                    svcs.forEach((s: any) => {
                        if (s.id) svcMap.set(String(s.id).trim().toLowerCase(), s);
                    });
                }

                // 🔧 Filter out "Phòng riêng" (addon, not a real service to rate)
                const rateableItems = (items || []).filter((i: any) => {
                    const sId = String(i.serviceId || '').trim().toLowerCase();
                    const svc = svcMap.get(sId);
                    const nameVN = typeof svc?.nameVN === 'object' 
                        ? (svc.nameVN?.vn || svc.nameVN?.vi || JSON.stringify(svc.nameVN)) 
                        : String(svc?.nameVN || '');
                    const nameLower = nameVN.toLowerCase();
                    if (nameLower.includes('phòng riêng') || nameLower.includes('phong rieng')) return false;
                    return true;
                });

                const processedItems: ServiceItem[] = [];

                rateableItems.forEach((i: any) => {
                    const sId = String(i.serviceId || '').trim().toLowerCase();
                    const svc = svcMap.get(sId);
                    // Use ?? to allow 0 duration for addons like "Phòng riêng"
                    const itemDuration = i.duration ?? svc?.duration ?? 0;
                    // Provide a default of 60 only if it's strictly null/undefined and not an addon? 
                    // Actually if it's 0, it should be 0.
                    const finalDuration = itemDuration !== null && itemDuration !== undefined ? itemDuration : 60;
                    let computedTimeStart: string | null = null;
                    const activeStatuses = ['IN_PROGRESS', 'COMPLETED', 'CLEANING', 'DONE'];
                    if (i.timeStart) {
                        computedTimeStart = i.timeStart;
                    } else if (booking.timeStart && activeStatuses.includes(i.status)) {
                        // Fallback: chỉ dùng booking.timeStart nếu ITEM NÀY đã bắt đầu
                        // KHÔNG dùng bookingStarted toàn cục → tránh DV chưa bắt đầu cũng đếm ngược
                        computedTimeStart = booking.timeStart;
                    }

                    // Split multi-KTV items: if a BookingItem has multiple technicianCodes,
                    // create separate ServiceItems so each KTV gets their own rating card.
                    const techCodes: string[] = Array.isArray(i.technicianCodes) && i.technicianCodes.length > 0
                        ? i.technicianCodes
                        : [booking.technicianCode || ''];

                    techCodes.forEach((techCode: string, techIdx: number) => {
                        // For multi-KTV: use composite ID so each KTV gets unique rating
                        const itemId = techCodes.length > 1 ? `${i.id}-ktv${techIdx}` : i.id;
                        const ktvRatingsMap: Record<string, number> = i.ktvRatings || {};
                        // Per-KTV rating: use ktvRatings JSONB if available, else fallback to itemRating
                        const perKtvRating = techCodes.length > 1
                            ? (ktvRatingsMap[techCode.trim()] ?? null)
                            : (i.itemRating ?? null);

                        // Per-KTV room/bed: lấy từ segments theo techCode, fallback item-level → booking-level
                        const ktvSegment = Array.isArray(i.segments)
                            ? i.segments.find((s: any) => s.ktvId === techCode)
                            : null;
                        const itemRoomName = ktvSegment?.roomId || i.roomName || booking.roomName || null;
                        const itemBedId = ktvSegment?.bedId || i.bedId || booking.bedId || null;

                        const fallbackName = svc?.nameVN || svc?.nameEN || `Dịch vụ ${i.serviceId}`;
                        processedItems.push({
                            id: itemId,
                            serviceId: i.serviceId,
                            service_name: fallbackName,
                            service_name_en: svc?.nameEN || svc?.nameVN,
                            service_names: {
                                vi: svc?.nameVN || fallbackName,
                                en: svc?.nameEN || fallbackName,
                                cn: svc?.nameCN || svc?.nameEN || fallbackName,
                                jp: svc?.nameJP || svc?.nameEN || fallbackName,
                                kr: svc?.nameKR || svc?.nameEN || fallbackName,
                            },
                            duration: finalDuration,
                            technicianCode: techCode || '',
                            staffName: '',
                            staffAvatar: '',
                            computedTimeStart,
                            quantity: i.quantity || 1,
                            price: i.price || 0,
                            options: i.options,
                            status: i.status || null,
                            itemRating: perKtvRating,
                            itemFeedback: i.itemFeedback ?? null,
                            ktvRatings: ktvRatingsMap,
                            // Per-item room/bed from segments
                            roomName: itemRoomName,
                            bedId: itemBedId,
                            segments: Array.isArray(i.segments) ? i.segments : (typeof i.segments === 'string' ? JSON.parse(i.segments) : [])
                        });
                    });
                });

                const totalDuration = processedItems.reduce((acc, item) => acc + item.duration, 0);

                setData({
                    id: booking.id,
                    status: (booking.status as JourneyStatus) || 'PREPARING',
                    timeStart: booking.timeStart || null,
                    timeEnd: booking.timeEnd || null,
                    rating: booking.rating || null,
                    violations: booking.violations || null,
                    tipAmount: booking.tipAmount || null,
                    staffName: '',
                    staffAvatar: '',
                    totalDuration: totalDuration || 60,
                    items: processedItems,
                    roomName: booking.roomName || null,
                    bedId: booking.bedId || null
                });
            } else {

                setError('Không tìm thấy đơn hàng.');
            }
        } catch (err: any) {
            console.error('Error fetching initial journey state:', err);
            setError(err.message || 'Lỗi tải dữ liệu.');
        } finally {
            setLoading(false);
        }
    }, [bookingId]);

    useEffect(() => {
        fetchState();

        if (!bookingId) return;

        const supabase = createClient();

        // 2. Subscribe to Realtime Updates — dùng resolvedId (booking.id thật)
        const channel = supabase
            .channel(`journey-tracking-${resolvedId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'Bookings',
                    filter: `id=eq.${resolvedId}`,
                },
                (payload: any) => {
                    console.log('[Journey] Booking Realtime Update:', payload.new);
                    const newBooking = payload.new;
                    
                    setData((prev) => {
                        if (!prev) return prev;
                        return {
                            ...prev,
                            status: (newBooking.status as JourneyStatus) || prev.status,
                            timeStart: newBooking.timeStart !== undefined ? newBooking.timeStart : prev.timeStart,
                            timeEnd: newBooking.timeEnd !== undefined ? newBooking.timeEnd : prev.timeEnd,
                            rating: newBooking.rating !== undefined ? newBooking.rating : prev.rating,
                            violations: newBooking.violations !== undefined ? newBooking.violations : prev.violations,
                            tipAmount: newBooking.tipAmount !== undefined ? newBooking.tipAmount : prev.tipAmount,
                        };
                    });

                    // If staff changed, re-fetch full state to get new staff details
                    if (newBooking.technicianCode) {
                        fetchState();
                    }
                }
            )
            // 🆕 Subscribe BookingItems: detect khi KTV hoàn thành từng DV hoặc Mua thêm DV
            .on(
                'postgres_changes',
                {
                    event: '*', // Lắng nghe cả INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'BookingItems',
                    filter: `bookingId=eq.${resolvedId}`,
                },
                (payload: any) => {
                    if (payload.eventType === 'INSERT') {
                        console.log('[Journey] BookingItem Realtime INSERT:', payload.new.id);
                        // Khi có dịch vụ mới mua thêm, ta cần gọi lại fetchState() để lấy được 
                        // từ điển Tên dịch vụ (nameVN, nameEN) từ bảng Services. 
                        // Vì sự kiện INSERT (mua thêm) rất hiếm khi xảy ra đồng loạt, nên việc gọi lại API là an toàn.
                        fetchState();
                        return;
                    }

                    if (payload.eventType === 'UPDATE') {
                        console.log('[Journey] BookingItem Realtime Update:', payload.new.id, payload.new.status);
                        const updatedItem = payload.new;
                        
                        setData((prev) => {
                            if (!prev) return prev;
                        // Match composite IDs: 'abc-ktv0' starts with 'abc'
                        const originalId = updatedItem.id;
                        const updatedKtvRatings: Record<string, number> = updatedItem.ktvRatings || {};
                        const updatedItems = prev.items.map(item => {
                            if (item.id === originalId || item.id.startsWith(`${originalId}-ktv`)) {
                                // For multi-KTV split cards: use per-KTV rating from ktvRatings
                                const isComposite = item.id.includes('-ktv');
                                let perKtvRating = updatedItem.itemRating ?? item.itemRating;
                                if (isComposite && item.technicianCode && Object.keys(updatedKtvRatings).length > 0) {
                                    perKtvRating = updatedKtvRatings[item.technicianCode.trim()] ?? item.itemRating;
                                }
                                return {
                                    ...item,
                                    status: updatedItem.status ?? item.status,
                                    itemRating: perKtvRating,
                                    itemFeedback: updatedItem.itemFeedback ?? item.itemFeedback,
                                    ktvRatings: updatedKtvRatings,
                                    computedTimeStart: updatedItem.timeStart ?? item.computedTimeStart,
                                    segments: Array.isArray(updatedItem.segments) ? updatedItem.segments : (typeof updatedItem.segments === 'string' ? JSON.parse(updatedItem.segments) : item.segments)
                                };
                            }
                            return item;
                        });
                        return { ...prev, items: updatedItems };
                    });
                    } // close if UPDATE
                } // close callback function
            )
            .subscribe((status: any, err?: any) => {
                console.log('[useJourneyRealtime] Subscribe Status:', status);
                if (err) {
                    console.error('[useJourneyRealtime] Subscribe Error:', err);
                }
            });

        // 🔧 EGRESS FIX: Tiered polling fallback — 15s visible, 30s hidden
        // Reduced from 5s → 15s when active (saves ~66% egress) while keeping reliability
        // Realtime handles instant updates; polling is FALLBACK for unreliable networks
        const pollInterval = setInterval(() => {
            if (document.visibilityState === 'hidden') {
                return; // Skip when hidden — no user watching
            }
            fetchState();
        }, 15000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    }, [bookingId, resolvedId, fetchState]);

    return { data, loading, error, refresh: fetchState };
}
