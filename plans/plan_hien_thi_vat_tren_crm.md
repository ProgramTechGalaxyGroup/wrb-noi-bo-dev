# Plan: Hiển thị thông tin VAT Invoice trên CRM (App Quản Trị)

> **Trạng thái:** ⏳ Chờ duyệt  
> **Project:** `Quan_Tri_Va_KTV`  
> **Ngày tạo:** 2026-06-12  

## Bối cảnh

Web nội bộ (`wrb-noi-bo-dev`) đã lưu 5 trường VAT vào bảng `Customers`:
`taxCode`, `companyName`, `companyAddress`, `companyEmail`, `companyPhone`

CRM ở app quản trị (`/reception/crm`) hiện **chưa đọc và hiển thị** các trường này.

## Thay đổi cần làm (2 files)

### 1. `lib/types.ts` — Thêm 5 trường VAT vào `Customer` interface

```typescript
// VAT Invoice fields
taxCode?: string;
companyName?: string;
companyAddress?: string;
companyEmail?: string;
companyPhone?: string;
```

### 2. `app/reception/crm/page.tsx` — UI updates

- **Search**: Thêm filter theo MST + tên công ty
- **Badge**: Hiện badge "🧾 VAT" cạnh tên KH có MST
- **Detail**: Hiện section thông tin xuất hoá đơn khi xem chi tiết KH

### 3. API — Không cần sửa

`/api/customers` route.ts đã dùng `select('*')` → tự động trả về cột mới.

## Open Questions
1. Kiểu hiển thị chi tiết VAT: Expand row / Side panel / Modal / Inline cột?
2. Triển khai ở conversation nào?
