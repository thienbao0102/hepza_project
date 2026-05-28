import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Tag, Alert, Tooltip } from 'antd';
import {
    Building,
    Info,
    CheckCircle,
    XCircle,
    Users,
    MapPin,
    Layers,
    Award,
    CalendarPlus,
    CalendarClock,
    Factory,
    Phone,
    Globe,
    ArrowUpRight,
    Ruler,
    BarChart3,
    Mail,
    User,
    Pencil,
    Hash,
    Zap,
    ImageOff,
    Trash2,
    Cloud,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useSummaryRecords } from '@features/resources/hooks/useSummaryRecords';
import LoadingSpinner from '@components/ui/LoadingSpinner';
import ConfirmDeleteDialog from "@components/common/ConfirmDeleteDialog";
import { useDeleteZone, usePreviewSoftDeleteZone } from "@features/industrialzone/hooks/useZoneMutations";
import toast from "@/utils/toast";
import { useZone } from '@features/industrialzone/hooks/useZoneQueries';
import { useCompanies } from '@features/company/hooks/useCompanyQueries';
import { useAuthenticatedUser } from '@/features/auth/hooks/useAuthQueries';
import { useHeader } from '@/components/common/Header/HeaderContext';
import ZoneResourceDashboard from '@features/industrialzone/components/ZoneResourceDashboard';
import { buildManagerScopedTitle } from '@/utils/managerScope';

const BRAND = '#4E5BA6';
const BRAND_LIGHT = '#4E5BA612';

// --- HELPERS ---
const getStatusStyle = (status) => {
    if (!status) return { color: 'default', icon: <Info size={14} />, label: 'Chưa có', bg: '#f3f4f6', text: '#6b7280' };
    const s = String(status).toLowerCase();
    if (s.includes('active') || s.includes('hoạt động'))
        return { color: 'green', icon: <CheckCircle size={14} />, label: 'Đang hoạt động', bg: '#dcfce7', text: '#16a34a' };
    if (s.includes('off') || s.includes('ngưng'))
        return { color: 'red', icon: <XCircle size={14} />, label: 'Ngưng hoạt động', bg: '#fee2e2', text: '#dc2626' };
    return { color: 'default', icon: <Info size={14} />, label: status, bg: '#f3f4f6', text: '#6b7280' };
};

const formatDate = (dateString) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
    });
};

const buildMapsUrl = (address) => address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
const buildWebsiteUrl = (w) => !w ? null : (w.startsWith('http') ? w : `https://${w}`);

// --- STAT PILL (overlaid on image) ---
const StatPill = ({ icon: Icon, label, value, unit, color = BRAND, bgColor = BRAND_LIGHT, textColor = 'text-gray-900', labelColor = 'text-gray-400' }) => (
    <div className="flex items-center gap-2.5 bg-white/95 backdrop-blur-md rounded-2xl px-4 py-3 shadow-lg border border-white/60">
        <div className="p-2 rounded-xl" style={{ background: bgColor }}>
            <Icon className="size-[18px]" style={{ color: color }} strokeWidth={2.2} />
        </div>
        <div>
            <p className={`text-[11px] font-semibold uppercase tracking-wider leading-none mb-0.5 ${labelColor}`}>{label}</p>
            <p className={`text-base font-bold leading-tight ${textColor}`}>
                {value ?? '--'}
                {unit && <span className={`text-xs font-medium ml-0.5 ${labelColor}`}>{unit}</span>}
            </p>
        </div>
    </div>
);

// --- INFO ROW (for detail grid) ---
const InfoItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-gray-50/80 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all duration-200 group">
        <div className="p-2 rounded-lg group-hover:scale-105 transition-transform" style={{ background: BRAND_LIGHT }}>
            <Icon className="size-[18px]" style={{ color: BRAND }} strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
            <p className="text-[15px] font-semibold text-gray-800 truncate leading-snug">{value || '--'}</p>
        </div>
    </div>
);

// --- MANAGER ROW ---
const ManagerRow = ({ name, id }) => {
    const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(-2).toUpperCase();
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all duration-200">
            <div
                className="size-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                style={{ background: `linear-gradient(135deg, ${BRAND}, #7B8EC9)` }}
            >
                {initials}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800 truncate">{name || 'Chưa rõ tên'}</p>
                <p className="text-xs text-gray-400 truncate">{id || '--'}</p>
            </div>
        </div>
    );
};

