/**
 * Journey Constants — Shared UI configs, data definitions, and constants.
 * Centralizes duplicated data (violations, timer config, rating options)
 * that was previously scattered across ActiveService, ServiceList, Feedback.
 */

// ─── Timer UI Configuration ──────────────────────────────────────────────────

export const TIMER_CONFIG = {
    CIRCULAR_SIZE: 300,
    INNER_SIZE: 200,
    RADIUS: 120,
    ANIMATION_DURATION: 500,
    MIN_HEIGHT: '80vh',
    AMBER_DARK: 'text-amber-900',
    AMBER_MAIN: '#F59E0B',
    AMBER_LIGHT: '#FFFBEB',
    TAB_HEIGHT: 56,
};

/** Compact timer config for ServiceList view */
export const TIMER_CONFIG_COMPACT = {
    TIMER_SIZE: 260,
    INNER_SIZE: 180,
    RADIUS: 110,
    AMBER_MAIN: '#F59E0B',
    AMBER_LIGHT: '#FFFBEB',
};

// ─── Violations Checklist ────────────────────────────────────────────────────

export const VIOLATIONS_VI = [
    '1. Kỹ thuật viên có sử dụng điện thoại cá nhân trong khi làm việc không?',
    '2. Kỹ thuật viên có làm phiền quý khách trong quá trình phục vụ không?',
    '3. Kỹ thuật viên có thực hiện sai quy trình dịch vụ không?',
    '4. Kỹ thuật viên có quên không gom vật dụng của quý khách vào một chỗ không?',
    '5. Kỹ thuật viên có gợi ý hoặc đòi tiền tip không?',
    '6. Kỹ thuật viên có quên thông báo cho quý khách khi bắt đầu bấm giờ không?',
];

export const VIOLATIONS_EN = [
    '1. Did the therapist use their personal phone during service?',
    '2. Did the therapist disturb you during the service?',
    '3. Did the therapist not follow the correct service?',
    '4. Did the therapist not gather your belongings in one place?',
    '5. Did the therapist hint or ask for a tip?',
    '6. Did the therapist forget to notify you when they started the timer?',
];

export const VIOLATIONS_KR = [
    '1. 테라피스트가 서비스 중 개인 휴대폰을 사용했습니까?',
    '2. 테라피스트가 서비스 중 방해를 주거나 불편하게 했습니까?',
    '3. 정해진 서비스 매뉴얼을 준수하지 않았습니까?',
    '4. 소지품을 한곳에 안전하게 보관해드리지 않았습니까?',
    '5. 팁을 노골적으로 요구하거나 암시했습니까?',
    '6. 타이머 시작 시 안내를 받지 못하셨습니까?',
];

export const VIOLATIONS_JP = [
    '1. 施術中、セラピストが私用の携帯電話を使用しましたか？',
    '2. 施術中、セラピストがお客様を妨げたり、不快にさせたりしましたか？',
    '3. 正しいサービス内容（マニュアル）に従っていませんでしたか？',
    '4. お手荷物を一箇所にまとめて管理していませんでしたか？',
    '5. チップを要求したり、それとなく促したりしましたか？',
    '6. タイマー開始の際、セラピストから案内がありませんでしたか？',
];

export const VIOLATIONS_CN = [
    '1. 理疗师在服务期间是否使用了私人手机？',
    '2. 理疗师在服务期间是否打扰到您（或让您感到不适）？',
    '3. 理疗师是否未按规定流程提供服务？',
    '4. 理疗师是否未将您的随身物品妥善集中放置？',
    '5. 理疗师是否有暗示或索要小费的行为？',
    '6. 理疗师在启动计时器时，是否忘记告知您？',
];

/** Map of language code to violations list */
const VIOLATIONS_MAP: Record<string, string[]> = {
    vi: VIOLATIONS_VI,
    en: VIOLATIONS_EN,
    kr: VIOLATIONS_KR,
    jp: VIOLATIONS_JP,
    cn: VIOLATIONS_CN,
};

/** Get violations list by language */
export const getViolations = (lang: string) =>
    VIOLATIONS_MAP[lang] || VIOLATIONS_EN;

// ─── Rating Options ──────────────────────────────────────────────────────────

/** Multi-language labels for rating options */
const RATING_LABELS: Record<string, Record<number, string>> = {
    vi: { 1: 'Tệ', 2: 'OK', 3: 'Tốt', 4: 'Xuất sắc' },
    en: { 1: 'Bad', 2: 'Ok', 3: 'Good', 4: 'Excellent' },
    kr: { 1: '나쁨', 2: '보통', 3: '좋음', 4: '훌륭함' },
    jp: { 1: '悪い', 2: '普通', 3: '良い', 4: '素晴らしい' },
    cn: { 1: '差', 2: '一般', 3: '好', 4: '优秀' },
};

/** Get rating label by language and value */
export const getRatingLabel = (lang: string, value: number): string =>
    RATING_LABELS[lang]?.[value] || RATING_LABELS['en'][value] || '';

export const RATING_OPTIONS = [
    {
        value: 1,
        emoji: '😡',
        label: 'Tệ',
        labelEN: 'Bad',
        bg: 'bg-red-100 border-red-400',
        bgSel: 'bg-red-200 border-red-500 scale-105 shadow-md',
    },
    {
        value: 2,
        emoji: '😐',
        label: 'OK',
        labelEN: 'Ok',
        bg: 'bg-gray-50 border-gray-200',
        bgSel: 'bg-gray-200 border-gray-500 scale-105 shadow-md',
    },
    {
        value: 3,
        emoji: '🙂',
        label: 'Tốt',
        labelEN: 'Good',
        bg: 'bg-amber-50 border-amber-200',
        bgSel: 'bg-amber-200 border-amber-500 scale-105 shadow-md',
    },
    {
        value: 4,
        emoji: '🤩',
        label: 'Xuất sắc',
        labelEN: 'Excellent',
        bg: 'bg-amber-100 border-amber-300',
        bgSel: 'bg-amber-300 border-amber-600 scale-105 shadow-md',
    },
];

// ─── Change Staff Threshold ──────────────────────────────────────────────────

/** Minutes after which "Change Staff" is disabled */
export const CHANGE_STAFF_TIMEOUT_MINUTES = 15;
