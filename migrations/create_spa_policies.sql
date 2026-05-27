-- Create SpaPolicies table
CREATE TABLE IF NOT EXISTS public."SpaPolicies" (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "contentVN" text NOT NULL,
    "contentEN" text NOT NULL,
    "contentCN" text NOT NULL,
    "contentJP" text NOT NULL,
    "contentKR" text NOT NULL,
    is_active boolean DEFAULT true,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public."SpaPolicies" ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access on SpaPolicies"
    ON public."SpaPolicies"
    FOR SELECT
    USING (true);

-- Insert default policies
INSERT INTO public."SpaPolicies" ("contentVN", "contentEN", "contentCN", "contentJP", "contentKR", order_index) VALUES
('Đối với đặt lịch tự do (chưa chọn thời gian cụ thể), hệ thống sẽ ghi nhận và bộ phận CSKH của Spa sẽ trực tiếp xác nhận, liên hệ chốt giờ với Quý khách.', 'For open booking (no specific time selected), our customer service will contact you directly to confirm the exact time.', '对于自由预约（未选择具体时间），我们的客服将直接与您联系以确认具体时间。', 'フリー予約（時間指定なし）の場合、カスタマーサービスから直接ご連絡し、時間を確定いたします。', '자유 예약(시간 미지정)의 경우 고객 센터에서 직접 연락하여 시간을 확정합니다.', 1),
('Quý khách vui lòng đến đúng giờ hẹn. Trong trường hợp đến sớm hoặc trễ hơn dự kiến, Quý khách có thể sẽ phải chờ để nhân viên sắp xếp chỗ.', 'Please arrive on time. If you arrive early or late, you may have to wait for our staff to arrange a spot.', '请准时到达。如果您早到或迟到，可能需要等待工作人员安排位置。', 'ご予約時間通りにご来店ください。予定より早く、または遅く到着された場合、スタッフが席をご用意するまでお待ちいただくことがございます。', '예약 시간에 맞춰 도착해 주시기 바랍니다. 일찍 오시거나 늦게 오시는 경우 직원이 자리를 마련할 때까지 대기하셔야 할 수 있습니다.', 2),
('Spa có quyền từ chối phục vụ nếu Quý khách có những yêu cầu hoặc hành vi không phù hợp với quy định chung của chúng tôi.', 'The Spa reserves the right to refuse service if guests have inappropriate requests or behaviors against our general regulations.', '如果客人有不当要求或违反我们一般规定的行为，水疗中心有权拒绝提供服务。', 'お客様が当店の一般的な規定に反する不適切な要求や行動をとられた場合、サービスをお断りする権利を有します。', '고객이 당사의 일반 규정에 어긋나는 부적절한 요구 또는 행동을 할 경우 스파는 서비스 제공을 거부할 권리가 있습니다.', 3),
('Thời gian phục vụ và phí dịch vụ VIP có thể thay đổi một chút tùy thuộc vào lựa chọn chuyên sâu của Quý khách khi đến tiệm.', 'Service time and VIP service fees may vary slightly depending on your specific choices upon arrival.', '服务时间和VIP服务费可能会根据您到达时的具体选择略有不同。', 'サービス時間およびVIPサービス料金は、ご来店時の具体的なご要望により若干変更される場合があります。', '도착 시 고객님의 구체적인 선택에 따라 서비스 시간 및 VIP 서비스 요금이 약간 변동될 수 있습니다.', 4);
