# Kế hoạch Sửa lỗi Đồng hồ Khách hàng & Tối ưu Polling

## Nguyên nhân gốc rễ (Root Cause)
1. **Đồng hồ bị đứng (Timer Drift):** Trong `Journey.logic.ts`, logic đếm ngược hiện tại đang dùng `prev + 1` mỗi giây. Khi khách hàng chuyển sang tab khác hoặc tắt màn hình điện thoại, trình duyệt sẽ tự động "đóng băng" hoặc giảm tần suất chạy `setInterval`. Hậu quả là đồng hồ không đếm đủ thời gian khi quay lại tab.
2. **Cập nhật dữ liệu (Polling):** Gần đây polling được giảm xuống 15 giây để tiết kiệm free tier. Bạn muốn mở lại tốc độ nhanh hơn, nhưng không muốn tốn tài nguyên khi chạy ngầm.

## Đề xuất giải pháp (Proposed Changes)

### 1. Cập nhật `Journey.logic.ts` (Sửa lỗi đồng hồ)
- Chuyển logic đếm ngược từ `prev + 1` sang **Thời gian tuyệt đối (Absolute Time)**: Tính bằng `Date.now() - startTime`. Do đó dù trình duyệt có đóng băng, khi mở lên đồng hồ sẽ tính lại khoảng chênh lệch chính xác.
- Bắt sự kiện `visibilitychange`: Ngay khi khách hàng bật lại tab hiển thị màn hình lên, đồng hồ sẽ tự trigger một cú tính lại để hiển thị chính xác tức thì.

### 2. Cập nhật `useJourneyRealtime.ts` (Mở lại đồng bộ nhanh & Không chạy ngầm)
- Chỉnh lại polling từ `15000ms` (15s) xuống `5000ms` (5s) (hoặc một số nhỏ hơn như cũ) để cập nhật thời gian thực tốt hơn.
- Duy trì logic kiểm tra `document.visibilityState === 'hidden'` để **bỏ qua việc fetch dữ liệu khi tab bị ẩn** (không chạy ngầm).
- **Thêm tính năng tức thì:** Đăng ký sự kiện `visibilitychange` để ngay khi khách hàng mở lại màn hình web, tự động kích hoạt `fetchState()` lập tức lấy dữ liệu mới nhất mà không cần đợi tới chu kỳ tiếp theo.