// --- COMPANY CARD ---
const CompanyCard = ({ company, canViewDetails }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const mapsUrl = buildMapsUrl(company?.address);
    const rawWebsite =
        (typeof company?.website === 'string' && company.website.trim()) ||
        (typeof company?.website_url === 'string' && company.website_url.trim()) ||
        (typeof company?.websiteUrl === 'string' && company.websiteUrl.trim()) ||
        (typeof company?.contact?.website === 'string' && company.contact.website.trim()) ||
        null;
    const websiteUrl = buildWebsiteUrl(rawWebsite);

    const handleClick = () => {
        if (!canViewDetails || (!company?.company_id && !company?.id)) return;
        const cid = company.company_id || company.id;
        const cur = location.pathname?.toLowerCase() || '';
        let target = `/company-details/${cid}`;
        if (cur.startsWith('/admin')) target = `/admin/business/${cid}`;
        else if (cur.startsWith('/manager')) target = `/manager/business/${cid}`;
        navigate(target, { state: { from: { pathname: location.pathname, search: location.search } } });
    };

    return (
        <div
            onClick={canViewDetails ? handleClick : undefined}
            className={`flex flex-col rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden transition-all duration-300
                ${canViewDetails ? 'cursor-pointer hover:shadow-md hover:border-gray-200 hover:-translate-y-0.5' : ''}`}
        >
            <div className="p-4 border-b border-gray-50 flex items-center gap-3">
                <div className="size-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: BRAND_LIGHT }}>
                    <Building className="size-4" style={{ color: BRAND }} />
                </div>
                <Tooltip title={company?.company_name} placement="top">
                    <h3 className="text-sm font-semibold text-gray-900 truncate flex-1">{company?.company_name || 'Doanh nghiệp'}</h3>
                </Tooltip>
                {canViewDetails && <ArrowUpRight className="size-4 shrink-0 text-gray-300" />}
            </div>
            <div className="px-4 py-3 space-y-2 text-[13px]">
                <CompanyInfoRow icon={MapPin} href={mapsUrl} text={company?.address} />
                <CompanyInfoRow icon={Phone} text={company?.phone_number} />
                <CompanyInfoRow icon={Globe} href={websiteUrl} text={rawWebsite} />
            </div>
        </div>
    );
};

