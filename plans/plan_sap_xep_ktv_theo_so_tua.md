# Kế hoạch sắp xếp danh sách KTV theo Sổ Tua (Turn Queue) trên VIP Menu

Tài liệu này mô tả kế hoạch lấy dữ liệu thứ tự xếp hàng (queue_position) từ bảng `TurnQueue` để sắp xếp danh sách KTV hiển thị trên VIP Menu chuẩn xác theo Sổ Tua thực tế của Spa.

## Đề xuất Giải Pháp & Thuật toán sắp xếp

### 1. Phân tích Database & API
*   Bảng `TurnQueue` lưu trữ thông tin trực ca của các KTV trong ngày. Trong đó cột `queue_position` (INTEGER) đại diện cho thứ tự xếp hàng để nhận khách (số tua).
*   Hiện tại, API `GET /api/staff/vip-available` chỉ truy vấn các trường `employee_id, status, estimated_end_time, current_order_id` của `TurnQueue`, thiếu cột `queue_position`.
*   Chúng ta cần bổ sung truy vấn cột này, trả về cho client và sắp xếp danh sách.

### 2. Thuật toán Sắp xếp (Sort Logic)
Cả ở Backend (API) và Frontend (UI) sẽ thống nhất bộ quy tắc sắp xếp như sau:
1.  **Theo trạng thái hoạt động (Availability):**
    *   AVAILABLE (Sẵn sàng) $\rightarrow$ Ưu tiên hàng đầu (0)
    *   BUSY (Đang phục vụ) $\rightarrow$ Ưu tiên 2 (1)
    *   NOT_YET (Chưa vô ca) $\rightarrow$ Ưu tiên 3 (2)
    *   OFF_DUTY (Đã tan ca) $\rightarrow$ Ưu tiên 4 (3)
    *   ON_LEAVE (Ngày nghỉ) $\rightarrow$ Ưu tiên cuối cùng (4)
2.  **Theo thứ tự sổ tua (Queue Position):**
    *   Nếu các KTV có **cùng trạng thái** (đặc biệt là cùng `AVAILABLE`), họ sẽ được sắp xếp theo số tua `queuePosition` tăng dần (tức là ai có vị trí xếp hàng nhỏ hơn sẽ đứng trước).
    *   Nếu không có thông tin xếp hàng (ví dụ KTV chưa check-in hoặc ngày nghỉ), `queuePosition` mặc định là `999`.
3.  **Theo mã KTV (Id):**
    *   Nếu cùng vị trí xếp hàng (hoặc cùng bằng 999), sắp xếp theo mã KTV để đảm bảo hiển thị ổn định.

## Chi tiết các file sửa đổi

### 1. [MODIFY] [vipStaffUtils.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ngan%20Ha/wrb-noi-bo-dev/src/lib/vipStaffUtils.ts)
*   Thêm trường `queuePosition?: number;` vào interface `VipStaffInfo` để tránh lỗi kiểu dữ liệu TypeScript.

### 2. [MODIFY] [vip-available/route.ts](file:///c:/Users/ADMIN/OneDrive/Desktop/Ngan%20Ha/wrb-noi-bo-dev/src/app/api/staff/vip-available/route.ts)
*   Thêm `queue_position` vào câu lệnh select từ bảng `TurnQueue` (dòng 73).
*   Bổ sung `queue_position` vào `turnQueueMap` và map vào object kết quả trả về `VipStaffInfo` (dòng 181).
*   Cập nhật logic sắp xếp (dòng 206) để so sánh thêm `queuePosition` khi cùng trạng thái hoạt động.

### 3. [MODIFY] [StaffSelector/index.tsx](file:///c:/Users/ADMIN/OneDrive/Desktop/Ngan%20Ha/wrb-noi-bo-dev/src/components/Menu/Premium/StaffSelector/index.tsx)
*   Cập nhật logic `useMemo` của biến `sortedStaff` (dòng 88) để sắp xếp đồng bộ với backend theo thứ tự: Trạng thái $\rightarrow$ queuePosition $\rightarrow$ mã KTV.

## Kế hoạch kiểm thử (Verification Plan)
1. **Biên dịch:** Chạy `npm run build` để kiểm tra lỗi TypeScript.
2. **Kiểm tra dữ liệu API:** Gọi thử API hoặc xem log để đảm bảo `queuePosition` đã được trả về đúng từ database Supabase.
3. **Kiểm tra UI hiển thị:**
   *   Vào màn hình chọn KTV của VIP Menu.
   *   Kiểm tra xem các KTV đang hiển thị nút "ĐẶT NGAY" (SẴN SÀNG/AVAILABLE) có được xếp theo đúng thứ tự sổ tua trên phần mềm điều phối (Turn Queue) hay không.
