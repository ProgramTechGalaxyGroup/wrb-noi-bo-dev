/* src/components/Booking/BookingCheckout.i18n.ts */

export type BookingTranslationKey = 
  // Info Step
  | 'step_info_title' | 'step_info_desc'
  // Date/Time Step
  | 'step_time_title' | 'step_time_desc' | 'bc_selectDate' | 'bc_availableTimes' | 'bc_moreDate' | 'bc_calendar' | 'bc_noTimeSlots' | 'bc_timeNote' | 'bc_month' | 'bc_close'
  | 'bc_sun' | 'bc_mon' | 'bc_tue' | 'bc_wed' | 'bc_thu' | 'bc_fri' | 'bc_sat' | 'cal_t2' | 'cal_t3' | 'cal_t4' | 'cal_t5' | 'cal_t6' | 'cal_t7' | 'cal_cn'
  // Invoice Step
  | 'step_invoice_title' | 'step_invoice_desc' | 'invoice_time'
  // Payment Step
  | 'step_payment_title' | 'step_payment_desc' | 'booking_reminder'
  // Terms Step
  | 'step_terms_title' | 'step_terms_desc' | 'terms_agree' | 'terms_link'
  // Confirm
  | 'btn_confirm' | 'btn_back' | 'btn_next' | 'error_incomplete';

export const bookingTranslations: Record<string, Record<BookingTranslationKey, string>> = {
  en: {
    step_info_title: 'Customer Info',
    step_info_desc: 'Please enter your information',
    step_time_title: 'Date & Time',
    step_time_desc: 'Select your preferred appointment',
    bc_selectDate: 'Select Date',
    bc_availableTimes: 'Available Times',
    bc_moreDate: 'More',
    bc_calendar: 'Calendar',
    bc_noTimeSlots: 'No time slots available today',
    bc_timeNote: 'Please scroll to choose a valid time',
    bc_month: 'Month ',
    bc_close: 'Close',
    bc_sun: 'Sun', bc_mon: 'Mon', bc_tue: 'Tue', bc_wed: 'Wed', bc_thu: 'Thu', bc_fri: 'Fri', bc_sat: 'Sat',
    cal_t2: 'Mon', cal_t3: 'Tue', cal_t4: 'Wed', cal_t5: 'Thu', cal_t6: 'Fri', cal_t7: 'Sat', cal_cn: 'Sun',
    step_invoice_title: 'Invoice Summary',
    step_invoice_desc: 'Review your selected services',
    invoice_time: 'Appointment:',
    step_payment_title: 'Payment Method',
    step_payment_desc: 'Choose how you want to pay',
    booking_reminder: 'Please note: Advance booking helps us guarantee your spot and prepare the best service for you.',
    step_terms_title: 'Terms & Conditions',
    step_terms_desc: 'Review our policies',
    terms_agree: 'I agree to the ',
    terms_link: 'Terms and Policies',
    btn_confirm: 'Confirm Booking',
    btn_back: 'Back',
    btn_next: 'Next',
    error_incomplete: 'Please complete all required fields.',
  },
  vi: {
    step_info_title: 'Thông Tin Khách',
    step_info_desc: 'Vui lòng nhập thông tin của bạn',
    step_time_title: 'Ngày & Giờ',
    step_time_desc: 'Chọn thời gian đặt hẹn',
    bc_selectDate: 'Chọn Ngày',
    bc_availableTimes: 'Thời Gian',
    bc_moreDate: 'Khác',
    bc_calendar: 'Lịch',
    bc_noTimeSlots: 'Đã hết giờ trống trong ngày',
    bc_timeNote: 'Vui lòng vuốt để chọn giờ hợp lệ',
    bc_month: 'Tháng ',
    bc_close: 'Đóng',
    bc_sun: 'CN', bc_mon: 'T2', bc_tue: 'T3', bc_wed: 'T4', bc_thu: 'T5', bc_fri: 'T6', bc_sat: 'T7',
    cal_t2: 'T2', cal_t3: 'T3', cal_t4: 'T4', cal_t5: 'T5', cal_t6: 'T6', cal_t7: 'T7', cal_cn: 'CN',
    step_invoice_title: 'Tổng Hợp Đơn',
    step_invoice_desc: 'Kiểm tra lại dịch vụ đã chọn',
    invoice_time: 'Lịch hẹn:',
    step_payment_title: 'Thanh Toán',
    step_payment_desc: 'Chọn phương thức thanh toán',
    booking_reminder: 'Lưu ý: Quý khách vui lòng đặt lịch trước để đảm bảo có KTV phục vụ đúng hẹn.',
    step_terms_title: 'Điều Khoản & Chính Sách',
    step_terms_desc: 'Vui lòng đọc kỹ các chính sách',
    terms_agree: 'Tôi đã đọc và đồng ý với ',
    terms_link: 'Điều khoản & Chính sách',
    btn_confirm: 'Xác Nhận Đặt Lịch',
    btn_back: 'Quay Lại',
    btn_next: 'Tiếp Tục',
    error_incomplete: 'Vui lòng điền đủ thông tin bắt buộc.',
  },
  // Thêm các ngôn ngữ khác nếu cần (jp, kr, cn)
};

export const getBookingT = (lang: string) => {
  return bookingTranslations[lang] || bookingTranslations['en'];
};
