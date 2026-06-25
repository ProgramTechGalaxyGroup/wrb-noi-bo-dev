# Kế hoạch Thêm Notification (Kèm ghi chú) cho luồng Checkout

## Mô tả Vấn đề
Hiện tại, khi khách hàng đặt lịch VIP thông qua luồng **Checkout (Giỏ hàng)** (tại `/api/orders`), thông tin ghi chú của khách (`vipCustomerNotes`) chỉ được lưu vào cột `options` (JSON) của bảng `BookingItems`. Hệ thống **chưa** gửi thông báo (`StaffNotifications`) về cho Admin giống như khi đặt trực tiếp bằng tính năng VIP Appointment. Điều này làm Admin không nhận được thông báo ngay lập tức về đơn hàng có chứa ghi chú quan trọng.

## Giải pháp Đề xuất

Chúng ta sẽ bổ sung **Bước 5: Tạo Notification** vào `src/app/api/orders/route.ts` sau khi đã insert thành công dữ liệu vào các bảng `Bookings` và `BookingItems`.

### 1. Phân tích Dữ liệu Giỏ Hàng (`cart / items`)
Dữ liệu gửi từ Frontend (CheckoutForm) chứa mảng `items`, gồm 2 loại:
- **Hàng Thường (Standard):** Có tên dịch vụ, số lượng.
- **Hàng VIP (VIP):** Có `vipDisplayName`, `vipDuration`, `vipStaffId`, và đặc biệt là `vipCustomerNotes`.

### 2. Xây dựng Chuỗi Thông Báo (Notification Message)
Message sẽ được format thân thiện, dễ đọc cho Admin (Telegram/Web Dashboard):

```text
📋 ĐƠN HÀNG MỚI (Từ Giỏ Hàng)
👤 Tên khách: [customerName] — [customerPhone]
💰 Tổng thanh toán: [totalVND]đ ([paymentMethod])

📦 DỊCH VỤ VIP:
- [Tên gói VIP] ([Thời gian]p) | KTV: [StaffId]
  📝 Ghi chú: [vipCustomerNotes]

📦 DỊCH VỤ THƯỜNG:
- [Tên dịch vụ] x[Qty]
```

### 3. Cập nhật file `/api/orders/route.ts`
- Thêm logic loop qua `vipItems` và `standardItems` để render ra text block như trên.
- Thực hiện `INSERT INTO StaffNotifications` với `type = 'NEW_ORDER'` và `employeeId = null` (Gửi cho toàn bộ Admin/Lễ tân).

### 4. Bổ sung `notes` ở Bookings (Optional for Admin Dashboard)
Mặc dù thông báo đã gửi, nhưng để Admin Dashboard dễ dàng nhìn thấy ghi chú VIP ngay ở view tổng mà không cần click sâu vào Item, ta có thể tổng hợp tất cả `vipCustomerNotes` thành 1 mảng JSON hoặc chuỗi và update vào field `Bookings.notes`.

---

## Các File Sẽ Chỉnh Sửa

### [MODIFY] `src/app/api/orders/route.ts`
- Thêm logic map text từ `vipItems` và `standardItems`.
- Gộp các `vipCustomerNotes` lại.
- Dùng `supabaseAdmin.from('StaffNotifications').insert(...)`.
- Khối code sẽ được đặt trước lệnh `return NextResponse.json(...)`.

## User Review Required
> [!IMPORTANT]
> Admin/Lễ tân có sử dụng hệ thống Notification này qua trang Lễ tân (Dashboard) hay là có tích hợp Bot Telegram nào đọc trực tiếp từ bảng `StaffNotifications` không? Format message trên đã đủ trực quan chưa bạn?
