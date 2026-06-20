/*
 * File: Menu/MenuContext.tsx
 * Chức năng: Context API cung cấp dữ liệu dịch vụ toàn cục
 * Logic:
 * - Fetch toàn bộ services ngay khi Provider mount (tại layout).
 * - Cung cấp danh sách services, loading state và error cho toàn app.
 * - Giúp các trang con (như StandardMenu) có data ngay lập tức mà không cần fetch lại.
 */

'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Service, ServiceOptions, CartItem, Category } from '@/components/Menu/types';
import { getServices } from '@/components/Menu/getServices';
import { type VipStaffInfo } from '@/lib/vipStaffUtils';

export interface CustomerInfoContext {
    name: string;
    email: string;
    phone: string;
    gender: string;
    room: string;
}

interface MenuContextType {
    services: Service[];
    categories: Category[]; // Added categories
    loading: boolean;
    error: any;
    refreshData: () => Promise<void>;

    // --- Cart Logic ---
    cart: CartItem[];
    addToCart: (service: Service, qty: number, options?: ServiceOptions) => string;
    updateCartItem: (cartId: string, qty: number) => void;
    updateCartItemOptions: (cartId: string, options: ServiceOptions) => void;
    updateAllCartItemOptions: (options: ServiceOptions) => void;
    removeFromCart: (cartId: string) => void;
    clearCart: () => void;
    getQty: (serviceId: string) => number; // Helper lấy tổng số lượng của 1 service ID

    // --- VIP Cart Logic ---
    addVipToCart: (params: {
        staffIds: string[];
        staffInfoList: VipStaffInfo[];
        skillIds: string[];
        displayName: string;
        duration: number;
        totalPrice: number;
        customerNotes?: string;
    }) => void;

    // --- Customer Logic ---
    customerInfo: CustomerInfoContext;
    updateCustomerInfo: (field: string, value: string) => void;
    resetCustomerInfo: () => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const MenuProvider = ({ children }: { children: ReactNode }) => {
    const [services, setServices] = useState<Service[]>([]);
    const [categories, setCategories] = useState<Category[]>([]); // Add categories state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);

    // Customer State
    const [customerInfo, setCustomerInfoContext] = useState<CustomerInfoContext>({
        name: '',
        email: '',
        phone: '',
        gender: 'Male',
        room: ''
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null); // Clear error cũ trước khi thử lại
            const data = await getServices('all');
            console.log('🚀 [MenuData] Pre-fetched', data.length, 'services');
            setServices(data);
        } catch (err) {
            console.error('❌ [MenuData] Error fetching:', err);
            setError(err); // Lưu lỗi vào context để UI biết đường hiển thị
            setServices([]); // Xóa dữ liệu cũ nếu lỗi
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- CART FUNCTIONS ---

    // 1. Thêm món (Tạo cartId mới hoặc cộng dồn nếu option giống hệt - tạm thời cứ tạo mới để dễ custom)
    const addToCart = (service: Service, qty: number, options?: ServiceOptions) => {
        const cartId = `${service.id}-${Date.now()}-${Math.random()}`;
        setCart(prev => {
            const newItem: CartItem = {
                ...service,
                cartId,
                qty,
                options: options || {}
            };
            return [...prev, newItem];
        });
        return cartId;
    };

    // Cập nhật số lượng
    const updateCartItem = (cartId: string, qty: number) => {
        setCart(prev => {
            if (qty <= 0) {
                return prev.filter(item => item.cartId !== cartId);
            }
            return prev.map(item => item.cartId === cartId ? { ...item, qty } : item);
        });
    };

    // [NEW] Cập nhật options cho 1 item cụ thể (CartId)
    const updateCartItemOptions = (cartId: string, options: ServiceOptions) => {
        setCart(prev => prev.map(item => item.cartId === cartId ? { ...item, options: { ...item.options, ...options } } : item));
    };

    // [NEW] Cập nhật options cho TOÀN BỘ giỏ hàng (Bulk Update)
    const updateAllCartItemOptions = (options: ServiceOptions) => {
        setCart(prev => prev.map(item => ({ ...item, options: { ...item.options, ...options } })));
    };

    // 3. Xóa
    const removeFromCart = (cartId: string) => updateCartItem(cartId, 0);

    // 4. Xóa hết
    const clearCart = () => setCart([]);

    // 5. Helper lấy số lượng (để hiện badge trên Menu)
    const getQty = (serviceId: string) => {
        return cart.filter(item => item.id === serviceId).reduce((sum, item) => sum + item.qty, 0);
    };

    // --- VIP CART FUNCTION ---
    const addVipToCart = (params: {
        staffIds: string[];
        staffInfoList: VipStaffInfo[];
        skillIds: string[];
        displayName: string;
        duration: number;
        totalPrice: number;
        customerNotes?: string;
    }) => {
        const newItems: CartItem[] = params.staffIds.map((staffId, index) => {
            const staffInfo = params.staffInfoList.find(s => s.id === staffId);
            return {
                // Service base fields (pseudo-service for VIP)
                id: 'NHS0800',
                cartId: `vip-${staffId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                cat: 'VIP',
                names: { en: params.displayName, vi: params.displayName },
                descriptions: { en: '', vi: '' },
                img: '',
                priceVND: index === 0 ? params.totalPrice : 0, // Price only on first item
                priceUSD: 0,
                timeValue: params.duration,
                qty: 1,
                menuType: 'vip' as const,
                // VIP-specific fields
                itemType: 'vip' as const,
                vipStaffId: staffId,
                vipStaffName: staffInfo?.fullName || staffId,
                vipStaffAvatar: staffInfo?.avatarUrl || null,
                vipSkillIds: params.skillIds,
                vipDisplayName: params.displayName,
                vipDuration: params.duration,
                vipCustomerNotes: params.customerNotes,
                // Add to options so it gets saved to Supabase JSONB
                options: {
                    displayName: params.displayName,
                    vipDuration: params.duration,
                    vipStaffId: staffId,
                    selectedSkills: params.skillIds,
                    notes: { content: params.customerNotes || '' }
                }
            };
        });
        setCart(prev => [...prev, ...newItems]);
    };

    // --- CUSTOMER FUNCTIONS ---
    const updateCustomerInfo = (field: string, value: string) => {
        setCustomerInfoContext(prev => ({ ...prev, [field]: value }));
    };

    const resetCustomerInfo = () => {
        setCustomerInfoContext({
            name: '',
            email: '',
            phone: '',
            gender: 'Male',
            room: ''
        });
    };

    return (
        <MenuContext.Provider value={{
            services, categories, loading, error, refreshData: fetchData,
            cart, addToCart, updateCartItem, updateCartItemOptions, updateAllCartItemOptions, removeFromCart, clearCart, getQty,
            addVipToCart,
            customerInfo, updateCustomerInfo, resetCustomerInfo
        }}>
            {children}
        </MenuContext.Provider>
    );
};

export const useMenuData = () => {
    const context = useContext(MenuContext);
    if (context === undefined) {
        throw new Error('useMenuData must be used within a MenuProvider');
    }
    return context;
};
