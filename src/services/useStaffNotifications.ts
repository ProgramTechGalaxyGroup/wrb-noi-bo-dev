import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

/**
 * 🔔 Hook: useStaffNotifications
 * -----------------------------
 * Lắng nghe bảng 'StaffNotifications' trên Supabase ở thời gian thực.
 * Khi có thông báo mới (SOS/MUA THÊM DỊCH VỤ), Hook này sẽ:
 * 1. Cập nhật danh sách thông báo.
 * 2. Phát âm thanh chuông báo.
 */

export interface StaffNotification {
  id: string;
  bookingId: string;
  type: 'EMERGENCY' | 'NORMAL' | 'ADD_SERVICE' | 'SOS';
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const useStaffNotifications = () => {
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [newCount, setNewCount] = useState(0);

  // 🔊 Hàm phát âm thanh chuông báo
  const playAlarm = useCallback(() => {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // mẫy chuông báo
      audio.play().catch(e => console.warn('Browser blocked auto-play sound:', e));
    } catch (err) {
      console.error('Audio play error:', err);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    // 1. Lấy danh sách thông báo chưa đọc lúc vừa load trang
    const fetchInitial = async () => {
      const { data } = await supabase
        .from('StaffNotifications')
        // 🔧 EGRESS FIX: Select only needed columns instead of select('*')
        .select('id, bookingId, type, message, isRead, createdAt')
        .eq('isRead', false)
        .order('createdAt', { ascending: false })
        .limit(20);
      
      if (data) {
        setNotifications(data as StaffNotification[]);
        setNewCount(data.length);
      }
    };

    fetchInitial();

    // 2. ⚡ Đăng ký Realtime CHANNEL (Bắt buộc phải bật Realtime trên Supabase như bạn đã làm)
    const channel = supabase
      .channel('reception-staff-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Chỉ nghe khi có bản ghi MỚI được chèn vào
          schema: 'public',
          table: 'StaffNotifications',
        },
        (payload: any) => {
          console.log('🆕 Thông báo mới từ phòng:', payload.new);
          const newNoti = payload.new as StaffNotification;
          
          setNotifications((prev) => [newNoti, ...prev]);
          setNewCount((c) => c + 1);

          // Phát chuông báo ngay lập tức!
          playAlarm();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playAlarm]);

  const markAsRead = async (id: string) => {
    const supabase = createClient();
    await supabase.from('StaffNotifications').update({ isRead: true }).eq('id', id);
    setNotifications((prev) => prev.filter(n => n.id !== id));
    setNewCount((c) => Math.max(0, c - 1));
  };

  return { notifications, newCount, markAsRead, playAlarm };
};
