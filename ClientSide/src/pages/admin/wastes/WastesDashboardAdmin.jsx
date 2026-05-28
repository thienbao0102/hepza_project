import React, { useEffect, useMemo, useState } from "react";
import { Container, Droplet, Zap, ClipboardPlus, SearchCheck, Trash, Calendar } from "lucide-react";
// Import các icon từ MUI
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import AirRoundedIcon from '@mui/icons-material/AirRounded';
import InvertColorsRoundedIcon from '@mui/icons-material/InvertColorsRounded';

import { Link, useNavigate } from 'react-router-dom';
import clsx from "clsx";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

// Import các custom hooks của bạn
import { useSummaryRecords } from "@/features/resources/hooks/useSummaryRecords";
import { useIsAuthenticated } from "@/features/auth/hooks/useAuthQueries";
import { useCompany } from "@/features/company/hooks/useCompanyQueries";
import { useZone } from "@/features/industrialzone/hooks/useZoneQueries";
import { useHeader } from "@/components/common/Header/HeaderContext";

dayjs.extend(customParseFormat);

// Hàm format số liệu (giữ nguyên logic của bạn)
function formatSmallNumbers(value) {
    if (value === null || value === undefined) {
        return new Intl.NumberFormat('vi-VN').format(0);
    }

    const num = Math.abs(value);
    let decimalPlaces;

    if (num >= 0.01) {
        decimalPlaces = 0;
    } else if (num > 0) {
        decimalPlaces = Math.ceil(Math.abs(Math.log10(num))) + 1;
    } else {
        decimalPlaces = 0;
    }

    const numberToFormat = parseFloat(value.toFixed(decimalPlaces));
    const finalDecimalPlaces = numberToFormat === 0 ? 0 : decimalPlaces;

    return new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: finalDecimalPlaces,
        maximumFractionDigits: finalDecimalPlaces,
        useGrouping: true
    }).format(numberToFormat);
}

