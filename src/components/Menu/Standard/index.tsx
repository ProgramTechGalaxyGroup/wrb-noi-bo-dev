/*
 * File: Standard/index.tsx
 * Chức năng: Component gốc (Root) của Menu Standard.
 * Logic chi tiết:
 * - Quản lý state toàn cục: cart (giỏ hàng), sheet (trạng thái hiển thị popup), activeCategory.
 * - Fetch dữ liệu service từ getServices.
 * - Tính toán tổng tiền (VND/USD) và tổng item thông qua useMemo.
 * - Điều phối hiển thị các Sheet: MainSheet (chọn giờ), ReviewSheet (sửa món), CartDrawer (giỏ hàng).
 * Tác giả: TunHisu
 * Ngày cập nhật: 2026-01-31
 */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 🔧 UI CONFIGURATION
export const PAGE_TRANSITION_CONFIG = {
    // Thời gian trượt vào của Menu (spring animation)
    MENU_SPRING_STIFFNESS: 350, // Càng lớn càng giật nhanh (mặc định cũ 260)
    MENU_SPRING_DAMPING: 25,    // Độ nảy (mặc định 25)

    // Thời gian đợi (ms) sau khi Menu đã trượt xong thì mới thực hiện cuộn đến mục Dịch vụ
    // Chỉnh xuống 50ms hoặc 0ms nếu muốn cuộn ngay lập tức
    SCROLL_DELAY_AFTER_ANIMATION_MS: 30,

    // Hiệu ứng cuộn. 
    // - 'auto': Nhảy cái rụp đến mục được chọn (nhanh nhất)
    // - 'smooth': Trình duyệt tự cuộn từ từ (thường ở các đt cũ hoặc vuốt xa sẽ rất châm)
    SCROLL_BEHAVIOR: 'auto' as ScrollBehavior,
};

// 1. Import Components con
import Header from './Header';
import ServiceList from './ServiceList';
import Footer from './Footer';

// Import các Sheet
import MainSheet from './Sheets/MainSheet';
import ReviewSheet from './Sheets/ReviewSheet';
import CartDrawer from './Sheets/CartDrawer';
import CustomForYouModal from '@/components/CustomForYou';
import { CustomPreferences } from '@/components/CustomForYou/types';

// Import Category Picker
import CategoryPicker from './CategoryPicker';

// 2. Import Logic & Data
import { CATEGORIES } from '@/components/Menu/constants';
import { Service, CartState, SheetState } from '@/components/Menu/types';
import { getServices } from '@/components/Menu/getServices'; // Đảm bảo đường dẫn đúng
import { useMenuData } from '@/components/Menu/MenuContext'; // Import Hook Context

interface StandardMenuProps {
    lang: string;
    onBack: () => void;
    onCheckout: () => void;
    onSwitchToVip?: () => void;
}

