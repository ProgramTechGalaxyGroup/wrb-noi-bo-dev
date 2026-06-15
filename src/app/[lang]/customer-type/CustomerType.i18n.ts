/*
 * File: CustomerType.i18n.ts
 * Chức năng: Định nghĩa các text đa ngôn ngữ cho trang chọn loại khách hàng
 * Chứa bản dịch cho 5 ngôn ngữ: en, vn, jp, kr, cn
 * Cung cấp type TranslationKey để type safety
 */

/**
 * Type định nghĩa các key có thể dịch
 */
export type TranslationKey = 'wc_title' | 'btn_walkin_title' | 'btn_walkin_desc' | 'btn_booking_title' | 'btn_booking_desc' | 'btn_old_title' | 'btn_back' | 'find_history' | 'desc_enter_email' | 'input_placeholder' | 'search' | 'cancel' | 'error_not_found' | 'error_desc' | 'btn_retry' | 'btn_register_new' | 'btn_logout' | 'or_manual';

/**
 * Object chứa tất cả bản dịch theo ngôn ngữ
 * Mỗi ngôn ngữ có record với các key tương ứng
 */
export const translations: Record<string, Record<TranslationKey, string>> = {
  en: {
    wc_title: 'Welcome',

    btn_walkin_title: 'Walk-in',
    btn_walkin_desc: 'Order at the Spa',
    btn_booking_title: 'Advance Booking',
    btn_booking_desc: 'Book for a future date',
    btn_old_title: 'View Order History',
    btn_back: 'Back',
    find_history: 'Find History',
    desc_enter_email: 'Enter your email to retrieve past visits.',
    input_placeholder: 'example@gmail.com',
    search: 'SEARCH',
    cancel: 'Cancel',
    error_not_found: 'Not Found',
    error_desc: 'This email has not been used before.',
    btn_retry: 'Try Another Email',
    btn_register_new: 'Register New Customer',
    btn_logout: 'Switch Account / Logout',
    or_manual: 'or enter email'
  },
  vi: {
    wc_title: 'Chào mừng',

    btn_walkin_title: 'Đặt Tại Tiệm',
    btn_walkin_desc: 'Làm dịch vụ ngay bây giờ',
    btn_booking_title: 'Đặt Lịch Trước',
    btn_booking_desc: 'Hẹn lịch cho ngày/giờ khác',
    btn_old_title: 'Xem lịch sử đơn hàng',
    btn_back: 'Quay lại',
    find_history: 'Tìm Lịch Sử',
    desc_enter_email: 'Nhập email để tìm lại lịch sử ghé thăm.',
    input_placeholder: 'example@gmail.com',
    search: 'TÌM KIẾM',
    cancel: 'Hủy',
    error_not_found: 'Không Tìm Thấy',
    error_desc: 'Email này chưa từng sử dụng dịch vụ.',
    btn_retry: 'Thử Email Khác',
    btn_register_new: 'Đăng Ký Khách Mới',
    btn_logout: 'Đổi Tài Khoản / Đăng Xuất',
    or_manual: 'hoặc nhập email'
  },
  jp: {
    wc_title: 'ようこそ',

    btn_walkin_title: 'ご来店注文',
    btn_walkin_desc: '今すぐサービスを受ける',
    btn_booking_title: '事前予約',
    btn_booking_desc: '別の日時で予約する',
    btn_old_title: '注文履歴を見る',
    btn_back: '戻る',
    find_history: '履歴検索',
    desc_enter_email: '過去の履歴を検索するにはメールを入力してください。',
    input_placeholder: 'example@gmail.com',
    search: '検索',
    cancel: 'キャンセル',
    error_not_found: '見つかりません',
    error_desc: 'このメールアドレスは登録されていません。',
    btn_retry: '別のメールを試す',
    btn_register_new: '新規登録',
    btn_logout: 'アカウント切り替え / ログアウト',
    or_manual: 'またはメール入力'
  },
  kr: {
    wc_title: '환영합니다',

    btn_walkin_title: '현장 주문',
    btn_walkin_desc: '지금 바로 서비스 이용',
    btn_booking_title: '사전 예약',
    btn_booking_desc: '다른 날짜/시간으로 예약',
    btn_old_title: '주문 내역 보기',
    btn_back: '돌아가기',
    find_history: '기록 찾기',
    desc_enter_email: '이전 방문 기록을 확인하려면 이메일을 입력하세요.',
    input_placeholder: 'example@gmail.com',
    search: '검색',
    cancel: '취소',
    error_not_found: '찾을 수 없음',
    error_desc: '이 이메일은 사용된 적이 없습니다.',
    btn_retry: '다른 이메일 시도',
    btn_register_new: '신규 고객 등록',
    btn_logout: '계정 전환 / 로그아웃',
    or_manual: '또는 이메일 입력'
  },
  cn: {
    wc_title: '欢迎',

    btn_walkin_title: '到店下单',
    btn_walkin_desc: '立即体验服务',
    btn_booking_title: '提前预约',
    btn_booking_desc: '预约其他日期/时间',
    btn_old_title: '查看订单记录',
    btn_back: '返回',
    find_history: '查找记录',
    desc_enter_email: '请输入您的电子邮件以检索过往记录。',
    input_placeholder: 'example@gmail.com',
    search: '搜索',
    cancel: '取消',
    error_not_found: '未找到',
    error_desc: '此电子邮件尚未使用过。',
    btn_retry: '尝试其他邮箱',
    btn_register_new: '注册新客户',
    btn_logout: '切换账号 / 退出',
    or_manual: '或输入邮箱'
  }
};