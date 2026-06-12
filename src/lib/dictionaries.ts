export const getDictionary = (lang: string) => {
    console.log('[getDictionary] requesting lang:', lang);
    // Use validLang logic to cover all supported languages
    const validLang = ['en', 'vi', 'kr', 'jp', 'cn'].includes(lang) ? lang : 'en';
    console.log('[getDictionary] resolved to:', validLang);
    return dictionaries[validLang as keyof typeof dictionaries];
};

const dictionaries = {
    en: {
        checkout: {
            title: "Payment Information",
            customer_info: "CUSTOMER INFO",
            full_name: "Full Name*",
            email: "Email (abc@gmail.com)*",
            phone: "Phone No.",
            gender: "Gender",
            male: "Male",
            female: "Female",
            other: "Other",
            pay_warning: "Please pay before entering the service room.",
            invoice_details: "Invoice Details",
            payment_method: "PAYMENT METHOD",
            amount_paid_title: "AMOUNT PAID", // Distinguish from modal
            reset: "Reset",
            change_title: "Change:",
            insufficient: "Insufficient",
            confirm_order_btn: "CONFIRM ORDER",
            payment_method_title: "PAYMENT",
            continue: "CONTINUE",

            // Modal Specific
            modal_title: "Confirming Order",
            review_text: "Please review your order before submitting.",
            customer_details: "CUSTOMER DETAILS",
            name: "Name:",
            email_label: "Email:",
            gender_label: "Gender:",
            order_summary: "ORDER SUMMARY",
            items: "items",
            strength: "Strength",
            therapist: "Therapist",
            custom_for_you_btn: "CUSTOM FOR YOU",
            strength_label: "Strength:",
            therapist_label: "Therapist:",
            focus: "Focus",
            avoid: "Avoid",
            total_duration: "Total Duration",
            time: "Time",
            mins: "mins",
            total_bill: "Total Bill",
            amount_paid: "Amount Paid",
            change_due: "Change Due",
            missing: "Missing",
            general_notes: "General Notes:",
            expected_time: "EXPECTED TIME",
            start_time: "Start Time:",
            end_time: "End Time:",
            cancel: "CANCEL",
            submit: "SUBMIT",
            order_submitted: "Order Submitted",
            done: "DONE",
            processing: "Processing...",
            send_request: "Send Request",
            edit: "EDIT",
            change_denomination_title: "Preferred Change Denomination",
            change_denomination_remaining: "Remaining",
            change_denomination_reset: "Reset",
            change_denomination_complete: "Complete",
            scan_qr: "Scan QR code to track your service on your phone",
            qr_timer_reminder: "To ensure your full session time, your therapist will show you a timer before your service begins. Scan the QR code above to track your journey.",
            screen_resets_in: "Screen resets in",
            reset_now: "<- Reset now",
            price_includes_vat: "*Price includes VAT",
            alerts: {
                fill_name_email: "Please enter Full Name and Email",
                fill_any_contact: "Please enter at least Name, Email, or Phone",
                fill_name: "Please enter your Full Name",
                fill_phone_or_email: "Please enter either your Phone Number or Email",
                select_payment: "Please select a payment method",
                order_error: "Error sending order. Please try again.",
                redirecting: "Redirecting...",
                auto_redirect: "Auto-redirecting in a few seconds"
            }
        },


        payment_methods: {
            cash_vnd: "Cash VND",
            cash_usd: "Cash USD",
            card: "Card",
            transfer: "Transfer",
            // New UI keys
            denominations: "Collected Denominations",
            exchange_rules: "Collection & Refund Rules",
            refund_note: "Change will be returned in VND.",
            accepted_cards: "Accepted Cards",
            cards_desc: "Supported payment cards",
            understood: "Understood",
            payment_regulation: {
                title: "Payment Regulation",
                content: "To avoid misunderstandings and confusion during consultation and service usage, as well as to ensure transparency, we collect fees before starting the service.",
                btn: "UNDERSTOOD"
            }
        },
        common: {
            back_to_menu: "Menu"
        },
        options: {
            strength_levels: {
                light: "Light",
                medium: "Medium",
                strong: "Strong"
            },
            therapist_options: {
                random: "Random",
                male: "Male",
                female: "Female"
            }
        },
        custom_for_you: {
            title: "Custom for you",
            full_body: "Full Body",
            partly: "Partly",
            tab_area: "Area",
            tab_preferences: "Therapist / Strength"
        },
        body_parts: {
            foot: "Foot",
            feet: "Feet",
            head: "Head",
            neck: "Neck",
            shoulder: "Shoulder",
            back: "Back",
            back_upper: "Upper Back",
            back_lower: "Lower Back",
            arm: "Arm",
            arms: "Arms",
            hand: "Hand",
            hands: "Hands",
            thigh: "Thigh",
            leg: "Leg",
            legs: "Legs",
            calf: "Calf",
            glute: "Glute",
            // Fallback for uppercase keys just in case
            FOOT: "Foot",
            HEAD: "Head",
            NECK: "Neck",
            SHOULDER: "Shoulder",
            BACK: "Back",
            ARM: "Arm",
            THIGH: "Thigh",
            CALF: "Calf"
        },
        tags: {
            pregnant: "Pregnant",
            allergy: "Allergy"
        },
        history: {
            page_title: "Your Visits",
            modify_btn: "Modify (New)",
            rebook_btn: "Rebook This",
            create_new_btn: "+ CREATE NEW BOOKING",
            feedback_btn: "Rate Service",
            resume_journey_btn: "Resume Journey",
            note_label: "Note",
            loading_visits: "Loading visits...",
            no_visits: "No visits found."
        },
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
    },

    vi: {
        checkout: {
            title: "Thông tin thanh toán",
            customer_info: "THÔNG TIN KHÁCH HÀNG",
            full_name: "Họ và tên*",
            email: "Email (abc@gmail.com)*",
            phone: "Số điện thoại",
            gender: "Giới tính",
            male: "Nam",
            female: "Nữ",
            other: "Khác",
            pay_warning: "Vui lòng thanh toán trước khi vào phòng dịch vụ.",
            invoice_details: "Chi tiết hóa đơn",
            payment_method: "PHƯƠNG THỨC THANH TOÁN",
            amount_paid_title: "TIỀN ĐÃ ĐƯA",
            reset: "Đặt lại",
            change_title: "Tiền thừa:",
            insufficient: "Thiếu",
            confirm_order_btn: "XÁC NHẬN ĐƠN",
            payment_method_title: "THANH TOÁN",
            continue: "TIẾP TỤC",

            // Modal Specific
            modal_title: "Xác nhận yêu cầu",
            review_text: "Vui lòng kiểm tra lại đơn hàng.",
            customer_details: "THÔNG TIN KHÁCH HÀNG",
            name: "Tên:",
            email_label: "Email:",
            gender_label: "Giới tính:",
            order_summary: "TÓM TẮT ĐƠN HÀNG",
            items: "món",
            strength: "Lực",
            therapist: "KTV",
            custom_for_you_btn: "TÙY CHỈNH CHO BẠN",
            strength_label: "Lực:",
            therapist_label: "KTV:",
            focus: "Tập trung",
            avoid: "Tránh",
            total_duration: "Tổng thời gian",
            time: "Thời gian",
            mins: "phút",
            total_bill: "Tổng tiền",
            amount_paid: "Tiền đã đưa",
            change_due: "Tiền thối lại",
            missing: "Thiếu",
            general_notes: "Lưu ý chung:",
            expected_time: "THỜI GIAN DỰ KIẾN",
            start_time: "Bắt đầu:",
            end_time: "Kết thúc:",
            cancel: "HỦY BỎ",
            submit: "XÁC NHẬN",
            order_submitted: "Đã gửi đơn",
            done: "Hoàn tất",
            processing: "Đang xử lý...",
            send_request: "Gửi yêu cầu",
            edit: "CHỈNH SỬA",
            change_denomination_title: "Mệnh giá muốn thối",
            change_denomination_remaining: "Còn lại",
            change_denomination_reset: "Đặt lại",
            change_denomination_complete: "Đủ",
            scan_qr: "Quét mã QR để theo dõi lộ trình trên điện thoại của bạn",
            qr_timer_reminder: "Để đảm bảo trọn vẹn thời gian dịch vụ, kỹ thuật viên sẽ hiển thị đồng hồ bấm giờ trước khi bắt đầu. Quét mã QR phía trên để theo dõi lộ trình dịch vụ của bạn.",
            screen_resets_in: "Màn hình tự động làm mới sau",
            reset_now: "<- Làm mới ngay",
            price_includes_vat: "*Giá đã bao gồm VAT",
            alerts: {
                fill_name_email: "Vui lòng điền Tên và Email",
                fill_any_contact: "Vui lòng điền ít nhất Tên, Email hoặc Số điện thoại",
                fill_name: "Vui lòng điền Họ và Tên",
                fill_phone_or_email: "Vui lòng điền Số điện thoại hoặc Email",
                select_payment: "Vui lòng chọn phương thức thanh toán",
                order_error: "Lỗi gửi đơn. Vui lòng thử lại.",
                redirecting: "Đang chuyển hướng...",
                auto_redirect: "Tự động chuyển sau vài giây"
            }
        },


        payment_methods: {
            cash_vnd: "Tiền mặt (VND)",
            cash_usd: "Tiền mặt (USD)",
            card: "Thẻ",
            transfer: "Chuyển khoản",
            // New UI keys
            denominations: "Mệnh giá thu",
            exchange_rules: "Quy định thu & trả lại",
            refund_note: "Tiền thừa sẽ được trả lại bằng VND.",
            accepted_cards: "Các loại thẻ chấp nhận",
            cards_desc: "Thẻ thanh toán được hỗ trợ",
            understood: "Đã hiểu",
            payment_regulation: {
                title: "Quy Định Thanh Toán",
                content: "Để tránh hiểu lầm và nhầm lẫn phát sinh trong quá trình tư vấn và sử dụng dịch vụ, cũng như đảm bảo tính minh bạch, chúng tôi thu phí trước khi bắt đầu dịch vụ.",
                btn: "ĐÃ HIỂU"
            }
        },
        common: {
            back_to_menu: "Menu"
        },
        options: {
            strength_levels: {
                light: "Nhẹ",
                medium: "Vừa",
                strong: "Mạnh"
            },
            therapist_options: {
                random: "Ngẫu nhiên",
                male: "Nam",
                female: "Nữ"
            }
        },
        custom_for_you: {
            title: "Tùy chỉnh cho bạn",
            full_body: "Toàn thân",
            partly: "Một phần",
            tab_area: "Vị trí",
            tab_preferences: "Kỹ thuật viên / Lực"
        },
        body_parts: {
            foot: "Chân",
            feet: "Bàn chân",
            head: "Đầu",
            neck: "Cổ",
            shoulder: "Vai",
            back: "Lưng",
            back_upper: "Lưng trên",
            back_lower: "Thắt lưng",
            arm: "Tay",
            arms: "Tay",
            hand: "Bàn tay",
            hands: "Bàn tay",
            thigh: "Đùi",
            leg: "Chân",
            legs: "Chân",
            calf: "Bắp chân",
            glute: "Mông",
            // Fallback
            FOOT: "Chân",
            HEAD: "Đầu",
            NECK: "Cổ",
            SHOULDER: "Vai",
            BACK: "Lưng",
            ARM: "Tay",
            THIGH: "Đùi",
            CALF: "Bắp chân"
        },
        tags: {
            pregnant: "Mang thai",
            allergy: "Dị ứng"
        },
        history: {
            page_title: "Lịch sử ghé thăm",
            modify_btn: "Chỉnh sửa (Mới)",
            rebook_btn: "Đặt lại đơn này",
            create_new_btn: "+ TẠO ĐƠN MỚI",
            feedback_btn: "Đánh giá",
            resume_journey_btn: "Quay lại lộ trình",
            note_label: "Lưu ý",
            loading_visits: "Đang tải lịch sử...",
            no_visits: "Không tìm thấy chuyến ghé thăm nào."
        },
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
    },

    kr: {
        checkout: {
            title: "결제 정보",
            customer_info: "고객 정보",
            full_name: "성명*",
            email: "이메일 (abc@gmail.com)*",
            phone: "전화번호",
            gender: "성별",
            male: "남성",
            female: "여성",
            other: "기타",
            pay_warning: "서비스 룸 입장 전 결제 부탁드립니다.",
            invoice_details: "청구서 세부 정보",
            payment_method: "결제 방법",
            amount_paid_title: "지불 금액",
            reset: "초기화",
            change_title: "거스름돈:",
            insufficient: "부족",
            confirm_order_btn: "주문 확인",
            payment_method_title: "결제",
            continue: "계속",

            // Modal Specific
            modal_title: "주문 확인",
            review_text: "제출하기 전에 주문을 확인해주세요.",
            customer_details: "고객 세부 정보",
            name: "이름:",
            email_label: "이메일:",
            gender_label: "성별:",
            order_summary: "주문 요약",
            items: "항목",
            strength: "강도",
            therapist: "테라피스트",
            custom_for_you_btn: "맞춤 설정",
            strength_label: "강도:",
            therapist_label: "테라피스트:",
            focus: "집중",
            avoid: "피할 곳",
            total_duration: "총 소요 시간",
            time: "시간",
            mins: "분",
            total_bill: "총 청구 금액",
            amount_paid: "지불 금액",
            change_due: "거스름돈",
            missing: "부족",
            general_notes: "일반 메모:",
            expected_time: "예상 시간",
            start_time: "시작 시간:",
            end_time: "종료 시간:",
            cancel: "취소",
            submit: "제출",
            order_submitted: "주문 완료",
            done: "완료",
            processing: "처리 중...",
            send_request: "요청 보내기",
            edit: "편집",
            change_denomination_title: "거스름돈 권종 선택",
            change_denomination_remaining: "남은 금액",
            change_denomination_reset: "초기화",
            change_denomination_complete: "완료",
            scan_qr: "QR 코드를 스캔하여 폰에서 진행 상황을 확인하세요",
            qr_timer_reminder: "정확한 서비스 시간 보장을 위해 관리사가 시작 전 타이머를 확인해 드립니다. 위의 QR 코드를 스캔하시면 휴대폰으로 서비스 여정을 실시간으로 확인하실 수 있습니다.",
            screen_resets_in: "화면이 다음 시간 후 새로고침됩니다:",
            reset_now: "<- 지금 새로고침",
            price_includes_vat: "*VAT 포함 가격",
            alerts: {
                fill_name_email: "이름과 이메일을 입력해 주세요",
                fill_any_contact: "이름, 이메일, 또는 전화번호 중 하나를 입력해 주세요",
                fill_name: "성명을 입력해 주세요",
                fill_phone_or_email: "전화번호 또는 이메일을 입력해 주세요",
                select_payment: "결제 방법을 선택해 주세요",
                order_error: "주문 전송 오류. 다시 시도해 주세요.",
                redirecting: "리다이렉트 중...",
                auto_redirect: "잠시 후 자동으로 이동합니다"
            }
        },


        payment_methods: {
            cash_vnd: "현금 (VND)",
            cash_usd: "현금 (USD)",
            card: "카드",
            transfer: "계좌 이체",
            // New UI keys
            denominations: "수금 가능 권종",
            exchange_rules: "수금 및 환불 규정",
            refund_note: "거스름돈은 VND로 반환됩니다.",
            accepted_cards: "허용된 카드",
            cards_desc: "지원되는 결제 카드",
            understood: "확인",
            payment_regulation: {
                title: "결제 규정",
                content: "상담 및 서비스 이용 중 발생하는 오해와 혼동을 방지하고 투명성을 보장하기 위해 서비스 시작 전에 요금을 청구합니다.",
                btn: "확인"
            }
        },
        common: {
            back_to_menu: "메뉴"
        },
        options: {
            strength_levels: {
                light: "약하게",
                medium: "보통",
                strong: "강하게"
            },
            therapist_options: {
                random: "무작위",
                male: "남성",
                female: "여성"
            }
        },
        custom_for_you: {
            title: "맞춤 설정",
            full_body: "전신",
            partly: "부분",
            tab_area: "부위",
            tab_preferences: "테라피스트 / 강도"
        },
        body_parts: {
            foot: "발",
            feet: "발",
            head: "머리",
            neck: "목",
            shoulder: "어깨",
            back: "등",
            back_upper: "등 위쪽",
            back_lower: "허리",
            arm: "팔",
            arms: "팔",
            hand: "손",
            hands: "손",
            thigh: "허벅지",
            leg: "다리",
            legs: "다리",
            calf: "종아리",
            glute: "엉덩이",
            // Fallback
            FOOT: "발",
            HEAD: "머리",
            NECK: "목",
            SHOULDER: "어깨",
            BACK: "등",
            ARM: "팔",
            THIGH: "허벅지",
            CALF: "종아리"
        },
        tags: {
            pregnant: "임산부",
            allergy: "알레르기"
        },
        history: {
            page_title: "방문 기록",
            modify_btn: "수정 (신규)",
            rebook_btn: "다시 예약",
            create_new_btn: "+ 새 예약 만들기",
            feedback_btn: "평가하기",
            resume_journey_btn: "진행 상황 보기",
            note_label: "메모",
            loading_visits: "방문 기록 로딩 중...",
            no_visits: "방문 기록이 없습니다."
        },
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
    },

    cn: {
        checkout: {
            title: "支付信息",
            customer_info: "客户信息",
            full_name: "姓名*",
            email: "邮箱 (abc@gmail.com)*",
            phone: "电话号码",
            gender: "性别",
            male: "男",
            female: "女",
            other: "其他",
            pay_warning: "请在进入服务室前付款。",
            invoice_details: "发票详情",
            payment_method: "支付方式",
            amount_paid_title: "已付金额",
            reset: "重置",
            change_title: "找零:",
            insufficient: "不足",
            confirm_order_btn: "确认订单",
            payment_method_title: "支付",
            continue: "继续",

            // Modal Specific
            modal_title: "确认订单",
            review_text: "提交前请检查您的订单。",
            customer_details: "客户详情",
            name: "姓名:",
            email_label: "邮箱:",
            gender_label: "性别:",
            order_summary: "订单摘要",
            items: "项目",
            strength: "力度",
            therapist: "理疗师",
            custom_for_you_btn: "为您定制",
            strength_label: "力度:",
            therapist_label: "理疗师:",
            focus: "重点",
            avoid: "避开",
            total_duration: "总时长",
            time: "时间",
            mins: "分钟",
            total_bill: "总费用",
            amount_paid: "已付金额",
            change_due: "找零",
            missing: "缺少",
            general_notes: "一般说明:",
            expected_time: "预计时间",
            start_time: "开始时间:",
            end_time: "结束时间:",
            cancel: "取消",
            submit: "提交",
            order_submitted: "订单已提交",
            done: "完成",
            processing: "处理中...",
            send_request: "发送请求",
            edit: "编辑",
            change_denomination_title: "找零面额选择",
            change_denomination_remaining: "剩余",
            change_denomination_reset: "重置",
            change_denomination_complete: "完成",
            scan_qr: "扫描二维码在手机上跟踪您的服务",
            qr_timer_reminder: "为了保障您的充足服务时间，理疗师将在开始前为您出示计时器。您可以扫描上方二维码，在手机上查看您的服务进度。",
            screen_resets_in: "屏幕将在以下时间后重置:",
            reset_now: "<- 立即重置",
            price_includes_vat: "*价格包含增值税",
            alerts: {
                fill_name_email: "请输入姓名和电子邮箱",
                fill_any_contact: "请输入至少姓名、电子邮箱或电话号码其中之一",
                fill_name: "请输入您的姓名",
                fill_phone_or_email: "请输入您的电话号码或电子邮箱",
                select_payment: "请选择支付方式",
                order_error: "发送订单时出错。请重试。",
                redirecting: "正在跳转...",
                auto_redirect: "几秒后自动跳转"
            }

        },

        payment_methods: {
            cash_vnd: "现金 (VND)",
            cash_usd: "现金 (USD)",
            card: "银行卡",
            transfer: "转账",
            // New UI keys
            denominations: "接收面额",
            exchange_rules: "收款与退款规则",
            refund_note: "找零将返还 VND。",
            accepted_cards: "支持的银行卡",
            cards_desc: "支持的支付卡",
            understood: "明白了",
            payment_regulation: {
                title: "支付规定",
                content: "为了避免咨询和服务使用过程中产生误解和混乱，并确保透明度，我们在开始服务前收取费用。",
                btn: "明白了"
            }
        },
        common: {
            back_to_menu: "菜单"
        },
        options: {
            strength_levels: {
                light: "轻",
                medium: "中",
                strong: "重"
            },
            therapist_options: {
                random: "随机",
                male: "男",
                female: "女"
            }
        },
        custom_for_you: {
            title: "为您定制",
            full_body: "全身",
            partly: "部分",
            tab_area: "部位",
            tab_preferences: "技师 / 力度"
        },
        body_parts: {
            foot: "脚",
            feet: "脚",
            head: "头",
            neck: "脖子",
            shoulder: "肩膀",
            back: "背部",
            back_upper: "上背部",
            back_lower: "下背部",
            arm: "手臂",
            arms: "手臂",
            hand: "手",
            hands: "手",
            thigh: "大腿",
            leg: "腿",
            legs: "腿",
            calf: "小腿",
            glute: "臀部",
            // Fallback
            FOOT: "脚",
            HEAD: "头",
            NECK: "脖子",
            SHOULDER: "肩膀",
            BACK: "背部",
            ARM: "手臂",
            THIGH: "大腿",
            CALF: "小腿"
        },
        tags: {
            pregnant: "孕妇",
            allergy: "过敏"
        },
        history: {
            page_title: "访问记录",
            modify_btn: "修改 (新)",
            rebook_btn: "再次预订",
            create_new_btn: "+ 创建新预订",
            feedback_btn: "评价服务",
            resume_journey_btn: "返回行程",
            note_label: "备注",
            loading_visits: "正在加载访问记录...",
            no_visits: "未找到访问记录。"
        },
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
    },

    jp: {
        checkout: {
            title: "お支払い情報",
            customer_info: "お客様情報",
            full_name: "氏名*",
            email: "メール (abc@gmail.com)*",
            phone: "電話番号",
            gender: "性別",
            male: "男性",
            female: "女性",
            other: "その他",
            pay_warning: "施術室に入る前にお支払いをお願いします。",
            invoice_details: "請求書詳細",
            payment_method: "お支払い方法",
            amount_paid_title: "支払金額",
            reset: "リセット",
            change_title: "お釣り:",
            insufficient: "不足",
            confirm_order_btn: "注文を確定",
            payment_method_title: "お支払い",
            continue: "次へ",

            // Modal Specific
            modal_title: "注文の確認",
            review_text: "送信する前に注文内容をご確認ください。",
            customer_details: "お客様詳細",
            name: "名前:",
            email_label: "メール:",
            gender_label: "性別:",
            order_summary: "注文概要",
            items: "アイテム",
            strength: "強さ",
            therapist: "セラピスト",
            custom_for_you_btn: "カスタム",
            strength_label: "強さ:",
            therapist_label: "セラピスト:",
            focus: "重点",
            avoid: "避ける場所",
            total_duration: "所要時間",
            time: "時間",
            mins: "分",
            total_bill: "合計金額",
            amount_paid: "支払金額",
            change_due: "お釣り",
            missing: "不足",
            general_notes: "備考:",
            expected_time: "予定時間",
            start_time: "開始時間:",
            end_time: "終了時間:",
            cancel: "キャンセル",
            submit: "送信",
            order_submitted: "注文送信完了",
            done: "完了",
            processing: "処理中...",
            send_request: "リクエスト送信",
            edit: "編集",
            change_denomination_title: "お釣りの券種選択",
            change_denomination_remaining: "残り",
            change_denomination_reset: "リセット",
            change_denomination_complete: "完了",
            scan_qr: "QRコードをスキャンしてスマートフォンで状況を確認",
            qr_timer_reminder: "施術時間を正確に管理するため、開始前にセラピストがタイマーをご提示いたします。上のQRコードをスキャンすると、スマートフォンでサービスの進行状況を確認できます。",
            screen_resets_in: "画面は以下でリセットされます:",
            reset_now: "<- 今すぐリセット",
            price_includes_vat: "*税込み価格",
            alerts: {
                fill_name_email: "お名前とメールアドレスを入力してください",
                fill_any_contact: "名前、メールアドレス、電話番号のいずれかを入力してください",
                fill_name: "氏名を入力してください",
                fill_phone_or_email: "電話番号またはメールアドレスのいずれかを入力してください",
                select_payment: "お支払い方法を選択してください",
                order_error: "注文の送信中にエラーが発生しました。もう一度お試しください。",
                redirecting: "リダイレクト中...",
                auto_redirect: "数秒後に自動的に移動します"
            }
        },


        payment_methods: {
            cash_vnd: "現金 (VND)",
            cash_usd: "現金 (USD)",
            card: "カード",
            transfer: "銀行振込",
            // New UI keys
            denominations: "取り扱い券種",
            exchange_rules: "徴収および返金ルール",
            refund_note: "お釣りはVNDで返却されます。",
            accepted_cards: "利用可能なカード",
            cards_desc: "対応している支払いカード",
            understood: "了解しました",
            payment_regulation: {
                title: "支払い規定",
                content: "相談やサービス利用中の誤解や混乱を避け、透明性を確保するために、サービス開始前に料金を徴収します。",
                btn: "了解しました"
            }
        },
        common: {
            back_to_menu: "メニュー"
        },
        options: {
            strength_levels: {
                light: "弱め",
                medium: "普通",
                strong: "強め"
            },
            therapist_options: {
                random: "指名なし",
                male: "男性",
                female: "女性"
            }
        },
        custom_for_you: {
            title: "カスタム",
            full_body: "全身",
            partly: "部分",
            tab_area: "部位",
            tab_preferences: "セラピスト / 強さ"
        },
        body_parts: {
            foot: "足",
            feet: "足",
            head: "頭",
            neck: "首",
            shoulder: "肩",
            back: "背中",
            back_upper: "背中上部",
            back_lower: "腰",
            arm: "腕",
            arms: "腕",
            hand: "手",
            hands: "手",
            thigh: "太もも",
            leg: "脚",
            legs: "脚",
            calf: "ふくらはぎ",
            glute: "お尻",
            // Fallback
            FOOT: "足",
            HEAD: "頭",
            NECK: "首",
            SHOULDER: "肩",
            BACK: "背中",
            ARM: "腕",
            THIGH: "太もも",
            CALF: "ふくらはぎ"
        },
        tags: {
            pregnant: "妊娠中",
            allergy: "アレルギー"
        },
        history: {
            page_title: "訪問履歴",
            modify_btn: "変更 (新規)",
            rebook_btn: "再予約",
            create_new_btn: "+ 新規予約作成",
            feedback_btn: "サービスを評価",
            resume_journey_btn: "現在の状況に戻る",
            note_label: "メモ",
            loading_visits: "履歴を読み込み中...",
            no_visits: "訪問履歴が見つかりません。"
        },
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
    }
};

