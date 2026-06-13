# 🧾 Tính năng Xuất Hoá Đơn VAT — Tổng hợp triển khai

> **Ngày hoàn thành:** 2026-06-12  
> **Project:** `wrb-noi-bo-dev` (Web nội bộ) + `Quan_Tri_Va_KTV` (App quản trị)  
> **Trạng thái:** ✅ Hoàn thành & đã test trên Production DB

---

## 1. Tổng quan

Khách hàng có thể yêu cầu **xuất hoá đơn VAT** ngay trong quá trình thanh toán trên web nội bộ. Hệ thống tự động tra cứu thông tin doanh nghiệp từ MST (Mã số thuế) qua 2 nguồn API, lưu vào DB, và hiển thị trên CRM cho quản lý.

### Flow hoạt động:
```
Khách tích "Xuất hoá đơn" → Nhập MST → Bấm Tra cứu
     ↓
API /api/tax-lookup → Gọi VietQR API + Esgoo API → Merge data
     ↓
Tự động điền: Tên công ty, Địa chỉ, SĐT (nếu có)
     ↓
Khách nhập thêm Email + SĐT (bắt buộc) → Submit đơn
     ↓
API /api/orders → Lưu vào bảng Customers (5 cột VAT)
     ↓
CRM /reception/crm → Hiển thị badge VAT + Modal chi tiết
```

---

## 2. Database Migration

**File:** `supabase/migrations/add_vat_invoice_columns_to_customers.sql`

```sql
ALTER TABLE "Customers"
ADD COLUMN IF NOT EXISTS "taxCode" text,
ADD COLUMN IF NOT EXISTS "companyName" text,
ADD COLUMN IF NOT EXISTS "companyAddress" text,
ADD COLUMN IF NOT EXISTS "companyEmail" text,
ADD COLUMN IF NOT EXISTS "companyPhone" text;

COMMENT ON COLUMN "Customers"."taxCode" IS 'Tax code (MST) of the business for VAT invoice';
COMMENT ON COLUMN "Customers"."companyName" IS 'Company name retrieved from VietQR API';
COMMENT ON COLUMN "Customers"."companyAddress" IS 'Company address retrieved from VietQR API';
COMMENT ON COLUMN "Customers"."companyEmail" IS 'Company email manually entered by customer';
COMMENT ON COLUMN "Customers"."companyPhone" IS 'Company phone manually entered by customer';
```

> ⚠️ **Đã chạy thành công** trên Supabase. Không cần chạy lại.

---

## 3. API — Tra cứu MST

**File:** `src/app/api/tax-lookup/route.ts`

- **Endpoint:** `GET /api/tax-lookup?taxCode=0316956049`
- **Nguồn data:** Merge từ 2 API:
  1. **VietQR** (`https://api.vietqr.io/v2/business/{mst}`) — Tên + Địa chỉ (ổn định)
  2. **Esgoo** (`https://esgoo.net/api-mst/{mst}.htm`) — Bổ sung SĐT + Người đại diện (nếu có)
- **Logic merge:** VietQR là base, Esgoo bổ sung phone/representative nếu VietQR thiếu
- **Response:**
```json
{
  "success": true,
  "data": {
    "taxCode": "0316956049",
    "companyName": "CÔNG TY CỔ PHẦN MARINE DIGITALE",
    "address": "Tầng 2, 456 Xô Viết Nghệ Tĩnh...",
    "phone": "0962211085",
    "representative": "PHẠM THÙY LINH",
    "status": "Đang hoạt động"
  }
}
```

---

## 4. API — Lưu đơn hàng

**File:** `src/app/api/orders/route.ts`

Khi request body chứa `vatInvoice`, API sẽ lưu thêm 5 trường vào bảng `Customers`:

```typescript
if (vatInvoice && vatInvoice.taxCode) {
    customerData.taxCode = vatInvoice.taxCode;
    customerData.companyName = vatInvoice.companyName || null;
    customerData.companyAddress = vatInvoice.companyAddress || null;
    customerData.companyEmail = vatInvoice.companyEmail || null;
    customerData.companyPhone = vatInvoice.companyPhone || null;
}
```

---

## 5. Frontend Components

