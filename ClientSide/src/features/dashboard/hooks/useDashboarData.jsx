// src/features/dashboard/hooks/useDashboardData.js
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useIsAuthenticated } from "@features/auth/hooks/useAuthQueries";
import { useCompany } from "@features/company/hooks/useCompanyQueries";
import { useSummaryRecordByPeriodkey, useSummaryRecords } from "@features/resources/hooks/useSummaryRecords";
import { useZone } from "@features/industrialzone/hooks/useZoneQueries";
import { useHeader } from "@/components/common/Header/HeaderContext";
import { formatSmallNumbers, transformDataToMonthlyMap } from "@/components/dashboard/DashboardLogical";
import { Atom, Container, Droplet, Flame, Sprout, Trash, Zap } from "lucide-react";

// Khai báo một lần ở đây

export const useDashboardData = () => {
    const { user, isLoading: isAuthLoading } = useIsAuthenticated();
    const userRole = user?.user?.role;
    const companyId = user?.user?.company_id;
    const zoneId = user?.user?.zone_id;
    const { date } = useHeader();


    const {
        selectedMonth,
        currentPeriodStart,
        currentPeriodEnd,
        prevPeriodStart,
        prevPeriodEnd,
        periodKeyYearStart,
        periodKeyYearEnd
    } = useMemo(() => {
        const isAllYear = date?.startsWith("00/");

        if (isAllYear) {
            const year = Number(date.split("/")[1]);
            return {
                selectedMonth: date,
                currentPeriodStart: year * 100 + 1,
                currentPeriodEnd: year * 100 + 12,
                prevPeriodStart: (year - 1) * 100 + 1,
                prevPeriodEnd: (year - 1) * 100 + 12,
                periodKeyYearStart: year * 100 + 1,
                periodKeyYearEnd: year * 100 + 12,
            };
        }

        const selectedDate = dayjs(date, "MM/YYYY", true);
        const pkNow = Number(selectedDate.format("YYYYMM"));
        const pkPrev = Number(selectedDate.subtract(1, 'month').format("YYYYMM"));

        return {
            selectedMonth: date,
            currentPeriodStart: pkNow,
            currentPeriodEnd: pkNow,
            prevPeriodStart: pkPrev,
            prevPeriodEnd: pkPrev,
            periodKeyYearStart: Number(selectedDate.startOf('year').format("YYYY01")),
            periodKeyYearEnd: Number(selectedDate.endOf('year').format("YYYY12")),
        };
    }, [date]);

    // --- LẤY THÔNG TIN CÔNG TY/ZONE ---
    const { data: company } = useCompany(companyId);
    const { data: zone } = useZone(zoneId)

    const addtionalParams = useMemo(() => {
        if (userRole === 'admin') return {};
        return {
            companyId,
            ...(zoneId && { zoneId })
        };
    }, [userRole, companyId, zoneId]);

    const hasRequiredParams = Boolean(userRole && (userRole === 'admin' || companyId || zoneId));

    const currentParams = useMemo(() => ({
        role: userRole,
        periodKeyStart: currentPeriodStart,
        periodKeyEnd: currentPeriodEnd,
        include: [1, 2, 3, 4, 5, 6],
        ...addtionalParams,
    }), [userRole, currentPeriodStart, currentPeriodEnd, addtionalParams]);

    const prevParams = useMemo(() => ({
        role: userRole,
        periodKeyStart: prevPeriodStart,
        periodKeyEnd: prevPeriodEnd,
        include: [1, 2, 3, 4, 5, 6],
        ...addtionalParams,
    }), [userRole, prevPeriodStart, prevPeriodEnd, addtionalParams]);

    const { data: summaryRecords = [], isLoading: isLoadingCurrent } = useSummaryRecords(currentParams, { enabled: hasRequiredParams });
    const { data: previousMonthSummaryRecords = [], isLoading: isLoadingPrev } = useSummaryRecords(prevParams, { enabled: hasRequiredParams });

    const buildYearlyParams = (includeCodes) => ({
        role: userRole,
        periodKeyStart: periodKeyYearStart,
        periodKeyEnd: periodKeyYearEnd,
        include: includeCodes,
        ...addtionalParams,
    });

    // --- HÀM GỌI DATA THEO NĂM (Đã tách khỏi component) ---
    const getDataByYear = ({ include }) => {
        const summaryParams = {
            role: userRole,
            periodKeyStart: periodKeyYearStart,
            periodKeyEnd: periodKeyYearEnd,
            include: include || [],
            ...addtionalParams,
        };
        // Dùng hook (useSummaryRecordByPeriodkey) ở cấp độ hook để tránh lỗi React rules
        const { data: summaryRecordDetails = [] } = useSummaryRecordByPeriodkey(summaryParams, {
            enabled: !!hasRequiredParams,
        });
        return summaryRecordDetails;
    };

    const { data: yearlyMaterialData = [], isLoading: l1 } = useSummaryRecordByPeriodkey(useMemo(() => buildYearlyParams([2]), [periodKeyYearStart, periodKeyYearEnd, addtionalParams, userRole]), { enabled: hasRequiredParams });
    const { data: yearlyChemicalData = [], isLoading: l2 } = useSummaryRecordByPeriodkey(useMemo(() => buildYearlyParams([3]), [periodKeyYearStart, periodKeyYearEnd, addtionalParams, userRole]), { enabled: hasRequiredParams });
    const { data: yearlyFuelData = [], isLoading: l3 } = useSummaryRecordByPeriodkey(useMemo(() => buildYearlyParams([4]), [periodKeyYearStart, periodKeyYearEnd, addtionalParams, userRole]), { enabled: hasRequiredParams });
    const { data: yearlyWasteData = [], isLoading: l4 } = useSummaryRecordByPeriodkey(useMemo(() => buildYearlyParams([5]), [periodKeyYearStart, periodKeyYearEnd, addtionalParams, userRole]), { enabled: hasRequiredParams });
    const { data: yearlyEmissionData = [], isLoading: l5 } = useSummaryRecordByPeriodkey(useMemo(() => buildYearlyParams([6]), [periodKeyYearStart, periodKeyYearEnd, addtionalParams, userRole]), { enabled: hasRequiredParams });

    const isGlobalLoading = isAuthLoading || isLoadingCurrent || isLoadingPrev || l1 || l2 || l3 || l4 || l5;

    const processedData = useMemo(() => {

        const currentList = Array.isArray(summaryRecords)
            ? summaryRecords
            : (summaryRecords?.summaryRecord || []);

        const prevList = Array.isArray(previousMonthSummaryRecords)
            ? previousMonthSummaryRecords
            : (previousMonthSummaryRecords?.summaryRecord || []);

        const summaryData = currentList?.[0] ?? {};
        const previousData = prevList?.[0] ?? {};

        const safeGet = (obj, key) => obj?.[key] ?? {};

        const inputMaterials = safeGet(summaryData, 'input_materials');
        const inputChemicals = safeGet(summaryData, 'input_chemicals');
        const fuels = safeGet(summaryData, 'fuels');
        const waste = safeGet(summaryData, 'waste');
        const emissions = safeGet(summaryData, 'emissions');

        const previousMonthInputMaterials = safeGet(previousData, 'input_materials');
        const previousMonthInputChemicals = safeGet(previousData, 'input_chemicals');
        const previousMonthFuels = safeGet(previousData, 'fuels');
        const previousMonthWaste = safeGet(previousData, 'waste');
        const previousMonthEmissions = safeGet(previousData, 'emissions');

        const consumptionOptions = [
            {
                label: "Nguyên vật liệu",
                dataCode: [2],
                title: "Biểu đồ Nguyên vật liệu sử dụng theo năm",
                icon: <span className="h-7 aspect-square bg-[#4E5BA6] rounded-[10px] flex justify-center items-center"><Container className="size-4 text-white" /></span>,
                data: transformDataToMonthlyMap(yearlyMaterialData, 'input_materials.total_materials', 'Nguyên vật liệu', '#4E5BA6', 12),
                unit: "Tấn",
                value: "materials"
            },
            {
                label: "Hóa chất",
                dataCode: [3],
                title: "Biểu đồ Hóa chất sử dụng theo năm",
                icon: <span className="h-7 aspect-square bg-[#9CB000] rounded-[10px] flex justify-center items-center"><Atom className="size-4 text-white" /></span>,
                data: transformDataToMonthlyMap(
                    yearlyChemicalData,
                    (item) => {
                        const chem = item?.input_chemicals || {};
                        const kg = chem.total_chemicals_kg || 0;
                        const tons = kg;

                        const l = chem.total_chemicals_l || 0;
                        const m3 = chem.total_chemicals_m3 || 0;
                        const totalM3 = (l) + m3;
                        return [tons, totalM3];
                    },
                    ['Hóa chất (Tấn)', 'Hóa chất (m³)'],
                    ['#9CB000', '#B09C00'],
                    12
                ),
                unit: "", // Để trống hoặc "Tấn / m³" nếu FE hiển thị
                value: "chemicals"
            },
            {
                label: "Nước",
                dataCode: [4],
                title: "Biểu đồ Nước sử dụng theo năm",
                icon: <span className="h-7 aspect-square bg-[#00A6FF] rounded-[10px] flex justify-center items-center"><Droplet className="size-4 text-white" /></span>,
                data: transformDataToMonthlyMap(yearlyFuelData, 'fuels.total_water', 'Nước', '#00A6FF', 12),
                unit: "m³",
                value: "water"
            },
            {
                label: "Điện",
                dataCode: [4],
                title: "Biểu đồ Điện sử dụng theo năm",
                icon: <span className="h-7 aspect-square bg-[#FF9D00] rounded-[10px] flex justify-center items-center"><Zap className="size-4 text-white" /></span>,
                data: transformDataToMonthlyMap(yearlyFuelData, 'fuels.total_electricity', 'Điện', '#FF9D00', 12),
                unit: "kWh",
                value: "electricity"
            },
            {
                label: "Chất đốt",
                dataCode: [4],
                title: "Biểu đồ Chất đốt sử dụng theo năm",
                icon: <span className="h-7 aspect-square bg-[#FF4000] rounded-[10px] flex justify-center items-center"><Flame className="size-4 text-white" /></span>,
                data: transformDataToMonthlyMap(yearlyFuelData, 'fuels.total_combustion', 'Chất đốt', '#FF4000', 12),
                unit: "Tấn",
                value: "combustion"
            },
        ];

        const emissionsOptions = [
            {
                label: "Phát thải CO₂",
                icon: <span className="h-7 aspect-square bg-[#1D8651] rounded-[10px] flex justify-center items-center"><Sprout className="size-4 text-white" /></span>,
                title: "Biểu đồ phát thải CO₂",
                data: transformDataToMonthlyMap(yearlyEmissionData, 'emissions.total_co2', 'Phát thải CO₂', '#1D8651', 12),
                unit: "Tấn CO₂",
                value: "co2"
            },
            {
                label: "Chất thải",
                icon: <span className="h-7 aspect-square bg-[#866701] rounded-[10px] flex justify-center items-center"><Trash className="size-4 text-white" /></span>,
                title: "Biểu đồ chất thải",
                data: transformDataToMonthlyMap(yearlyWasteData, 'waste.total_waste_tan', 'Chất thải', '#866701', 12),
                unit: "Tấn",
                value: "waste"
            }
        ];

        return {
            summaryRecordData: summaryData,
            previousMonthSummaryRecordData: previousData,
            inputMaterials, inputChemicals, fuels, waste, emissions,
            previousMonthInputMaterials, previousMonthInputChemicals, previousMonthFuels, previousMonthWaste, previousMonthEmissions,
            consumptionOptions, emissionsOptions
        };
    }, [
        summaryRecords, previousMonthSummaryRecords,
        yearlyMaterialData, yearlyChemicalData, yearlyFuelData, yearlyWasteData, yearlyEmissionData,
        userRole // Thêm userRole vào dep để trigger lại log
    ]);

    return {
        ...processedData, // Spread toàn bộ data đã xử lý

        formatSmallNumbers,

        user,
        userRole,
        company,
        companyId,
        zoneId,
        zone,
        selectedMonth,
        date,

        isLoading: isGlobalLoading
    };
};