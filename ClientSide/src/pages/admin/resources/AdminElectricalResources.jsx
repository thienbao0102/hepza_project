import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReuseableTable from "@components/common/ReuseableTable";
import { AddButton } from "@components/ui/Button";
import SearchBox from "@components/ui/SearchBox";
import { useNavigate } from "react-router-dom";
import { Zap, SearchCheck, Trash, TrendingUp, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import BillImageViewer from "@components/common/BillImageViewer";
import { useCompany } from "@features/company/hooks/useCompanyQueries";
import { useZone } from "@features/industrialzone/hooks/useZoneQueries";
import dayjs from "dayjs";
import { useSummaryDetail } from "@features/resources/hooks/useSummaryRecords";
import { useIsAuthenticated } from "@features/auth/hooks/useAuthQueries";
import { useHeader } from '@/components/common/Header/HeaderContext';
import ButtonFilter from "@components/ui/ButtonFilter";
import clsx from "clsx";
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend,
    BarChart, Bar
} from 'recharts';

function formatToVietnamTime(isoTimestamp) {
    if (!isoTimestamp) return "";
    const date = new Date(isoTimestamp);
    return dayjs(date).format("DD/MM/YYYY HH:mm");
}

const AdminElectricalResources = () => {
    const getSourceStyles = (source) => {
        const lower = (source || "").toLowerCase();
        if (lower.includes("lưới")) return "bg-orange-50 text-orange-700 border-orange-200";
        if (lower.includes("tái tạo")) return "bg-green-50 text-green-700 border-green-200";
        return "bg-gray-50 text-gray-700 border-gray-200";
    };

    const getPurposeStyles = (purpose) => {
        const lower = (purpose || "").toLowerCase();
        if (lower.includes("sản xuất") || lower.includes("production")) return "bg-blue-50 text-blue-700 border-blue-200";
        if (lower.includes("sinh hoạt") || lower.includes("domestic")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
        if (lower.includes("khác") || lower.includes("other")) return "bg-slate-50 text-slate-600 border-slate-200";
        return "bg-gray-50 text-gray-700 border-gray-200";
    };

    const columns = [
        {
            Header: "Tên",
            accessor: "purpose",
            render: (val) => {
                const styles = getPurposeStyles(val);
                return (
                    <span className={clsx(
                        "px-2.5 py-1 rounded-full text-xs font-medium border truncate block w-fit mx-auto capitalize shadow-sm",
                        styles
                    )} title={val}>
                        {val}
                    </span>
                );
            },
        },
        {
            Header: "Số lượng",
            accessor: "quantity",
            render: (val) => <span className="truncate block w-full text-center font-mono text-blue-600 font-medium" title={val?.toLocaleString()}>{val?.toLocaleString()}</span>,
        },
        {
            Header: "Đơn vị",
            accessor: "unit",
            render: (val) => <span className="truncate block w-full text-center capitalize text-slate-500 font-medium" title={val}>{val}</span>,
        },
        {
            Header: "Nguồn điện",
            accessor: "source",
            render: (val) => {
                const styles = getSourceStyles(val);
                return (
                    <span className={clsx(
                        "truncate block mx-auto px-3 py-1 rounded-full text-xs font-medium w-fit capitalize border shadow-sm",
                        styles
                    )} title={val}>
                        {val || "Khác"}
                    </span>
                );
            },
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
            render: (val) => <span className="truncate block w-full text-center text-slate-400 font-medium" title={formatToVietnamTime(val)}>{formatToVietnamTime(val)}</span>,
        },

    ];

    const [selectedRows, setSelectedRows] = useState([]);
    const { setHeaderConfig, setBreadcrumbItems, date } = useHeader();
    const navigate = useNavigate();

    const { user } = useIsAuthenticated();
    const userRole = user?.user?.role;
    const companyId = user?.user?.company_id;
    const { data: company = [] } = useCompany(companyId);
    const zoneId = company?.company?.zone_id;

    // Time, Filter & Search State
    const [selectedFilters, setSelectedFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({});
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSourceForPurpose, setSelectedSourceForPurpose] = useState("all");

    const handleSort = (field, order) => {
        setSortConfig({ [field]: order });
    };

    const handleSearch = useCallback((keyword) => {
        setSearchTerm(keyword);
    }, []);

    // Calculate periodKey range based on Header date selection
    const { periodKeyStart, periodKeyEnd } = useMemo(() => {
        const isAllYear = date?.startsWith("00/");
        if (isAllYear) {
            const year = Number(date.split("/")[1]);
            return { periodKeyStart: year * 100 + 1, periodKeyEnd: year * 100 + 12 };
        }
        const parsed = dayjs(date, "MM/YYYY", true);
        const pk = parsed.isValid() ? Number(parsed.format("YYYYMM")) : Number(dayjs().format("YYYYMM"));
        return { periodKeyStart: pk, periodKeyEnd: pk };
    }, [date]);

    const summaryParams = {
        role: userRole,
        periodKeyStart,
        periodKeyEnd,
        ...(userRole !== 'admin' && { companyId }),
        ...(userRole !== 'admin' && zoneId && { zoneId }),
        include: [3] // FuelResource for Electricity
    };

    const hasRequiredParams = userRole && (userRole === 'admin' || companyId || zoneId);
    const { data: summaryRecords = [], isFetching } = useSummaryDetail(summaryParams, {
        enabled: !!hasRequiredParams,
        keepPreviousData: false
    });
    const apiData = summaryRecords.FuelResource || [];

    // Flatten data: each API record becomes multiple rows (production, domestic, other)
    const rawData = useMemo(() => {
        const flattened = [];
        apiData.forEach(item => {
            const base = {
                _id: item._id,
                source: item.fuelName,
                unit: item.unit,
                createdAt: item.createdAt,
                periodKey: item.periodKey,
                zone_id: item.zone_id,
                company_id: item.company_id,
                billImage: item.billImage,
            };
            if (item.detail?.production > 0) {
                flattened.push({ ...base, _id: `${base._id}-prod`, purpose: "Sản xuất", quantity: item.detail.production });
            }
            if (item.detail?.domestic > 0) {
                flattened.push({ ...base, _id: `${base._id}-dom`, purpose: "Sinh hoạt", quantity: item.detail.domestic });
            }
            if (item.detail?.other > 0) {
                flattened.push({ ...base, _id: `${base._id}-other`, purpose: "Khác", quantity: item.detail.other });
            }
            if (!item.detail || (item.detail.production === 0 && item.detail.domestic === 0 && item.detail.other === 0)) {
                if (item.quantity > 0) {
                    flattened.push({ ...base, _id: `${base._id}-total`, purpose: "Tổng", quantity: item.quantity });
                }
            }
        });
        return flattened;
    }, [apiData]);

    // Generate filter options dynamically
    const filterOptions = useMemo(() => {
        const dataSafe = Array.isArray(rawData) ? rawData : [];
        const sources = [...new Set(dataSafe.map(item => item.source).filter(Boolean))];
        const purposes = [...new Set(dataSafe.map(item => item.purpose).filter(Boolean))];
        return {
            source: sources,
            purpose: purposes,
            date_range: []
        };
    }, [rawData]);

    const fieldLabels = {
        source: "Nguồn điện",
        purpose: "Mục đích",
        date_range: "Ngày tạo"
    };

    // Filter & Sort logic
    const filteredData = useMemo(() => {
        let result = rawData.filter(item => {
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                const matchesPurpose = (item.purpose || "").toLowerCase().includes(search);
                const matchesSource = (item.source || "").toLowerCase().includes(search);
                if (!matchesPurpose && !matchesSource) return false;
            }
            if (selectedFilters.source?.length > 0) {
                if (!selectedFilters.source.includes(item.source)) return false;
            }
            if (selectedFilters.purpose?.length > 0) {
                if (!selectedFilters.purpose.includes(item.purpose)) return false;
            }
            if (selectedFilters.date_range?.from && selectedFilters.date_range?.to) {
                const itemDate = dayjs(item.createdAt);
                const from = dayjs(selectedFilters.date_range.from).startOf('day');
                const to = dayjs(selectedFilters.date_range.to).endOf('day');
                if (itemDate.isBefore(from) || itemDate.isAfter(to)) return false;
            }
            return true;
        });

        const sortField = Object.keys(sortConfig)[0];
        const sortOrder = sortConfig[sortField];
        if (sortField && sortOrder !== 0) {
            result.sort((a, b) => {
                let valA = a[sortField];
                let valB = b[sortField];
                if (sortField === 'quantity') {
                    valA = Number(valA) || 0;
                    valB = Number(valB) || 0;
                } else {
                    valA = (valA || "").toString().toLowerCase();
                    valB = (valB || "").toString().toLowerCase();
                }
                if (valA < valB) return -1 * sortOrder;
                if (valA > valB) return 1 * sortOrder;
                return 0;
            });
        }
        return result;
    }, [rawData, selectedFilters, sortConfig, searchTerm]);

    // --- Data Processing for Charts ---
    const chartData = useMemo(() => {
        const sourceMap = new Map();
        const timeMap = new Map();
        const purposeMap = new Map();
        const purposeBySource = new Map();

        rawData.forEach(item => {
            const source = item.source || "Khác";
            const qty = Number(item.quantity) || 0;
            const purpose = item.purpose || "Khác";

            sourceMap.set(source, (sourceMap.get(source) || 0) + qty);
            purposeMap.set(purpose, (purposeMap.get(purpose) || 0) + qty);

            if (!purposeBySource.has(source)) {
                purposeBySource.set(source, new Map());
            }
            const srcPurposeMap = purposeBySource.get(source);
            srcPurposeMap.set(purpose, (srcPurposeMap.get(purpose) || 0) + qty);
        });

        apiData.forEach(item => {
            const qty = Number(item.quantity) || 0;
            const date = dayjs(item.createdAt);
            const monthKey = date.format("MM/YYYY");
            const timestamp = date.valueOf();

            if (!timeMap.has(monthKey)) {
                timeMap.set(monthKey, { name: monthKey, value: 0, timestamp });
            }
            timeMap.get(monthKey).value += qty;
        });

        const byType = Array.from(sourceMap.entries()).map(([name, value]) => ({ name, value }));
        const byTime = Array.from(timeMap.values())
            .sort((a, b) => a.timestamp - b.timestamp)
            .map(({ name, value }) => ({ name, value }));
        const byPurpose = Array.from(purposeMap.entries()).map(([name, value]) => ({ name, value }));

        const byPurposeGrouped = {};
        purposeBySource.forEach((pMap, srcKey) => {
            byPurposeGrouped[srcKey] = Array.from(pMap.entries()).map(([name, value]) => ({ name, value }));
        });

        return { byType, byTime, byPurpose, byPurposeGrouped, sources: Array.from(sourceMap.keys()) };
    }, [rawData, apiData]);

    const purposeChartData = useMemo(() => {
        if (selectedSourceForPurpose === "all") {
            return chartData.byPurpose;
        }
        return chartData.byPurposeGrouped[selectedSourceForPurpose] || [];
    }, [chartData, selectedSourceForPurpose]);

    // --- Effects ---
    useEffect(() => {
        setHeaderConfig({
            title: "Quản lý Điện năng",
            description: "Thống kê và quản lý điện năng tiêu thụ",
            showWeather: true,
            showDatePicker: true
        })
        setBreadcrumbItems([
            { key: '/resources', title: "Quản lý tài nguyên" },
            { key: '/resources/electricalResources', title: "Quản lý Điện" },
        ])
    }, [setHeaderConfig, setBreadcrumbItems]);

    const handleAdd = () => navigate("/resources/resource-form");
    const COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#F43F5E'];

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
            {/* Top Section: Analytics */}
            <div className="h-[28%] shrink-0">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">

                    {/* Chart 1: Distribution */}
                    <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-blue-50 rounded-lg">
                                <PieChartIcon className="size-4 text-blue-600" />
                            </div>
                            <h3 className="font-semibold text-sm text-slate-800 leading-tight">Cơ cấu nguồn</h3>
                        </div>
                        <div className="flex-1 min-h-0 relative">
                            {chartData.byType.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData.byType}
                                            cx="40%"
                                            cy="50%"
                                            innerRadius={35}
                                            outerRadius={55}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {chartData.byType.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            formatter={(value, name) => [`${value.toLocaleString()} kWh`, <span className="capitalize">{name}</span>]}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Legend
                                            layout="vertical"
                                            verticalAlign="middle"
                                            align="right"
                                            iconType="circle"
                                            iconSize={6}
                                            formatter={(value) => <span className="text-[10px] text-slate-600 font-medium ml-1 truncate max-w-[80px] block capitalize" title={value}>{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState message="Chưa có dữ liệu" />
                            )}
                        </div>
                    </div>

                    {/* Chart 2: Usage by Purpose */}
                    <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-green-50 rounded-lg">
                                    <BarChart3 className="size-4 text-green-600" />
                                </div>
                                <h3 className="font-semibold text-sm text-slate-800 leading-tight">Mục đích sử dụng</h3>
                            </div>
                            {/* Source Toggle */}
                            <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg">
                                <button
                                    onClick={() => setSelectedSourceForPurpose("all")}
                                    className={clsx(
                                        "px-2 py-0.5 text-[10px] font-medium rounded-md transition-all",
                                        selectedSourceForPurpose === "all"
                                            ? "bg-white text-slate-800 shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Tất cả
                                </button>
                                {chartData.sources.map(src => (
                                    <button
                                        key={src}
                                        onClick={() => setSelectedSourceForPurpose(src)}
                                        className={clsx(
                                            "px-2 py-0.5 text-[10px] font-medium rounded-md transition-all capitalize",
                                            selectedSourceForPurpose === src
                                                ? "bg-white text-slate-800 shadow-sm"
                                                : "text-slate-500 hover:text-slate-700"
                                        )}
                                    >
                                        {src.replace("điện ", "")}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 min-h-0 relative">
                            {purposeChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={purposeChartData} layout="vertical" margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748B' }} width={60} axisLine={false} tickLine={false} />
                                        <RechartsTooltip
                                            formatter={(value) => [`${value.toLocaleString()} kWh`, "Số lượng"]}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} barSize={12} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState message="Chưa có dữ liệu" />
                            )}
                        </div>
                    </div>

                    {/* Chart 3: Trend */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-orange-50 rounded-lg">
                                <TrendingUp className="size-4 text-orange-600" />
                            </div>
                            <h3 className="font-semibold text-sm text-slate-800 leading-tight">Xu hướng tiêu thụ (kWh)</h3>
                        </div>
                        <div className="flex-1 min-h-0 w-full">
                            {chartData.byTime.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData.byTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorElec" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748B', fontSize: 11 }}
                                            dy={5}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748B', fontSize: 11 }}
                                            tickFormatter={(val) => val >= 1000 ? `${val / 1000}k` : val}
                                        />
                                        <RechartsTooltip
                                            formatter={(value) => [`${value.toLocaleString()} kWh`, "Tổng tiêu thụ"]}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorElec)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState message="Chưa có dữ liệu xu hướng" />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Table */}
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden h-full">
                <div className="flex flex-wrap gap-3 justify-between items-center pb-4 pt-5 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-slate-100 rounded-lg">
                            <Zap className="size-5 text-slate-600" />
                        </div>
                        <h3 className="font-semibold text-slate-800">Danh sách Sử dụng Điện</h3>
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
                                placeholder="Tìm kiếm nguồn điện..."
                                onSearch={handleSearch}
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
                            rowsPerPage={20}
                            showActions={false}
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            onSelectionChange={setSelectedRows}
                            loading={isFetching}
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

export default AdminElectricalResources;