export default function StandardMenu({ lang, onBack, onCheckout, onSwitchToVip }: StandardMenuProps) {
    // --- STATE DỮ LIỆU ---
    // Remove local loading state (duplicate)
    const [services, setServices] = useState<Service[]>([]);

    // --- STATE GIAO DIỆN ---
    const [mode, setMode] = useState<'PICKER' | 'MENU'>('PICKER');
    const [activeCategory, setActiveCategory] = useState<string>('Body');
    const [slideDirection, setSlideDirection] = useState<number>(1);
    const [selectedCats, setSelectedCats] = useState<string[]>([]);
    const [pendingScrollCategory, setPendingScrollCategory] = useState<string | null>(null);

    // State quản lý Sheet
    const [sheet, setSheet] = useState<SheetState>({
        isOpen: false,
        type: null,
        data: null
    });

    const [lastAddedCartIds, setLastAddedCartIds] = useState<string[]>([]);

    // --- 1. LẤY DATA TỪ CONTEXT ---
    const { services: allServices, loading: contextLoading, cart, addToCart: contextAddToCart, updateCartItem, updateCartItemOptions, removeFromCart } = useMenuData();

    useEffect(() => {
        if (!contextLoading && allServices.length > 0) {
            // Filter đúng loại Standard (NHS...)
            const standardServices = allServices.filter(s => s.menuType === 'standard');
            setServices(standardServices);
        }
    }, [allServices, contextLoading]);

    // --- 2. LOGIC TÍNH TOÁN CART ---
    // a. Tính tổng tiền & số lượng (cho Footer)
    const { totalVND, totalUSD, totalItems, maxMinutes } = useMemo(() => {
        let vnd = 0, usd = 0, items = 0, maxMin = 0;

        cart.forEach(item => {
            vnd += (item.priceVND || 0) * item.qty;
            usd += (item.priceUSD || 0) * item.qty;
            items += item.qty;
            if (item.timeValue > maxMin) maxMin = item.timeValue;
        });

        return { totalVND: vnd, totalUSD: usd, totalItems: items, maxMinutes: maxMin };
    }, [cart]);

    // b. Tạo Lookup Map (ID -> Qty) để truyền xuống ServiceList và MainSheet (để hiện Badge)
    const cartLookup = useMemo(() => {
        const lookup: Record<string, number> = {};
        cart.forEach(item => {
            // Cộng dồn qty của các item có cùng ID (dù khác options)
            lookup[item.id] = (lookup[item.id] || 0) + item.qty;
        });
        return lookup;
    }, [cart]);

    // Array categories gốc (hiển thị đủ trên Header)
    const allCategories = CATEGORIES;
    // Array dành cho phần thân: CHỈ hiển thị category đang được chọn
    const filteredCategories = CATEGORIES.filter(cat => cat.id === activeCategory);

    // --- 3. XỬ LÝ TƯƠNG TÁC ---

    // [QUAN TRỌNG] Khi bấm vào Card ở List -> Nhận vào 1 NHÓM (Service[])
    const handleServiceClick = (group: Service[]) => {
        setSheet({ isOpen: true, type: 'MAIN', data: group });
    };

    // Hàm cập nhật Cart (Dùng cho cả MainSheet và ReviewSheet)
    const handleUpdateCart = (cartId: string, qty: number) => {
        updateCartItem(cartId, qty);
    };

    const handleAddToCart = (id: string, qty: number, options?: any) => {
        const service = services.find(s => s.id === id);
        if (service) {
            // 1. Tìm các item cũ trong cart có cùng id (để replace logic)
            const existingItems = cart.filter(item => item.id === id);

            // 2. Xóa hết chúng đi
            existingItems.forEach(item => {
                removeFromCart(item.cartId);
            });

            // 3. Thêm mới: Chạy vòng lặp để thêm từng item lẻ (qty = 1)
            const newAddedIds: string[] = [];
            for (let i = 0; i < qty; i++) {
                const newId = contextAddToCart(service, 1, options);
                newAddedIds.push(newId);
            }

            // 4. CHUYỂN SANG BƯỚC CUSTOM (hoặc skip nếu không cần)
            setLastAddedCartIds(newAddedIds);

            // Task E2: Skip Custom modal for services that don't need it (e.g., Private Room)
            if (service.SHOW_CUSTOM_FOR_YOU === false) {
                closeSheet();
            } else {
                setSheet({ isOpen: true, type: 'CUSTOM', data: service });
            }
        }
    };

    // Hàm lưu custom cho các item vừa thêm
    const handleSaveCustom = (prefs: CustomPreferences) => {
        // Áp dụng cho danh sách các item mới
        lastAddedCartIds.forEach(cartId => {
            updateCartItemOptions(cartId, {
                strength: prefs.strength,
                therapist: prefs.therapist,
                bodyParts: prefs.bodyParts,
                notes: prefs.notes
            });
        });
        closeSheet();
    };

    // Mở giỏ hàng tổng (Sẽ làm CartDrawer sau)
    const handleOpenCart = () => {
        setSheet({ isOpen: true, type: 'CART', data: null });
    };

    // Đóng Sheet
    const closeSheet = () => {
        setSheet({ ...sheet, isOpen: false });
        setTimeout(() => setSheet({ isOpen: false, type: null, data: null }), 300);
    };

    return (
        <AnimatePresence mode="wait">
            {mode === 'PICKER' ? (
                <CategoryPicker
                    key="picker"
                    categories={CATEGORIES}
                    lang={lang}
                    onSelect={(ids) => {
                        const selectedId = ids[0] || 'Body';
                        setActiveCategory(selectedId);
                        setPendingScrollCategory(selectedId);
                        setMode('MENU');
                    }}
                    onBack={onBack}
                />
            ) : (
                <motion.div
                    key="menu"
                    className="relative inset-0 z-20 bg-black flex flex-col h-[100dvh] w-full overflow-hidden font-sans"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ type: 'spring', stiffness: PAGE_TRANSITION_CONFIG.MENU_SPRING_STIFFNESS, damping: PAGE_TRANSITION_CONFIG.MENU_SPRING_DAMPING }}
                    onAnimationComplete={() => {
                        if (pendingScrollCategory) {
                            setTimeout(() => {
                                const el = document.getElementById(`cat-${pendingScrollCategory}`);
                                if (el) el.scrollIntoView({ behavior: PAGE_TRANSITION_CONFIG.SCROLL_BEHAVIOR });
                                setPendingScrollCategory(null);
                            }, PAGE_TRANSITION_CONFIG.SCROLL_DELAY_AFTER_ANIMATION_MS); // Chỉnh thời gian delay cuộn ở đầu file
                        }
                    }}
                >

                    {/* A. HEADER (Vẫn đưa vào toàn bộ cat để user có thể tab qua lại) */}
                    <Header
                        categories={allCategories}
                        activeCategory={activeCategory}
                        lang={lang}
                        onSelectCategory={(id) => {
                            if (id !== activeCategory) {
                                const oldIdx = allCategories.findIndex(c => c.id === activeCategory);
                                const newIdx = allCategories.findIndex(c => c.id === id);
                                setSlideDirection(newIdx > oldIdx ? 1 : -1);
                                setActiveCategory(id);
                            }
                        }}
                    />

                    {/* B. LIST (Chỉ truyền category đã lọc) */}
                    <ServiceList
                        categories={filteredCategories}
                        services={services}
                        cart={cartLookup}
                        direction={slideDirection}
                        lang={lang}
                        onItemClick={handleServiceClick}
                    />

                    {/* C. FOOTER */}
                    <Footer
                        totalVND={totalVND}
                        totalUSD={totalUSD}
                        totalItems={totalItems}
                        maxMinutes={maxMinutes}
                        lang={lang}
                        onBack={() => setMode('PICKER')}
                        onToggleCart={handleOpenCart}
                        onSwitchToVip={onSwitchToVip}
                    />

                    {/* D. KHU VỰC CÁC SHEET */}

                    {/* 1. Main Sheet (Chọn thời gian) - Nhận data là Array (Group) */}
                    {sheet.isOpen && sheet.type === 'MAIN' && Array.isArray(sheet.data) && (
                        <MainSheet
                            group={sheet.data} // Truyền data (là mảng) vào prop group
                            cart={cartLookup} // Truyền Lookup Map để check sl
                            isOpen={sheet.isOpen}
                            lang={lang}
                            onClose={closeSheet}
                            onAddToCart={handleAddToCart}
                        />
                    )}

                    {/* 2. Review Sheet (Xem lại món đơn lẻ) - Nhận data là 1 Service */}
                    {sheet.isOpen && sheet.type === 'REVIEW' && !Array.isArray(sheet.data) && sheet.data && (
                        <ReviewSheet
                            service={sheet.data}
                            cart={cartLookup} // Truyền Lookup Map
                            isOpen={sheet.isOpen}
                            lang={lang}
                            onClose={closeSheet}
                            onUpdateCart={handleUpdateCart}
                        />
                    )}

                    {/* 3. Cart Drawer (Giỏ hàng) */}
                    {sheet.isOpen && sheet.type === 'CART' && (
                        <CartDrawer
                            cart={cart}
                            services={services}
                            lang={lang}
                            isOpen={sheet.isOpen}
                            onClose={closeSheet}
                            onUpdateCart={handleUpdateCart}
                            onCheckout={onCheckout}
                        />
                    )}

                    {/* 4. Custom For You Modal (Mới tích hợp vào quy trình) */}
                    {sheet.isOpen && sheet.type === 'CUSTOM' && !Array.isArray(sheet.data) && sheet.data && (
                        <CustomForYouModal
                            isOpen={sheet.isOpen}
                            onClose={closeSheet}
                            onSave={handleSaveCustom}
                            serviceData={{
                                ID: sheet.data.id,
                                NAMES: sheet.data.names as Record<string, string>,
                                FOCUS_POSITION: sheet.data.FOCUS_POSITION as any,
                                TAGS: sheet.data.TAGS as any,
                                SHOW_STRENGTH: sheet.data.SHOW_STRENGTH,
                                HINT: sheet.data.HINT as Record<string, string>,
                                PRICE_VN: sheet.data.priceVND,
                                PRICE_USD: sheet.data.priceUSD,
                                // Task E3: Pass visibility flags
                                SHOW_NOTES: sheet.data.SHOW_NOTES,
                                SHOW_PREFERENCES: sheet.data.SHOW_PREFERENCES,
                                SHOW_GENDER: sheet.data.SHOW_GENDER,
                                SHOW_FOCUS: sheet.data.SHOW_FOCUS,
                            }}
                            lang={lang as any}
                        />
                    )}

                </motion.div>
            )}
        </AnimatePresence>
    );
}
