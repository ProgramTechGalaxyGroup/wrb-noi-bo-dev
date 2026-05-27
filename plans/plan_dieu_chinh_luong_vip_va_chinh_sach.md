# Điều chỉnh luồng VIP ngày 25/05 và Chính sách Spa

## 1. Mục tiêu
- **Thời gian chọn lịch:** Đồng hồ tự động lấy mốc thời gian rảnh tiếp theo (ví dụ KTV rảnh lúc 18:22 -> Chọn được từ 18:30) nếu khách hàng chọn đúng KTV đang bận.
- **UI Điều khoản & Chính sách:** Thêm ô checkbox "Đồng ý điều khoản & chính sách của Spa" (có tích xanh lá) trước khi nhấn Xác nhận đặt lịch.
- **Database:** Thêm bảng/cấu hình lưu trữ các điều khoản này trong Supabase.

## 2. Phân tích hiện trạng và Giải pháp

### 2.1. Logic hiển thị thời gian (BookingConfig/index.tsx)
- **Hiện tại:** Các khung giờ (slots) bắt đầu từ `now + bufferMinutes` (nếu là hôm nay) hoặc từ giờ bắt đầu ca (`shiftStart`). Hệ thống đang cho phép chọn bất kỳ giờ nào sau mốc này mà chưa check xem KTV được chọn có đang bận hay không ở thời điểm đó.
- **Giải pháp:** 
  - Đọc danh sách `selectedStaffInfoList`. Nếu có KTV nào đang có `availability === 'BUSY'` và có thông tin `estimatedEndTime` (giờ dự kiến xong).
  - Tìm thời gian xong muộn nhất (`maxBusyMins`).
  - Làm tròn giờ rảnh lên mốc 30 phút gần nhất (VD: 18:22 -> 18:30).
  - Gộp chung điều kiện: Giờ cho phép book sớm nhất = `Math.max(startMins, maxBusyMins_rounded)`. Khi đó đồng hồ FlipClock sẽ chỉ hiện từ 18:30 trở đi.

### 2.2. Checkbox "Đồng ý Điều khoản"
- Đặt checkbox ngay trên nút "XÁC NHẬN CHỌN" ở thanh CTA (nổi ở dưới cùng màn hình).
- Dạng UI: Checkbox vuông/tròn tuỳ chỉnh bằng Tailwind. Khi chưa check thì viền xám, khi check thì fill màu và có icon dấu tích xanh lá cây.
- Nút Xác nhận sẽ mờ đi (disabled) nếu người dùng chưa tích vào.

### 2.3. Lưu trữ Điều khoản ở Database
- **Đề xuất Database:** 
  - Khuyến nghị sử dụng bảng `SystemConfigs` hiện có. Tạo một record với key là `vip_booking_policies`.
  - Lưu dữ liệu dưới dạng mảng JSON `[{ "id": 1, "contentVN": "..." }]`.
  - Lý do: Chính sách là text cấu hình tĩnh, ít khi query phức tạp, để vào SystemConfigs sẽ rất gọn gàng thay vì đẻ thêm bảng mới gây rối DB.
- **Mẫu chính sách (Draft):**
  1. *Đối với đặt lịch tự do (chưa chọn thời gian cụ thể), hệ thống sẽ ghi nhận và bộ phận CSKH của Spa sẽ trực tiếp xác nhận, liên hệ chốt giờ với Quý khách.*
  2. *Quý khách vui lòng đến đúng giờ hẹn. Trong trường hợp đến sớm hoặc trễ hơn dự kiến, Quý khách có thể sẽ phải chờ để nhân viên sắp xếp chỗ.*
  3. *Spa có quyền từ chối phục vụ nếu Quý khách có những yêu cầu hoặc hành vi không phù hợp với quy định chung của chúng tôi.*
  4. *Thời gian phục vụ và phí dịch vụ VIP có thể thay đổi một chút tùy thuộc vào lựa chọn chuyên sâu của Quý khách khi đến tiệm.*

## 3. Các thay đổi dự kiến (Files to Modified)

### 3.1 Cập nhật Component i18n
#### [MODIFY] `src/components/Menu/Premium/Premium.i18n.ts`
- Bổ sung text dịch cho checkbox (VN/EN/CN/JP...). VD: "Tôi đã đọc và đồng ý với Điều khoản & Chính sách của Spa."

### 3.2 Cập nhật UI và Logic (Frontend)
#### [MODIFY] `src/components/Menu/Premium/BookingConfig/index.tsx`
- Thêm state `isAgreedTerms` (boolean, default false).
- Cập nhật logic tính `startMins` bên trong `useMemo` của `pickerTimeRange`: Quét mảng `selectedStaffInfoList` để lấy `estimatedEndTime` của KTV bận.
- Vẽ UI Checkbox tích xanh ở `Floating CTA Bar`.
- Vô hiệu hoá (disabled) nút "Xác nhận" nếu `isAgreedTerms` là false.

### 3.3 Database Update
- Cung cấp script SQL nhỏ (hoặc hướng dẫn bạn add tay trên Supabase dashboard) để thêm record `vip_booking_policies` vào bảng `SystemConfigs`.

## 4. Open Questions (Cần bạn duyệt)

> [!IMPORTANT]
> **1. Nơi lưu trữ DB:** Bạn có đồng ý dùng bảng `SystemConfigs` với key `vip_booking_policies` để lưu danh sách điều khoản không? Hay bạn muốn tạo hẳn 1 bảng mới riêng biệt (ví dụ bảng `SpaPolicies` gồm id, content, is_active) giống như bảng `Reminders`? 
> **2. Popup chi tiết:** Bạn có muốn chữ "Điều khoản & Chính sách" có thể bấm vào để bật lên 1 Modal (Popup) hiển thị danh sách 4 chính sách mẫu kia không? Hay chỉ cần 1 dòng chữ và checkbox là đủ, khách tự hiểu?
> **3. Điều kiện chặn book sớm:** Nếu KTV rảnh lúc 18:22, tôi làm tròn lên thành 18:30 khách mới book được, logic làm tròn này có đúng ý bạn không?

## 5. Verification Plan
- Chọn giả lập 1 KTV đang bận (`estimatedEndTime = '18:22'`).
- Mở màn hình BookingConfig, kiểm tra đồng hồ. Đảm bảo Slot đầu tiên cho phép chọn là `18:30`.
- Kiểm tra tính năng Checkbox xanh lá: Bấm vào mới cho qua bước Confirm.
