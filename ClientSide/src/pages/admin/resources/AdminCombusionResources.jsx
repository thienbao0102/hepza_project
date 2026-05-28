import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import clsx from "clsx";
import {
    ResponsiveContainer,
    PieChart, Pie, Cell,
    BarChart, Bar,
    XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend
} from 'recharts';
import {
    SearchCheck, Trash, Flame,
    BarChart3, TrendingUp, FlaskConical
} from "lucide-react";

import ReuseableTable from "@components/common/ReuseableTable";
import { AddButton } from "@components/ui/Button";
import ButtonFilter from "@components/ui/ButtonFilter";
import SearchBox from "@components/ui/SearchBox";
import { useHeader } from '@/components/common/Header/HeaderContext';
import { useIsAuthenticated } from "@/features/auth/hooks/useAuthQueries";
import { useCompany } from "@/features/company/hooks/useCompanyQueries";
import { useZone } from "@features/industrialzone/hooks/useZoneQueries";
import { useSummaryDetail } from "@/features/resources/hooks/useSummaryRecords";

const COLORS = ['#F97316', '#F59E0B', '#EF4444', '#B45309', '#78350F'];

const AdminCombustionResources = () => {
    const getCategoryStyles = (cat) => {
        const lower = (cat || "").toLowerCase();
        if (lower.includes("than")) return "bg-zinc-50 text-zinc-700 border-zinc-200";
        if (lower.includes("biomass")) return "bg-lime-50 text-lime-700 border-lime-200";
        if (lower.includes("dầu mỏ") || lower.includes("petroleum")) return "bg-blue-50 text-blue-700 border-blue-200";
        if (lower.includes("khí") || lower.includes("gas")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
        return "bg-slate-50 text-slate-700 border-slate-200";
    };

    const navigate = useNavigate();
    const { setHeaderConfig, setBreadcrumbItems, date } = useHeader();
    const { user } = useIsAuthenticated();

    const companyId = user?.user?.company_id;
    const userRole = user?.user?.role;
    const { data: company = [] } = useCompany(companyId);
    const zoneId = company?.company?.zone_id;

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFilters, setSelectedFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({});
    const [selectedRows, setSelectedRows] = useState([]);

    // Data Fetching
    const isAllYear = date?.startsWith("00/");
    const selectedYear = isAllYear ? date.split("/")[1] : (dayjs(date, "MM/YYYY", true).isValid() ? dayjs(date, "MM/YYYY").year() : dayjs().year());

    const periodKeyStart = isAllYear ? Number(`${selectedYear}01`) : Number(dayjs(date, "MM/YYYY", true).isValid() ? dayjs(date, "MM/YYYY").format("YYYYMM") : dayjs().format("YYYYMM"));
    const periodKeyEnd = isAllYear ? Number(`${selectedYear}12`) : periodKeyStart;

    const hasRequiredParams = userRole && (userRole === 'admin' || companyId || zoneId);
    const { data: summaryRecords = {}, isFetching } = useSummaryDetail({
        role: userRole,
        ...(userRole !== 'admin' && { companyId }),
        ...(userRole !== 'admin' && zoneId && { zoneId }),
        periodKeyStart,
        periodKeyEnd,
        include: [5] // FuelResource for combustion
    }, { enabled: !!hasRequiredParams });

    const rawDataRaw = summaryRecords.FuelResource || [];
    const rawData = useMemo(() => Array.isArray(rawDataRaw) ? rawDataRaw : [], [rawDataRaw]);

    // --- Data Processing for Table ---
    const filteredData = useMemo(() => {
        let result = rawData.map(item => ({
            ...item,
            id: item.id || `combustion-${Math.random()}`,
            fuelName: item.main_group || "Khác",
            category: item.sub_group || "Năng lượng",
            qty: Number(item.quantity) || 0,
            unit: item.unit || "Tấn",
            formattedDate: dayjs(item.createdAt).format("DD/MM/YYYY")
        }));

        if (searchTerm) {
            const lowSearch = searchTerm.toLowerCase();
            result = result.filter(item =>
                item.fuelName.toLowerCase().includes(lowSearch) ||
                item.category.toLowerCase().includes(lowSearch)
            );
        }

        Object.keys(selectedFilters).forEach(key => {
            const values = selectedFilters[key];
            if (values && values.length > 0) {
                result = result.filter(item => values.includes(item[key]));
            }
        });

        const sortField = Object.keys(sortConfig)[0];
        const sortOrder = sortConfig[sortField];
        if (sortField && sortOrder !== 0) {
            result.sort((a, b) => {
                let valA = a[sortField];
                let valB = b[sortField];
                if (typeof valA === 'string') {
                    valA = valA.toLowerCase();
                    valB = valB.toLowerCase();
                }
                if (valA < valB) return -1 * sortOrder;
                if (valA > valB) return 1 * sortOrder;
                return 0;
            });
        }
        return result;
    }, [rawData, searchTerm, selectedFilters, sortConfig]);

    // --- Data Processing for Charts ---
    const chartData = useMemo(() => {
        const typeMap = new Map();
        const fuelUsageMap = new Map();
        const timeMap = new Map();
        const allTypes = new Set();

        rawData.forEach(item => {
            const type = item.sub_group || "Khác";
            const name = item.main_group || "Khác";
            const qty = Number(item.quantity) || 0;

            typeMap.set(type, (typeMap.get(type) || 0) + qty);
            fuelUsageMap.set(name, (fuelUsageMap.get(name) || 0) + qty);

            const dateObj = dayjs(item.createdAt);
            const monthKey = dateObj.format("MM/YYYY");
            const timestamp = dateObj.valueOf();

            if (!timeMap.has(monthKey)) {
                timeMap.set(monthKey, { name: monthKey, timestamp });
            }
            const record = timeMap.get(monthKey);
            record[name] = (record[name] || 0) + qty;
            allTypes.add(name);
        });

        const byType = Array.from(typeMap.entries()).map(([name, value]) => ({ name, value }));
        const byTime = Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);
        const top5Fuels = Array.from(fuelUsageMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        return {
            byType,
            byTime,
            top5: top5Fuels,
            types: Array.from(allTypes)
        };
    }, [rawData]);

    useEffect(() => {
        setHeaderConfig({
            title: "Quản lý Chất Đốt",
            description: "Thống kê và quản lý các loại nhiên liệu đốt",
            showWeather: true,
            showDatePicker: true
        });
        setBreadcrumbItems([
            { key: '/resources', title: "Quản lý tài nguyên" },
            { key: '/resources/combustionResources', title: "Quản lý Chất Đốt" },
        ]);
    }, [setHeaderConfig, setBreadcrumbItems]);

    const handleAdd = () => navigate("/resources/resource-form");
    const handleSort = (field, order) => setSortConfig({ [field]: order });

    const columns = [
        {
            Header: "Tên Nhiên liệu",
            accessor: "fuelName",
            render: (val) => (
                <span className={clsx(
                    "px-2.5 py-1 rounded-full text-xs font-medium border truncate block w-fit mx-auto capitalize shadow-sm",
                    "bg-slate-50 text-slate-700 border-slate-200"
                )} title={val}>
                    {val}
                </span>
            ),
            sortable: true
        },
        {
            Header: "Số lượng",
            accessor: "qty",
            render: (val) => <span className="truncate block w-full text-center font-mono text-blue-600 font-medium">{val?.toLocaleString()}</span>,
            sortable: true
        },
        {
            Header: "Đơn vị",
            accessor: "unit",
            render: (val) => <span className="truncate block w-full text-center capitalize text-slate-500 font-medium">{val}</span>,
            sortable: true
        },
        {
            Header: "Phân loại",
            accessor: "category",
            render: (val) => {
                const styles = getCategoryStyles(val);
                return (
                    <span className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-medium border truncate block w-fit mx-auto capitalize shadow-sm",
                        styles
                    )} title={val}>
                        {val || "Khác"}
                    </span>
                );
            },
            sortable: true
        },
        {
            Header: "KCX/KCN",
            accessor: "zone_id",
            render: (val) => <ZoneCell zoneId={val} />,
        },
        {
            Header: "Doanh nghiệp",
            accessor: "company_id",
            render: (val) => <CompanyCell companyId={val} />,
        },
        {
            Header: "Ngày tạo",
            accessor: "createdAt",
            render: (val) => <span className="text-slate-400 text-sm">{dayjs(val).format("DD/MM/YYYY")}</span>,
            sortable: true
        }
    ];

    const filterOptions = useMemo(() => {
        return {
            category: Array.from(new Set(rawData.map(i => i.sub_group).filter(Boolean))),
            fuelName: Array.from(new Set(rawData.map(i => i.main_group).filter(Boolean)))
        };
    }, [rawData]);

    const fieldLabels = {
        category: "Dạng nhiên liệu",
        fuelName: "Tên cụ thể"
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
            {/* Charts Section */}
            <div className="h-[28%] shrink-0">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 lg:gap-3 h-full">

                    {/* Donut Chart: Distribution */}
                    <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-orange-50 rounded-lg">
                                <FlaskConical className="size-4 text-orange-600" />
                            </div>
                            <h3 className="font-semibold text-sm text-slate-800 leading-tight">Cơ cấu nhiên liệu</h3>
                        </div>
                        <div className="flex-1 min-h-0 relative">
                            {chartData.byType.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData.byType}
                                            cx="40%" cy="50%"
                                            innerRadius={35} outerRadius={55}
                                            paddingAngle={4}
                                            dataKey="value"
                                        >
                                            {chartData.byType.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            formatter={(value) => [`${value?.toLocaleString()}`, "Lượng dùng"]}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Legend
                                            layout="vertical" verticalAlign="middle" align="right"
                                            iconType="circle" iconSize={6}
                                            formatter={(value) => <span className="text-[10px] text-slate-600 font-medium ml-1 truncate max-w-[80px] block capitalize">{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : <EmptyState message="Chưa có dữ liệu" />}
                        </div>
                    </div>

                    {/* Bar Chart: Top Fuels */}
                    <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-red-50 rounded-lg">
                                <BarChart3 className="size-4 text-red-600" />
                            </div>
                            <h3 className="font-semibold text-sm text-slate-800 leading-tight">Top Nhiên liệu</h3>
                        </div>
                        <div className="flex-1 min-h-0 relative">
                            {chartData.top5.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.top5} layout="vertical" margin={{ left: 10, right: 30, top: 0, bottom: 0 }}>
                                        <XAxis type="number" hide />
                                        <YAxis
                                            type="category" dataKey="name"
                                            axisLine={false} tickLine={false}
                                            tick={{ fontSize: 9, fill: '#64748B' }}
                                            width={60}
                                            tickFormatter={(val) => val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()}
                                        />
                                        <RechartsTooltip
                                            formatter={(value) => [`${value?.toLocaleString()}`, "Lượng dùng"]}
                                            cursor={{ fill: '#F8FAFC' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', shadow: 'none', fontSize: '11px' }}
                                        />
                                        <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={12} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <EmptyState message="Chưa có dữ liệu" />}
                        </div>
                    </div>

                    {/* Trend Chart */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-amber-50 rounded-lg">
                                <TrendingUp className="size-4 text-amber-600" />
                            </div>
                            <h3 className="font-semibold text-sm text-slate-800 leading-tight">Xu hướng tiêu thụ</h3>
                        </div>
                        <div className="flex-1 min-h-0 relative">
                            {chartData.byTime.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.byTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false} tickLine={false}
                                            tick={{ fontSize: 10, fill: '#64748B' }}
                                        />
                                        <YAxis
                                            axisLine={false} tickLine={false}
                                            tick={{ fontSize: 10, fill: '#64748B' }}
                                        />
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} formatter={(value) => <span className="capitalize">{value}</span>} />
                                        {chartData.types.map((type, idx) => (
                                            <Bar key={type} dataKey={type} name={type} stackId="a" fill={COLORS[idx % COLORS.length]} barSize={32} />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <EmptyState message="Chưa có dữ liệu" />}
                        </div>
                    </div>

                </div>
            </div>

            {/* Bottom Section: Table */}
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden h-full">
                <div className="flex flex-wrap gap-3 justify-between items-center pb-4 pt-5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-slate-100 rounded-lg">
                            <Flame className="size-5 text-orange-600" />
                        </div>
                        <h3 className="font-semibold text-slate-800">Danh sách Sử dụng Chất đốt</h3>
                    </div>

                    <div className="flex flex-1 gap-2 justify-end items-center max-w-2xl">
                        {selectedRows.length > 0 && (
                            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                                <Trash className="size-4" />
                                Xóa {selectedRows.length} mục
                            </button>
                        )}
                        <ButtonFilter
                            onFilter={setSelectedFilters}
                            filterOptions={filterOptions}
                            fieldLabels={fieldLabels}
                            selectedFilters={selectedFilters}
                            setSelectedFilters={setSelectedFilters}
                        />
                        <div className="w-full max-w-xs">
                            <SearchBox
                                placeholder="Tìm cụm từ..."
                                onSearch={setSearchTerm}
                            />
                        </div>
                        <AddButton onClick={handleAdd} text={"Khai báo mới"} />
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    <div className="absolute inset-0 overflow-auto">
                        <ReuseableTable
                            columns={columns}
                            data={filteredData}
                            onSelectionChange={setSelectedRows}
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            loading={isFetching}
                            showActions={false}
                            showPagination={true}
                            rowsPerPage={20}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const EmptyState = ({ message }) => (
    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
        <SearchCheck className="size-8 opacity-50" />
        <span className="text-sm font-medium">{message}</span>
    </div>
);

// Admin-specific cell renderers
const ZoneCell = ({ zoneId }) => {
    let processedZoneId = zoneId;
    if (typeof zoneId === 'string' && zoneId.trim().startsWith('{')) {
        const match = zoneId.match(/'([^']*)'/);
        processedZoneId = match?.[1] || null;
    }
    const { data: zone, isLoading, isError } = useZone(processedZoneId);
    if (isLoading) return <span className="text-slate-400 italic text-xs">Đang tải...</span>;
    if (isError || !processedZoneId) return <span className="text-slate-400 text-xs">—</span>;
    const zoneName = zone?.zone?.zone_name || '—';
    return <span className="truncate block max-w-full text-center text-xs text-slate-600 font-medium" title={zoneName}>{zoneName}</span>;
};

const CompanyCell = ({ companyId }) => {
    const { data: company, isLoading, isError } = useCompany(companyId);
    if (isLoading) return <span className="text-slate-400 italic text-xs">Đang tải...</span>;
    if (isError) return <span className="text-slate-400 text-xs">—</span>;
    const companyName = company?.company?.company_name || '—';
    return <span className="truncate block max-w-full text-center text-xs text-slate-600 font-medium" title={companyName}>{companyName}</span>;
};

export default AdminCombustionResources;