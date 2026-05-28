import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReuseableTable from "@components/common/ReuseableTable";
import { AddButton } from "@components/ui/Button";
import SearchBox from "@components/ui/SearchBox";
import { useNavigate } from "react-router-dom";
import { Trash, SearchCheck, TrendingUp, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
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

const ManagerSolidWastes = () => {
    const getGroupStyles = (group) => { const l = (group || "").toLowerCase(); if (l.includes("sinh hoạt") || l.includes("do")) return "bg-blue-50 text-blue-700 border-blue-200"; if (l.includes("công nghiệp") || l.includes("ind")) return "bg-green-50 text-green-700 border-green-200"; if (l.includes("nguy hại") || l.includes("ha")) return "bg-red-50 text-red-700 border-red-200"; return "bg-gray-50 text-gray-700 border-gray-200"; };

    const columns = [
        { Header: "Tên rác thải", accessor: "name", render: (val) => <span className="truncate block w-full text-center font-medium text-slate-700 capitalize">{val}</span> },
        { Header: "Khối lượng", accessor: "quantity", render: (val) => <span className="truncate block w-full text-center font-mono text-blue-600 font-medium">{val?.toLocaleString()}</span> },
        { Header: "Đơn vị", accessor: "unit", render: (val) => <span className="truncate block w-full text-center capitalize text-slate-500 font-medium">{val || "Tấn"}</span> },
        { Header: "Loại rác", accessor: "groupName", render: (val) => <span className={clsx("px-2.5 py-1 rounded-full text-xs font-medium border truncate block w-fit mx-auto capitalize shadow-sm", getGroupStyles(val))}>{val}</span> },
        { Header: "KCX/KCN", accessor: "zone_id", render: (val) => <ZoneCell zoneId={val} /> },
        { Header: "Doanh nghiệp", accessor: "company_id", render: (val) => <CompanyCell companyId={val} /> },
        { Header: "Ngày ghi nhận", accessor: "createdAt", render: (val) => <span className="truncate block w-full text-center text-slate-400 font-medium">{dayjs(val).format("DD/MM/YYYY HH:mm")}</span> },
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
    const [selectedGroupForChart, setSelectedGroupForChart] = useState("all");

    const { periodKeyStart, periodKeyEnd } = useMemo(() => { const isAllYear = date?.startsWith("00/"); if (isAllYear) { const y = Number(date.split("/")[1]); return { periodKeyStart: y * 100 + 1, periodKeyEnd: y * 100 + 12 }; } const p = dayjs(date, "MM/YYYY", true); const pk = p.isValid() ? Number(p.format("YYYYMM")) : Number(dayjs().format("YYYYMM")); return { periodKeyStart: pk, periodKeyEnd: pk }; }, [date]);

    const summaryParams = { role: userRole, periodKeyStart, periodKeyEnd, ...(userRole !== 'admin' && { companyId }), ...(userRole !== 'admin' && zoneId && { zoneId }), include: [6] };
    const hasRequiredParams = userRole && (userRole === 'admin' || companyId || zoneId);
    const { data: summaryRecords = [], isFetching } = useSummaryDetail(summaryParams, { enabled: !!hasRequiredParams, keepPreviousData: false });
    const apiData = summaryRecords.WasteResource || summaryRecords.waste || [];

    const normalizeGroupName = (group) => { const g = (group || '').toLowerCase(); if (g.includes('do') || g.includes('sinh hoạt')) return "Sinh hoạt"; if (g.includes('ind') || g.includes('công nghiệp')) return "Công nghiệp"; if (g.includes('ha') || g.includes('nguy hại')) return "Nguy hại"; return group || "Khác"; };

    const solidWasteItems = useMemo(() => { const keys = ['do', 'ind', 'ha', 'chất thải sinh hoạt', 'chất thải công nghiệp', 'chất thải nguy hại']; return apiData.filter(i => { const sg = (i.main_group || i.subGroup || i.sub_group || '').toLowerCase(); return keys.includes(sg); }); }, [apiData]);
    const rawData = useMemo(() => solidWasteItems.map(i => ({ ...i, name: i.wasteName || i.name || "Chưa đặt tên", groupName: normalizeGroupName(i.main_group || i.subGroup || i.sub_group), _id: i._id || i.id || `t-${Math.random()}` })), [solidWasteItems]);

    const filterOptions = useMemo(() => ({ groupName: [...new Set(rawData.map(i => i.groupName).filter(Boolean))], date_range: [] }), [rawData]);
    const fieldLabels = { groupName: "Loại rác", date_range: "Ngày tạo" };

    const filteredData = useMemo(() => {
        let result = rawData.filter(i => { if (searchTerm) { const s = searchTerm.toLowerCase(); if (!(i.name || "").toLowerCase().includes(s) && !(i.groupName || "").toLowerCase().includes(s)) return false; } if (selectedFilters.groupName?.length > 0 && !selectedFilters.groupName.includes(i.groupName)) return false; return true; });
        const sf = Object.keys(sortConfig)[0]; const so = sortConfig[sf];
        if (sf && so !== 0) result.sort((a, b) => { let vA = sf === 'quantity' ? Number(a[sf]) || 0 : (a[sf] || "").toString().toLowerCase(); let vB = sf === 'quantity' ? Number(b[sf]) || 0 : (b[sf] || "").toString().toLowerCase(); return vA < vB ? -1 * so : vA > vB ? 1 * so : 0; });
        return result;
    }, [rawData, selectedFilters, sortConfig, searchTerm]);

    const chartData = useMemo(() => {
        const groupMap = new Map(); const timeMap = new Map(); const nameMap = new Map(); const nameByGroup = new Map();
        rawData.forEach(i => { const g = i.groupName || "Khác"; const q = Number(i.quantity) || 0; const n = i.name || "Khác"; groupMap.set(g, (groupMap.get(g) || 0) + q); nameMap.set(n, (nameMap.get(n) || 0) + q); if (!nameByGroup.has(g)) nameByGroup.set(g, new Map()); nameByGroup.get(g).set(n, (nameByGroup.get(g).get(n) || 0) + q); const d = dayjs(i.createdAt); if (d.isValid()) { const mk = d.format("MM/YYYY"); if (!timeMap.has(mk)) timeMap.set(mk, { name: mk, value: 0, timestamp: d.valueOf() }); timeMap.get(mk).value += q; } });
        const byType = Array.from(groupMap.entries()).map(([n, v]) => ({ name: n, value: v }));
        const byTime = Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp).map(({ name, value }) => ({ name, value }));
        const byName = Array.from(nameMap.entries()).map(([n, v]) => ({ name: n, value: v })).sort((a, b) => b.value - a.value).slice(0, 10);
        const byNameGrouped = {}; nameByGroup.forEach((m, k) => { byNameGrouped[k] = Array.from(m.entries()).map(([n, v]) => ({ name: n, value: v })).sort((a, b) => b.value - a.value).slice(0, 10); });
        return { byType, byTime, byName, byNameGrouped, groups: Array.from(groupMap.keys()) };
    }, [rawData]);

    const detailedChartData = useMemo(() => selectedGroupForChart === "all" ? chartData.byName : (chartData.byNameGrouped[selectedGroupForChart] || []), [chartData, selectedGroupForChart]);

    const COLORS = ['#3B82F6', '#10B981', '#EF4444', '#F97316', '#8B5CF6'];
    const GROUP_COLORS = { "Sinh hoạt": "#3B82F6", "Công nghiệp": "#10B981", "Nguy hại": "#EF4444", "Khác": "#94A3B8" };

    useEffect(() => {
        setHeaderConfig({ title: "Quản lý Chất thải rắn", description: "Thống kê và quản lý chất thải rắn", showWeather: true, showDatePicker: true });
        setBreadcrumbItems([{ key: "/manager/waste", title: "Quản lý Chất thải" }, { key: "/manager/waste/solid-waste", title: "Chất thải rắn" }]);
    }, [setHeaderConfig, setBreadcrumbItems]);

    useEffect(() => {
        setHeaderConfig({
            title: buildManagerScopedTitle("Chất thải rắn", managerZoneLabel),
            description: `Theo dõi chất thải rắn của doanh nghiệp thuộc ${managerZoneLabel}.`,
            showWeather: true,
            showDatePicker: true
        });
        setBreadcrumbItems([
            { key: '/manager/waste', title: "Chất thải" },
            { key: '/manager/waste/solid-waste', title: `Chất thải rắn | ${managerZoneLabel}` }
        ]);
    }, [managerZoneLabel, setBreadcrumbItems, setHeaderConfig]);

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
            <div className="h-[28%] shrink-0"><div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
                <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 bg-blue-50 rounded-lg"><PieChartIcon className="size-4 text-blue-600" /></div><h3 className="font-semibold text-sm text-slate-800 leading-tight">Cơ cấu rác thải</h3></div><div className="flex-1 min-h-0 relative">{chartData.byType.length > 0 ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData.byType} cx="40%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value">{chartData.byType.map((e, i) => <Cell key={`c-${i}`} fill={GROUP_COLORS[e.name] || COLORS[i % COLORS.length]} />)}</Pie><RechartsTooltip formatter={(v, n) => [`${v.toLocaleString()} Tấn`, <span className="capitalize">{n}</span>]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} /><Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" iconSize={6} formatter={(v) => <span className="text-[10px] text-slate-600 font-medium ml-1 truncate max-w-[80px] block capitalize">{v}</span>} /></PieChart></ResponsiveContainer> : <EmptyState message="Chưa có dữ liệu" />}</div></div>
                <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col"><div className="flex items-center justify-between gap-2 mb-2"><div className="flex items-center gap-2"><div className="p-1.5 bg-green-50 rounded-lg"><BarChart3 className="size-4 text-green-600" /></div><h3 className="font-semibold text-sm text-slate-800 leading-tight">Chi tiết phát thải</h3></div><div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg overflow-x-auto max-w-[120px]"><button onClick={() => setSelectedGroupForChart("all")} className={clsx("px-2 py-0.5 text-[10px] font-medium rounded-md transition-all whitespace-nowrap", selectedGroupForChart === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Tất cả</button>{chartData.groups.map(g => <button key={g} onClick={() => setSelectedGroupForChart(g)} className={clsx("px-2 py-0.5 text-[10px] font-medium rounded-md transition-all capitalize whitespace-nowrap", selectedGroupForChart === g ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700")}>{g}</button>)}</div></div><div className="flex-1 min-h-0 relative">{detailedChartData.length > 0 ? <ResponsiveContainer width="100%" height="100%"><BarChart data={detailedChartData} layout="vertical" margin={{ left: -10, right: 10, top: 10, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" /><XAxis type="number" hide /><YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748B' }} width={70} axisLine={false} tickLine={false} /><RechartsTooltip formatter={(v) => [`${v.toLocaleString()} Tấn`, "Khối lượng"]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} /><Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} barSize={12} /></BarChart></ResponsiveContainer> : <EmptyState message="Chưa có dữ liệu" />}</div></div>
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 bg-orange-50 rounded-lg"><TrendingUp className="size-4 text-orange-600" /></div><h3 className="font-semibold text-sm text-slate-800 leading-tight">Xu hướng phát sinh (Tấn)</h3></div><div className="flex-1 min-h-0 w-full">{chartData.byTime.length > 0 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData.byTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}><defs><linearGradient id="colorWaste" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} /><stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} dy={5} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} /><RechartsTooltip formatter={(v) => [`${v.toLocaleString()} Tấn`, "Tổng khối lượng"]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} /><Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#colorWaste)" /></AreaChart></ResponsiveContainer> : <EmptyState message="Chưa có dữ liệu xu hướng" />}</div></div>
            </div></div>
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden h-full">
                <div className="flex flex-wrap gap-3 justify-between items-center pb-4 pt-5 border-b border-slate-100"><div className="flex items-center gap-2"><div className="p-2 bg-slate-100 rounded-lg"><Trash className="size-5 text-slate-600" /></div><h3 className="font-semibold text-slate-800">Danh sách Rác thải rắn</h3></div><div className="flex flex-1 gap-2 justify-end items-center max-w-2xl">{selectedRows.length > 0 && <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"><Trash className="size-4" />Xóa {selectedRows.length} mục</button>}<ButtonFilter onFilter={setSelectedFilters} filterOptions={filterOptions} fieldLabels={fieldLabels} selectedFilters={selectedFilters} setSelectedFilters={setSelectedFilters} /><div className="w-full max-w-xs"><SearchBox placeholder="Tìm kiếm rác thải..." onSearch={useCallback((k) => setSearchTerm(k), [])} /></div><AddButton onClick={() => navigate("/manager/resources/resource-form")} text={"Khai báo mới"} /></div></div>
                <div className="flex-1 overflow-hidden relative"><div className="absolute inset-0 overflow-auto"><ReuseableTable columns={columns} data={filteredData} rowsPerPage={20} showActions={false} sortConfig={sortConfig} onSort={(f, o) => setSortConfig({ [f]: o })} onSelectionChange={setSelectedRows} loading={isFetching} /></div></div>
            </div>
        </div>
    );
};

const EmptyState = ({ message }) => (<div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2"><SearchCheck className="size-8 opacity-50" /><span className="text-sm font-medium">{message}</span></div>);
const ZoneCell = ({ zoneId }) => { let id = zoneId; if (typeof zoneId === 'string' && zoneId.trim().startsWith('{')) { const m = zoneId.match(/'([^']*)'/); id = m?.[1] || null; } const { data: zone, isLoading, isError } = useZone(id); if (isLoading) return <span className="text-slate-400 italic text-xs">Đang tải...</span>; if (isError || !id) return <span className="text-slate-400 text-xs">—</span>; return <span className="truncate block max-w-full text-center text-xs text-slate-600 font-medium" title={zone?.zone?.zone_name || '—'}>{zone?.zone?.zone_name || '—'}</span>; };
const CompanyCell = ({ companyId }) => { const { data: company, isLoading, isError } = useCompany(companyId); if (isLoading) return <span className="text-slate-400 italic text-xs">Đang tải...</span>; if (isError) return <span className="text-slate-400 text-xs">—</span>; return <span className="truncate block max-w-full text-center text-xs text-slate-600 font-medium" title={company?.company?.company_name || '—'}>{company?.company?.company_name || '—'}</span>; };

export default ManagerSolidWastes;
