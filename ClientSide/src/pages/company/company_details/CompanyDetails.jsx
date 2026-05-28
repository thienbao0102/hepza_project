// src/pages/CompanyDetails.jsx
import React, { useEffect } from "react";
import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@app/providers/auth/AuthProvider";
import { useCompany } from "@features/company/hooks/useCompanyQueries";
import { useNotification } from "@/app/providers/notification/NotificationProvider";
import { useZone } from "@features/industrialzone/hooks/useZoneQueries";
import { usePreviewSoftDeleteCompany, useDeleteCompany } from "@features/enterprises/hooks/useCompanyMutations";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import { useEnvReports } from '@/features/resources/hooks/useEnvironmentalReport';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Notification from "@components/common/Notifications";
import { TableCell } from "@mui/material";
import {
    LayoutDashboard,
    Database,
    Trash2,
    History,
    Info,
    Droplets,
    Zap,
    Wind,
    ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import "./CompanyDetails.css";
import ConpanyInfomationPage from "./CompanyInfomationPage";
import CompanyOverviewStats from "./CompanyOverviewStats";
import CompanyResourcesTab from "./CompanyResourcesTab";
import CompanyWastesTab from "./CompanyWastesTab";
import ReportTable from "@/features/resources/components/ReportTable";
import { useHeader } from "@/components/common/Header/HeaderContext";
import dayjs from "dayjs";

const TABS = [
    { id: 'TONG_QUAN_DN', label: 'Thông tin chung', icon: Info },
    { id: 'TONG_QUAN_SL', label: 'Tổng quan số liệu', icon: LayoutDashboard },
    { id: 'DU_LIEU_TN', label: 'Dữ liệu tài nguyên', icon: Zap },
    { id: 'DU_LIEU_CT', label: 'Dữ liệu chất thải', icon: Trash2 },
    { id: 'KHAI_BAO_TN_CT', label: 'Lịch sử khai báo', icon: History },
];

export default function CompanyDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState(TABS[0].id);
    const role = user?.role ?? user?.user?.role;
    const isAdminOrManager = role === 'admin' || role === 'manager';

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [notification, setNotification] = useState({ open: false, type: '', title: '', description: '' });

    // Mutation hooks for delete
    const previewSoftDeleteMutation = usePreviewSoftDeleteCompany();
    const deleteCompanyMutation = useDeleteCompany();

    const {
        data: companyFetchData,
        isLoading: companyLoading,
        isError: companyError,
        error: companyErrorMsg,
    } = useCompany(id);

    const company = companyFetchData?.company || null;

    const companyId = company?.company_id || company?._id || company?.id;

    // Check if company has uploaded env report for current year
    const currentYear = new Date().getFullYear();
    const { data: envReports = [] } = useEnvReports(companyId, { enabled: !!companyId && role === 'company' });
    const showEnvAlert = role === 'company' && !envReports.some(r => r.year === currentYear);

    const { setHeaderConfig, setBreadcrumbItems, date } = useHeader();

    useEffect(() => {

        setHeaderConfig({
            title: "Thông tin chi tiết doanh nghiệp",
            description: company?.company_name,
            showWeather: true,
            showDatePicker: true,
            rightContent: role === 'admin' ? (
                <button
                    onClick={() => setDeleteDialogOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 hover:border-red-300 transition-all duration-200 cursor-pointer"
                >
                    <Trash2 size={16} />
                    <span>Vô hiệu hóa</span>
                </button>
            ) : null,
        });

        setBreadcrumbItems([
            {
                key: `/business`,
                title: "Quản lý doanh nghiệp"
            },
            {
                key: `/business/${id}`,
                title: company?.company_name
            },
        ]);

        return () => {
            setBreadcrumbItems(null);
            setHeaderConfig({ title: "", description: "" });
        };
    }, [id, company]);//Dependencies theo thông tin cần hiện trong breadcrumb & header

    // Lấy thông tin zone theo company.zone_id
    const {
        data: zoneFetchData,
        isLoading: zoneLoading,
        isError: zoneError,
    } = useZone(company?.zone_id, { enabled: !!company?.zone_id });

    const zone = zoneFetchData?.zone || null;
    const zoneId = company?.zone_id || zone?.zone_id || zone?.id;

    if (companyLoading) {
        return (
            <div className="flex items-center justify-center min-h-full">
                <LoadingSpinner tip="Đang tải thông tin công ty..." />
            </div>
        );
    }

    if (companyError) {
        return (
            <div className="flex items-center justify-center min-h-full">
                <p className="text-red-500">Lỗi: {companyErrorMsg?.message}</p>
            </div>
        );
    }

    if (!company) {
        return (
            <div className="flex items-center justify-center min-h-full">
                <p>Không tìm thấy doanh nghiệp.</p>
            </div>
        );
    }

    // Hàm để render nội dung tương ứng với tab đang hoạt động
    const renderContent = () => {
        const isAllYear = date?.startsWith("00/");
        const yearFromDate = isAllYear ? Number(date.split("/")[1]) : null;
        const parsedDate = isAllYear ? null : (date ? dayjs(date, "MM/YYYY") : dayjs());
        const selectedYear = isAllYear ? yearFromDate : (parsedDate?.isValid() ? parsedDate.year() : dayjs().year());

        const tabProps = { role, companyId, zoneId, selectedDate: parsedDate, isAllYear, selectedYear };

        switch (activeTab) {
            case 'TONG_QUAN_SL':
                return <CompanyOverviewStats {...tabProps} />;
            case 'DU_LIEU_TN':
                return <CompanyResourcesTab {...tabProps} />;
            case 'DU_LIEU_CT':
                return <CompanyWastesTab {...tabProps} />;
            case 'KHAI_BAO_TN_CT':
                return (
                    <div className="h-full w-full flex flex-col">
                        <ReportTable role={role} companyId={companyId} zoneId={zoneId} />
                    </div>
                );
            case 'TONG_QUAN_DN':
            default:
                return <ConpanyInfomationPage role={role} company={company} zone={zone} />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#f8fafc]">
            <div className="flex flex-col h-full gap-2.5">
                {/* Navigation Container - Sticky at top */}
                <div className="tab-navigation-wrapper sticky top-0 z-30 pt-1 bg-[#f8fafc]/80 backdrop-blur-md">
                    <div className="tab-navigation-container shadow-sm border border-black/5">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`modern-tab-item ${isActive ? 'active' : ''}`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-pill"
                                            className="absolute inset-0 bg-white shadow-sm rounded-xl z-0"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <div className="relative z-10 flex items-center gap-2.5">
                                        <div className={`tab-icon-wrapper ${isActive ? 'active' : ''}`}>
                                            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                        </div>
                                        <span className={`tab-label ${isActive ? 'active' : ''}`}>
                                            {tab.label}
                                        </span>
                                        {tab.id === 'TONG_QUAN_DN' && showEnvAlert && (
                                            <span className="relative flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="h-full w-full"
                        >
                            {renderContent()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Delete dialog */}
            {role === 'admin' && (
                <ConfirmDeleteDialog
                    open={deleteDialogOpen}
                    onClose={() => setDeleteDialogOpen(false)}
                    onConfirm={() => {
                        setDeleteDialogOpen(false);
                        const basePath = '/admin/business';
                        navigate(basePath, {
                            state: {
                                notification: {
                                    type: 'success',
                                    title: 'Thành công',
                                    description: `Đã vô hiệu hóa doanh nghiệp "${company?.company_name}" thành công.`
                                }
                            }
                        });
                    }}
                    title="Xác nhận vô hiệu hóa doanh nghiệp"
                    isHardDelete={false}
                    selectedIds={companyId ? [companyId] : []}
                    previewMutation={previewSoftDeleteMutation}
                    deleteMutation={deleteCompanyMutation}
                    columns={['Doanh nghiệp', 'Tài khoản người dùng/ Đại diện']}
                    renderRow={(item) => {
                        const name = item.company_name || 'Không xác định';
                        const affectedUsers = item.affectedUsers || [];
                        const userNames = affectedUsers.length > 0
                            ? affectedUsers.map((u) => u.full_name || u.email || 'Không có tên').join(', ')
                            : 'Không có';
                        return (
                            <>
                                <TableCell sx={{ borderBottom: '1px solid #f0f0f0' }}>{name}</TableCell>
                                <TableCell sx={{ borderBottom: '1px solid #f0f0f0' }}>{userNames}</TableCell>
                            </>
                        );
                    }}
                />
            )}

            <Notification
                open={notification.open}
                type={notification.type}
                title={notification.title}
                description={notification.description}
                onClose={() => setNotification({ ...notification, open: false })}
            />
        </div>
    );
}
