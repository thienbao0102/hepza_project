// src/pages/admin/dashboard/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
// Chỉ giữ lại những imports cần thiết cho layout và logic
import { useHeader } from "@/components/common/Header/HeaderContext";
import { useDashboardData } from "@features/dashboard/hooks/useDashboarData";
import { DataCard, ModernQuickLink } from "@components/dashboard/DashboardComponents";
import ConsumptionSection from "@components/dashboard/ConsumptionsSection";
import EmissionsSection from "@components/dashboard/EmissionsSection";
import EnterpriseDeclarationButton from "@components/dashboard/EnterpriseDeclarationButton";
import { Package, FlaskConical, Zap } from "lucide-react";
import { Lightbulb, MessageSquare, Factory, Building2, Users, FileText, Trash2, CloudFog, BarChart3, Database, ChevronLeft, ChevronRight, Bug } from "lucide-react";
import { motion, useMotionValue, animate } from "framer-motion";
import dayjs from "dayjs";

const AdminDashboard = () => {
    // 1. GỌI HOOK LOGIC
    const dashboardData = useDashboardData();

    const {
        inputMaterials, inputChemicals, fuels, waste, emissions,
        previousMonthInputMaterials, previousMonthInputChemicals, previousMonthFuels, previousMonthWaste, previousMonthEmissions,
        formatSmallNumbers, consumptionOptions, emissionsOptions, date,
        isLoading
    } = dashboardData;

    // 2. STATE VÀ EFFECT CHO HEADER (Đã được chuyển từ logic bên trong component ra ngoài)
    const { setHeaderConfig, setDate } = useHeader();

    useEffect(() => {
        // Parse date -> periodKey
        const [month, year] = date ? date.split('/') : ["", ""];
        const periodKey = year && month ? `${year}${month}` : "";

        // Thiết lập cấu hình Header (chỉ chạy 1 lần)
        setHeaderConfig({
            title: "Tổng quan",
            description: "Tổng quan dữ liệu của tất cả Khu công nghiệp và Khu chế xuất",
            showWeather: true,
            showDatePicker: true,
            rightContent: <EnterpriseDeclarationButton periodKey={periodKey} date={date} />
        });
    }, [setHeaderConfig, setDate, date]);

    // --- KHAI BÁO STATE CHO BIỂU ĐỒ (Giữ nguyên) ---
    const [emissionsChartState, setEmissionsChartState] = useState('co2');
    const [consumptionChartState, setConsumptionChartState] = useState('materials');

    const currentEmissionsOption = emissionsOptions.find(opt => opt.value === emissionsChartState);
    const currentConsumptionOption = consumptionOptions.find(opt => opt.value === consumptionChartState);

    return (
        <div className="h-full flex flex-col gap-3 md:grid md:grid-cols-5 md:grid-rows-[auto_1fr] py-2 overflow-y-auto">
            <div className="w-full md:col-span-full shrink-0">
                <DashboardQuickLinks />
            </div>

            {/* --- HÀNG 2: DATA SECTIONS --- */}

            {/* Consumption: Mobile full, md chiếm 3/5 (Bên trái) */}
            <div className="w-full h-full md:col-span-3 min-h-0">
                <ConsumptionSection data={dashboardData} options={consumptionOptions} />
            </div>

            {/* Emissions: Mobile full, md chiếm 2/5 (Bên phải) */}
            <div className="w-full h-full md:col-span-2 min-h-0">
                <EmissionsSection data={dashboardData} options={emissionsOptions} />
            </div>
        </div>
    );
}

const DashboardQuickLinks = () => {
    const QUICK_LINKS = [
        {
            title: "Doanh nghiệp",
            url: "/admin/business",
            icon: <Building2 className="size-6" />,
            description: "Thông tin và hồ sơ doanh nghiệp",
            color: "#f59e0b", // Amber 500
        },
        {
            title: "Khu công nghiệp",
            url: "/admin/industrialZone",
            icon: <Factory className="size-6" />,
            description: "Quản lý dữ liệu các Khu công nghiệp và Khu chế xuất",
            color: "#10b981", // Emerald 500
        },
        {
            title: "Người dùng",
            url: "/admin/user",
            icon: <Users className="size-6" />,
            description: "Quản lý tài khoản hệ thống",
            color: "#f43f5e", // Rose 500
        },
        {
            title: "Giải pháp",
            url: "/admin/solutions",
            icon: <Lightbulb className="size-6" />,
            description: "Quản lý các giải pháp và đề xuất",
            color: "#3b82f6", // Blue 500
        },
        {
            title: "Báo cáo lỗi",
            url: "/admin/error-logs",
            icon: <Bug className="size-6" />,
            description: "Xem và xử lý báo cáo lỗi",
            color: "#ef4444", // Red 500
        },
    ];

    return (
        <div className="h-full grid grid-cols-2 md:grid-cols-5 gap-3">
            {QUICK_LINKS.map((link, index) => (
                <ModernQuickLink key={index} {...link} className="flex-1" />
            ))}
        </div>
    );
};

export default AdminDashboard;