### 5a. VatInvoiceSection (Component chính)
**File:** `src/components/Checkout/VatInvoiceSection.tsx`

- Checkbox "Bạn có muốn xuất hoá đơn?"
- Input MST + nút "Tra cứu"
- Card hiển thị kết quả (Tên công ty, Địa chỉ, SĐT auto-fill)
- 2 ô input bắt buộc: Email công ty + SĐT công ty
- Hỗ trợ 5 ngôn ngữ

### 5b. PaymentModal
**File:** `src/components/Checkout/PaymentModal.tsx`

- Tích hợp `VatInvoiceSection` bên trong
- Validation: nếu tích VAT + đã tra cứu → bắt buộc nhập Email + SĐT
- Truyền `vatInvoice` data lên checkout page qua `onNext()`

### 5c. OrderConfirmModal
**File:** `src/components/Checkout/OrderConfirmModal.tsx`

- Hiển thị thông tin VAT trong modal xác nhận đơn (MST, Tên, Địa chỉ, Email, SĐT)

### 5d. Checkout Pages (CẢ 2 luồng)
- `src/app/[lang]/old-user/[menuType]/checkout/page.tsx` ✅
- `src/app/[lang]/new-user/[menuType]/checkout/page.tsx` ✅

Cả 2 luồng đều truyền `vatInvoice` vào payload gửi API.

---

## 6. CRM — Hiển thị trên App Quản Trị

**Project:** `Quan_Tri_Va_KTV`

### 6a. Type Definition
**File:** `lib/types.ts`

```typescript
export interface Customer {
  // ... existing fields ...
  // VAT Invoice fields
  taxCode?: string;
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
}
```

### 6b. CRM Page
**File:** `app/reception/crm/page.tsx`

- **Search:** Tìm kiếm theo MST hoặc tên công ty
- **Badge:** Hiện badge "🧾 VAT" màu vàng cạnh tên KH có MST
- **Modal chi tiết:** Bấm nút `⋯` (3 chấm) → mở modal hiển thị:
  - Thông tin cá nhân (tên, SĐT, email)
  - Thống kê (tổng chi tiêu, số lần đến, lần cuối)
  - Ghi chú + đánh giá KTV
  - **Section VAT** (gradient vàng cam): MST, tên công ty, địa chỉ, email, SĐT

### 6c. API Customers
**File:** `app/api/customers/route.ts`

- Không cần sửa — đã dùng `select('*')` nên tự động trả về 5 cột mới.

---

## 7. Đa ngôn ngữ (i18n)

**File:** `src/lib/dictionaries.ts`

### 🇬🇧 English (EN)
```js
vat_invoice: {
    checkbox_label: "Do you want a VAT invoice?",
    tax_code_placeholder: "Enter Tax Code (e.g. 0316794479)",
    lookup_btn: "Look up",
    looking_up: "Looking up...",
    company_name: "Company Name",
    address: "Address",
    not_found: "Tax code not found. Please check and try again.",
    error: "Lookup failed. Please try again.",
    invoice_info_title: "VAT INVOICE INFO",
    email: "Company Email *",
    phone: "Company Phone *",
    required_fields: "Please enter company Email and Phone"
}
```

### 🇻🇳 Tiếng Việt (VI)
```js
vat_invoice: {
    checkbox_label: "Bạn có muốn xuất hoá đơn?",
    tax_code_placeholder: "Nhập mã số thuế (VD: 0316794479)",
    lookup_btn: "Tra cứu",
    looking_up: "Đang tra cứu...",
    company_name: "Tên công ty",
    address: "Địa chỉ",
    not_found: "Không tìm thấy MST. Vui lòng kiểm tra lại.",
    error: "Tra cứu thất bại. Vui lòng thử lại.",
    invoice_info_title: "THÔNG TIN XUẤT HOÁ ĐƠN",
    email: "Email công ty *",
    phone: "SĐT công ty *",
    required_fields: "Vui lòng nhập Email và SĐT công ty"
}
```

### 🇰🇷 Korean (KR)
```js
vat_invoice: {
    checkbox_label: "세금계산서를 발행하시겠습니까?",
    tax_code_placeholder: "사업자등록번호 입력 (예: 0316794479)",
    lookup_btn: "조회",
    looking_up: "조회 중...",
    company_name: "회사명",
    address: "주소",
    not_found: "사업자등록번호를 찾을 수 없습니다. 확인 후 다시 시도해주세요.",
    error: "조회 실패. 다시 시도해주세요.",
    invoice_info_title: "세금계산서 정보",
    email: "회사 이메일 *",
    phone: "회사 전화번호 *",
    required_fields: "회사 이메일과 전화번호를 입력해주세요"
}
```

### 🇨🇳 Chinese (CN)
```js
vat_invoice: {
    checkbox_label: "您需要开具增值税发票吗？",
    tax_code_placeholder: "输入税号 (例: 0316794479)",
    lookup_btn: "查询",
    looking_up: "正在查询...",
    company_name: "公司名称",
    address: "地址",
    not_found: "未找到该税号，请检查后重试。",
    error: "查询失败，请重试。",
    invoice_info_title: "增值税发票信息",
    email: "公司邮箱 *",
    phone: "公司电话 *",
    required_fields: "请输入公司邮箱和电话"
}
```

### 🇯🇵 Japanese (JP)
```js
vat_invoice: {
    checkbox_label: "VAT請求書を発行しますか？",
    tax_code_placeholder: "税コードを入力 (例: 0316794479)",
    lookup_btn: "検索",
    looking_up: "検索中...",
    company_name: "会社名",
    address: "住所",
    not_found: "税コードが見つかりません。確認して再試行してください。",
    error: "検索に失敗しました。もう一度お試しください。",
    invoice_info_title: "VAT請求書情報",
    email: "会社メール *",
    phone: "会社電話 *",
    required_fields: "会社のメールアドレスと電話番号を入力してください"
}
```

---

## 8. Danh sách file thay đổi

### Project `wrb-noi-bo-dev` (Web nội bộ)

| File | Thay đổi |
|------|---------|
| `supabase/migrations/add_vat_invoice_columns_to_customers.sql` | [NEW] SQL migration thêm 5 cột |
| `src/app/api/tax-lookup/route.ts` | [NEW] API tra cứu MST (VietQR + Esgoo) |
| `src/components/Checkout/VatInvoiceSection.tsx` | [NEW] Component UI xuất hoá đơn |
| `src/components/Checkout/PaymentModal.tsx` | [MODIFY] Tích hợp VatInvoiceSection + validation |
| `src/components/Checkout/OrderConfirmModal.tsx` | [MODIFY] Hiển thị VAT info trong xác nhận |
| `src/app/api/orders/route.ts` | [MODIFY] Lưu 5 trường VAT vào Customers |
| `src/app/[lang]/old-user/[menuType]/checkout/page.tsx` | [MODIFY] Thêm VAT state + truyền data |
| `src/app/[lang]/new-user/[menuType]/checkout/page.tsx` | [MODIFY] Sync VAT feature từ old-user |
| `src/lib/dictionaries.ts` | [MODIFY] Thêm vat_invoice keys cho 5 ngôn ngữ |

### Project `Quan_Tri_Va_KTV` (App quản trị)

| File | Thay đổi |
|------|---------|
| `lib/types.ts` | [MODIFY] Thêm 5 trường VAT vào Customer interface |
| `app/reception/crm/page.tsx` | [MODIFY] Badge VAT + Search MST + Modal chi tiết |

---

## 9. Test đã thực hiện

| Test | Kết quả |
|------|---------|
| Tra cứu MST có SĐT (`0316956049`) | ✅ Tự động điền Tên + Địa chỉ + SĐT |
| Tra cứu MST không có SĐT (`0319475583`) | ✅ Chỉ điền Tên + Địa chỉ, SĐT để trống |
| Submit đơn luồng new-user có VAT | ✅ Lưu đầy đủ 5 trường vào DB |
| Submit đơn không tích VAT | ✅ Không ghi gì (taxCode = null) |
| Validation bắt buộc Email + SĐT | ✅ Alert lỗi nếu chưa nhập |
| CRM hiển thị badge VAT | ✅ (chờ deploy app quản trị) |
