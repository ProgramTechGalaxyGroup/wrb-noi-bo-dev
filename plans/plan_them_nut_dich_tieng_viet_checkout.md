# Kế hoạch triển khai: Thêm nút dịch Tiếng Việt tại trang Checkout (Thường & VIP)

## 📌 Mục tiêu
Bổ sung một nút bấm nhỏ ở góc trên bên phải màn hình Checkout để Lễ tân/Quản lý có thể chuyển đổi nhanh toàn bộ thông tin đơn hàng sang Tiếng Việt (hoặc ngược lại) khi khách đang thao tác bằng ngôn ngữ khác (Hàn, Trung, Nhật, Anh).
Do dự án đã cấu trúc lại theo Next.js App Router và dùng chung trang Checkout cho cả Menu Thường và VIP, việc điều chỉnh sẽ được thực hiện trên các file dùng chung này. Thiết kế nút cực kỳ nhỏ gọn, tinh tế và tiệp màu nền để tránh việc khách hàng ấn nhầm.

---

## 🛠️ Chi tiết các thay đổi đề xuất

### 1. Cập nhật Component Header: `src/components/Checkout/CheckoutHeader.tsx`
- Bổ sung prop `rightAction?: React.ReactNode` để có thể nhúng nút dịch thuật vào góc trên bên phải.
- Thay thế phần `div` spacer (`<div className="w-10"></div>`) bằng `{rightAction}` để hiển thị nút chức năng (hoặc fallback về spacer nếu không có `rightAction`).

### 2. Cập nhật Trang Checkout (New User & Old User)
Thực hiện trên 2 file:
- `src/app/[lang]/new-user/[menuType]/checkout/page.tsx`
- `src/app/[lang]/old-user/[menuType]/checkout/page.tsx`

**A. Bổ sung State quản lý ngôn ngữ hiển thị**:
- Thêm state `activeLang` để quyết định ngôn ngữ hiển thị trên giao diện (khởi tạo bằng `rawLang`).
- Thêm state `originalLang` để lưu lại ngôn ngữ gốc của khách (khởi tạo bằng `rawLang`).
```tsx
const [activeLang, setActiveLang] = useState(rawLang);
const [originalLang, setOriginalLang] = useState(rawLang);
```

**B. Cập nhật Logic dịch thuật**:
- Đổi dòng gọi từ điển: `const dict = getDictionary(activeLang);`
- Đổi các biến `lang` truyền vào các component con (`CustomerInfo`, `Invoice`, `PaymentModal`, `OrderConfirmModal`, v.v.) thành `activeLang`.
- Giữ nguyên `lang` gốc (`rawLang`) khi gửi payload lên API `/api/orders` để hệ thống gửi thông báo Telegram chuẩn theo ngôn ngữ của khách hàng.
  ```ts
  const payload = {
      //...
      lang: rawLang 
  };
  ```

**C. Bổ sung nút dịch Tiếng Việt**:
- Truyền nút bấm vào prop `rightAction` của `CheckoutHeader`.
- Nút có kích thước nhỏ gọn (`px-2 py-1` với font chữ siêu nhỏ `text-[9px]`).
- Tối ưu chống ấn nhầm: Sử dụng màu nền tối tiệp màu với banner (`bg-[#131315]/40` kết hợp border mờ `#4d463a]/20`), không dùng màu sáng để khách không chú ý tới.
```tsx
<CheckoutHeader
    title={dict.checkout.title}
    backLabel={dict.common?.back_to_menu}
    onBack={handleBack}
    rightAction={
        <button
            type="button"
            onClick={() => {
                if (activeLang === 'vi') {
                    setActiveLang(originalLang);
                } else {
                    setActiveLang('vi');
                }
            }}
            className="bg-[#131315]/40 hover:bg-[#1b1b1d]/80 text-[#e6c487]/70 hover:text-[#e6c487] text-[9px] font-black tracking-widest uppercase px-2.5 py-1.5 rounded-lg border border-[#4d463a]/20 shadow-sm active:scale-95 transition-all flex items-center gap-1"
        >
            🌐 {activeLang === 'vi' ? `ORIG (${originalLang.toUpperCase()})` : 'DỊCH VN'}
        </button>
    }
/>
```

---

## 🧪 Kế hoạch kiểm thử (Verification Plan)

1. **Kiểm tra giao diện & Chuyển đổi ngôn ngữ**:
   - Truy cập vào trang Checkout với ngôn ngữ khác (ví dụ: `lang = 'kr'`) cho cả Menu Thường và Menu VIP.
   - Xác nhận nút **"🌐 DỊCH VN"** hiển thị nhỏ gọn ở góc phải của thanh Header.
   - Bấm nút: Xác nhận toàn bộ giao diện (Tiêu đề, Thông tin khách hàng, Tên dịch vụ trong Invoice) đổi sang Tiếng Việt.
   - Bấm lại: Giao diện chuyển lại thành ngôn ngữ gốc.
2. **Kiểm tra Gửi Đặt Lịch**:
   - Điền thông tin và bấm xác nhận ở giao diện Tiếng Việt.
   - Xác nhận API `/api/orders` nhận được đúng ngôn ngữ gốc của khách (`lang` = `kr`) để lưu xuống DB và bắn Telegram chính xác.
3. **Biên dịch**:
   - Chạy build/dev dự án bảo đảm không có lỗi TypeScript.
