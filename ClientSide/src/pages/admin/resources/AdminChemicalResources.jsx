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
    SearchCheck, Trash, FlaskConical,
    BarChart3, TrendingUp
} from "lucide-react";

import ReuseableTable from "@components/common/ReuseableTable";
import { AddButton } from "@components/ui/Button";
import SearchBox from "@components/ui/SearchBox";
import ButtonFilter from "@components/ui/ButtonFilter";

import { useHeader } from '@/components/common/Header/HeaderContext';
import { useSummaryDetail } from "@/features/resources/hooks/useSummaryRecords";
import { useIsAuthenticated } from "@/features/auth/hooks/useAuthQueries";
import { useCompany } from "@/features/company/hooks/useCompanyQueries";
import { useZone } from "@features/industrialzone/hooks/useZoneQueries";

const COLORS = ['#8B5CF6', '#10B981', '#06B6D4', '#F43F5E', '#F59E0B', '#6366F1'];

const AdminChemicalResources = () => {
    const getCategoryStyles = (cat) => {
        const lower = (cat || "").toLowerCase();
        if (lower.includes("nguy hiểm")) return "bg-red-50 text-red-700 border-red-200";
        if (lower.includes("axit")) return "bg-orange-50 text-orange-700 border-orange-200";
        if (lower.includes("bazơ") || lower.includes("kiềm")) return "bg-blue-50 text-blue-700 border-blue-200";
        if (lower.includes("muối")) return "bg-slate-50 text-slate-700 border-slate-200";
        if (lower.includes("dung môi")) return "bg-purple-50 text-purple-700 border-purple-200";
        if (lower.includes("khí") || lower.includes("bay hơi")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
        if (lower.includes("phụ gia")) return "bg-cyan-50 text-cyan-700 border-cyan-200";
        if (lower.includes("khử")) return "bg-rose-50 text-rose-700 border-rose-200";
        return "bg-slate-50 text-slate-700 border-slate-200";
    };

    const navigate = useNavigate();
    const { user } = useIsAuthenticated();
    const userRole = user?.user?.role;
    const companyId = user?.user?.company_id;
    const { setHeaderConfig, setBreadcrumbItems, date } = useHeader();

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedFilters, setSelectedFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({});
    const [selectedRows, setSelectedRows] = useState([]);

    // Period identification logic
    const isAllYear = date?.startsWith("00/");
    const selectedYear = isAllYear ? Number(date.split("/")[1]) : (dayjs(date, "MM/YYYY", true).isValid() ? dayjs(date, "MM/YYYY").year() : dayjs().year());

    let periodKeyStart, periodKeyEnd;
    if (isAllYear) {
        periodKeyStart = selectedYear * 100 + 1;
        periodKeyEnd = selectedYear * 100 + 12;
    } else {
        const d = dayjs(date, "MM/YYYY", true).isValid() ? dayjs(date, "MM/YYYY") : dayjs();
        const p = Number(d.format("YYYYMM"));
        periodKeyStart = p;
        periodKeyEnd = p;
    }

    const { data: company = [] } = useCompany(companyId);
    const zoneId = company?.company?.zone_id;

    const summaryParams = {
        role: userRole,
        periodKeyStart,
        periodKeyEnd,
        ...(userRole !== 'admin' && { companyId }),
        ...(userRole !== 'admin' && zoneId && { zoneId }),
        include: [2] // InputResource for Chemicals
    };

    const hasRequiredParams = userRole && (userRole === 'admin' || companyId || zoneId);
    const { data: summaryRecords = [], isFetching } = useSummaryDetail(summaryParams, { enabled: !!hasRequiredParams });
    const apiData = summaryRecords.InputResource || [];

    // Table data
    const rawData = useMemo(() => {
        const dataSafe = Array.isArray(apiData) ? apiData : [];
        return dataSafe.map(item => ({
            ...item,
            sub_group: item.sub_group || (item.unit?.toLowerCase().includes('kg') ? "Rắn" : item.unit?.toLowerCase().includes('l') ? "Lỏng" : "Khí")
        }));
    }, [apiData]);

    // Filter & Sort logic
    const filteredData = useMemo(() => {
        let result = rawData.filter(item => {
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                const matchesName = (item.name || "").toLowerCase().includes(search);
                const matchesCategory = (item.sub_group || "").toLowerCase().includes(search);
                if (!matchesName && !matchesCategory) return false;
            }
            if (selectedFilters.sub_group?.length > 0) {
                if (!selectedFilters.sub_group.includes(item.sub_group)) return false;
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

    // Generate filter options
    const filterOptions = useMemo(() => {
        const dataSafe = Array.isArray(rawData) ? rawData : [];
        const categories = [...new Set(dataSafe.map(item => item.sub_group).filter(Boolean))];
        return {
            sub_group: categories,
            date_range: []
        };
    }, [rawData]);

    const fieldLabels = {
        sub_group: "Phân loại",
        date_range: "Ngày tạo"
    };

    // Chart Data Processing
    const chartData = useMemo(() => {
        const typeMap = new Map();
        const timeMap = new Map();
        const chemicalUsageMap = new Map();
        const allTypes = new Set();

        rawData.forEach(item => {
            const type = item.sub_group || "Khác";
            const qty = Number(item.quantity) || 0;
            const name = item.name || "N/A";

            typeMap.set(type, (typeMap.get(type) || 0) + qty);
            chemicalUsageMap.set(name, (chemicalUsageMap.get(name) || 0) + qty);

            const dateObj = dayjs(item.createdAt);
            const monthKey = dateObj.format("MM/YYYY");
            const timestamp = dateObj.valueOf();

            if (!timeMap.has(monthKey)) {
                timeMap.set(monthKey, { name: monthKey, total: 0, timestamp });
            }
            const record = timeMap.get(monthKey);
            record.total += qty;
            record[type] = (record[type] || 0) + qty;
            allTypes.add(type);
        });

        const byType = Array.from(typeMap.entries()).map(([name, value]) => ({ name, value }));
        const byTime = Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);
        const top5Chemicals = Array.from(chemicalUsageMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        return {
            byType,
            byTime,
            top5: top5Chemicals,
            types: Array.from(allTypes)
        };
    }, [rawData]);

    useEffect(() => {
        setHeaderConfig({
            title: "Quản lý Hóa chất",
            description: "Thống kê và quản lý hóa chất sử dụng",
            showWeather: true,
            showDatePicker: true
        })
        setBreadcrumbItems([
            { key: '/resources', title: "Quản lý tài nguyên" },
            { key: '/resources/chemicalResources', title: "Quản lý Hóa chất" },
        ])
    }, [setHeaderConfig, setBreadcrumbItems]);

    const handleAdd = () => navigate("/resources/resource-form");

    const columns = [
        {
            Header: "Tên Hóa chất",
            accessor: "name",
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
            accessor: "quantity",
            render: (val) => <span className="truncate block w-full text-center font-mono text-blue-600 font-medium">{val?.toLocaleString()}</span>,
            sortable: true
        },
        {
            Header: "Đơn vị",
            accessor: "unit",
            render: (val) => <span className="truncate block w-full text-center capitalize text-slate-500 font-medium">{val}</span>
        },
        {
            Header: "Phân loại",
            accessor: "sub_group",
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
            render: (val) => <span className="text-slate-400 text-sm tabular-nums">{dayjs(val).format("DD/MM/YYYY")}</span>,
            sortable: true
        }
    ];

    const handleSort = (field, order) => {
        setSortConfig({ [field]: order });
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
            {/* Charts Section */}
            <div className="h-[28%] shrink-0">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 lg:gap-3 h-full">

                    {/* Donut Chart: Distribution */}
                    <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-indigo-50 rounded-lg">
                                <SearchCheck className="size-4 text-indigo-600" />
                            </div>
                            <h3 className="font-semibold text-sm text-slate-800 leading-tight">Cơ cấu sử dụng</h3>
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

                    {/* Bar Chart: Top Chemicals */}
                    <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-emerald-50 rounded-lg">
                                <BarChart3 className="size-4 text-emerald-600" />
                            </div>
                            <h3 className="font-semibold text-sm text-slate-800 leading-tight">Top Hóa chất</h3>
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
                                        <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} barSize={12} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <EmptyState message="Chưa có dữ liệu" />}
                        </div>
                    </div>

                    {/* Stacked Bar: Trend */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-blue-50 rounded-lg">
                                <TrendingUp className="size-4 text-blue-600" />
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
                                            <Bar key={type} dataKey={type} name={type} stackId="a" fill={COLORS[idx % COLORS.length]} radius={idx === chartData.types.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} barSize={32} />
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
                            <FlaskConical className="size-5 text-indigo-600" />
                        </div>
                        <h3 className="font-semibold text-slate-800">Danh sách Sử dụng Hóa chất</h3>
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
                                placeholder="Tìm tên hóa chất..."
                                onSearch={setSearchTerm}
                            />
                        </div>
                        <AddButton onClick={handleAdd} text={"Khai báo Hóa chất"} />
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

export default AdminChemicalResources;