const WastesDashboardAdmin = () => {
    const navigate = useNavigate();
    const { user } = useIsAuthenticated();
    const userRole = user?.user?.role;
    const companyId = user?.user?.company_id;

    const { setHeaderConfig, date, setDate } = useHeader();

    useEffect(() => {
        setHeaderConfig({
            title: "Tổng quan chất thải",
            description: 'Tổng quan chất thải',
            showWeather: true,
            showDatePicker: false,
        });
    }, []);

    // Lấy thông tin Company và Zone (nếu cần filter theo quyền hạn)
    const { data: company = [] } = useCompany(companyId);
    const zoneId = company?.company?.zone_id;
    const { data: zone = [] } = useZone(zoneId);

    const [selectedMonth, setSelectedMonth] = useState(dayjs().format("MM/YYYY"));
    const selectedDate = dayjs(selectedMonth, "MM/YYYY", true);
    const periodKeyNow = Number(selectedDate.format("YYYYMM"));

    // --- CẤU HÌNH PARAMS LẤY DATA CHẤT THẢI ---
    const summaryParams = {
        role: userRole,
        periodKeyStart: periodKeyNow,
        periodKeyEnd: periodKeyNow,
        include: [4], // Chỉ lấy nhóm Chất thải
        ...(userRole !== 'admin' && { companyId }),
        ...(userRole !== 'admin' && zoneId && { zoneId })
    };

    const hasRequiredParams = userRole && (userRole === 'admin' || companyId || zoneId);

    const {
        data: summaryRecords = [],
        isLoading: isSummaryLoading,
    } = useSummaryRecords(summaryParams, { enabled: !!hasRequiredParams });

    // --- XỬ LÝ DỮ LIỆU (PARSING) ---
    const parsedData = useMemo(() => {
        const rawData = summaryRecords?.[0] ?? {};
        const w = rawData.waste ?? {};

        // Helper lấy số an toàn
        const getNum = (val) => Number(val) || 0;

        // Mapping dữ liệu dựa trên keys API trả về
        return {
            solid: {
                // DO - Chất thải sinh hoạt (Dùng key WSO hoặc tương đương trong hệ thống của bạn)
                domestic: getNum(w.total_solid_waste_WSO),
                // IND - Chất thải công nghiệp
                industrial: getNum(w.total_solid_waste_INDS),
                // HA - Chất thải nguy hại
                hazardous: getNum(w.total_solid_waste_HAS),
                // Đơn vị chung cho chất thải rắn
                unit: w.unit_solid_and_gas_waste ?? "Tấn"
            },
            water: {
                // WWA - Nước thải
                total: getNum(w.total_water_waste),
                unit: w.unit_water_waste ?? "m³"
            },
            gas: {
                // GASW - Khí thải
                total: getNum(w.total_gas_waste),
                unit: w.unit_gas_waste ?? "mg/l"
            }
        };
    }, [summaryRecords]);

    return (
        <div className="flex flex-col items-center justify-between max-h-screen h-screen min-h-0 overflow-y-auto gap-4">
            {/* Main Content */}
            <div className="flex flex-col flex-1 gap-3 min-h-0 w-full" >
                <div className="flex w-full h-fit items-stretch gap-2 min-h-0">
                    <ResourceCardContainer
                        icon={
                            <span className="h-7 aspect-square bg-[#00EA4A] rounded-[10px] flex justify-center items-center">
                                <Trash className="size-4 text-white" />
                            </span>
                        }
                        title={"Chất thải"}
                        className={"flex-grow"}
                    >
                        <div className="flex flex-grow items-center w-full relative">
                            {/* 1. DO - Chất thải sinh hoạt */}
                            <ResourceCard
                                icon={
                                    <span className="h-13 aspect-square rounded-full bg-[#00EA4A]/20 flex justify-center items-center text-[#00EA4A]">
                                        <HomeRoundedIcon className="h-full aspect-square" />
                                    </span>
                                }
                                title={"Sinh hoạt"}
                                data={formatSmallNumbers(parsedData.solid.domestic)}
                                unit={parsedData.solid.unit}
                            />

                            {/* 2. IND - Chất thải công nghiệp */}
                            <ResourceCard
                                icon={
                                    <span className="h-13 aspect-square rounded-full bg-[#00EA4A]/20 flex justify-center items-center text-[#00EA4A]">
                                        <CategoryRoundedIcon className="h-full aspect-square" />
                                    </span>
                                }
                                title={"Công nghiệp"}
                                data={formatSmallNumbers(parsedData.solid.industrial)}
                                unit={parsedData.solid.unit}
                            />

                            {/* 3. HA - Chất thải nguy hại */}
                            <ResourceCard
                                icon={
                                    <span className="h-13 aspect-square rounded-full bg-[#ff6254]/20 flex justify-center items-center text-[#ff6254]">
                                        <ReportProblemRoundedIcon className="h-full aspect-square" />
                                    </span>
                                }
                                title={"Nguy hại"}
                                data={formatSmallNumbers(parsedData.solid.hazardous)}
                                unit={parsedData.solid.unit}
                            />

                            {/* 4. WWA - Nước thải */}
                            <ResourceCard
                                icon={
                                    <span className="h-13 aspect-square rounded-full bg-[#00C0E8]/20 flex justify-center items-center text-[#00C0E8]">
                                        <InvertColorsRoundedIcon className="h-full aspect-square" />
                                    </span>
                                }
                                title={"Nước thải"}
                                data={formatSmallNumbers(parsedData.water.total)}
                                unit={parsedData.water.unit}
                            />

                            {/* 5. GASW - Khí thải */}
                            <ResourceCard
                                icon={
                                    <span className="h-13 aspect-square rounded-full bg-gray-500/20 flex justify-center items-center text-gray-600">
                                        <AirRoundedIcon className="h-full aspect-square" />
                                    </span>
                                }
                                title={"Khí thải"}
                                data={formatSmallNumbers(parsedData.gas.total)}
                                unit={parsedData.gas.unit}
                            />
                        </div>
                    </ResourceCardContainer>
                </div>
                <div className="flex w-full flex-2 items-stretch gap-2 min-h-0">
                </div>
            </div >
        </div >
    );
}

export default WastesDashboardAdmin;

// --- Sub Components (Giữ nguyên styling như trang Resource) ---

const ResourceCard = ({ icon, title, data, unit }) => {
    return (
        <div className="flex flex-col gap-2 h-full items-center flex-1 min-w-[120px]">
            <div className="flex h-full aspect-square max-h-16">
                {icon}
            </div>
            <div className="flex flex-col flex-1 text-gray-600">
                <p className="truncate w-full overflow-visible text-center text-[16px]">{title}</p>
                <span className="flex items-end justify-center gap-1">
                    <p className="text-2xl 2xl:text-3xl font-medium text-black leading-none">{data}</p>
                    <p className="text-sm mb-1">{unit}</p>
                </span>
            </div>
        </div>
    );
}

const ResourceCardContainer = ({ icon, title, children, className, to }) => {
    const navigate = useNavigate();
    return (
        <div
            className={clsx(
                "flex flex-col w-fit bg-white border border-black/20 rounded-2xl p-[10px] gap-3",
                className
            )}
        >
            {/* Header */}
            <div
                className="flex w-full overflow-visible h-fit text-gray-600 items-center gap-2 cursor-pointer"
                onClick={() => to && navigate(to)}
            >
                {icon}
                <p className="truncate overflow-visible text-[16px] font-medium">{title}</p>
            </div>

            {children}
        </div>
    );
};

const ResourceQuickLink = ({ icon, title, to }) => {
    return (
        <Link
            to={to}
            className="flex items-center gap-2 rounded-lg transition hover:opacity-80"
        >
            {icon}
            <span className="text-sm text-gray-600 underline underline-dashed underline-offset-2 [text-decoration-style:dotted] decoration-gray-500">
                {title}
            </span>
        </Link>
    );
};