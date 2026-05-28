import React, { useEffect, useState } from "react";
import { useHeader } from "@/components/common/Header/HeaderContext";
import { useDashboardData } from "@features/dashboard/hooks/useDashboarData";
import { ModernQuickLink } from "@components/dashboard/DashboardComponents";
import ConsumptionSection from "@components/dashboard/ConsumptionsSection";
import EmissionsSection from "@components/dashboard/EmissionsSection";
import EnterpriseDeclarationButton from "@components/dashboard/EnterpriseDeclarationButton";
import { Building2, Factory, Lightbulb, Bell, FileText } from "lucide-react";
import dayjs from "dayjs";
import { useAuthenticatedUser } from "@features/auth/hooks/useAuthQueries";
import { buildManagerScopedTitle, resolveManagerZoneLabel } from "@/utils/managerScope";
import { useZone } from "@features/industrialzone/hooks/useZoneQueries";

const ManagerDashboard = () => {
    // 1. GỌI HOOK LOGIC
    const dashboardData = useDashboardData();
    const { data: authData } = useAuthenticatedUser();
    const currentUser = authData?.user || authData || {};
    const { data: zoneData } = useZone(currentUser?.zone_id, { enabled: !!currentUser?.zone_id });
    const managerZoneLabel = resolveManagerZoneLabel({
        zoneName: zoneData?.zone?.zone_name || currentUser?.zone_name,
        zoneId: currentUser?.zone_id,
    });

    const {
        consumptionOptions, emissionsOptions, date,
        isLoading
    } = dashboardData;

    // 2. STATE VÀ EFFECT CHO HEADER
    const { setHeaderConfig, setDate } = useHeader();

    useEffect(() => {
        // Parse date -> periodKey
        const [month, year] = date ? date.split('/') : ["", ""];
        const periodKey = year && month ? `${year}${month}` : "";

        // Thiết lập cấu hình Header (chỉ chạy 1 lần hoặc khi date thay đổi)
        setHeaderConfig({
            title: "Tổng quan",
            description: "Tổng quan dữ liệu môi trường Khu công nghiệp và Khu chế xuất",
            showWeather: true,
            showDatePicker: true,
            rightContent: <EnterpriseDeclarationButton periodKey={periodKey} date={date} />
        });
    }, [setHeaderConfig, setDate, date]);

    useEffect(() => {
        const [month, year] = date ? date.split('/') : ["", ""];
        const periodKey = year && month ? `${year}${month}` : "";

        setHeaderConfig({
            title: buildManagerScopedTitle("Tổng quan", managerZoneLabel),
            description: `Tổng quan dữ liệu môi trường của ${managerZoneLabel}.`,
            showWeather: true,
            showDatePicker: true,
            rightContent: <EnterpriseDeclarationButton periodKey={periodKey} date={date} />
        });
    }, [date, managerZoneLabel, setHeaderConfig]);

    // --- KHAI BÁO STATE CHO BIỂU ĐỒ ---
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
            url: "/manager/business",
            icon: <Building2 className="size-6" />,
            description: "Thông tin và dữ liệu doanh nghiệp",
            color: "#f59e0b", // Amber 500
        },
        {
            title: "Khu công nghiệp",
            url: "/manager/industrialZone",
            icon: <Factory className="size-6" />,
            description: "Quản lý dữ liệu Khu công nghiệp",
            color: "#10b981", // Emerald 500
        },
        {
            title: "Giải pháp",
            url: "/manager/solutions",
            icon: <Lightbulb className="size-6" />,
            description: "Quản lý các giải pháp đề xuất",
            color: "#3b82f6", // Blue 500
        },
        {
            title: "Báo cáo",
            url: "/manager/reports",
            icon: <FileText className="size-6" />,
            description: "Xuất dữ liệu và báo cáo",
            color: "#f43f5e", // Rose 500
        },
        {
            title: "Thông báo",
            url: "/manager/notifications",
            icon: <Bell className="size-6" />,
            description: "Quản lý và xem hệ thống thông báo",
            color: "#8b5cf6", // Purple 500
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

export default ManagerDashboard;
