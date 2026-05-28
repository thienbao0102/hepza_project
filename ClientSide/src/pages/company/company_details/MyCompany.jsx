import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Users } from "lucide-react";
import { useCompany } from "@features/company/hooks/useCompanyQueries";
import { useZone } from "@features/industrialzone/hooks/useZoneQueries";
import { useAuthenticatedUser } from "@/features/auth/hooks/useAuthQueries";
import { useHeader } from "@/components/common/Header/HeaderContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import CompanyInfomationPage from "./CompanyInfomationPage";
import CompanySubAccounts from "@pages/company/components/CompanySubAccounts";
import "./CompanyDetails.css";

export default function MyCompany() {
    const navigate = useNavigate();
    const location = useLocation();
    const { setHeaderConfig, setBreadcrumbItems } = useHeader();

    const { data: userData, isLoading: userLoading } = useAuthenticatedUser();
    const companyId = userData?.company_id || userData?.user?.company_id;

    const {
        data: companyFetchData,
        isLoading: companyLoading,
        isError: companyError,
        error: companyErrorMsg,
    } = useCompany(companyId);

    const company = companyFetchData?.company || null;

    const { data: zoneFetchData } = useZone(company?.zone_id, {
        enabled: !!company?.zone_id,
    });

    const zone = zoneFetchData?.zone || null;

    const pathSegments = location.pathname.split("/");
    const currentSegment = pathSegments[pathSegments.length - 1];
    const [activeTab, setActiveTab] = useState(currentSegment);

    useEffect(() => {
        setActiveTab(currentSegment);
    }, [currentSegment]);

    useEffect(() => {
        setHeaderConfig({
            title: "Doanh nghiệp của tôi",
            description:
                company?.company_name ||
                "Theo dõi thông tin doanh nghiệp và nhân sự nội bộ của bạn",
            showWeather: true,
            showDatePicker: false,
        });

        setBreadcrumbItems([
            {
                key: "/overview",
                title: "Doanh nghiệp của tôi",
            },
            {
                key: "/my-information/business",
                title: company?.company_name || "Thông tin doanh nghiệp",
            },
        ]);
    }, [company, setBreadcrumbItems, setHeaderConfig]);

    const currentUserId = useMemo(
        () => String(userData?.user_id || userData?.user?.user_id || ""),
        [userData]
    );
    const representativeUserId = useMemo(
        () => String(company?.representative_user_id || ""),
        [company?.representative_user_id]
    );
    const isMainUser = !!currentUserId && currentUserId === representativeUserId;

    useEffect(() => {
        if (currentSegment === "subaccounts" && !isMainUser) {
            navigate("/my-information/business", { replace: true });
        }
    }, [currentSegment, isMainUser, navigate]);

    const tabs = [{ id: "business", label: "Thông tin doanh nghiệp", icon: Building2 }];

    if (isMainUser) {
        tabs.push({ id: "subaccounts", label: "Nhân sự", icon: Users });
    }

    const handleTabClick = (path) => {
        navigate(`/my-information/${path}`);
    };

    const renderContent = () => {
        switch (currentSegment) {
            case "business":
                return <CompanyInfomationPage company={company} zone={zone} />;
            case "subaccounts":
                return isMainUser ? (
                    <CompanySubAccounts />
                ) : (
                    <div className="p-4 text-center">Bạn không có quyền truy cập mục nhân sự.</div>
                );
            default:
                return <CompanyInfomationPage company={company} zone={zone} />;
        }
    };

    if (userLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <LoadingSpinner tip="Đang tải thông tin người dùng..." />
            </div>
        );
    }

    if (!companyId) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p>Tài khoản không liên kết với doanh nghiệp nào.</p>
            </div>
        );
    }

    if (companyLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <LoadingSpinner tip="Đang tải thông tin doanh nghiệp..." />
            </div>
        );
    }

    if (companyError) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-red-500">Lỗi: {companyErrorMsg?.message}</p>
            </div>
        );
    }

    if (!company) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p>Không tìm thấy doanh nghiệp.</p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-[#f8fafc]">
            <div className="flex h-full flex-col gap-2.5">
                <div className="tab-navigation-wrapper sticky top-0 z-30 bg-[#f8fafc]/80 pt-1 backdrop-blur-md">
                    <div className="tab-navigation-container border border-black/5 shadow-sm">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabClick(tab.id)}
                                    className={`modern-tab-item ${isActive ? "active" : ""}`}
                                >
                                    {isActive ? (
                                        <motion.div
                                            layoutId="active-pill"
                                            className="absolute inset-0 z-0 rounded-xl bg-white shadow-sm"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    ) : null}

                                    <div className="relative z-10 flex items-center gap-2.5">
                                        <div className={`tab-icon-wrapper ${isActive ? "active" : ""}`}>
                                            <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                                        </div>
                                        <span className={`tab-label ${isActive ? "active" : ""}`}>
                                            {tab.label}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
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
        </div>
    );
}