const CompanyInfoRow = ({ icon: Icon, text, href }) => (
    <div className="flex items-start gap-2">
        <Icon size={14} className="mt-0.5 shrink-0" style={{ color: BRAND }} />
        {href && text ? (
            <a href={href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                className="truncate hover:underline text-sm" style={{ color: BRAND }}>{text}</a>
        ) : (
            <span className="truncate text-gray-500 text-sm">{text || 'Chưa cập nhật'}</span>
        )}
    </div>
);

// ==============================
// MAIN COMPONENT
// ==============================
const ZoneDetail = () => {
    const params = useParams();
    const zoneId = params.zoneId ?? params.zone_id ?? params.id;
    const navigate = useNavigate();
    const location = useLocation();
    const isAdminContext = location.pathname?.toLowerCase().startsWith('/admin');
    const { data: authData } = useAuthenticatedUser();
    const user = authData?.user || authData;
    const userRole = String(user?.role || '').toLowerCase();
    const { setHeaderConfig, setBreadcrumbItems } = useHeader();

    const [dialogState, setDialogState] = useState({
        isOpen: false,
    });

    const defaultYear = dayjs().year(); // Default về năm hiện tại (2026)
    const periodKeyStart = defaultYear * 100 + 1;
    const periodKeyEnd = defaultYear * 100 + 12;

    const { data: zoneData, isLoading: isZoneLoading, isError: isZoneError, error: zoneError } = useZone(zoneId);
    const zone = zoneData?.zone || zoneData;
    const isManagedZone = String(zone?.zone_id || zoneId || '') === String(user?.zone_id || '');
    const canViewCompanyDetails = userRole === 'admin' || (userRole === 'manager' && isManagedZone);

    // Chỉ admin mới xem được CO2 và Dashboard trong trang chi tiết KCN
    const canViewCO2AndDashboard = userRole === 'admin';

    const { data: rawYearlyData = [] } = useSummaryRecords(
        {
            role: userRole,
            zoneId: zone?.zone_id || zoneId,
            include: [1, 2, 3, 4, 5, 6],
            periodKeyStart: periodKeyStart,
            periodKeyEnd: periodKeyEnd,
        },
        { enabled: canViewCO2AndDashboard && !!userRole && !!(zone?.zone_id || zoneId) }
    );

    const co2Total = useMemo(() => {
        const arr = Array.isArray(rawYearlyData) ? rawYearlyData : (rawYearlyData?.summaryRecord ?? []);
        return arr.reduce((acc, r) => {
            const v = Number(r.emissions?.total_co2);
            return acc + (isFinite(v) ? v : 0);
        }, 0);
    }, [rawYearlyData]);

    const previewSoftDeleteMutation = usePreviewSoftDeleteZone();
    const deleteMutation = useDeleteZone();

    const { data: companiesData, isLoading: isCompaniesLoading } = useCompanies({
        page: 1, limit: 9999, search: '', debounceDelay: 0,
        filters: zoneId ? { zone_id: zoneId } : {},
    });

    const status = getStatusStyle(zone?.status);

    useEffect(() => {
        setHeaderConfig({
            title: zone?.zone_name,
            description: 'Thông tin chi tiết khu công nghiệp',
            showWeather: true,
            showDatePicker: false,
        });
        const path = location.pathname.toLowerCase();
        let rootPath = '/industrialZone';
        if (path.startsWith('/admin')) rootPath = '/admin/industrialZone';
        else if (path.startsWith('/manager')) rootPath = '/manager/industrialZone';

        setBreadcrumbItems([
            { key: rootPath, title: 'Quản lý Khu công nghiệp và Khu chế xuất' },
            { key: `${rootPath}/${zoneId}`, title: zone?.zone_name },
        ]);
    }, [zoneId, zone]);

    useEffect(() => {
        if (userRole !== 'manager' || !zone?.zone_name) return;

        setHeaderConfig({
            title: buildManagerScopedTitle('Khu công nghiệp', zone.zone_name),
            description: 'Bạn đang xem phạm vi dữ liệu của khu công nghiệp này.',
            showWeather: true,
            showDatePicker: false,
        });

        setBreadcrumbItems([
            { key: '/manager/industrialZone', title: 'Khu công nghiệp' },
            { key: `/manager/industrialZone/${zoneId}`, title: zone.zone_name },
        ]);
    }, [setBreadcrumbItems, setHeaderConfig, userRole, zone, zoneId]);

    const companiesInZone = useMemo(() => {
        const companies = companiesData?.companies ?? [];
        if (!zoneId) return companies;
        return companies.filter((c) => c.zone_id === zoneId);
    }, [companiesData, zoneId]);

    // --- GUARDS ---
    if (!zoneId) {
        return <div className="p-6"><Alert message="Thiếu mã khu công nghiệp" description="Không xác định được khu công nghiệp được yêu cầu." type="error" showIcon /></div>;
    }
    if (isZoneLoading || isCompaniesLoading) {
        return <div className="flex items-center justify-center h-[60vh]"><LoadingSpinner tip="Đang tải thông tin khu công nghiệp..." /></div>;
    }
    if (isZoneError || !zone) {
        return <div className="p-6"><Alert message="Không thể tải thông tin khu công nghiệp" description={zoneError?.message || 'Vui lòng thử lại sau.'} type="error" showIcon /></div>;
    }

    const managers = Array.isArray(zone.managers) ? zone.managers : [];
    const managerIds = Array.isArray(zone.managers_ids) ? zone.managers_ids : [];
    const hasImage = !!zone.image_url;

    // --- ACTIONS ---
    const handleDeleteClick = () => {
        setDialogState({ isOpen: true });
    };

    const handleConfirmDelete = async () => {
        try {
            toast({
                title: "Thành công",
                description: "Đã đưa khu công nghiệp vào mục vô hiệu hóa",
                type: "success"
            });
            navigate('/admin/industrialZone');
        } catch (error) {
            toast({
                title: "Lỗi",
                description: "Đã có lỗi xảy ra",
                type: "error"
            });
        } finally {
            setDialogState({ isOpen: false });
        }
    };

    return (
        <div className="flex flex-col gap-4 h-full overflow-y-auto pb-6 px-1">

            {/* ========================================== */}
            {/* HERO: IMAGE AS FOCAL POINT                */}
            {/* ========================================== */}
            <div className="relative w-full rounded-3xl shadow-md group">
                {/* Image — dominant, tall, immersive */}
                <div className="relative w-full h-[220px] sm:h-[280px] md:h-[340px] lg:h-[400px] rounded-3xl overflow-hidden">
                    {hasImage ? (
                        <img
                            src={zone.image_url}
                            alt={zone.zone_name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 flex flex-col items-center justify-center">
                            <ImageOff className="size-16 text-gray-300 mb-3" />
                            <span className="text-gray-400 text-sm font-medium">Chưa có hình ảnh</span>
                        </div>
                    )}

                    {/* Gradient overlays for text readability */}
                    {hasImage && (
                        <>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
                        </>
                    )}
                </div>

                {/* Content overlay — bottom-left */}
                <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
                    {/* Status + Admin action */}
                    <div className="flex items-center gap-2 mb-3">
                        <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm"
                            style={{ background: status.bg, color: status.text }}
                        >
                            {status.icon}
                            {status.label}
                        </span>

                        {zone.zone_type && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm text-gray-700 shadow-sm">
                                <Layers size={12} />
                                {zone.zone_type}
                            </span>
                        )}

                        {isAdminContext && (
                            <>
                                <button
                                    onClick={() => navigate(`/admin/industrialZone/update-zone/${zone.zone_id}`)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white transition-all cursor-pointer"
                                    style={{ color: BRAND }}
                                >
                                    <Pencil size={12} />
                                    Chỉnh sửa
                                </button>
                                <button
                                    onClick={handleDeleteClick}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white text-red-600 transition-all cursor-pointer"
                                    title="Vô hiệu hóa"
                                >
                                    <Trash2 size={12} />
                                    Vô hiệu hóa
                                </button>
                            </>
                        )}
                    </div>

                    {/* Zone name */}
                    <h1 className={`text-2xl lg:text-4xl font-bold mb-1.5 leading-tight ${hasImage ? 'text-white drop-shadow-lg' : 'text-gray-900'}`}>
                        {zone.zone_name}
                    </h1>

                    {zone.location && (
                        <p className={`text-sm flex items-center gap-1.5 ${hasImage ? 'text-white/80' : 'text-gray-500'}`}>
                            <MapPin className="size-4" />
                            {zone.location}
                        </p>
                    )}
                </div>

                {/* Stat pills — floating, responsive wrap */}
                <div className="absolute bottom-[-20px] left-4 right-4 sm:left-auto sm:right-6 lg:right-8 flex flex-wrap sm:flex-nowrap gap-2 sm:gap-2.5 z-10 justify-center sm:justify-end">
                    {canViewCO2AndDashboard && (
                        <StatPill
                            icon={Cloud}
                            label={`Tổng CO₂ (${defaultYear})`}
                            value={co2Total > 0 ? Math.round(co2Total).toLocaleString('de-DE') : '--'}
                            unit="tấn"
                            color="#10B981"
                            bgColor="#10B98118"
                        />
                    )}
                    <StatPill icon={Factory} label="Doanh nghiệp" value={companiesInZone.length} />
                </div>
            </div>

            {/* Spacer for the floating stat pills */}
            <div className="h-5 sm:h-4" />

            {/* ========================================== */}
            {/* DETAILS: 12-col grid                      */}
            {/* ========================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                {/* LEFT — Zone info */}
                <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Info className="size-[18px] text-gray-400" />
                        <h2 className="text-base font-bold text-gray-800">Thông tin khu công nghiệp</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        <InfoItem icon={Hash} label="Mã KCN" value={zone.zone_id} />
                        <InfoItem icon={Layers} label="Loại hình" value={zone.zone_type} />
                        <InfoItem icon={MapPin} label="Địa điểm" value={zone.location} />
                        <InfoItem icon={Award} label="Năm thành lập" value={zone.established_year} />
                        <InfoItem icon={CalendarPlus} label="Ngày tạo" value={formatDate(zone.created_at)} />
                        <InfoItem icon={CalendarClock} label="Cập nhật" value={formatDate(zone.updated_at)} />
                        <InfoItem icon={Users} label="Tổng doanh nghiệp" value={companiesInZone.length} />
                        <InfoItem icon={Zap} label="Công suất hạ tầng" value={zone.infrastructure_capacity} />
                    </div>
                </div>

                {/* RIGHT — Sidebar */}
                <div className="lg:col-span-4 flex flex-col gap-3">
                    {/* Managers */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex-1">
                        <div className="flex items-center gap-2 mb-3">
                            <Users className="size-[18px] text-gray-400" />
                            <h2 className="text-base font-bold text-gray-800">Ban quản lý</h2>
                        </div>
                        <div className="space-y-2">
                            {managers.length > 0 ? managers.map(m => (
                                <ManagerRow key={m.user_id || m.email || m.full_name}
                                    name={m.full_name} id={m.email || m.phone_number || m.user_id} />
                            )) : managerIds.length > 0 ? managerIds.map(mId => (
                                <ManagerRow key={mId} name={mId} id={mId} />
                            )) : (
                                <p className="text-sm text-gray-400 py-6 text-center">Chưa có thông tin quản lý</p>
                            )}
                        </div>
                    </div>

                    {/* Contact */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Phone className="size-[18px] text-gray-400" />
                            <h2 className="text-base font-bold text-gray-800">Liên hệ</h2>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <User size={15} style={{ color: BRAND }} />
                                <div>
                                    <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Đầu mối</p>
                                    <p className="text-sm font-medium text-gray-800">{zone.contact_person || 'Chưa cập nhật'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone size={15} style={{ color: BRAND }} />
                                <div>
                                    <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Số điện thoại</p>
                                    <p className="text-sm font-medium text-gray-800">{zone.contact_phone || 'Chưa cập nhật'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail size={15} style={{ color: BRAND }} />
                                <div>
                                    <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Email</p>
                                    <p className="text-sm font-medium text-gray-800 break-all">{zone.contact_email || 'Chưa cập nhật'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========================================== */}
            {/* COMPANY LIST & DASHBOARD - FULL WIDTH ROWS */}
            {/* ========================================== */}
            <div className="flex flex-col gap-6">
                {/* TOP: COMPANY LIST - FULL WIDTH */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                        <Factory className="size-[18px] text-gray-400" />
                        <h2 className="text-base font-bold text-gray-800">Danh sách doanh nghiệp thuộc khu công nghiệp</h2>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: BRAND_LIGHT, color: BRAND }}>
                            {companiesInZone.length}
                        </span>
                    </div>

                    {companiesInZone.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                            <Factory className="size-12 mb-3" />
                            <p className="text-gray-400 font-medium text-sm">Chưa có doanh nghiệp nào thuộc khu công nghiệp này.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 xxl:grid-cols-5 gap-4">
                            {companiesInZone.map(company => (
                                <CompanyCard
                                    key={company.company_id || company.company_name || company.id || company._id}
                                    company={company}
                                    canViewDetails={canViewCompanyDetails}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* BOTTOM: RESOURCE & CO₂ DASHBOARD - FULL WIDTH */}
                {canViewCO2AndDashboard && (
                    <div className="w-full">
                        <ZoneResourceDashboard zoneId={zone?.zone_id || zoneId} userRole={userRole} />
                    </div>
                )}
            </div>

            {/* DELETE CONFIRMATION DIALOG */}
            {isAdminContext && (
                <ConfirmDeleteDialog
                    open={dialogState.isOpen}
                    onClose={() => setDialogState({ isOpen: false })}
                    onConfirm={handleConfirmDelete}
                    actionType="soft-delete"
                    selectedIds={[zoneId]}
                    entityType="zone"
                    previewMutation={previewSoftDeleteMutation}
                    deleteMutation={deleteMutation}
                    columns={[
                        'Tên khu công nghiệp',
                        'Số lượng công ty ảnh hưởng',
                        'Số lượng tài khoản ảnh hưởng'
                    ]}
                    renderRow={(row) => (
                        <>
                            <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                                {row.zone_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                                {row.affectedCompaniesCount || 0}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                                {row.affectedUsersCount || 0}
                            </td>
                        </>
                    )}
                />
            )}
        </div>
    );
};

export default ZoneDetail;
