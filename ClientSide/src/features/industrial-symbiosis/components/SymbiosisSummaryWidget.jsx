import React, { useEffect, useState, useMemo } from 'react';
import {
    ArrowDownLeft, ArrowUpRight, ArrowRight, Package, Loader2,
    Clock, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { getBuyDemands, getSellSupplies } from '@/services/businessSysmbiosisService';
import { useIsAuthenticated } from "@/features/auth/hooks/useAuthQueries"; // Import Auth Query

const SymbiosisSummaryWidget = () => {
    const navigate = useNavigate();
    const [buyList, setBuyList] = useState([]);
    const [sellList, setSellList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Get role from auth query
    const { user } = useIsAuthenticated();
    const userRole = user?.user?.role;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [buyRes, sellRes] = await Promise.all([
                    getBuyDemands(),
                    getSellSupplies()
                ]);
                setBuyList(buyRes || []);
                setSellList(sellRes || []);
            } catch (error) {
                console.error('Failed to fetch symbiosis data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const stats = useMemo(() => {
        const allItems = [
            ...buyList.map(i => ({ ...i, _type: 'buy' })),
            ...sellList.map(i => ({ ...i, _type: 'sell' }))
        ];

        const now = dayjs();
        const active = allItems.filter(i => !i.expiryDate || dayjs(i.expiryDate).isAfter(now));
        const expiringSoon = allItems.filter(i => {
            if (!i.expiryDate) return false;
            const exp = dayjs(i.expiryDate);
            return exp.isAfter(now) && exp.diff(now, 'day') <= 7;
        });

        const totalBuyValue = buyList.reduce((sum, i) => sum + (parseFloat(i.price) || 0) * (parseFloat(i.quantity) || 0), 0);
        const totalSellValue = sellList.reduce((sum, i) => sum + (parseFloat(i.price) || 0) * (parseFloat(i.quantity) || 0), 0);

        const recentItems = allItems
            .sort((a, b) => new Date(b.createdAt || b.expiryDate || 0) - new Date(a.createdAt || a.expiryDate || 0))
            .slice(0, 5);

        return {
            totalBuy: buyList.length,
            totalSell: sellList.length,
            totalAll: allItems.length,
            activeCount: active.length,
            expiringSoonCount: expiringSoon.length,
            totalBuyValue,
            totalSellValue,
            recentItems,
        };
    }, [buyList, sellList]);

    const formatCurrency = (val) => {
        if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}B`;
        if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
        if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
        return val.toLocaleString();
    };

    if (loading) {
        return (
            <div className="col-start-4 col-end-7 row-start-1 row-end-4 bg-white border border-black/20 rounded-xl flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-7 h-7 xl:w-8 xl:h-8 animate-spin text-[#4E5BA6]" />
                    <p className="text-xs xl:text-sm text-gray-400 font-medium">Đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    const hasData = stats.totalAll > 0;

    return (
        <div className="col-start-4 col-end-7 row-start-1 row-end-4 flex flex-col gap-2 xl:gap-3">
            {/* Title row */}
            <span className="flex justify-between pr-2 items-center shrink-0">
                <p className="text-gray-900 font-bold text-lg xl:text-xl 2xl:text-xl uppercase tracking-wide">Cộng sinh công nghiệp</p>
                {userRole === 'company' && (
                    <button
                        onClick={() => navigate('/business/cong-sinh-doanh-nghiep')}
                        className="px-4 py-1.5 xl:px-5 xl:py-2 rounded-lg text-sm xl:text-base font-semibold transition-all shadow-sm flex items-center gap-2 bg-[#4E5BA6] text-white hover:bg-[#3d4885] shadow-md hover:shadow-lg cursor-pointer"
                    >
                        Quản lý <ArrowRight className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                    </button>
                )}
            </span>

            {/* Stat Cards Row — Buy & Sell */}
            <div className="grid grid-cols-2 gap-2 xl:gap-3 shrink-0">
                {/* Buy Card */}
                <div className="bg-white border border-black/20 rounded-xl p-3 xl:p-4 2xl:p-5 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[3px] xl:h-[4px] bg-[#4E5BA6]" />
                    <div className="flex items-center gap-2 xl:gap-3 mt-1">
                        <div className="h-9 w-9 xl:h-11 xl:w-11 2xl:h-12 2xl:w-12 bg-[#4E5BA6]/10 rounded-lg xl:rounded-xl flex items-center justify-center shrink-0">
                            <ArrowDownLeft className="w-[18px] h-[18px] xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-[#4E5BA6]" strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-gray-500 font-semibold uppercase text-[10px] xl:text-xs 2xl:text-sm tracking-wider">Cần mua</p>
                            <p className="text-2xl xl:text-3xl 2xl:text-4xl font-bold text-[#4E5BA6] leading-tight">{stats.totalBuy}</p>
                        </div>
                    </div>
                    <div className="mt-2 xl:mt-3 pt-2 xl:pt-3 border-t border-dashed border-gray-100">
                        <p className="text-[10px] xl:text-xs 2xl:text-sm text-gray-400 font-medium">Tổng giá trị</p>
                        <p className="text-sm xl:text-base 2xl:text-lg font-bold text-gray-700">{formatCurrency(stats.totalBuyValue)} <span className="text-[10px] xl:text-xs font-normal text-gray-400">VND</span></p>
                    </div>
                </div>

                {/* Sell Card */}
                <div className="bg-white border border-black/20 rounded-xl p-3 xl:p-4 2xl:p-5 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[3px] xl:h-[4px] bg-[#568D65]" />
                    <div className="flex items-center gap-2 xl:gap-3 mt-1">
                        <div className="h-9 w-9 xl:h-11 xl:w-11 2xl:h-12 2xl:w-12 bg-[#568D65]/10 rounded-lg xl:rounded-xl flex items-center justify-center shrink-0">
                            <ArrowUpRight className="w-[18px] h-[18px] xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-[#568D65]" strokeWidth={2.5} />
                        </div>
                        <div>
                            <p className="text-gray-500 font-semibold uppercase text-[10px] xl:text-xs 2xl:text-sm tracking-wider">Cần bán</p>
                            <p className="text-2xl xl:text-3xl 2xl:text-4xl font-bold text-[#568D65] leading-tight">{stats.totalSell}</p>
                        </div>
                    </div>
                    <div className="mt-2 xl:mt-3 pt-2 xl:pt-3 border-t border-dashed border-gray-100">
                        <p className="text-[10px] xl:text-xs 2xl:text-sm text-gray-400 font-medium">Tổng giá trị</p>
                        <p className="text-sm xl:text-base 2xl:text-lg font-bold text-gray-700">{formatCurrency(stats.totalSellValue)} <span className="text-[10px] xl:text-xs font-normal text-gray-400">VND</span></p>
                    </div>
                </div>
            </div>

            {/* Status indicators */}
            <div className="grid grid-cols-3 gap-2 xl:gap-3 shrink-0">
                <div className="bg-white border border-black/20 rounded-xl px-3 py-2 xl:px-4 xl:py-3 2xl:px-5 2xl:py-4 flex items-center gap-2 xl:gap-3">
                    <div className="h-7 w-7 xl:h-9 xl:w-9 2xl:h-10 2xl:w-10 bg-blue-50 rounded-lg xl:rounded-xl flex items-center justify-center shrink-0">
                        <Package className="w-3.5 h-3.5 xl:w-4 xl:h-4 2xl:w-5 2xl:h-5 text-[#4E5BA6]" />
                    </div>
                    <div>
                        <p className="text-lg xl:text-xl 2xl:text-2xl font-bold text-gray-800 leading-none">{stats.totalAll}</p>
                        <p className="text-[9px] xl:text-[10px] 2xl:text-xs text-gray-400 font-semibold uppercase tracking-wider">Tổng tin</p>
                    </div>
                </div>
                <div className="bg-white border border-black/20 rounded-xl px-3 py-2 xl:px-4 xl:py-3 2xl:px-5 2xl:py-4 flex items-center gap-2 xl:gap-3">
                    <div className="h-7 w-7 xl:h-9 xl:w-9 2xl:h-10 2xl:w-10 bg-emerald-50 rounded-lg xl:rounded-xl flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 xl:w-4 xl:h-4 2xl:w-5 2xl:h-5 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-lg xl:text-xl 2xl:text-2xl font-bold text-gray-800 leading-none">{stats.activeCount}</p>
                        <p className="text-[9px] xl:text-[10px] 2xl:text-xs text-gray-400 font-semibold uppercase tracking-wider">Còn hiệu lực</p>
                    </div>
                </div>
                <div className="bg-white border border-black/20 rounded-xl px-3 py-2 xl:px-4 xl:py-3 2xl:px-5 2xl:py-4 flex items-center gap-2 xl:gap-3">
                    <div className="h-7 w-7 xl:h-9 xl:w-9 2xl:h-10 2xl:w-10 bg-amber-50 rounded-lg xl:rounded-xl flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 xl:w-4 xl:h-4 2xl:w-5 2xl:h-5 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-lg xl:text-xl 2xl:text-2xl font-bold text-gray-800 leading-none">{stats.expiringSoonCount}</p>
                        <p className="text-[9px] xl:text-[10px] 2xl:text-xs text-gray-400 font-semibold uppercase tracking-wider">Sắp hết hạn</p>
                    </div>
                </div>
            </div>

            {/* Recent Items */}
            <div className="bg-white border border-black/20 rounded-xl overflow-hidden flex flex-col flex-1">
                <div className="px-3 pt-2.5 pb-1.5 xl:px-4 xl:pt-3 xl:pb-2 flex items-center justify-between border-b border-gray-100 shrink-0">
                    <p className="text-[10px] xl:text-xs 2xl:text-sm font-bold text-gray-400 uppercase tracking-wider">Tin đăng gần đây</p>
                    {userRole === 'company' && (
                        <button
                            onClick={() => navigate('/business/cong-sinh-doanh-nghiep')}
                            className="text-[10px] xl:text-xs 2xl:text-sm font-bold text-[#4E5BA6] hover:underline cursor-pointer"
                        >
                            Xem tất cả
                        </button>
                    )}
                </div>

                {!hasData ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 xl:p-6">
                        <div className="h-11 w-11 xl:h-14 xl:w-14 2xl:h-16 2xl:w-16 bg-gray-50 rounded-xl flex items-center justify-center mb-2">
                            <Package className="w-5 h-5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7 text-gray-300" />
                        </div>
                        <p className="text-sm xl:text-base font-semibold text-gray-500">Chưa có tin đăng nào</p>
                        <p className="text-xs xl:text-sm text-gray-400 mt-0.5">Đăng tin mua/bán để bắt đầu cộng sinh</p>
                        {userRole === 'company' && (
                            <button
                                onClick={() => navigate('/business/cong-sinh-doanh-nghiep')}
                                className="mt-3 text-xs xl:text-sm font-bold text-white bg-[#4E5BA6] hover:bg-[#3d4885] px-5 py-2 xl:px-6 xl:py-2.5 rounded-lg transition-colors cursor-pointer shadow-sm"
                            >
                                Đăng tin ngay
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-y-auto px-1 py-1">
                        {stats.recentItems.map((item, idx) => {
                            const isSell = item._type === 'sell';
                            const color = isSell ? '#568D65' : '#4E5BA6';
                            const label = isSell ? 'BÁN' : 'MUA';
                            const StatusIcon = isSell ? ArrowUpRight : ArrowDownLeft;
                            const isExpired = item.expiryDate && dayjs(item.expiryDate).isBefore(dayjs());

                            return (
                                <div
                                    key={item._id || idx}
                                    className="flex items-center gap-2 xl:gap-3 px-2 py-1.5 xl:px-3 xl:py-2.5 2xl:py-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                    onClick={() => navigate('/business/cong-sinh-doanh-nghiep')}
                                >
                                    <div
                                        className="w-[3px] xl:w-[4px] h-7 xl:h-8 2xl:h-9 rounded-full shrink-0"
                                        style={{ backgroundColor: color }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 xl:gap-2">
                                            <span
                                                className="text-[8px] xl:text-[9px] 2xl:text-[10px] font-bold px-1 py-0.5 xl:px-1.5 xl:py-1 rounded uppercase tracking-wide flex items-center gap-0.5 shrink-0"
                                                style={{ color, backgroundColor: `${color}15` }}
                                            >
                                                <StatusIcon className="w-2 h-2 xl:w-2.5 xl:h-2.5" strokeWidth={3} />
                                                {label}
                                            </span>
                                            <span className="text-xs xl:text-sm 2xl:text-base font-semibold text-gray-700 truncate">
                                                {item.wasteName}
                                            </span>
                                            {isExpired && (
                                                <span className="text-[8px] xl:text-[9px] font-bold text-red-400 bg-red-50 px-1 py-0.5 rounded shrink-0">
                                                    HẾT HẠN
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] xl:text-xs 2xl:text-sm text-gray-400 mt-0.5">
                                            <span className="font-medium">{item.quantity} {item.unit}</span>
                                            {item.expiryDate && (
                                                <>
                                                    <span className="text-gray-200">·</span>
                                                    <span className="flex items-center gap-0.5">
                                                        <Clock className="w-[9px] h-[9px] xl:w-3 xl:h-3" />
                                                        {dayjs(item.expiryDate).format('DD/MM/YY')}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {item.price != null && (
                                        <span className="text-xs xl:text-sm 2xl:text-base font-bold shrink-0" style={{ color }}>
                                            {parseInt(item.price).toLocaleString()}đ
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SymbiosisSummaryWidget;
