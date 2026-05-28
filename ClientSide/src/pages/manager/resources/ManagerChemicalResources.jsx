import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import clsx from "clsx";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { SearchCheck, Trash, FlaskConical, BarChart3, TrendingUp } from "lucide-react";
import ReuseableTable from "@components/common/ReuseableTable";
import { AddButton } from "@components/ui/Button";
import SearchBox from "@components/ui/SearchBox";
import ButtonFilter from "@components/ui/ButtonFilter";
import { useHeader } from '@/components/common/Header/HeaderContext';
import { useSummaryDetail } from "@/features/resources/hooks/useSummaryRecords";
import { useIsAuthenticated } from "@/features/auth/hooks/useAuthQueries";
import { useCompany } from "@/features/company/hooks/useCompanyQueries";
import { useZone } from "@features/industrialzone/hooks/useZoneQueries";
import { buildManagerScopedTitle, resolveManagerZoneLabel } from "@/utils/managerScope";

const COLORS = ['#8B5CF6', '#10B981', '#06B6D4', '#F43F5E', '#F59E0B', '#6366F1'];

const ManagerChemicalResources = () => {
    const getCategoryStyles = (cat) => {
        const lower = (cat || "").toLowerCase();
        if (lower.includes("nguy hiểm")) return "bg-red-50 text-red-700 border-red-200";
        if (lower.includes("axit")) return "bg-orange-50 text-orange-700 border-orange-200";
        if (lower.includes("bazơ") || lower.includes("kiềm")) return "bg-blue-50 text-blue-700 border-blue-200";
        if (lower.includes("dung môi")) return "bg-purple-50 text-purple-700 border-purple-200";
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

    const isAllYear = date?.startsWith("00/");
    let periodKeyStart, periodKeyEnd;
    if (isAllYear) { const y = Number(date.split("/")[1]); periodKeyStart = y * 100 + 1; periodKeyEnd = y * 100 + 12; }
    else { const d = dayjs(date, "MM/YYYY", true).isValid() ? dayjs(date, "MM/YYYY") : dayjs(); const p = Number(d.format("YYYYMM")); periodKeyStart = p; periodKeyEnd = p; }

    const { data: company = [] } = useCompany(companyId);
    const zoneId = company?.company?.zone_id;
    const managerZoneLabel = resolveManagerZoneLabel({
        zoneName: company?.company?.zone_name || user?.user?.zone_name,
        zoneId: zoneId || user?.user?.zone_id,
    });

    const summaryParams = { role: userRole, periodKeyStart, periodKeyEnd, ...(userRole !== 'admin' && { companyId }), ...(userRole !== 'admin' && zoneId && { zoneId }), include: [2] };
    const hasRequiredParams = userRole && (userRole === 'admin' || companyId || zoneId);
    const { data: summaryRecords = [], isFetching } = useSummaryDetail(summaryParams, { enabled: !!hasRequiredParams });
    const apiData = summaryRecords.InputResource || [];

    const rawData = useMemo(() => (Array.isArray(apiData) ? apiData : []).map(item => ({ ...item, sub_group: item.sub_group || (item.unit?.toLowerCase().includes('kg') ? "Rắn" : item.unit?.toLowerCase().includes('l') ? "Lỏng" : "Khí") })), [apiData]);

    const filteredData = useMemo(() => {
        let result = rawData.filter(item => {
            if (searchTerm) { const s = searchTerm.toLowerCase(); if (!(item.name || "").toLowerCase().includes(s) && !(item.sub_group || "").toLowerCase().includes(s)) return false; }
            if (selectedFilters.sub_group?.length > 0 && !selectedFilters.sub_group.includes(item.sub_group)) return false;
            return true;
        });
        const sf = Object.keys(sortConfig)[0]; const so = sortConfig[sf];
        if (sf && so !== 0) result.sort((a, b) => { let vA = sf === 'quantity' ? Number(a[sf]) || 0 : (a[sf] || "").toString().toLowerCase(); let vB = sf === 'quantity' ? Number(b[sf]) || 0 : (b[sf] || "").toString().toLowerCase(); return vA < vB ? -1 * so : vA > vB ? 1 * so : 0; });
        return result;
    }, [rawData, selectedFilters, sortConfig, searchTerm]);

    const filterOptions = useMemo(() => ({ sub_group: [...new Set(rawData.map(i => i.sub_group).filter(Boolean))], date_range: [] }), [rawData]);
    const fieldLabels = { sub_group: "Phân loại", date_range: "Ngày tạo" };

    const chartData = useMemo(() => {
        const typeMap = new Map(); const timeMap = new Map(); const chemMap = new Map(); const allTypes = new Set();
        rawData.forEach(item => { const type = item.sub_group || "Khác"; const qty = Number(item.quantity) || 0; const name = item.name || "N/A"; typeMap.set(type, (typeMap.get(type) || 0) + qty); chemMap.set(name, (chemMap.get(name) || 0) + qty); const d = dayjs(item.createdAt); const mk = d.format("MM/YYYY"); if (!timeMap.has(mk)) timeMap.set(mk, { name: mk, total: 0, timestamp: d.valueOf() }); const r = timeMap.get(mk); r.total += qty; r[type] = (r[type] || 0) + qty; allTypes.add(type); });
        return { byType: Array.from(typeMap.entries()).map(([n, v]) => ({ name: n, value: v })), byTime: Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp), top5: Array.from(chemMap.entries()).map(([n, v]) => ({ name: n, value: v })).sort((a, b) => b.value - a.value).slice(0, 5), types: Array.from(allTypes) };
    }, [rawData]);

    useEffect(() => {
        setHeaderConfig({ title: "Quản lý Hóa chất", description: "Thống kê và quản lý hóa chất sử dụng", showWeather: true, showDatePicker: true });
        setBreadcrumbItems([{ key: '/manager/resources', title: "Quản lý tài nguyên" }, { key: '/manager/resources/chemicalResources', title: "Quản lý Hóa chất" }]);
    }, [setHeaderConfig, setBreadcrumbItems]);

    useEffect(() => {
        setHeaderConfig({
            title: buildManagerScopedTitle("Hóa chất", managerZoneLabel),
            description: `Theo dõi hóa chất của doanh nghiệp thuộc ${managerZoneLabel}.`,
            showWeather: true,
            showDatePicker: true
        });
        setBreadcrumbItems([
            { key: '/manager/resources', title: "Tài nguyên" },
            { key: '/manager/resources/chemicalResources', title: `Hóa chất | ${managerZoneLabel}` }
        ]);
    }, [managerZoneLabel, setBreadcrumbItems, setHeaderConfig]);

    const columns = [
        { Header: "Tên Hóa chất", accessor: "name", render: (val) => <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-50 text-slate-700 border-slate-200 truncate block w-fit mx-auto capitalize shadow-sm" title={val}>{val}</span>, sortable: true },
        { Header: "Số lượng", accessor: "quantity", render: (val) => <span className="truncate block w-full text-center font-mono text-blue-600 font-medium">{val?.toLocaleString()}</span>, sortable: true },
        { Header: "Đơn vị", accessor: "unit", render: (val) => <span className="truncate block w-full text-center capitalize text-slate-500 font-medium">{val}</span> },
        { Header: "Phân loại", accessor: "sub_group", render: (val) => <span className={clsx("px-2.5 py-1 rounded-full text-xs font-medium border truncate block w-fit mx-auto capitalize shadow-sm", getCategoryStyles(val))} title={val}>{val || "Khác"}</span>, sortable: true },
        { Header: "KCX/KCN", accessor: "zone_id", render: (val) => <ZoneCell zoneId={val} /> },
        { Header: "Doanh nghiệp", accessor: "company_id", render: (val) => <CompanyCell companyId={val} /> },
        { Header: "Ngày tạo", accessor: "createdAt", render: (val) => <span className="text-slate-400 text-sm tabular-nums">{dayjs(val).format("DD/MM/YYYY")}</span>, sortable: true }
    ];

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
            <div className="h-[28%] shrink-0"><div className="grid grid-cols-1 lg:grid-cols-4 gap-2 lg:gap-3 h-full">
                <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 bg-indigo-50 rounded-lg"><SearchCheck className="size-4 text-indigo-600" /></div><h3 className="font-semibold text-sm text-slate-800 leading-tight">Cơ cấu sử dụng</h3></div><div className="flex-1 min-h-0 relative">{chartData.byType.length > 0 ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chartData.byType} cx="40%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={4} dataKey="value">{chartData.byType.map((e, i) => <Cell key={`c-${i}`} fill={COLORS[i % COLORS.length]} />)}</Pie><RechartsTooltip formatter={(v) => [`${v?.toLocaleString()}`, "Lượng dùng"]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} /><Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" iconSize={6} formatter={(v) => <span className="text-[10px] text-slate-600 font-medium ml-1 truncate max-w-[80px] block capitalize">{v}</span>} /></PieChart></ResponsiveContainer> : <EmptyState message="Chưa có dữ liệu" />}</div></div>
                <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 bg-emerald-50 rounded-lg"><BarChart3 className="size-4 text-emerald-600" /></div><h3 className="font-semibold text-sm text-slate-800 leading-tight">Top Hóa chất</h3></div><div className="flex-1 min-h-0 relative">{chartData.top5.length > 0 ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.top5} layout="vertical" margin={{ left: 10, right: 30 }}><XAxis type="number" hide /><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748B' }} width={60} /><RechartsTooltip formatter={(v) => [`${v?.toLocaleString()}`, "Lượng dùng"]} cursor={{ fill: '#F8FAFC' }} contentStyle={{ borderRadius: '8px', border: 'none', fontSize: '11px' }} /><Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} barSize={12} /></BarChart></ResponsiveContainer> : <EmptyState message="Chưa có dữ liệu" />}</div></div>
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col"><div className="flex items-center gap-2 mb-2"><div className="p-1.5 bg-blue-50 rounded-lg"><TrendingUp className="size-4 text-blue-600" /></div><h3 className="font-semibold text-sm text-slate-800 leading-tight">Xu hướng tiêu thụ</h3></div><div className="flex-1 min-h-0 relative">{chartData.byTime.length > 0 ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData.byTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748B' }} /><RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} /><Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} formatter={(v) => <span className="capitalize">{v}</span>} />{chartData.types.map((t, i) => <Bar key={t} dataKey={t} name={t} stackId="a" fill={COLORS[i % COLORS.length]} radius={i === chartData.types.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} barSize={32} />)}</BarChart></ResponsiveContainer> : <EmptyState message="Chưa có dữ liệu" />}</div></div>
            </div></div>
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden h-full">
                <div className="flex flex-wrap gap-3 justify-between items-center pb-4 pt-5 border-b border-slate-100"><div className="flex items-center gap-2"><div className="p-2 bg-slate-100 rounded-lg"><FlaskConical className="size-5 text-indigo-600" /></div><h3 className="font-semibold text-slate-800">Danh sách Sử dụng Hóa chất</h3></div><div className="flex flex-1 gap-2 justify-end items-center max-w-2xl">{selectedRows.length > 0 && <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"><Trash className="size-4" />Xóa {selectedRows.length} mục</button>}<ButtonFilter onFilter={setSelectedFilters} filterOptions={filterOptions} fieldLabels={fieldLabels} selectedFilters={selectedFilters} setSelectedFilters={setSelectedFilters} /><div className="w-full max-w-xs"><SearchBox placeholder="Tìm tên hóa chất..." onSearch={setSearchTerm} /></div>{userRole === 'admin' && <AddButton onClick={() => navigate("/manager/resources/resource-form")} text={"Khai báo Hóa chất"} />}</div></div>
                <div className="flex-1 overflow-hidden relative"><div className="absolute inset-0 overflow-auto"><ReuseableTable columns={columns} data={filteredData} onSelectionChange={setSelectedRows} sortConfig={sortConfig} onSort={(f, o) => setSortConfig({ [f]: o })} loading={isFetching} showActions={false} rowsPerPage={20} /></div></div>
            </div>
        </div>
    );
};

const EmptyState = ({ message }) => (<div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2"><SearchCheck className="size-8 opacity-50" /><span className="text-sm font-medium">{message}</span></div>);
const ZoneCell = ({ zoneId }) => { let id = zoneId; if (typeof zoneId === 'string' && zoneId.trim().startsWith('{')) { const m = zoneId.match(/'([^']*)'/); id = m?.[1] || null; } const { data: zone, isLoading, isError } = useZone(id); if (isLoading) return <span className="text-slate-400 italic text-xs">Đang tải...</span>; if (isError || !id) return <span className="text-slate-400 text-xs">—</span>; return <span className="truncate block max-w-full text-center text-xs text-slate-600 font-medium" title={zone?.zone?.zone_name || '—'}>{zone?.zone?.zone_name || '—'}</span>; };
const CompanyCell = ({ companyId }) => { const { data: company, isLoading, isError } = useCompany(companyId); if (isLoading) return <span className="text-slate-400 italic text-xs">Đang tải...</span>; if (isError) return <span className="text-slate-400 text-xs">—</span>; return <span className="truncate block max-w-full text-center text-xs text-slate-600 font-medium" title={company?.company?.company_name || '—'}>{company?.company?.company_name || '—'}</span>; };

export default ManagerChemicalResources;
