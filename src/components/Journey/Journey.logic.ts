/**
 * Journey Logic — Shared hooks and business logic.
 * Consolidates useServiceTimer (was duplicated in ActiveService + ServiceList)
 * and groupItemsByTech (was in ServiceList).
 */

import { useEffect, useState, useCallback } from 'react';
import { ServiceItem } from '@/components/Journey/useJourneyRealtime';

// ─── useServiceTimer ─────────────────────────────────────────────────────────
// Merged from ActiveService (full version with timeEnd) and ServiceList (compact).

interface ServiceTimerResult {
    elapsedSeconds: number;
    remainingSeconds: number;
    progress: number;       // 0-100%
    elapsedMinutes: number;
    formattedTime: string;  // "MM:SS"
    isStarted: boolean;
    isFinished: boolean;
}

/**
 * Hook: per-service timer logic.
 * Counts elapsed time from computedTimeStart, counts down from duration.
 * @param duration - Service duration in minutes
 * @param computedTimeStart - ISO timestamp when service started (null = not started)
 * @param timeEnd - Optional ISO timestamp when service ended
 */
export const useServiceTimer = (
    duration: number,
    computedTimeStart: string | null | undefined,
    timeEnd?: string | null,
    isPaused?: boolean
): ServiceTimerResult => {
    const totalSeconds = duration * 60;
    const isStarted = !!computedTimeStart;

    const getInitialElapsed = useCallback(() => {
        if (!computedTimeStart) return 0;

        let normalizedStart = computedTimeStart;
        if (typeof computedTimeStart === 'string' && !computedTimeStart.includes('Z') && !computedTimeStart.includes('+')) {
            // Chỉ thay thế khoảng trắng bằng chữ T để Safari parse được
            // KHÔNG thêm Z vì dữ liệu trong DB là giờ Việt Nam (Local Time), thêm Z sẽ biến thành giờ UTC (tương lai 7 tiếng)
            normalizedStart = computedTimeStart.replace(' ', 'T');
        }

        const start = new Date(normalizedStart).getTime();

        if (timeEnd) {
            let normalizedEnd = timeEnd;
            if (typeof timeEnd === 'string' && !timeEnd.includes('Z') && !timeEnd.includes('+')) {
                normalizedEnd = timeEnd.replace(' ', 'T');
            }
            const end = new Date(normalizedEnd).getTime();
            const diffInSeconds = Math.floor((end - start) / 1000);
            return Math.max(0, Math.min(diffInSeconds, totalSeconds));
        }

        const now = new Date().getTime();
        const diffInSeconds = Math.floor((now - start) / 1000);
        return Math.max(0, Math.min(diffInSeconds, totalSeconds));
    }, [computedTimeStart, timeEnd, totalSeconds]);

    const [elapsedSeconds, setElapsedSeconds] = useState(getInitialElapsed());

    useEffect(() => {
        setElapsedSeconds(getInitialElapsed());
    }, [getInitialElapsed]);

    useEffect(() => {
        // Only tick if the service has actually started
        if (!isStarted) return;

        // Đếm giây mượt mà bằng prev + 1
        const interval = setInterval(() => {
            setElapsedSeconds(prev => Math.min(prev + 1, totalSeconds));
        }, 1000);

        // Cập nhật ngay lập tức thời gian thực tế khi user quay lại tab (truy cập mới chạy)
        // Chống drift khi tab bị trình duyệt đưa vào chế độ ngủ
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                setElapsedSeconds(getInitialElapsed());
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isStarted, isPaused, getInitialElapsed, totalSeconds]);

    const remainingSeconds = totalSeconds - elapsedSeconds;
    const progress = isStarted ? (remainingSeconds / totalSeconds) * 100 : 100;
    const remainingMinutes = Math.floor(remainingSeconds / 60);
    const remainingSecs = remainingSeconds % 60;
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const formattedTime = `${remainingMinutes.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
    const isFinished = remainingSeconds <= 0 && isStarted;

    return { elapsedSeconds, remainingSeconds, progress, elapsedMinutes, formattedTime, isStarted, isFinished };
};


// ─── groupItemsByTech ────────────────────────────────────────────────────────
// Moved from ServiceList.tsx (was L83-139)

export interface GroupedService {
    technicianCode: string;
    names: string[];
    combinedName: string;
    totalDuration: number;
    itemCount: number;
    earliestTimeStart: string | null;
    roomName: string | null;
    bedId: string | null;
    items: ServiceItem[];
    /** All items in group have COMPLETED/DONE/CLEANING status */
    isCompleted: boolean;
    /** At least one item has a computedTimeStart */
    isStarted: boolean;
    activeSegmentIndex: number;
    totalSegments: number;
}

/**
 * Group booking items by technician code.
 * Items with the same tech code are grouped together for combined timer display.
 */
export const groupItemsByTech = (items: ServiceItem[], lang: string = 'vi'): GroupedService[] => {
    const map = new Map<string, ServiceItem[]>();
    items.forEach(item => {
        // For composite items (multi-KTV split from same BookingItem),
        // group by base item ID → they share ONE timer circle
        const isComposite = item.id.includes('-ktv');
        const key = isComposite
            ? `__shared_${item.id.replace(/-ktv\d+$/, '')}` // Group by base BookingItem ID
            : (item.technicianCode || `__no_tech_${item.id}`);
        const list = map.get(key) || [];
        list.push(item);
        map.set(key, list);
    });

    return Array.from(map.entries()).map(([groupKey, groupItems]) => {
        const isShared = groupKey.startsWith('__shared_');

        const getLocalizedName = (i: ServiceItem) => i.service_names?.[lang] || i.service_name;

        // Deduplicate service names for shared items (same DV shown once)
        const names = isShared
            ? [...new Set(groupItems.map(getLocalizedName))]
            : groupItems.map(getLocalizedName);

        // Gộp segments — DEDUP cho shared group (co-working) vì các items cùng mang 1 mảng segments
        const allMySegs = isShared
            ? (groupItems[0]?.segments || [])           // Co-working: lấy 1 lần, tránh nhân đôi
            : groupItems.flatMap(i => i.segments || []); // Single KTV: mỗi item có segments riêng

        let activeSegDuration = 0;
        let activeSegStartTime: string | null = null;
        let hasActiveSeg = false;
        let activeSegIdx = -1;

        if (allMySegs.length > 0 && allMySegs.some(s => s.actualStartTime)) {
             // Tìm chặng đang chạy (từ dưới lên, chặng cuối cùng có actualStartTime)
             for (let i = allMySegs.length - 1; i >= 0; i--) {
                 if (allMySegs[i].actualStartTime) {
                     activeSegDuration = Number(allMySegs[i].duration) || 0;
                     activeSegStartTime = allMySegs[i].actualStartTime;
                     hasActiveSeg = true;
                     activeSegIdx = i;
                     break;
                 }
             }
        }

        // For shared items: same DV → use max duration (not sum)
        // For sequential items: different DVs → sum durations
        // 🕒 NẾU CÓ CHẶNG ĐANG CHẠY: Dùng thời gian của riêng chặng đó
        const totalDuration = hasActiveSeg 
            ? activeSegDuration 
            : (isShared ? Math.max(...groupItems.map(i => i.duration)) : groupItems.reduce((sum, i) => sum + i.duration, 0));

        // Collect all tech codes for display
        const allTechCodes = [...new Set(groupItems.map(i => i.technicianCode).filter(Boolean))];
        const techDisplay = isShared ? allTechCodes.join(' & ') : (groupItems[0]?.technicianCode || '');

        // Combined name: for shared show "DV (NH001 & NH002)"
        const combinedName = isShared && allTechCodes.length > 1
            ? `${names.join(' + ')} (${allTechCodes.join(' & ')})`
            : names.join(' + ');

        // Earliest timeStart among all items in group
        // 🕒 NẾU CÓ CHẶNG ĐANG CHẠY: Dùng mốc bắt đầu của riêng chặng đó
        let earliestTimeStart: string | null = activeSegStartTime;
        if (!hasActiveSeg) {
            groupItems.forEach(i => {
                if (i.computedTimeStart) {
                    if (!earliestTimeStart || new Date(i.computedTimeStart) < new Date(earliestTimeStart)) {
                        earliestTimeStart = i.computedTimeStart;
                    }
                }
            });
        }

        const doneStatuses = ['COMPLETED', 'DONE', 'CLEANING', 'FEEDBACK'];
        const isCompleted = groupItems.every(i => doneStatuses.includes(i.status || ''));
        const isStarted = groupItems.some(i => i.computedTimeStart !== null);

        return {
            technicianCode: isShared ? techDisplay : (groupKey.startsWith('__no_tech_') ? '' : groupKey),
            names,
            combinedName,
            totalDuration,
            itemCount: isShared ? 1 : groupItems.length, // Shared = 1 DV with multiple KTVs
            earliestTimeStart,
            roomName: groupItems[0]?.roomName || null,
            bedId: groupItems[0]?.bedId || null,
            items: groupItems,
            isCompleted,
            isStarted,
            activeSegmentIndex: activeSegIdx,
            totalSegments: allMySegs.length
        };
    });
};


// ─── useViolations ───────────────────────────────────────────────────────────
// Consolidated from ActiveService + ServiceList violations logic

interface UseViolationsResult {
    selectedViolations: number[];
    sentViolations: Set<number>;
    sendingViolation: number | null;
    toggleViolation: (index: number) => void;
}

/**
 * Hook: manage violation selection, localStorage persistence, and notification sending.
 * @param bookingId - Booking ID for storage key scoping
 * @param currentItemId - Current service item ID for per-item tracking (optional)
 * @param violations - The violations list (for notification text)
 * @param roomName - Room name for notification message
 * @param bedId - Bed ID for notification message
 * @param serviceName - Service name for notification message
 */
export const useViolations = (
    bookingId: string | undefined,
    currentItemId: string,
    violations: string[],
    roomName?: string,
    bedId?: string,
    serviceName?: string,
): UseViolationsResult => {
    const storageKeyViolations = `spa_wrb_violations_${bookingId || 'default'}`;
    const storageKeySent = `spa_wrb_sent_${bookingId || 'default'}`;

    const [violationsMap, setViolationsMap] = useState<Record<string, number[]>>({});
    const [sentViolationsMap, setSentViolationsMap] = useState<Record<string, number[]>>({});
    const [sendingViolation, setSendingViolation] = useState<number | null>(null);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKeyViolations);
            if (saved) setViolationsMap(JSON.parse(saved));
            const savedSent = localStorage.getItem(storageKeySent);
            if (savedSent) setSentViolationsMap(JSON.parse(savedSent));
        } catch { /* silent */ }
    }, [storageKeyViolations, storageKeySent]);

    const selectedViolations = violationsMap[currentItemId] || [];
    const sentViolationsForItem = new Set(sentViolationsMap[currentItemId] || []);

    // Send notification to front desk when a violation is selected
    const sendViolationNotification = useCallback(async (violationIndex: number, violationText: string) => {
        if (!bookingId || sentViolationsForItem.has(violationIndex)) return;
        setSendingViolation(violationIndex);
        try {
            const svcName = serviceName || 'Dịch vụ';
            await fetch('/api/notifications/normal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId,
                    type: 'FEEDBACK',
                    message: `⚠️ Khách${roomName ? ` phòng ${roomName}` : ''}${bedId ? ` giường ${bedId}` : ''} - DV "${svcName}" phản hồi: ${violationText}`,
                }),
            });
            setSentViolationsMap(prev => {
                const next = { ...prev, [currentItemId]: [...(prev[currentItemId] || []), violationIndex] };
                try { localStorage.setItem(storageKeySent, JSON.stringify(next)); } catch { /* silent */ }
                return next;
            });
        } catch (err) {
            console.error('Failed to send violation notification:', err);
        } finally {
            setSendingViolation(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookingId, currentItemId, serviceName, roomName, bedId, storageKeySent]);

    const toggleViolation = useCallback((index: number) => {
        // 🚀 TÍNH TOÁN ĐỒNG BỘ: Không dựa vào nội bộ updater function vì React 18 batching sẽ làm mất dữ liệu
        const isSelecting = !selectedViolations.includes(index);

        setViolationsMap(prev => {
            const currentList = prev[currentItemId] || [];
            const nextList = !currentList.includes(index)
                ? [...currentList, index]
                : currentList.filter(i => i !== index);
            const next = { ...prev, [currentItemId]: nextList };
            try { localStorage.setItem(storageKeyViolations, JSON.stringify(next)); } catch { /* silent */ }
            return next;
        });

        // Send notification only on CHECK (not uncheck)
        if (isSelecting) {
            sendViolationNotification(index, violations[index]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentItemId, storageKeyViolations, violations, sendViolationNotification, selectedViolations]);

    return {
        selectedViolations,
        sentViolations: sentViolationsForItem,
        sendingViolation,
        toggleViolation,
    };
};

// ─── useRemindersCustomer ───────────────────────────────────────────────────

/**
 * Hook: fetch active reminders (violations) from Supabase dynamically.
 */
export const useRemindersCustomer = (lang: string = 'vi') => {
    const [reminders, setReminders] = useState<string[]>([]);

    useEffect(() => {
        const fetchReminders = async () => {
            const { createClient } = await import('@/lib/supabase');
            const supabase = createClient();
            const { data, error } = await supabase
                .from('Reminders_Customer')
                .select('contentVN, contentEN, contentCN, contentJP, contentKR')
                .eq('is_active', true)
                .order('order_index', { ascending: true });

            if (data && !error) {
                const mapLangToColumn = (l: string) => {
                    switch (l) {
                        case 'en': return 'contentEN';
                        case 'kr': return 'contentKR';
                        case 'jp': return 'contentJP';
                        case 'cn': return 'contentCN';
                        default: return 'contentVN';
                    }
                };
                const colName = mapLangToColumn(lang);
                setReminders(data.map((r: any) => r[colName]));
            }
        };
        fetchReminders();
    }, [lang]);

    return reminders;
};
