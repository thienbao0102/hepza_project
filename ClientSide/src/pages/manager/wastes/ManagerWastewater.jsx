import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReuseableTable from "@components/common/ReuseableTable";
import { AddButton } from "@components/ui/Button";
import SearchBox from "@components/ui/SearchBox";
import { useNavigate } from "react-router-dom";
import { Droplet, SearchCheck, Trash, TrendingUp, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import { useCompany } from "@features/company/hooks/useCompanyQueries";
import { useZone } from "@features/industrialzone/hooks/useZoneQueries";
import dayjs from "dayjs";
import { useSummaryDetail } from "@features/resources/hooks/useSummaryRecords";
import { useIsAuthenticated } from "@features/auth/hooks/useAuthQueries";
import { useHeader } from '@/components/common/Header/HeaderContext';
import ButtonFilter from "@components/ui/ButtonFilter";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, BarChart, Bar } from 'recharts';
import { buildManagerScopedTitle, resolveManagerZoneLabel } from "@/utils/managerScope";

const ManagerWastewater = () => {
    const COLORS = ['#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6'];
    const columns = [
        { Header: "Loại nước thải", accessor: "name", render: (v) => <span className="font-medium text-slate-700 block truncate capitalize">{v}</span> },
        { Header: "Lưu lượng", accessor: "quantity", render: (v) => <span className="font-mono text-blue-600 font-bold block text-center">{v?.toLocaleString()}</span> },
        { Header: "Đơn vị", accessor: "unit", render: (v) => <span className="text-slate-500 text-sm font-medium block text-center capitalize">{v}</span> },
        { Header: "KCX/KCN", accessor: "zone_id", render: (v) => <ZoneCell zoneId={v} /> },
        { Header: "Doanh nghiệp", accessor: "company_id", render: (v) => <CompanyCell companyId={v} /> },
        { Header: "Ngày tạo", accessor: "createdAt", render: (v) => <span className="text-slate-400 text-sm block text-center">{dayjs(v).format("DD/MM/YYYY HH:mm")}</span> }
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

    const { periodKeyStart, periodKeyEnd } = useMemo(() => {
        const isAll = date?.startsWith("00/");
        if (isAll) { const y = Number(date.split("/")[1]); return { periodKeyStart: y * 100 + 1, periodKeyEnd: y * 100 + 12 }; }
        const p = dayjs(date, "MM/YYYY", true);
        const pk = p.isValid() ? Number(p.format("YYYYMM")) : Number(dayjs().format("YYYYMM"));
        return { periodKeyStart: pk, periodKeyEnd: pk };
    }, [date]);

    const params = { role: userRole, periodKeyStart, periodKeyEnd, ...(userRole !== 'admin' && { companyId }), ...(userRole !== 'admin' && zoneId && { zoneId }), include: [6] };
    const ok = userRole && (userRole === 'admin' || companyId || zoneId);
    const { data: sr = [], isFetching } = useSummaryDetail(params, { enabled: !!ok });
    const api = sr.WasteResource || sr.waste || [];

    const items = useMemo(() => {
        const kw = ['wwa', 'wa', 'nước thải', 'wastewater'];
        return api.filter(i => { const sg = (i.main_group || i.sub_group || '').toLowerCase(); const n = (i.wasteName || i.name || '').toLowerCase(); return kw.includes(sg) || n.includes('nước thải'); });
    }, [api]);

    const rawData = useMemo(() => items.map(i => ({ ...i, name: i.wasteName || i.name || "N/A", _id: i._id || `t-${Math.random()}` })), [items]);

    const filteredData = useMemo(() => {
        let r = rawData; if (searchTerm) { const s = searchTerm.toLowerCase(); r = r.filter(i => (i.name || '').toLowerCase().includes(s)); }
        const sf = Object.keys(sortConfig)[0]; const so = sortConfig[sf];
        if (sf && so) r = [...r].sort((a, b) => { let va = sf === 'quantity' ? Number(a[sf]) || 0 : (a[sf] || '').toString().toLowerCase(); let vb = sf === 'quantity' ? Number(b[sf]) || 0 : (b[sf] || '').toString().toLowerCase(); return va < vb ? -1 * so : va > vb ? so : 0; });
        return r;
    }, [rawData, sortConfig, searchTerm]);

    const chartData = useMemo(() => {
        const tm = new Map(); const nm = new Map();
        rawData.forEach(i => { const q = Number(i.quantity) || 0; const n = i.name; nm.set(n, (nm.get(n) || 0) + q); const d = dayjs(i.createdAt); const mk = d.format("MM/YYYY"); if (!tm.has(mk)) tm.set(mk, { name: mk, total: 0, timestamp: d.valueOf() }); const r = tm.get(mk); r.total += q; r[n] = (r[n] || 0) + q; });
        const byTime = Array.from(tm.values()).sort((a, b) => a.timestamp - b.timestamp);
        const byName = Array.from(nm.entries()).map(([n, v]) => ({ name: n, value: v })).sort((a, b) => b.value - a.value);
        return { byTime, byName, names: byName.map(i => i.name) };
    }, [rawData]);

    useEffect(() => {
        setHeaderConfig({ title: "Quản lý Nước thải", description: "Thống kê và quản lý nước thải", showWeather: true, showDatePicker: true });
        setBreadcrumbItems([{ key: '/manager/waste', title: "Quản lý Chất thải" }, { key: '/manager/waste/wastewater', title: "Nước thải" }]);
    }, [setHeaderConfig, setBreadcrumbItems]);

    useEffect(() => {
        setHeaderConfig({
            title: buildManagerScopedTitle("Nước thải", managerZoneLabel),
            description: `Theo dõi nước thải của doanh nghiệp thuộc ${managerZoneLabel}.`,
            showWeather: true,
            showDatePicker: true
        });
        setBreadcrumbItems([
            { key: '/manager/waste', title: "Chất thải" },
            { key: '/manager/waste/wastewater', title: `Nước thải | ${managerZoneLabel}` }
        ]);
    }, [managerZoneLabel, setBreadcrumbItems, setHeaderConfig]);

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
            <div className="h-[28%] shrink-0"><div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
                <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 bg-cyan-50 rounded-lg"><PieChartIcon className="size-4 text-cyan-600" /></div><h3 className="font-semibold text-sm text-slate-800">Cơ cấu theo loại</h3></div><div className="flex-1 min-h-0">{chartData.byName.length > 0 ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData.byName} cx="40%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value">{chartData.byName.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><RechartsTooltip formatter={(v) => [`${v.toLocaleString()} m³`]} contentStyle={{ borderRadius: '8px', border: 'none' }} /><Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" iconSize={6} formatter={(v) => <span className="text-[10px] text-slate-600 ml-1 capitalize">{v}</span>} /></PieChart></ResponsiveContainer> : <EmptyState message="Chưa có dữ liệu" />}</div></div>
                <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 bg-indigo-50 rounded-lg"><BarChart3 className="size-4 text-indigo-600" /></div><h3 className="font-semibold text-sm text-slate-800">Lưu lượng lớn nhất</h3></div><div className="flex-1 min-h-0">{chartData.byName.length > 0 ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.byName.slice(0, 10)} layout="vertical" margin={{ left: -10, right: 10 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748B' }} width={80} axisLine={false} tickLine={false} /><RechartsTooltip formatter={(v) => [`${v.toLocaleString()} m³`]} contentStyle={{ borderRadius: '8px', border: 'none' }} /><Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>{chartData.byName.slice(0, 10).map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer> : <EmptyState message="Chưa có dữ liệu" />}</div></div>
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 bg-blue-50 rounded-lg"><TrendingUp className="size-4 text-blue-600" /></div><h3 className="font-semibold text-sm text-slate-800">Xu hướng (m³)</h3></div><div className="flex-1 min-h-0 w-full">{chartData.byTime.length > 0 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData.byTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}><defs>{chartData.names.map((n, i) => <linearGradient key={n} id={`mww-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.6} /><stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} /></linearGradient>)}</defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} /><RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none' }} /><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />{chartData.names.map((n, i) => <Area key={n} type="monotone" dataKey={n} stackId="1" stroke={COLORS[i % COLORS.length]} strokeWidth={2} fillOpacity={1} fill={`url(#mww-${i})`} />)}</AreaChart></ResponsiveContainer> : <EmptyState message="Chưa có dữ liệu" />}</div></div>
            </div></div>
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden h-full">
                <div className="flex flex-wrap gap-3 justify-between items-center pb-4 pt-5 border-b border-slate-100"><div className="flex items-center gap-2"><div className="p-2 bg-slate-100 rounded-lg"><Droplet className="size-5 text-cyan-600" /></div><h3 className="font-semibold text-slate-800">Danh sách Nước thải</h3></div><div className="flex flex-1 gap-2 justify-end items-center max-w-2xl"><ButtonFilter onFilter={setSelectedFilters} filterOptions={{ date_range: [] }} fieldLabels={{ date_range: "Ngày tạo" }} selectedFilters={selectedFilters} setSelectedFilters={setSelectedFilters} /><div className="w-full max-w-xs"><SearchBox placeholder="Tìm kiếm..." onSearch={useCallback((k) => setSearchTerm(k), [])} /></div>{userRole === 'admin' && <AddButton onClick={() => navigate("/manager/resources/resource-form")} text="Khai báo mới" />}</div></div>
                <div className="flex-1 overflow-hidden relative"><div className="absolute inset-0 overflow-auto"><ReuseableTable columns={columns} data={filteredData} rowsPerPage={20} showActions={false} sortConfig={sortConfig} onSort={(f, o) => setSortConfig({ [f]: o })} onSelectionChange={setSelectedRows} loading={isFetching} /></div></div>
            </div>
        </div>
    );
};

const EmptyState = ({ message }) => (<div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2"><SearchCheck className="size-8 opacity-50" /><span className="text-sm font-medium">{message}</span></div>);
const ZoneCell = ({ zoneId }) => { let id = zoneId; if (typeof zoneId === 'string' && zoneId.trim().startsWith('{')) { const m = zoneId.match(/'([^']*)'/); id = m?.[1] || null; } const { data: z, isLoading, isError } = useZone(id); if (isLoading) return <span className="text-slate-400 italic text-xs">...</span>; if (isError || !id) return <span className="text-slate-400 text-xs">—</span>; return <span className="truncate block max-w-full text-center text-xs text-slate-600 font-medium">{z?.zone?.zone_name || '—'}</span>; };
const CompanyCell = ({ companyId }) => { const { data: c, isLoading, isError } = useCompany(companyId); if (isLoading) return <span className="text-slate-400 italic text-xs">...</span>; if (isError) return <span className="text-slate-400 text-xs">—</span>; return <span className="truncate block max-w-full text-center text-xs text-slate-600 font-medium">{c?.company?.company_name || '—'}</span>; };

export default ManagerWastewater;
