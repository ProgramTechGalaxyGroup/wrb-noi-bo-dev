'use client';
import React, { useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useJourneyRealtime } from '@/components/Journey/useJourneyRealtime';
import WaitingRoom from '@/components/Journey/WaitingRoom';
import ServiceList from '@/components/Journey/ServiceList';
import CheckBelongings from '@/components/Journey/CheckBelongings';
import Feedback from '@/components/Journey/Feedback';
import { translations } from '@/components/Journey/Journey.i18n';
import { useAuthStore } from '@/lib/authStore.logic';

export default function JourneyPage({ params }: { params: Promise<{ lang: string, bookingId: string }> }) {
    const resolvedParams = React.use(params);
    const bookingId = resolvedParams.bookingId;
    const lang = resolvedParams.lang;

    const { data: journeyData, loading, error, refresh } = useJourneyRealtime(bookingId);
    const { isAuthUser } = useAuthStore();
    const [isSosLoading, setIsSosLoading] = React.useState(false);
    const [sosSent, setSosSent] = React.useState(false);
    const [isActionLoading, setIsActionLoading] = React.useState(false);
    const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
    const [serviceView, setServiceView] = React.useState<'TIMER' | 'CHECK_BELONGINGS' | 'RATING'>('TIMER');
    const [confirmState, setConfirmState] = React.useState<{ isOpen: boolean; message: string; onConfirm: () => void; isDestructive?: boolean } | null>(null);
    const [alertState, setAlertState] = React.useState<{ isOpen: boolean; message: string; type?: 'error' | 'success' | 'info' }>({ isOpen: false, message: '' });
    const [forceAllRated, setForceAllRated] = React.useState(false);

    // 🔄 Refresh state (MUST be before conditional returns — React Rules of Hooks)
    const [isRefreshing, setIsRefreshing] = React.useState(false);

    const handleManualRefresh = React.useCallback(async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await refresh();
        } catch (err) {
            console.error('Refresh error:', err);
        } finally {
            setIsRefreshing(false);
        }
    }, [isRefreshing, refresh]);

    // State machine: derive từ booking.status + items status
    const rawStatus = journeyData?.status || 'PREPARING';
    // Log debug
    const itemStatuses = (journeyData?.items || []).map(i => `${i.id}:${i.status}`);
    console.log('[Journey] rawStatus:', rawStatus, '| items:', itemStatuses.join(', '));
    // Bất kỳ item nào có status KHÁC "WAITING"/null → coi booking đã bắt đầu
    const itemsStarted = (journeyData?.items || []).some(i =>
        i.status && i.status !== 'WAITING'
    );
    const derivedStatusRaw = (rawStatus === 'NEW' || rawStatus === 'PREPARING') && itemsStarted
        ? 'IN_PROGRESS'
        : rawStatus === 'NEW' ? 'PREPARING'
            : rawStatus === 'COMPLETED' ? 'CLEANING'
                : rawStatus;

    // Kể cả khi Lễ tân đã bấm DONE (dọn phòng xong), nếu khách CHƯA đánh giá -> Ép về trạng thái FEEDBACK để khách có thể đánh giá bất cứ lúc nào
    const allRated = (journeyData?.items || []).length > 0 && (journeyData?.items || []).every(i =>
        i.itemRating !== null && i.itemRating !== undefined
    );

    const state = forceAllRated ? 'DONE' : (derivedStatusRaw === 'DONE' && !allRated) ? 'FEEDBACK' : derivedStatusRaw;

    // Khi rawStatus = PREPARING nhưng items đã Started -> Nghĩa là KTV đang nghỉ giữa chặng (chuyển phòng)
    const isPaused = rawStatus === 'PREPARING' && itemsStarted;

    const t = {
        preparing: translations[lang]?.preparing || translations['en'].preparing,
        inProgress: translations[lang]?.inProgress || translations['en'].inProgress,
        completed: translations[lang]?.completed || translations['en'].completed,
        feedback: translations[lang]?.feedback || translations['en'].feedback,
        title: translations[lang]?.title || translations['en'].title,
        errorTitle: translations[lang]?.errorTitle || translations['en'].errorTitle,
        retry: translations[lang]?.retry || translations['en'].retry,
        finishTitle: translations[lang]?.finishTitle || translations['en'].finishTitle,
        finishSub: translations[lang]?.finishSub || translations['en'].finishSub,
        goHome: translations[lang]?.goHome || translations['en'].goHome,
        sos: translations[lang]?.sos || translations['en'].sos,
        sosConfirm: translations[lang]?.sosConfirm || translations['en'].sosConfirm,
        sosSending: translations[lang]?.sosSending || translations['en'].sosSending,
        sosSent: translations[lang]?.sosSent || translations['en'].sosSent,
        allDoneTitle: ({ vi: 'Cảm ơn bạn đã đánh giá!', en: 'Thank you for your feedback!', kr: '평가해 주셔서 감사합니다!', cn: '感谢您的评价！', jp: 'ご評価いただきありがとうございます！' } as Record<string, string>)[lang] || 'Thank you for your feedback!',
        allDoneSub: ({ vi: 'Mọi dịch vụ đã hoàn thành. Hẹn gặp lại bạn!', en: 'All services completed. See you again!', kr: '모든 서비스가 완료되었습니다. 다음에 또 뵙겠습니다!', cn: '所有服务已完成。期待再次见到您！', jp: '全てのサービスが完了しました。またのお越しをお待ちしております！' } as Record<string, string>)[lang] || 'All services completed. See you again!',
    };

    // Progress steps — 4 bước lộ trình đầy đủ
    const steps = [
        {
            id: 'FOOT_SOAK',
            label: translations[lang]?.footSoak || translations['en'].footSoak,
            emoji: '🛁',
        },
        {
            id: 'SERVICE',
            label: translations[lang]?.service || translations['en'].service,
            emoji: '💆',
        },
        {
            id: 'CHECK',
            label: translations[lang]?.checkItems || translations['en'].checkItems,
            emoji: '👜',
        },
        {
            id: 'RATING',
            label: translations[lang]?.rating || translations['en'].rating,
            emoji: '⭐',
        },
    ];

    // Map booking status → stepper index
    const getStepIndex = () => {
        if (state === 'DONE') return steps.length; // all done
        if (state === 'PREPARING') return 0; // Ngâm chân
        if (state === 'CLEANING' || state === 'FEEDBACK' || state === 'IN_PROGRESS') {
            if (serviceView === 'RATING') return 3;
            if (serviceView === 'CHECK_BELONGINGS') return 2;
            return 1; // TIMER
        }
        return 1;
    };
    const currentIndex = getStepIndex();

    // ─── Handlers ────────────────────────────────────────────────────────────

    const handleSOS = async () => {
        if (sosSent || isSosLoading) return;
        setConfirmState({
            isOpen: true,
            message: t.sosConfirm,
            isDestructive: true,
            onConfirm: async () => {
                setConfirmState(null);
                setIsSosLoading(true);
                try {
                    const res = await fetch('/api/notifications/emergency', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            bookingId,
                            customerName: journeyData?.roomName || 'Khách',
                            message: `🚨 KHẨN CẤP: Khách hàng tại PHÒNG ${journeyData?.roomName || '???'}${journeyData?.bedId ? ` - GIƯỜNG ${journeyData.bedId}` : ''} nhấn nút báo động.`
                        })
                    });
                    if (!res.ok) throw new Error('Failed to send SOS');
                    setSosSent(true);
                    setTimeout(() => setSosSent(false), 5000);
                } catch (err) {
                    console.error('SOS Error:', err);
                    setAlertState({
                        isOpen: true,
                        message: 'Gửi yêu cầu thất bại. Vui lòng thử lại hoặc gọi nhân viên.',
                        type: 'error'
                    });
                } finally {
                    setIsSosLoading(false);
                }
            }
        });
    };

    const handleAddService = async () => {
        if (isActionLoading) return;
        setIsActionLoading(true);
        try {
            const res = await fetch('/api/notifications/normal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId,
                    customerName: journeyData?.roomName || 'Khách',
                    message: `🔔 YÊU CẦU: Khách tại PHÒNG ${journeyData?.roomName || '???'}${journeyData?.bedId ? ` - GIƯỜNG ${journeyData.bedId}` : ''} muốn MUA THÊM DỊCH VỤ.`
                })
            });
            if (res.ok) {
                setActionSuccess('ADD_SERVICE');
                setTimeout(() => setActionSuccess(null), 3000);
            }
        } catch (err) { console.error(err); }
        finally { setIsActionLoading(false); }
    };

    const handleChangeStaff = async () => {
        if (isActionLoading) return;
        setConfirmState({
            isOpen: true,
            message: lang === 'vi' ? 'Bạn muốn yêu cầu đổi nhân viên?' : 'Do you want to request a staff change?',
            onConfirm: async () => {
                setConfirmState(null);
                setIsActionLoading(true);
                try {
                    const res = await fetch('/api/notifications/emergency', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            bookingId,
                            customerName: journeyData?.roomName || 'Khách',
                            message: `🚨 ĐỔI NGƯỜI: Khách tại PHÒNG ${journeyData?.roomName || '???'}${journeyData?.bedId ? ` - GIƯỜNG ${journeyData.bedId}` : ''} yêu cầu ĐỔI NHÂN VIÊN.`
                        })
                    });
                    if (res.ok) {
                        setActionSuccess('CHANGE_STAFF');
                        setTimeout(() => setActionSuccess(null), 3000);
                    } else {
                        throw new Error('Failed to change staff');
                    }
                } catch (err) {
                    console.error(err);
                    setAlertState({
                        isOpen: true,
                        message: 'Gửi yêu cầu thất bại. Vui lòng thử lại.',
                        type: 'error'
                    });
                }
                finally { setIsActionLoading(false); }
            }
        });
    };

    // 🆕 Per-item rating handler (supports per-KTV ratings)
    const handleItemRated = useCallback(async (itemId: string, rating: number, feedback: string) => {
        // Strip composite KTV suffix (e.g. 'abc-ktv0' → 'abc') for DB update
        const realItemId = itemId.replace(/-ktv\d+$/, '');

        // Extract ktvCode for per-KTV rating
        let ktvCode: string | undefined;
        if (itemId !== realItemId) {
            // This is a composite ID → find the corresponding KTV code
            const matchedItem = journeyData?.items?.find(i => i.id === itemId);
            ktvCode = matchedItem?.technicianCode?.trim() || undefined;
        }

        const res = await fetch('/api/journey/update', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bookingId,
                bookingItemId: realItemId,
                itemRating: rating,
                itemFeedback: feedback || null,
                ktvCode, // Per-KTV rating identifier
                status: 'DONE',
            })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to submit rating');
        }
        // Refresh to update booking status if DONE
        await refresh();
    }, [bookingId, refresh, journeyData?.items]);

    // Handler: CheckBelongings → chuyển sang FEEDBACK
    const handleCheckBelongingsConfirm = useCallback(async () => {
        try {
            const res = await fetch('/api/journey/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId, status: 'FEEDBACK' })
            });
            if (!res.ok) throw new Error('Failed to update status');
            await refresh();
        } catch (err) {
            console.error('CheckBelongings confirm error:', err);
        }
    }, [bookingId, refresh]);

    // Handler: Feedback → chuyển sang DONE
    const handleFeedbackComplete = useCallback(async (result: { rating: number, violations: number[], tipAmount: number, feedbackNote?: string }) => {
        try {
            const res = await fetch('/api/journey/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookingId,
                    rating: result.rating,
                    violations: result.violations,
                    tipAmount: result.tipAmount,
                    status: 'DONE'
                })
            });
            if (!res.ok) throw new Error('Failed to submit feedback');
            await refresh();
        } catch (err) {
            console.error('Feedback submit error:', err);
            throw err; // Re-throw so Feedback component can show error
        }
    }, [bookingId, refresh]);

    // ─── Render ───────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center font-sans text-[#C9A96E]">
                <svg className="animate-spin w-10 h-10" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center font-sans">
                <h2 className="text-xl font-bold text-[#C9A96E] mb-2">{t.errorTitle}</h2>
                <p className="text-gray-400">{error}</p>
                <button onClick={refresh} className="mt-4 px-6 py-2 bg-[#C9A96E] text-black font-bold rounded-xl hover:bg-[#b09461] transition-colors">{t.retry}</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0d0d0d] text-white pb-10 font-sans selection:bg-[#C9A96E]/20">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#1c1c1e]/90 backdrop-blur-md border-b border-white/5 px-4 py-4 flex flex-col shadow-sm">
                <div className="flex items-center w-full mb-4">
                    <button className="p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                    </button>
                    <h1 className="flex-1 text-center font-bold text-[#C9A96E] text-lg uppercase tracking-widest">
                        {t.title}
                    </h1>
                    {/* 🔄 Refresh button — reliable alternative to pull-to-refresh */}
                    <button 
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        className="p-2 -mr-2 text-gray-400 hover:text-[#C9A96E] active:scale-90 transition-all disabled:opacity-50"
                        style={{ minWidth: 44, minHeight: 44 }}
                    >
                        <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                        </svg>
                    </button>
                </div>

                {/* Progress Stepper — 4 bước */}
                <div className="relative flex justify-between items-center w-full px-2 mt-2">
                    <div className="absolute top-5 left-8 right-8 h-0.5 bg-white/10 z-0">
                        <div
                            className="h-full bg-[#C9A96E] transition-all duration-700 ease-out shadow-[0_0_10px_rgba(201,169,110,0.5)]"
                            style={{ width: `${(Math.max(0, currentIndex) / (steps.length - 1)) * 100}%` }}
                        ></div>
                    </div>

                    {steps.map((step, index) => {
                        const isCompleted = currentIndex > index;
                        const isActive = currentIndex === index;

                        let colorClass = 'bg-[#0d0d0d] border-white/5 text-gray-500';
                        if (isCompleted) colorClass = 'bg-[#C9A96E] border-[#C9A96E] text-black';
                        if (isActive) colorClass = 'bg-[#1c1c1e] border-[#C9A96E] text-[#C9A96E] shadow-[0_0_15px_rgba(201,169,110,0.3)]';

                        return (
                            <div key={step.id} className="flex flex-col items-center gap-2 relative z-10">
                                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${colorClass}`}>
                                    {isCompleted ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                    ) : (
                                        <span className="text-lg leading-none">{step.emoji}</span>
                                    )}
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-[#C9A96E]' : isCompleted ? 'text-white' : 'text-gray-500'}`}>
                                    {step.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-md mx-auto relative px-4 pt-6">
                {state === 'PREPARING' && (
                    <WaitingRoom
                        orderId={journeyData?.id || bookingId}
                        lang={lang}
                        items={journeyData?.items || []}
                        roomName={journeyData?.roomName}
                        bedId={journeyData?.bedId}
                        currentStep={currentIndex}
                    />
                )}

                {(state === 'IN_PROGRESS' || state === 'CLEANING' || state === 'FEEDBACK') && (
                    <ServiceList
                        items={journeyData?.items || []}
                        lang={lang}
                        bookingId={bookingId}
                        roomName={journeyData?.roomName}
                        bedId={journeyData?.bedId}
                        fallbackStaffName={journeyData?.staffName}
                        fallbackStaffAvatar={journeyData?.staffAvatar}
                        onSOS={handleSOS}
                        isSosLoading={isSosLoading}
                        sosSent={sosSent}
                        isAuthUser={isAuthUser}
                        onAddService={handleAddService}
                        onChangeStaff={handleChangeStaff}
                        isActionLoading={isActionLoading}
                        actionSuccess={actionSuccess}
                        onItemRated={handleItemRated}
                        isPaused={isPaused}
                        onViewChange={setServiceView}
                        onAllRated={() => setForceAllRated(true)}
                    />
                )}

                {state === 'DONE' && (
                    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95">
                        <div className="w-24 h-24 bg-[#C9A96E]/10 text-[#C9A96E] rounded-full flex items-center justify-center mb-6 border-4 border-[#C9A96E]/20 shadow-[0_0_20px_rgba(201,169,110,0.2)]">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <h2 className="text-2xl font-black text-[#C9A96E] mb-2">{t.allDoneTitle}</h2>
                        <p className="text-gray-400">{t.allDoneSub}</p>
                        <button onClick={() => window.location.href = `/${lang}/customer-type`} className="mt-8 px-8 py-3 bg-[#C9A96E] border-none rounded-2xl font-bold text-black uppercase tracking-widest shadow-lg hover:bg-[#b09461] transition-colors">{t.goHome}</button>
                    </div>
                )}
            </main>

            {/* Custom Confirm Modal */}
            {confirmState?.isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[#1c1c1e] w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-white/5 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border ${confirmState.isDestructive ? 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/20' : 'bg-[#C9A96E]/10 text-[#C9A96E] border-[#C9A96E]/20 shadow-[0_0_15px_rgba(201,169,110,0.2)]'}`}>
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{({ vi: 'Xác nhận', en: 'Confirm Action', kr: '확인', cn: '确认', jp: '確認' } as Record<string, string>)[lang] || 'Confirm Action'}</h3>
                        <p className="text-gray-400 text-[15px] mb-8 leading-relaxed bg-[#0d0d0d] p-4 rounded-2xl w-full border border-white/5">{confirmState.message}</p>
                        <div className="flex gap-3 w-full">
                            <button onClick={() => setConfirmState(null)} className="flex-1 py-3.5 rounded-xl font-bold bg-[#0d0d0d] text-gray-400 border border-white/5 hover:border-white/10 hover:text-white transition-colors">
                                {({ vi: 'Hủy', en: 'Cancel', kr: '취소', cn: '取消', jp: 'キャンセル' } as Record<string, string>)[lang] || 'Cancel'}
                            </button>
                            <button onClick={confirmState.onConfirm} className={`flex-1 py-3.5 rounded-xl font-bold text-black border-none shadow-lg transition-colors ${confirmState.isDestructive ? 'bg-[#FF3B30] hover:bg-red-700 shadow-[#FF3B30]/20' : 'bg-[#C9A96E] hover:bg-[#b09461] shadow-[#C9A96E]/20'}`}>
                                {({ vi: 'Đồng ý', en: 'Yes', kr: '확인', cn: '确定', jp: 'はい' } as Record<string, string>)[lang] || 'Yes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Alert Modal Overlay */}
            {alertState.isOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1c1c1e] w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-white/5 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border ${alertState.type === 'error' ? 'bg-[#FF3B30]/10 text-[#FF3B30] border-[#FF3B30]/20' : 'bg-[#C9A96E]/10 text-[#C9A96E] border-[#C9A96E]/20'} shadow-[0_0_15px_rgba(201,169,110,0.2)]`}>
                            {alertState.type === 'error' ? (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            ) : (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{({ vi: 'Thông báo', en: 'Alert', kr: '알림', cn: '提示', jp: 'お知らせ' } as Record<string, string>)[lang] || 'Alert'}</h3>
                        <p className="text-gray-400 text-[15px] mb-8 leading-relaxed bg-[#0d0d0d] p-4 rounded-2xl w-full border border-white/5">{alertState.message}</p>
                        <div className="flex w-full">
                            <button onClick={() => setAlertState(prev => ({ ...prev, isOpen: false }))} className={`w-full py-4 rounded-xl font-bold border-none shadow-lg transition-colors ${alertState.type === 'error' ? 'bg-[#FF3B30] text-white hover:bg-red-700 shadow-[#FF3B30]/20' : 'bg-[#C9A96E] text-black hover:bg-[#b09461] shadow-[#C9A96E]/20'}`}>
                                {({ vi: 'Đã hiểu', en: 'Got it', kr: '확인', cn: '知道了', jp: '了解' } as Record<string, string>)[lang] || 'Got it'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
