-- Enable RLS cho bảng Reminders_Customer
ALTER TABLE public."Reminders_Customer" ENABLE ROW LEVEL SECURITY;

-- Thêm Policy cho phép đọc dữ liệu (SELECT) từ client
CREATE POLICY "Allow public read access on Reminders_Customer"
    ON public."Reminders_Customer"
    FOR SELECT
    USING (true);
