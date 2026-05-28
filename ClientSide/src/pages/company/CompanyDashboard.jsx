// src/pages/admin/dashboard/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { useHeader } from "@/components/common/Header/HeaderContext";
import { useDashboardData } from "@features/dashboard/hooks/useDashboarData";
import { ModernQuickLink, QuickLink } from "@components/dashboard/DashboardComponents";
import ConsumptionSection from "@components/dashboard/ConsumptionsSection";
import EmissionsSection from "@components/dashboard/EmissionsSection";
import { IonIcon } from '@ionic/react';
import { library, chatbubbles, folder, business, search, reader } from 'ionicons/icons';
import dayjs from "dayjs";
import { Lightbulb, Factory, Building2, Users, FileText, ClipboardList, Handshake, BarChart3, Database, ChevronLeft, ChevronRight, Share2, Info, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEnvReports } from '@/features/resources/hooks/useEnvironmentalReport';


const CompanyDashboard = () => {
    // 1. GỌI HOOK LOGIC
    const dashboardData = useDashboardData();

    const {
        inputMaterials, inputChemicals, fuels, waste, emissions,
        previousMonthInputMaterials, previousMonthInputChemicals, previousMonthFuels, previousMonthWaste, previousMonthEmissions,
        company,
        formatSmallNumbers, consumptionOptions, emissionsOptions, date
    } = dashboardData;

    // 2. STATE VÀ EFFECT CHO HEADER (Đã được chuyển từ logic bên trong component ra ngoài)
    const { setHeaderConfig, setDate } = useHeader();

    useEffect(() => {
        // Thiết lập cấu hình Header (chỉ chạy 1 lần)
        setHeaderConfig({
            title: "Tổng quan",
            description: "Tổng quan dữ liệu của doanh nghiệp",
            showWeather: true,
            showDatePicker: true,
        });
    }, [setHeaderConfig, setDate]);

    // --- KHAI BÁO STATE CHO BIỂU ĐỒ (Giữ nguyên) ---
    const [emissionsChartState, setEmissionsChartState] = useState('co2');
    const [consumptionChartState, setConsumptionChartState] = useState('materials');

    const currentEmissionsOption = emissionsOptions.find(opt => opt.value === emissionsChartState);
    const currentConsumptionOption = consumptionOptions.find(opt => opt.value === consumptionChartState);

    return (
        // MAIN GRID CONTAINER
        // Mobile: Flex cột (xếp chồng).
        // md trở lên: Grid 5 cột như cũ.
        <div className="h-full flex flex-col gap-4 md:grid md:grid-cols-5 md:grid-rows-[auto_1fr] py-2 overflow-y-auto">
            {/* Quick Links: Mobile full, md chiếm 3/5 */}
            <div className="w-full md:col-span-full">
                <DashboardQuickLinks company={company} />
            </div>

            {/* --- HÀNG 2: DATA SECTIONS --- */}

            {/* Consumption: Mobile full, md chiếm 3/5 (Bên trái) */}
            <div className="w-full md:col-span-3">
                <ConsumptionSection data={dashboardData} options={consumptionOptions} />
            </div>

            {/* Emissions: Mobile full, md chiếm 2/5 (Bên phải) */}
            <div className="w-full md:col-span-2">
                <EmissionsSection data={dashboardData} options={emissionsOptions} />
            </div>

        </div >
    );
}

const DashboardQuickLinks = ({ company }) => {
    const companyId = company?.company?.company_id;
    const currentYear = new Date().getFullYear();
    const { data: envReports = [] } = useEnvReports(companyId, { enabled: !!companyId });
    const showEnvAlert = !envReports.some(r => r.year === currentYear);

    const QUICK_LINKS = [
        {
            title: company?.company?.company_name || 'Thông tin doanh nghiệp',
            url: "/my-information/business",
            icon: <Building2 className="size-6" />,
            description: "Thông tin và hồ sơ doanh nghiệp",
            color: "#f59e0b",
            alert: showEnvAlert,
        },
        {
            title: "Cộng sinh",
            url: "/business/cong-sinh-doanh-nghiep",
            icon: <Handshake className="size-6" />,
            description: "Cộng sinh công nghiệp & Kết nối",
            color: "#10b981", // Emerald 500
        },
        {
            title: "Khu công nghiệp",
            url: "/industrialZone",
            icon: <Factory className="size-6" />,
            description: "Quản lý dữ liệu các KCN/KCX",
            color: "#3b82f6", // Blue 500
        },
        {
            title: "Giải pháp",
            url: "/solutions",
            icon: <Lightbulb className="size-6" />,
            description: "Quản lý các giải pháp và đề xuất",
            color: "#8b5cf6", // Violet 500
        },
        {
            title: "Khai báo",
            url: "/resources/resource-form",
            icon: <ClipboardList className="size-6" />,
            description: "Khai báo tài nguyên và Chất thải",
            color: "#f43f5e", // Rose 500
        },
    ];

    return (
        // Mobile: Grid 2 cột
        // MD (Tablet): Grid 3 cột
        // md (Desktop): Grid 5 cột (thẳng hàng)
        <div className="h-full grid grid-cols-2 md:grid-cols-5 gap-3">
            {QUICK_LINKS.map((link, index) => (
                <ModernQuickLink key={index} {...link} />
            ))}
        </div>
    );
};

export default CompanyDashboard;