/* eslint-disable react/prop-types, react/jsx-sort-props */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import ReuseableTable from "@components/common/ReuseableTable";
import { AddButton } from "@components/ui/Button";
import SearchBox from "@components/ui/SearchBox";
import { useNavigate } from "react-router-dom";
import { Wind, SearchCheck, Trash, TrendingUp, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
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

const AdminGasWaste = () => {
    const COLORS = ['#94A3B8', '#64748B', '#0EA5E9', '#38BDF8', '#A78BFA'];

    const columns = [
        { Header: "Loại khí thải", accessor: "name", render: (val) => <span className="font-medium text-slate-700 block truncate capitalize" title={val}>{val}</span> },
        { Header: "Lưu lượng", accessor: "quantity", render: (val) => <span className="font-mono text-sky-600 font-bold block text-center">{val?.toLocaleString()}</span> },
        { Header: "Đơn vị", accessor: "unit", render: (val) => <span className="text-slate-500 text-sm font-medium block text-center capitalize">{val}</span> },
        { Header: "KCX/KCN", accessor: "zone_id", render: (val) => <ZoneCell zoneId={val} /> },
        { Header: "Doanh nghiệp", accessor: "company_id", render: (val) => <CompanyCell companyId={val} /> },
        { Header: "Ngày tạo", accessor: "createdAt", render: (val) => <span className="text-slate-400 text-sm font-medium block text-center">{dayjs(val).format("DD/MM/YYYY HH:mm")}</span> }
    ];

    const [selectedRows, setSelectedRows] = useState([]);
    const { setHeaderConfig, setBreadcrumbItems, date } = useHeader();
    const navigate = useNavigate();
    const { user } = useIsAuthenticated();
    const userRole = user?.user?.role;
    const companyId = user?.user?.company_id;
    const { data: company = [] } = useCompany(companyId);
    const zoneId = company?.company?.zone_id;
    const [selectedFilters, setSelectedFilters] = useState({});
    const [sortConfig, setSortConfig] = useState({});
    const [searchTerm, setSearchTerm] = useState("");

    const { periodKeyStart, periodKeyEnd } = useMemo(() => {
        const isAllYear = date?.startsWith("00/");
        if (isAllYear) { const y = Number(date.split("/")[1]); return { periodKeyStart: y * 100 + 1, periodKeyEnd: y * 100 + 12 }; }
        const p = dayjs(date, "MM/YYYY", true); const pk = p.isValid() ? Number(p.format("YYYYMM")) : Number(dayjs().format("YYYYMM"));
        return { periodKeyStart: pk, periodKeyEnd: pk };
    }, [date]);

    const summaryParams = { role: userRole, periodKeyStart, periodKeyEnd, ...(userRole !== 'admin' && { companyId }), ...(userRole !== 'admin' && zoneId && { zoneId }), include: [6] };
    const hasRequiredParams = userRole && (userRole === 'admin' || companyId || zoneId);
    const { data: summaryRecords = [], isFetching } = useSummaryDetail(summaryParams, { enabled: !!hasRequiredParams, keepPreviousData: false });
    const apiData = summaryRecords.WasteResource || summaryRecords.waste || [];

    const emissionsItems = useMemo(() => {
        const keywords = ['khí thải', 'gas', 'emission', 'khói', 'bụi', 'hơi'];
        return apiData.filter(item => {
            const sg = (item.main_group || item.subGroup || item.sub_group || '').toLowerCase();
            const name = (item.wasteName || item.name || '').toLowerCase();
            return keywords.some(k => sg.includes(k) || name.includes(k));
        });
    }, [apiData]);

    const rawData = useMemo(() => emissionsItems.map(item => ({ ...item, name: item.wasteName || item.name || "Chưa đặt tên", unit: "mg/l", _id: item._id || item.id || `temp-${Math.random()}` })), [emissionsItems]);

    const filterOptions = useMemo(() => ({ date_range: [] }), []);
    const fieldLabels = { date_range: "Ngày tạo" };

    const filteredData = useMemo(() => {
        let result = rawData.filter(item => { if (searchTerm) { const s = searchTerm.toLowerCase(); if (!(item.name || "").toLowerCase().includes(s)) return false; } return true; });
        const sf = Object.keys(sortConfig)[0]; const so = sortConfig[sf];
        if (sf && so !== 0) result.sort((a, b) => { let vA = sf === 'quantity' ? Number(a[sf]) || 0 : (a[sf] || "").toString().toLowerCase(); let vB = sf === 'quantity' ? Number(b[sf]) || 0 : (b[sf] || "").toString().toLowerCase(); return vA < vB ? -1 * so : vA > vB ? 1 * so : 0; });
        return result;
    }, [rawData, selectedFilters, sortConfig, searchTerm]);

    const chartData = useMemo(() => {
        const timeMap = new Map(); const nameMap = new Map();
        rawData.forEach(item => { const qty = Number(item.quantity) || 0; const name = item.name || "Khác"; nameMap.set(name, (nameMap.get(name) || 0) + qty); const d = dayjs(item.createdAt); const mk = d.format("MM/YYYY"); const ts = d.valueOf(); if (!timeMap.has(mk)) timeMap.set(mk, { name: mk, total: 0, timestamp: ts }); const r = timeMap.get(mk); r.total += qty; r[name] = (r[name] || 0) + qty; });
        const byTime = Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);
        const byName = Array.from(nameMap.entries()).map(([n, v]) => ({ name: n, value: v })).sort((a, b) => b.value - a.value);
        return { byTime, byName, names: byName.map(i => i.name) };
    }, [rawData]);

    const detailedChartData = useMemo(() => chartData.byName.slice(0, 10), [chartData]);

    const CustomAreaTooltip = ({ active, payload, label }) => {
        if (active && payload?.length) {
            const sorted = [...payload].sort((a, b) => b.value - a.value);
            return (<div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl ring-1 ring-black/5"><p className="mb-2 font-semibold text-slate-700 text-sm border-b pb-1 border-slate-100">{label}</p><div className="flex flex-col gap-1.5">{sorted.map((e, i) => <div key={i} className="flex items-center justify-between gap-4 text-xs"><div className="flex items-center gap-1.5 min-w-[80px]"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} /><span className="text-slate-600 truncate max-w-[120px]">{e.name}</span></div><span className="font-mono font-medium text-slate-800">{e.value.toLocaleString()} <span className="text-slate-400 text-[10px]">mg/l</span></span></div>)}<div className="pt-2 mt-1 border-t border-slate-100 flex justify-between items-center text-xs font-semibold text-slate-800"><span>Tổng cộng</span><span>{sorted.reduce((a, b) => a + b.value, 0).toLocaleString()} mg/l</span></div></div></div>);
        }
        return null;
    };

    useEffect(() => {
        setHeaderConfig({ title: "Quản lý Khí thải", description: "Thống kê và quản lý khí thải", showWeather: true, showDatePicker: true });
        setBreadcrumbItems([{ key: '/admin/waste', title: "Quản lý Chất thải" }, { key: '/admin/waste/gas-waste', title: "Khí thải" }]);
    }, [setHeaderConfig, setBreadcrumbItems]);

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
            <div className="h-[28%] shrink-0"><div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
                <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 bg-sky-50 rounded-lg"><PieChartIcon className="size-4 text-sky-600" /></div><h3 className="font-semibold text-sm text-slate-800 leading-tight">Cơ cấu theo loại</h3></div><div className="flex-1 min-h-0 relative">{chartData.byName.length > 0 ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData.byName} cx="40%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value">{chartData.byName.map((e, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />)}</Pie><RechartsTooltip content={<CustomAreaTooltip />} /><Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" iconSize={6} formatter={(v) => <span className="text-[10px] text-slate-600 font-medium ml-1 truncate max-w-[80px] block capitalize">{v}</span>} /></PieChart></ResponsiveContainer> : <EmptyState message="Chưa có dữ liệu" />}</div></div>
                <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 bg-indigo-50 rounded-lg"><BarChart3 className="size-4 text-indigo-600" /></div><h3 className="font-semibold text-sm text-slate-800 leading-tight">Lưu lượng lớn nhất</h3></div><div className="flex-1 min-h-0 relative">{detailedChartData.length > 0 ? <ResponsiveContainer width="100%" height="100%"><BarChart data={detailedChartData} layout="vertical" margin={{ left: -10, right: 10, top: 10, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" /><XAxis type="number" hide /><YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748B' }} width={80} axisLine={false} tickLine={false} /><RechartsTooltip formatter={(v) => [`${v.toLocaleString()} m³`, "Lưu lượng"]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} /><Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>{detailedChartData.map((e, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer> : <EmptyState message="Chưa có dữ liệu" />}</div></div>
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 bg-blue-50 rounded-lg"><TrendingUp className="size-4 text-blue-600" /></div><h3 className="font-semibold text-sm text-slate-800 leading-tight">Xu hướng phát sinh (mg/l)</h3></div><div className="flex-1 min-h-0 w-full">{chartData.byTime.length > 0 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData.byTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}><defs>{chartData.names.map((n, i) => <linearGradient key={`g-${n}`} id={`colorGas-${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.6} /><stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} /></linearGradient>)}</defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} dy={5} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v} /><RechartsTooltip content={<CustomAreaTooltip />} cursor={{ stroke: '#64748B', strokeWidth: 1, strokeDasharray: '4 4' }} /><Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} formatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />{chartData.names.map((n, i) => <Area key={n} type="monotone" dataKey={n} stackId="1" stroke={COLORS[i % COLORS.length]} strokeWidth={2} fillOpacity={1} fill={`url(#colorGas-${i})`} />)}</AreaChart></ResponsiveContainer> : <EmptyState message="Chưa có dữ liệu xu hướng" />}</div></div>
            </div></div>
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden h-full">
                <div className="flex flex-wrap gap-3 justify-between items-center pb-4 pt-5 border-b border-slate-100"><div className="flex items-center gap-2"><div className="p-2 bg-slate-100 rounded-lg"><Wind className="size-5 text-sky-600" /></div><h3 className="font-semibold text-slate-800">Danh sách Khí thải</h3></div><div className="flex flex-1 gap-2 justify-end items-center max-w-2xl">{selectedRows.length > 0 && <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"><Trash className="size-4" />Xóa {selectedRows.length} mục</button>}<ButtonFilter onFilter={setSelectedFilters} filterOptions={filterOptions} fieldLabels={fieldLabels} selectedFilters={selectedFilters} setSelectedFilters={setSelectedFilters} /><div className="w-full max-w-xs"><SearchBox placeholder="Tìm kiếm..." onSearch={useCallback((k) => setSearchTerm(k), [])} /></div><AddButton onClick={() => navigate("/admin/resources/resource-form")} text={"Khai báo mới"} /></div></div>
                <div className="flex-1 overflow-hidden relative"><div className="absolute inset-0 overflow-auto"><ReuseableTable columns={columns} data={filteredData} rowsPerPage={20} showActions={false} sortConfig={sortConfig} onSort={(f, o) => setSortConfig({ [f]: o })} onSelectionChange={setSelectedRows} loading={isFetching} /></div></div>
            </div>
        </div>
    );
};

const EmptyState = ({ message }) => (<div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2"><SearchCheck className="size-8 opacity-50" /><span className="text-sm font-medium">{message}</span></div>);
const ZoneCell = ({ zoneId }) => { let id = zoneId; if (typeof zoneId === 'string' && zoneId.trim().startsWith('{')) { const m = zoneId.match(/'([^']*)'/); id = m?.[1] || null; } const { data: zone, isLoading, isError } = useZone(id); if (isLoading) return <span className="text-slate-400 italic text-xs">Đang tải...</span>; if (isError || !id) return <span className="text-slate-400 text-xs">—</span>; return <span className="truncate block max-w-full text-center text-xs text-slate-600 font-medium" title={zone?.zone?.zone_name || '—'}>{zone?.zone?.zone_name || '—'}</span>; };
const CompanyCell = ({ companyId }) => { const { data: company, isLoading, isError } = useCompany(companyId); if (isLoading) return <span className="text-slate-400 italic text-xs">Đang tải...</span>; if (isError) return <span className="text-slate-400 text-xs">—</span>; return <span className="truncate block max-w-full text-center text-xs text-slate-600 font-medium" title={company?.company?.company_name || '—'}>{company?.company?.company_name || '—'}</span>; };

export default AdminGasWaste;
