import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReuseableTable from "@components/common/ReuseableTable";
import { AddButton } from "@components/ui/Button";
import SearchBox from "@components/ui/SearchBox";
import { useNavigate } from "react-router-dom";
import { Droplet, SearchCheck, Trash, TrendingUp, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import BillImageViewer from "@components/common/BillImageViewer";
import { useCompany } from "@features/company/hooks/useCompanyQueries";
import { useZone } from "@features/industrialzone/hooks/useZoneQueries";
import dayjs from "dayjs";
import { useSummaryDetail } from "@features/resources/hooks/useSummaryRecords";
import { useIsAuthenticated } from "@features/auth/hooks/useAuthQueries";
import { useHeader } from '@/components/common/Header/HeaderContext';
import ButtonFilter from "@components/ui/ButtonFilter";
import clsx from "clsx";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, BarChart, Bar } from 'recharts';
import { buildManagerScopedTitle, resolveManagerZoneLabel } from "@/utils/managerScope";

const ManagerWaterResources = () => {
    const getSourceStyles = (source) => { const l = (source || "").toLowerCase(); if (l.includes("cấp") || l.includes("tap")) return "bg-blue-50 text-blue-700 border-blue-200"; if (l.includes("mưa") || l.includes("rain")) return "bg-cyan-50 text-cyan-700 border-cyan-200"; if (l.includes("giếng")) return "bg-amber-50 text-amber-700 border-amber-200"; if (l.includes("tái")) return "bg-green-50 text-green-700 border-green-200"; return "bg-gray-50 text-gray-700 border-gray-200"; };
    const getPurposeStyles = (purpose) => { const l = (purpose || "").toLowerCase(); if (l.includes("sản xuất")) return "bg-blue-50 text-blue-700 border-blue-200"; if (l.includes("sinh hoạt")) return "bg-emerald-50 text-emerald-700 border-emerald-200"; if (l.includes("tưới")) return "bg-lime-50 text-lime-700 border-lime-200"; return "bg-gray-50 text-gray-700 border-gray-200"; };

    const columns = [
        { Header: "Tên", accessor: "purpose", render: (val) => <span className={clsx("px-2.5 py-1 rounded-full text-xs font-medium border truncate block w-fit mx-auto capitalize shadow-sm", getPurposeStyles(val))} title={val}>{val}</span> },
        { Header: "Số lượng", accessor: "quantity", render: (val) => <span className="truncate block w-full text-center font-mono text-blue-600 font-medium">{val?.toLocaleString()}</span> },
        { Header: "Đơn vị", accessor: "unit", render: (val) => <span className="truncate block w-full text-center capitalize text-slate-500 font-medium">{val}</span> },
        { Header: "Nguồn nước", accessor: "source", render: (val) => <span className={clsx("truncate block mx-auto px-3 py-1 rounded-full text-xs font-medium w-fit capitalize border shadow-sm", getSourceStyles(val))} title={val}>{val || "Khác"}</span> },
        { Header: "KCX/KCN", accessor: "zone_id", render: (val) => <ZoneCell zoneId={val} /> },
        { Header: "Doanh nghiệp", accessor: "company_id", render: (val) => <CompanyCell companyId={val} /> },
        { Header: "Ngày tạo", accessor: "createdAt", render: (val) => <span className="truncate block w-full text-center text-slate-400 font-medium">{dayjs(val).format("DD/MM/YYYY HH:mm")}</span> }
    ];

    const [selectedRows, setSelectedRows] = useState([]);
    const { setHeaderConfig, setBreadcrumbItems, date } = useHeader();
    const navigate = useNavigate();
    const { user } = useIsAuthenticated();
    const userRole = user?.user?.role;
    const companyId = user?.user?.company_id;
    const { data: company = [] } = useCompany(companyId);
    const zoneId = company?.company?.zone_id;
    const managerZoneLabel = resolveManagerZoneLabel({
        zoneName: company?.company?.zone_name || user?.user?.zone_name,
        zoneId: zoneId || user?.user?.zone_id,
    });
    const [selectedFilters, setSelectedFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({});
    const [searchTerm, setSearchTerm] = useState("");

    const { periodKeyStart, periodKeyEnd } = useMemo(() => { const isAllYear = date?.startsWith("00/"); if (isAllYear) { const y = Number(date.split("/")[1]); return { periodKeyStart: y * 100 + 1, periodKeyEnd: y * 100 + 12 }; } const p = dayjs(date, "MM/YYYY", true); const pk = p.isValid() ? Number(p.format("YYYYMM")) : Number(dayjs().format("YYYYMM")); return { periodKeyStart: pk, periodKeyEnd: pk }; }, [date]);

    const summaryParams = { role: userRole, periodKeyStart, periodKeyEnd, ...(userRole !== 'admin' && { companyId }), ...(userRole !== 'admin' && zoneId && { zoneId }), include: [4] };
    const hasRequiredParams = userRole && (userRole === 'admin' || companyId || zoneId);
    const { data: summaryRecords = [], isFetching } = useSummaryDetail(summaryParams, { enabled: !!hasRequiredParams, keepPreviousData: false });
    const apiData = summaryRecords.FuelResource || [];

    const rawData = useMemo(() => {
        const flattened = [];
        apiData.forEach(item => { const base = { _id: item._id, source: item.fuelName, unit: item.unit || "m³", createdAt: item.createdAt, zone_id: item.zone_id, company_id: item.company_id, billImage: item.billImage }; const qty = Number(item.quantity) || 0; if (qty > 0) flattened.push({ ...base, purpose: item.fuelName || "Nước", quantity: qty }); });
        return flattened;
    }, [apiData]);

    const filterOptions = useMemo(() => ({ source: [...new Set(rawData.map(i => i.source).filter(Boolean))], date_range: [] }), [rawData]);
    const fieldLabels = { source: "Nguồn nước", date_range: "Ngày tạo" };

    const filteredData = useMemo(() => {
        let result = rawData.filter(item => { if (searchTerm) { const s = searchTerm.toLowerCase(); if (!(item.purpose || "").toLowerCase().includes(s) && !(item.source || "").toLowerCase().includes(s)) return false; } if (selectedFilters.source?.length > 0 && !selectedFilters.source.includes(item.source)) return false; return true; });
        const sf = Object.keys(sortConfig)[0]; const so = sortConfig[sf];
        if (sf && so !== 0) result.sort((a, b) => { let vA = sf === 'quantity' ? Number(a[sf]) || 0 : (a[sf] || "").toString().toLowerCase(); let vB = sf === 'quantity' ? Number(b[sf]) || 0 : (b[sf] || "").toString().toLowerCase(); return vA < vB ? -1 * so : vA > vB ? 1 * so : 0; });
        return result;
    }, [rawData, selectedFilters, sortConfig, searchTerm]);

    const chartData = useMemo(() => {
        const sourceMap = new Map(); const timeMap = new Map();
        rawData.forEach(item => { const src = item.source || "Khác"; sourceMap.set(src, (sourceMap.get(src) || 0) + (Number(item.quantity) || 0)); });
        apiData.forEach(item => { const d = dayjs(item.createdAt); const mk = d.format("MM/YYYY"); if (!timeMap.has(mk)) timeMap.set(mk, { name: mk, value: 0, timestamp: d.valueOf() }); timeMap.get(mk).value += (Number(item.quantity) || 0); });
        return { byType: Array.from(sourceMap.entries()).map(([n, v]) => ({ name: n, value: v })), byTime: Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp).map(({ name, value }) => ({ name, value })), top5: Array.from(sourceMap.entries()).map(([n, v]) => ({ name: n, value: v })).sort((a, b) => b.value - a.value).slice(0, 5), sources: Array.from(sourceMap.keys()) };
    }, [rawData, apiData]);

    useEffect(() => {
        setHeaderConfig({ title: "Quản lý Nước", description: "Thống kê và quản lý nguồn nước sử dụng", showWeather: true, showDatePicker: true });
        setBreadcrumbItems([{ key: '/manager/resources', title: "Quản lý tài nguyên" }, { key: '/manager/resources/waterResources', title: "Quản lý Nước" }]);
    }, [setHeaderConfig, setBreadcrumbItems]);

    useEffect(() => {
        setHeaderConfig({
            title: buildManagerScopedTitle("Nước", managerZoneLabel),
            description: `Theo dõi nguồn nước sử dụng của doanh nghiệp thuộc ${managerZoneLabel}.`,
            showWeather: true,
            showDatePicker: true
        });
        setBreadcrumbItems([
            { key: '/manager/resources', title: "Tài nguyên" },
            { key: '/manager/resources/waterResources', title: `Nước | ${managerZoneLabel}` }
        ]);
    }, [managerZoneLabel, setBreadcrumbItems, setHeaderConfig]);

    const COLORS = ['#06B6D4', '#3B82F6', '#10B981', '#8B5CF6', '#F43F5E'];

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
            <div className="h-[28%] shrink-0"><div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
                {/* Pie */}
                <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 bg-cyan-50 rounded-lg"><PieChartIcon className="size-4 text-cyan-600" /></div><h3 className="font-semibold text-sm text-slate-800 leading-tight">Cơ cấu nguồn nước</h3></div><div className="flex-1 min-h-0 relative">{chartData.byType.length > 0 ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData.byType} cx="40%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value">{chartData.byType.map((e, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />)}</Pie><RechartsTooltip formatter={(v, n) => [`${v.toLocaleString()} m³`, <span className="capitalize">{n}</span>]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} /><Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" iconSize={6} formatter={(v) => <span className="text-[10px] text-slate-600 font-medium ml-1 truncate max-w-[80px] block capitalize">{v}</span>} /></PieChart></ResponsiveContainer> : <EmptyState message="Chưa có dữ liệu" />}</div></div>
                {/* Top Sources */}
                <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 bg-blue-50 rounded-lg"><BarChart3 className="size-4 text-blue-600" /></div><h3 className="font-semibold text-sm text-slate-800 leading-tight">Top nguồn nước</h3></div><div className="flex-1 min-h-0 relative">{chartData.top5.length > 0 ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.top5} layout="vertical" margin={{ left: -10, right: 10, top: 10, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" /><XAxis type="number" hide /><YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748B' }} width={60} axisLine={false} tickLine={false} /><RechartsTooltip formatter={(v) => [`${v.toLocaleString()} m³`, "Số lượng"]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} /><Bar dataKey="value" fill="#06B6D4" radius={[0, 4, 4, 0]} barSize={12} /></BarChart></ResponsiveContainer> : <EmptyState message="Chưa có dữ liệu" />}</div></div>
                {/* Trend */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 bg-teal-50 rounded-lg"><TrendingUp className="size-4 text-teal-600" /></div><h3 className="font-semibold text-sm text-slate-800 leading-tight">Xu hướng tiêu thụ (m³)</h3></div><div className="flex-1 min-h-0 w-full">{chartData.byTime.length > 0 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData.byTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}><defs><linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} /><stop offset="95%" stopColor="#06B6D4" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} dy={5} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v} /><RechartsTooltip formatter={(v) => [`${v.toLocaleString()} m³`, "Tổng tiêu thụ"]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} /><Area type="monotone" dataKey="value" stroke="#06B6D4" strokeWidth={2} fillOpacity={1} fill="url(#colorWater)" /></AreaChart></ResponsiveContainer> : <EmptyState message="Chưa có dữ liệu xu hướng" />}</div></div>
            </div></div>
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden h-full">
                <div className="flex flex-wrap gap-3 justify-between items-center pb-4 pt-5 border-b border-slate-100"><div className="flex items-center gap-2"><div className="p-2 bg-slate-100 rounded-lg"><Droplet className="size-5 text-cyan-600" /></div><h3 className="font-semibold text-slate-800">Danh sách Sử dụng Nước</h3></div><div className="flex flex-1 gap-2 justify-end items-center max-w-2xl">{selectedRows.length > 0 && <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"><Trash className="size-4" />Xóa {selectedRows.length} mục</button>}<ButtonFilter onFilter={setSelectedFilters} filterOptions={filterOptions} fieldLabels={fieldLabels} selectedFilters={selectedFilters} setSelectedFilters={setSelectedFilters} /><div className="w-full max-w-xs"><SearchBox placeholder="Tìm kiếm nguồn nước..." onSearch={useCallback((k) => setSearchTerm(k), [])} /></div>{userRole === 'admin' && <AddButton onClick={() => navigate("/manager/resources/resource-form")} text={"Khai báo mới"} />}</div></div>
                <div className="flex-1 overflow-hidden relative"><div className="absolute inset-0 overflow-auto"><ReuseableTable columns={columns} data={filteredData} rowsPerPage={20} showActions={false} sortConfig={sortConfig} onSort={(f, o) => setSortConfig({ [f]: o })} onSelectionChange={setSelectedRows} loading={isFetching} /></div></div>
            </div>
        </div>
    );
};

const EmptyState = ({ message }) => (<div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2"><SearchCheck className="size-8 opacity-50" /><span className="text-sm font-medium">{message}</span></div>);
const ZoneCell = ({ zoneId }) => { let id = zoneId; if (typeof zoneId === 'string' && zoneId.trim().startsWith('{')) { const m = zoneId.match(/'([^']*)'/); id = m?.[1] || null; } const { data: zone, isLoading, isError } = useZone(id); if (isLoading) return <span className="text-slate-400 italic text-xs">Đang tải...</span>; if (isError || !id) return <span className="text-slate-400 text-xs">—</span>; return <span className="truncate block max-w-full text-center text-xs text-slate-600 font-medium" title={zone?.zone?.zone_name || '—'}>{zone?.zone?.zone_name || '—'}</span>; };
const CompanyCell = ({ companyId }) => { const { data: company, isLoading, isError } = useCompany(companyId); if (isLoading) return <span className="text-slate-400 italic text-xs">Đang tải...</span>; if (isError) return <span className="text-slate-400 text-xs">—</span>; return <span className="truncate block max-w-full text-center text-xs text-slate-600 font-medium" title={company?.company?.company_name || '—'}>{company?.company?.company_name || '—'}</span>; };

export default ManagerWaterResources;
