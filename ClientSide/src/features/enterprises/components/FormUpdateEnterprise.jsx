import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Select, DatePicker, ConfigProvider, Divider } from 'antd';
import dayjs from "dayjs";
import { motion, AnimatePresence } from "framer-motion";
import toast from '@/utils/toast';
import {
    ArrowLeft,
    Building2,
    Briefcase,
    Users,
    CheckCircle2,
    ChevronRight,
    Save,
    Info
} from "lucide-react";
import { handlerGetCompanyById } from "@services/companyService";
import { handlerGetAllZones } from "@services/zoneService";
import { handlerGetAllIndustries, handlerGetAllIndustryGroups } from "@services/industryService";
import { handlerLookupTaxCode } from "@services/taxLookupService";
import { useUpdateCompany } from "@features/enterprises/hooks/useCompanyMutations";
import { useSetCompanyRepresentative } from "@features/enterprises/hooks/useCompanyMutations";
import { useCompanies } from "@features/company/hooks/useCompanyQueries";
import { useUsersByRole } from "@features/admin/hooks/useUserQueries";
import { mapErrorToNotification } from '@/utils/Error/mapErrorToNotification';
import { useHeader } from '@/components/common/Header/HeaderContext';
import ConfirmationModal from "@/components/common/ConfirmationModal";
import locale from 'antd/es/date-picker/locale/vi_VN';
import { useAuthenticatedUser } from '@features/auth/hooks/useAuthQueries';
import { buildIdNameMaps, normalizeSelectionToIds } from '@/utils/industryValueUtils';

// --- Linear Style Components ---

const LinearInput = ({ label, required, error, className, disabled = false, ...props }) => (
    <div className="space-y-1.5 w-full">
        <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
            {label}
            {required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            <input
                className={`w-full h-11 px-3 bg-gray-50 border border-transparent rounded-xl text-sm text-gray-900 
                placeholder-gray-400 transition-all duration-200 ease-in-out
                focus:bg-white focus:border-[#4E5BA6] focus:ring-4 focus:ring-[#4E5BA6]/10 focus:outline-none 
                hover:bg-white hover:border-gray-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:hover:border-transparent ${className}`}
                disabled={disabled}
                {...props}
            />
        </div>
        {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
);

const FormUpdateEnterprise = () => {
    const navigate = useNavigate();
    const { company_id } = useParams();
    const [currentStep, setCurrentStep] = useState(1);
    const steps = [
        { id: 1, key: "basic", title: "Thông tin chung", icon: Building2, subtitle: "Điều chỉnh các thông tin định danh và địa lý của doanh nghiệp." },
        { id: 2, key: "details", title: "Lĩnh vực hoạt động", icon: Briefcase, subtitle: "Cập nhật các lĩnh vực kinh doanh để đồng bộ hóa báo cáo hệ thống." },
        { id: 3, key: "contact", title: "Liên hệ & Quy mô", icon: Users, subtitle: "Chỉnh sửa thông tin nhân sự và đầu mối liên hệ chính thức." }
    ];
    const activeSection = steps[currentStep - 1].key;
    const activeIndex = currentStep - 1;

    const [formData, setFormData] = useState({
        company_id: "",
        company_name: "",
        company_registration_number_base: "",
        company_registration_number_branch: "",
        address: "",
        company_type: "",
        zone_id: "",
        industry: [],
        industry_group: [],
        total_workers: "",
        founded_year: "",
        website: "",
        revenue: "",
        market: "",
        full_name: "",
        email: "",
        phone_number: "",
        __v: null,
    });

    const [allZones, setAllZones] = useState([]);
    const [industryGroups, setIndustryGroups] = useState([]);
    const [allIndustries, setAllIndustries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isTaxLookupLoading, setIsTaxLookupLoading] = useState(false);
    const updateCompanyMutation = useUpdateCompany();
    const { data: companiesData } = useCompanies({ page: 1, limit: 9999 });
    const companies = companiesData?.companies || [];
    const [originalZoneId, setOriginalZoneId] = useState(null);
    const { setHeaderConfig, setBreadcrumbItems } = useHeader();
    const { data: user } = useAuthenticatedUser();
    const currentRole = user?.role || user?.user?.role;
    const currentZoneId = user?.zone_id || user?.user?.zone_id || "";
    const currentZoneName = user?.zone_name || user?.user?.zone_name || "";
    const isManager = currentRole === 'manager';
    const resolvedManagerZoneName = currentZoneName || allZones.find(
        (zone) => String(zone.zone_id || zone.id) === String(currentZoneId || '')
    )?.zone_name || currentZoneId;
    const canManageRepresentative = currentRole === 'admin' || currentRole === 'manager';
    const [isRepresentativeModalOpen, setIsRepresentativeModalOpen] = useState(false);
    const [currentRepresentativeUserId, setCurrentRepresentativeUserId] = useState("");
    const [selectedRepresentativeUserId, setSelectedRepresentativeUserId] = useState("");
    const setRepresentativeMutation = useSetCompanyRepresentative();
    const {
        data: representativeUsersData,
        isLoading: isRepresentativeUsersLoading,
    } = useUsersByRole({
        role: 'company',
        page: 1,
        limit: 100,
        filters: { company: company_id },
        enabled: canManageRepresentative && isRepresentativeModalOpen && !!company_id,
    });

    const handleNext = () => {
        if (currentStep < steps.length) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    useEffect(() => {
        const abortController = new AbortController();

        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const [zonesResponse, industryGroupsResponse, industriesResponse, companyResponse] = await Promise.all([
                    handlerGetAllZones(1, 1000, undefined, abortController.signal),
                    handlerGetAllIndustryGroups({ page: 1, limit: 1000 }, undefined, undefined, abortController.signal),
                    handlerGetAllIndustries({ page: 1, limit: 1000 }, undefined, undefined, undefined, abortController.signal),
                    handlerGetCompanyById(company_id, abortController.signal),
                ]);

                if (zonesResponse.zones) setAllZones(zonesResponse.zones);
                if (Array.isArray(industryGroupsResponse.groups)) setIndustryGroups(industryGroupsResponse.groups);
                if (industriesResponse.industries) setAllIndustries(industriesResponse.industries);

                if (companyResponse.company) {
                    const { company } = companyResponse;
                    const groupMaps = buildIdNameMaps(industryGroupsResponse.groups || [], 'group_id', 'group_name');
                    const industryMaps = buildIdNameMaps(industriesResponse.industries || [], 'industry_id', 'industry_name');
                    // Parse MST thanh base + branch
                    let mstBase = '';
                    let mstBranch = '';
                    const rawMst = company.company_registration_number || '';
                    if (rawMst && !rawMst.startsWith('REG-')) {
                        if (rawMst.includes('-')) {
                            const parts = rawMst.split('-');
                            mstBase = parts[0] || '';
                            mstBranch = parts[1] || '';
                        } else {
                            mstBase = rawMst;
                        }
                    }
                    const mappedData = {
                        company_name: company.company_name || "",
                        company_registration_number_base: mstBase,
                        company_registration_number_branch: mstBranch,
                        website: company.website || "",
                        address: company.address || "",
                        company_type: company.company_type || "",
                        zone_id: company.zone_id || "",
                        industry: normalizeSelectionToIds(company.industry, industryMaps),
                        industry_group: normalizeSelectionToIds(company.industry_group, groupMaps),
                        total_workers: company.total_workers || "",
                        revenue: company.revenue || "",
                        market: company.market || "",
                        founded_year: company.founded_year || "",
                        company_id: company.company_id || "",
                        full_name: company.full_name || "",
                        email: company.email || "",
                        phone_number: company.phone_number || "",
                        __v: company.__v ?? null,
                    };
                    setFormData(mappedData);
                    setOriginalZoneId(company.zone_id);
                    setCurrentRepresentativeUserId(company.representative_user_id || "");
                    setSelectedRepresentativeUserId("");

                    // Update header config dynamically with company name
                    setHeaderConfig({
                        title: isManager
                            ? `Cập nhật doanh nghiệp | ${resolvedManagerZoneName || currentZoneId || "KCN được phân công"}`
                            : `Cập nhật: ${company.company_name}`,
                        description: isManager
                            ? `Bạn đang chỉnh sửa ${company.company_name} thuộc ${resolvedManagerZoneName || currentZoneId || "khu công nghiệp được phân công"}`
                            : "Chỉnh sửa thông tin chi tiết doanh nghiệp trong cơ sở dữ liệu",
                        showWeather: true,
                        showDatePicker: true,
                    });
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
                const { title, description } = mapErrorToNotification(error, 'GET_COMPANY');
                toast.error(title ?? 'Không thể tải thông tin doanh nghiệp.', description ?? (error.message || ''));
            } finally {
                setLoading(false);
            }
        };

        if (company_id) fetchInitialData();

        const basePath = isManager ? "/manager" : "/admin";
        setBreadcrumbItems([
            { key: `${basePath}/business`, title: "Doanh nghiệp" },
            { key: `${basePath}/business/update-business`, title: "Cập nhật doanh nghiệp" },
            { key: `${basePath}/business/update-business/${company_id}`, title: formData.company_name || company_id },
        ]);

        return () => abortController.abort();
    }, [company_id, currentZoneId, formData.company_name, isManager, resolvedManagerZoneName, setBreadcrumbItems, setHeaderConfig]);

    useEffect(() => {
        if (formData.zone_id && originalZoneId && formData.zone_id !== originalZoneId && companies.length > 0) {
            const companiesInZone = companies.filter((c) => c.zone_id === formData.zone_id).length;
            const nextCompanyNumber = (companiesInZone + 1).toString().padStart(5, "0");
            const newCompanyId = `${formData.zone_id}DN${nextCompanyNumber}`;
            setFormData((prev) => (prev.company_id !== newCompanyId ? { ...prev, company_id: newCompanyId } : prev));
        }
    }, [formData.zone_id, originalZoneId, companies]);

    const handleChange = (name, value) => {
        const fieldName = typeof name === 'string' ? name : name.target.name;
        const fieldValue = typeof name === 'string' ? value : name.target.value;
        setFormData((prev) => ({ ...prev, [fieldName]: fieldValue }));
    };

    const handleTaxLookup = async () => {
        const mstBase = formData.company_registration_number_base?.trim();
        const mstBranch = formData.company_registration_number_branch?.trim();
        const taxCode = mstBase ? (mstBranch ? `${mstBase}-${mstBranch}` : mstBase) : '';

        if (!taxCode) {
            toast.error('Thiếu MST', 'Vui lòng nhập mã số thuế trước khi tra cứu.');
            return;
        }

        setIsTaxLookupLoading(true);
        try {
            const result = await handlerLookupTaxCode(taxCode);
            setFormData((prev) => ({
                ...prev,
                company_name: result.company_name || prev.company_name,
                address: result.address || prev.address,
            }));
            toast.success(
                'Tra cứu MST thành công',
                'Tên doanh nghiệp và địa chỉ đã được tự động điền từ dữ liệu MST.'
            );
        } catch (error) {
            toast.error('Không thể tra cứu MST', error.message || 'Vui lòng kiểm tra lại MST và thử lại.');
        } finally {
            setIsTaxLookupLoading(false);
        }
    };

    const representativeUsers = representativeUsersData?.users || [];
    const currentRepresentative = representativeUsers.find(
        (candidate) => String(candidate?.user_id || '') === String(currentRepresentativeUserId || '')
    );
    const representativeCandidates = representativeUsers.filter(
        (candidate) => String(candidate?.user_id || '') !== String(currentRepresentativeUserId || '')
    );

    useEffect(() => {
        if (!isRepresentativeModalOpen) return;
        if (representativeCandidates.length === 0) {
            setSelectedRepresentativeUserId("");
            return;
        }

        const hasSelectedCandidate = representativeCandidates.some(
            (candidate) => String(candidate?.user_id || '') === String(selectedRepresentativeUserId || '')
        );

        if (!hasSelectedCandidate) {
            setSelectedRepresentativeUserId(representativeCandidates[0]?.user_id || "");
        }
    }, [isRepresentativeModalOpen, representativeCandidates, selectedRepresentativeUserId]);

    const closeRepresentativeModal = () => {
        if (setRepresentativeMutation.isPending) return;
        setIsRepresentativeModalOpen(false);
        setSelectedRepresentativeUserId("");
    };

    const handleRepresentativeChange = async () => {
        if (!selectedRepresentativeUserId) {
            throw new Error("Vui lòng chọn một tài khoản để gán làm người đại diện.");
        }

        const result = await setRepresentativeMutation.mutateAsync({
            company_id,
            representative_user_id: selectedRepresentativeUserId,
        });

        const updatedCompany = result?.company;
        if (!updatedCompany?.representative_user_id) {
            throw new Error("Không thể cập nhật người đại diện. Vui lòng thử lại.");
        }

        setCurrentRepresentativeUserId(updatedCompany.representative_user_id || "");
        setFormData((prev) => ({
            ...prev,
            full_name: updatedCompany.full_name || "",
            email: updatedCompany.email || "",
            phone_number: updatedCompany.phone_number || "",
        }));
        toast.success("Thành công", "Đã cập nhật người đại diện của doanh nghiệp.");
        closeRepresentativeModal();
    };

    const fallbackIndustryGroups = [
        'Cơ khí, điện, điện tử', 'Hóa dược, cao su, nhựa', 'Chế biến lương thực, thực phẩm',
        'Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất', 'May mặc, thuộc da, dệt nhuộm', 'Khác'
    ];

    const groupMaps = React.useMemo(
        () => buildIdNameMaps(industryGroups, 'group_id', 'group_name'),
        [industryGroups]
    );

    const selectedGroupIds = React.useMemo(
        () => normalizeSelectionToIds(formData.industry_group, groupMaps),
        [formData.industry_group, groupMaps]
    );

    const groupedIndustries = React.useMemo(() => {
        return allIndustries.reduce((acc, industry) => {
            const groupId = industry.group_id;
            const groupName = groupMaps.nameById[groupId] || groupId;
            if (!acc[groupId]) acc[groupId] = { groupName, industries: [] };
            acc[groupId].industries.push(industry);
            return acc;
        }, {});
    }, [allIndustries, groupMaps.nameById]);

    const industriesByGroupId = React.useMemo(() => {
        if (selectedGroupIds.length === 0) return groupedIndustries;
        return selectedGroupIds.reduce((acc, groupId) => {
            if (groupedIndustries[groupId]) acc[groupId] = groupedIndustries[groupId];
            return acc;
        }, {});
    }, [groupedIndustries, selectedGroupIds]);

    const hasSelectedGroup = selectedGroupIds.length > 0;

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        const mstBase = formData.company_registration_number_base?.trim();
        const mstBranch = formData.company_registration_number_branch?.trim();
        const company_registration_number = mstBase
            ? (mstBranch ? `${mstBase}-${mstBranch}` : mstBase)
            : null;

        const payload = {
            ...formData,
            company_registration_number,
            total_workers: formData.total_workers ? Number(formData.total_workers) : null,
            founded_year: formData.founded_year ? Number(formData.founded_year) : null,
        };
        delete payload.company_registration_number_base;
        delete payload.company_registration_number_branch;
        updateCompanyMutation.mutate(
            { company_id, companyData: payload },
            {
                onSuccess: () => {
                    toast.success("Thành công", "Cập nhật doanh nghiệp thành công!");
                    setTimeout(() => {
                        const basePath = window.location.pathname.startsWith('/admin') ? '/admin' : '/manager';
                        navigate(`${basePath}/business`);
                    }, 1000);
                },
                onError: (error) => {
                    const { title, description } = mapErrorToNotification(error, 'UPDATE_COMPANY');
                    toast.error(title ?? 'Đã xảy ra lỗi khi cập nhật.', description ?? (error.message || ''));
                },
            }
        );
    };

    const companyTypeOptions = ["Nhà nước", "Tư nhân", "Liên doanh", "FDI", "Hợp tác xã", "Khác"];

    const representativeModalContent = (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Người đại diện hiện tại
                </p>
                <div className="mt-2 space-y-1">
                    <p className="text-sm font-semibold text-slate-900">
                        {formData.full_name || currentRepresentative?.full_name || "Chưa có dữ liệu"}
                    </p>
                    <p className="text-sm text-slate-600">
                        {formData.email || currentRepresentative?.email || "Chưa có email liên hệ"}
                    </p>
                    <p className="text-sm text-slate-500">
                        {formData.phone_number || currentRepresentative?.phone_number || "Chưa có số điện thoại"}
                    </p>
                </div>
            </div>

            <div className="rounded-2xl border border-[#4E5BA6]/15 bg-[#4E5BA6]/5 px-4 py-3 text-sm leading-relaxed text-slate-700">
                Chỉ có thể gán lại người đại diện từ các tài khoản doanh nghiệp đang hoạt động của doanh nghiệp này.
            </div>

            {isRepresentativeUsersLoading ? (
                <div className="flex items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500">
                    <div className="h-5 w-5 rounded-full border-2 border-[#4E5BA6]/20 border-t-[#4E5BA6] animate-spin" />
                    <span>Đang tải danh sách tài khoản doanh nghiệp...</span>
                </div>
            ) : representativeCandidates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm leading-relaxed text-slate-600">
                    Doanh nghiệp này chưa có tài khoản phù hợp để gán làm người đại diện. Vui lòng tạo hoặc khôi phục một tài khoản trước.
                </div>
            ) : (
                <div className="space-y-3">
                    {representativeCandidates.map((candidate) => {
                        const isSelected = String(candidate?.user_id || '') === String(selectedRepresentativeUserId || '');
                        return (
                            <button
                                key={candidate.user_id}
                                type="button"
                                onClick={() => setSelectedRepresentativeUserId(candidate.user_id)}
                                className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${isSelected
                                    ? "border-[#4E5BA6] bg-[#4E5BA6]/6 shadow-sm shadow-[#4E5BA6]/10"
                                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900">{candidate.full_name || "Chưa cập nhật họ tên"}</p>
                                        <p className="mt-1 text-sm text-slate-600">{candidate.email || "Chưa có email"}</p>
                                        <p className="mt-1 text-sm text-slate-500">{candidate.phone_number || "Chưa có số điện thoại"}</p>
                                    </div>
                                    <div className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-[#4E5BA6] bg-[#4E5BA6]" : "border-slate-300 bg-white"}`}>
                                        <div className="h-2 w-2 rounded-full bg-white" />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );

    if (loading) return <div className="flex justify-center items-center h-[calc(100dvh-64px)] text-gray-400 font-medium">{"Đang tải dữ liệu doanh nghiệp..."}</div>;

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#4E5BA6',
                    borderRadius: 12,
                    colorBorder: 'transparent',
                    colorBgContainer: '#F9FAFB',
                    controlHeight: 44,
                    fontSize: 14,
                    fontFamily: "'Inter', sans-serif"
                },
                components: {
                    Select: {
                        colorBgContainer: '#F9FAFB',
                        hoverBg: '#FFFFFF',
                        activeBg: '#FFFFFF',
                        colorBorder: 'transparent',
                        hoverBorderColor: '#E5E7EB',
                        activeBorderColor: '#4E5BA6',
                        activeShadow: '0 0 0 4px rgba(78, 91, 166, 0.1)',
                    },
                    DatePicker: {
                        colorBgContainer: '#F9FAFB',
                        hoverBg: '#FFFFFF',
                        activeBg: '#FFFFFF',
                        colorBorder: 'transparent',
                        hoverBorderColor: '#E5E7EB',
                        activeBorderColor: '#4E5BA6',
                        activeShadow: '0 0 0 4px rgba(78, 91, 166, 0.1)',
                    },
                    Input: {
                        colorBgContainer: '#F9FAFB',
                        hoverBg: '#FFFFFF',
                        activeBg: '#FFFFFF',
                        colorBorder: 'transparent',
                        hoverBorderColor: '#E5E7EB',
                        activeBorderColor: '#4E5BA6',
                        activeShadow: '0 0 0 4px rgba(78, 91, 166, 0.1)',
                    }
                }
            }}
        >
            <div className="h-[calc(100dvh-64px)] bg-[#F8FAFC] md:pb-8 font-sans overflow-hidden flex items-center justify-center">
                <div className="w-full h-full grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Left Sidebar */}
                    <div className="md:col-span-3 xl:col-span-3 flex flex-col h-full gap-5">
                        <div className="bg-white rounded-[20px] p-3 shadow-sm border border-gray-100 flex flex-col gap-2">
                            {steps.map((step) => (
                                <button
                                    key={step.id}
                                    onClick={() => setCurrentStep(step.id)}
                                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 w-full text-left ${currentStep === step.id
                                        ? "bg-[#4E5BA6] text-white shadow-md shadow-[#4E5BA6]/20"
                                        : currentStep > step.id
                                            ? "text-[#4E5BA6] bg-[#4E5BA6]/5"
                                            : "text-gray-500 hover:bg-[#4E5BA6]/5 hover:text-[#4E5BA6]"
                                        }`}
                                >
                                    <step.icon size={18} className={currentStep === step.id ? "text-white" : "text-gray-400"} />
                                    <span>{step.title}</span>
                                    {currentStep === step.id && <ChevronRight size={16} className="ml-auto text-white/60" />}
                                </button>
                            ))}
                        </div>

                        {/* Regulations Card */}
                        <div className="bg-[#4E5BA6]/5 rounded-[20px] p-5 border border-[#4E5BA6]/20 flex flex-col gap-3">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-[#4E5BA6]/10 rounded-xl shrink-0">
                                    <Info size={18} className="text-[#4E5BA6]" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#4E5BA6] text-sm mb-2">{"Thông tin sửa đổi"}</h4>
                                    <ul className="text-xs text-[#4E5BA6]/80 space-y-2 list-disc pl-3 leading-relaxed">
                                        {activeSection === "basic" && (
                                            <>
                                                <li>{"Thay đổi Khu công nghiệp sẽ tự động cập nhật lại Mã số doanh nghiệp."}</li>
                                                <li>{"Mã số doanh nghiệp mới sẽ được tính dựa trên số lượng đơn vị hiện có tại khu đó."}</li>
                                            </>
                                        )}
                                        {activeSection === "details" && (
                                            <>
                                                <li>{"Cập nhật ngành nghề sẽ ảnh hưởng đến các biểu mẫu báo cáo định kỳ."}</li>
                                                <li>{"Vui lòng kiểm tra lại các nghị định liên quan sau khi thay đổi lĩnh vực."}</li>
                                            </>
                                        )}
                                        {activeSection === "contact" && (
                                            <>
                                                <li>{"Đảm bảo thông tin liên hệ là chính chủ để nhận thông báo khẩn cấp."}</li>
                                                <li>{"Quy mô nhân sự nên được cập nhật khớp với báo cáo bảo hiểm gần nhất."}</li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Actions */}
                        <div className="mt-auto flex flex-col gap-3">
                            <button
                                onClick={handleSubmit}
                                disabled={updateCompanyMutation.isPending || currentStep !== steps.length}
                                className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group ${currentStep === steps.length
                                    ? "bg-[#4E5BA6] text-white shadow-lg shadow-[#4E5BA6]/30 hover:bg-[#3d4885] hover:shadow-xl"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                {updateCompanyMutation.isPending ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>{"Cập nhật dữ liệu"}</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => navigate(-1)}
                                className="w-full py-3.5 rounded-xl bg-white text-gray-500 font-semibold border border-gray-200 hover:bg-gray-50 hover:text-gray-700 transition-all"
                            >
                                {"Hủy thay đổi"}
                            </button>
                        </div>
                    </div>

                    {/* Right Content */}
                    <div className="md:col-span-9 xl:col-span-9 bg-white rounded-[2.5rem] shadow-xl shadow-gray-100 border border-gray-100 flex flex-col overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-[#4E5BA6]">
                            {activeSection === "basic" && <Building2 size={300} />}
                            {activeSection === "details" && <Briefcase size={300} />}
                            {activeSection === "contact" && <Users size={300} />}
                        </div>

                        <div className="p-8 pb-4 shrink-0 flex items-center justify-between border-b border-gray-50">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                                    {steps[currentStep - 1].title}
                                </h2>
                                <div className="flex flex-col gap-1">
                                    <p className="text-sm text-gray-500 font-medium italic">
                                        {steps[currentStep - 1].subtitle}
                                    </p>
                                    <p className="text-sm text-gray-400 font-medium flex items-center gap-2">
                                        <span className="bg-[#4E5BA6]/10 text-[#4E5BA6] px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                                            {"Bước"} {currentStep}
                                        </span>
                                        <span className="opacity-40">/ {steps.length}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 pt-6 pb-20 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeSection}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-6"
                                >
                                    {activeSection === "basic" && (
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-5">
                                            <div className="col-span-1 xl:col-span-2">
                                                <LinearInput
                                                    label="Tên Doanh Nghiệp"
                                                    required
                                                    name="company_name"
                                                    value={formData.company_name}
                                                    onChange={handleChange}
                                                    placeholder="Ví dụ: CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI ABC"
                                                    className="font-medium"
                                                />
                                            </div>

                                            {/* MST Split Input */}
                                            <div className="col-span-1 xl:col-span-2 space-y-1.5">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                    {"Mã Số Thuế (MST) "}<span className="text-red-500">*</span>
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        className="w-[200px] h-11 px-3 bg-gray-50 border border-transparent rounded-xl text-sm text-gray-900 font-mono tracking-widest
                                                        placeholder-gray-400 transition-all duration-200 ease-in-out
                                                        focus:bg-white focus:border-[#4E5BA6] focus:ring-4 focus:ring-[#4E5BA6]/10 focus:outline-none
                                                        hover:bg-white hover:border-gray-200"
                                                        placeholder="0312345678"
                                                        value={formData.company_registration_number_base}
                                                        maxLength={10}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                            handleChange('company_registration_number_base', val);
                                                        }}
                                                        inputMode="numeric"
                                                    />
                                                    <span className="text-gray-400 font-bold text-lg">-</span>
                                                    <input
                                                        className="w-[90px] h-11 px-3 bg-gray-50 border border-transparent rounded-xl text-sm text-gray-900 font-mono tracking-widest text-center
                                                        placeholder-gray-400 transition-all duration-200 ease-in-out
                                                        focus:bg-white focus:border-[#4E5BA6] focus:ring-4 focus:ring-[#4E5BA6]/10 focus:outline-none
                                                        hover:bg-white hover:border-gray-200"
                                                        placeholder="001"
                                                        value={formData.company_registration_number_branch}
                                                        maxLength={3}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                                                            handleChange('company_registration_number_branch', val);
                                                        }}
                                                        inputMode="numeric"
                                                    />
                                                    <span className="text-xs text-gray-400 font-medium ml-1">{"(Chi nhánh)"}</span>
                                                    <button
                                                        type="button"
                                                        onClick={handleTaxLookup}
                                                        disabled={isTaxLookupLoading || !formData.company_registration_number_base}
                                                        className={`ml-2 inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold transition-all ${isTaxLookupLoading || !formData.company_registration_number_base
                                                            ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                                                            : 'bg-[#4E5BA6] text-white shadow-md shadow-[#4E5BA6]/20 hover:bg-[#3d4885]'
                                                            }`}
                                                    >
                                                        {isTaxLookupLoading ? 'Đang tra cứu...' : 'Tra cứu MST'}
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-gray-400 italic">
                                                    {"Nhập 10 số MST gốc. Nếu là chi nhánh/văn phòng đại diện, thêm 3 số phụ (VD: 001, 002)."}
                                                </p>
                                            </div>

                                            <div className="col-span-1 space-y-2">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                    {"Khu Công Nghiệp "}<span className="text-red-500">*</span>
                                                </label>
                                                <Select
                                                    className="w-full"
                                                    placeholder="-- Chọn khu công nghiệp tập trung --"
                                                    value={formData.zone_id || undefined}
                                                    onChange={(value) => handleChange('zone_id', value)}
                                                    showSearch
                                                    optionFilterProp="children"
                                                    size="middle"
                                                    disabled={isManager}
                                                >
                                                    {allZones.map((zone) => (
                                                        <Select.Option key={zone.zone_id} value={zone.zone_id}>
                                                            {zone.zone_name}
                                                        </Select.Option>
                                                    ))}
                                                </Select>
                                            </div>

                                            <div className="col-span-1 space-y-2">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                    {"Mã Số (Thực tế)"}
                                                </label>
                                                <div className="h-[44px] px-3 flex items-center bg-gray-50 rounded-xl border border-transparent text-[#4E5BA6] font-mono text-base font-bold shadow-inner">
                                                    {formData.company_id || "Đang tải mã số..."}
                                                </div>
                                            </div>

                                            <div className="col-span-1 space-y-2">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                    {"Năm Thành Lập"}
                                                </label>
                                                <DatePicker
                                                    picker="year"
                                                    locale={locale}
                                                    className="w-full"
                                                    placeholder="-- Chọn năm thành lập --"
                                                    value={formData.founded_year ? dayjs(String(formData.founded_year), 'YYYY') : null}
                                                    onChange={(date) => handleChange('founded_year', date ? date.year() : "")}
                                                    size="middle"
                                                />
                                            </div>

                                            <div className="col-span-1 space-y-2">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                    {"Loại hình"}
                                                </label>
                                                <Select
                                                    className="w-full"
                                                    placeholder="-- Chọn loại hình doanh nghiệp --"
                                                    value={formData.company_type || undefined}
                                                    onChange={(value) => handleChange('company_type', value)}
                                                    size="middle"
                                                >
                                                    {companyTypeOptions.map((option) => (
                                                        <Select.Option key={option} value={option}>{option}</Select.Option>
                                                    ))}
                                                </Select>
                                            </div>

                                            <div className="col-span-1 xl:col-span-2">
                                                <LinearInput
                                                    label="Địa chỉ trụ sở chính"
                                                    name="address"
                                                    value={formData.address}
                                                    onChange={handleChange}
                                                    placeholder="Số nhà, đường, phường, quận..."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeSection === "details" && (
                                        <div className="space-y-8">
                                            <div className="space-y-2">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                    {"Nhóm Ngành "}<span className="text-red-500">*</span>
                                                </label>
                                                <Select
                                                    mode="multiple"
                                                    className="w-full"
                                                    placeholder="-- Chọn một hoặc nhiều nhóm ngành --"
                                                    value={formData.industry_group}
                                                    onChange={(value) => handleChange('industry_group', value)}
                                                    maxTagCount="responsive"
                                                    style={{ minHeight: 44 }}
                                                    size="middle"
                                                >
                                                    {industryGroups.map((group) => (
                                                        <Select.Option key={group.group_id} value={group.group_id}>
                                                            {group.group_name}
                                                        </Select.Option>
                                                    ))}
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                    {"Chi Tiết Ngành Nghề "}<span className="text-red-500">*</span>
                                                </label>
                                                <Select
                                                    mode="multiple"
                                                    className="w-full"
                                                    placeholder={hasSelectedGroup ? "-- Chọn mã ngành cụ thể --" : "Vui lòng chọn nhóm ngành trước"}
                                                    disabled={!hasSelectedGroup}
                                                    value={formData.industry}
                                                    onChange={(value) => handleChange('industry', value)}
                                                    showSearch
                                                    optionFilterProp="label"
                                                    style={{ minHeight: 44 }}
                                                    size="middle"
                                                >
                                                    {Object.entries(industriesByGroupId).map(([groupId, { groupName, industries }]) => (
                                                        <Select.OptGroup key={groupId} label={groupName}>
                                                            {industries.map((inst) => (
                                                                <Select.Option
                                                                    key={inst.industry_id || inst.industry_name}
                                                                    value={inst.industry_id}
                                                                    label={`${inst.industry_code ? inst.industry_code + ' - ' : ''}${inst.industry_name}`}
                                                                >
                                                                    <div className="flex items-center justify-between gap-2 overflow-hidden">
                                                                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0 border border-gray-200">
                                                                            {inst.industry_code || 'N/A'}
                                                                        </span>
                                                                        <span className="truncate flex-1">
                                                                            {inst.industry_name}
                                                                        </span>
                                                                    </div>
                                                                </Select.Option>
                                                            ))}
                                                        </Select.OptGroup>
                                                    ))}
                                                </Select>
                                            </div>

                                            <div className="p-5 rounded-2xl bg-[#4E5BA6]/5 border border-[#4E5BA6]/20 flex gap-4 items-start">
                                                <CheckCircle2 className="shrink-0 text-[#4E5BA6] mt-1" size={24} />
                                                <div>
                                                    <h4 className="font-bold text-[#4E5BA6] mb-1 text-base">{"Hệ thống phân tích tự động"}</h4>
                                                    <p className="text-sm text-gray-600 leading-relaxed">
                                                        {"Mọi thay đổi trong ngành nghề sẽ được hệ thống "}<b>Hepza</b>{" xử lý để cập nhật lại danh sách báo cáo môi trường và các quy định pháp lý tương ứng."}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeSection === "contact" && (
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-5">
                                            <div className="col-span-1 xl:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-relaxed text-amber-900">
                                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                    <div className="space-y-1">
                                                        <strong className="font-bold">{"Lưu ý:"}</strong>
                                                        <p>
                                                            {"Thông tin người đại diện, email và số điện thoại đang được đồng bộ từ tài khoản đại diện hiện tại."}
                                                            {" Các trường này chỉ hiển thị để đối chiếu và sẽ được cập nhật qua luồng chuyển người đại diện."}
                                                        </p>
                                                    </div>
                                                    {canManageRepresentative && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsRepresentativeModalOpen(true)}
                                                            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#4E5BA6] shadow-sm shadow-amber-200/40 ring-1 ring-[#4E5BA6]/15 transition hover:bg-[#4E5BA6] hover:text-white"
                                                        >
                                                            Đổi người đại diện
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <LinearInput
                                                label="Người Đại Diện"
                                                required
                                                name="full_name"
                                                value={formData.full_name}
                                                onChange={handleChange}
                                                disabled
                                                placeholder="Tên đầy đủ theo CCCD"
                                            />
                                            <LinearInput
                                                label="Quy Mô (Nhân viên)"
                                                type="number"
                                                name="total_workers"
                                                value={formData.total_workers}
                                                onChange={handleChange}
                                                placeholder="Số lượng lao động tại doanh nghiệp"
                                            />
                                            <LinearInput
                                                label="Email người đại diện"
                                                required
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                disabled
                                                placeholder="dia-chi-email@cong-ty.com"
                                            />
                                            <LinearInput
                                                label="Số điện thoại người đại diện"
                                                required
                                                type="tel"
                                                name="phone_number"
                                                value={formData.phone_number}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    handleChange('phone_number', val);
                                                }}
                                                disabled
                                                inputMode="numeric"
                                                maxLength={11}
                                                placeholder="Ví dụ: 09xxxxxxxx"
                                            />
                                            <LinearInput
                                                label="Trang Website"
                                                name="website"
                                                value={formData.website}
                                                onChange={handleChange}
                                                placeholder="https://..."
                                            />
                                            <LinearInput
                                                label="Thị Trường"
                                                name="market"
                                                value={formData.market}
                                                onChange={handleChange}
                                                placeholder="Nội địa, Xuất khẩu..."
                                            />
                                            <div className="col-span-1 xl:col-span-2">
                                                <LinearInput
                                                    label="Doanh Thu Định Kỳ"
                                                    name="revenue"
                                                    value={formData.revenue}
                                                    onChange={handleChange}
                                                    placeholder="Kê khai theo đơn vị VNĐ"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Right Panel Footer Navigation */}
                        <div className="p-6 bg-white flex items-center justify-between shrink-0">
                            <button
                                onClick={handleBack}
                                disabled={currentStep === 1}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${currentStep === 1
                                    ? "text-gray-200 cursor-not-allowed uppercase text-[11px]"
                                    : "text-gray-500 hover:bg-gray-100 uppercase text-[11px]"
                                    }`}
                            >
                                <ArrowLeft size={16} />
                                <span>{"Quay lại"}</span>
                            </button>

                            <div className="flex items-center gap-4">
                                {currentStep !== steps.length && (
                                    <button
                                        onClick={handleNext}
                                        className="flex items-center gap-2 px-10 py-3 bg-[#4E5BA6] text-white rounded-xl font-bold shadow-lg shadow-[#4E5BA6]/20 hover:bg-[#3d4885] transition-all group uppercase text-[12px] tracking-widest"
                                    >
                                        <span>{"Tiếp theo"}</span>
                                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tax Lookup Loading Overlay */}
            {isTaxLookupLoading && (
                <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[2px] flex items-center justify-center rounded-[2.5rem]">
                    <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-2xl shadow-xl shadow-indigo-100 border border-indigo-50">
                        <div className="w-8 h-8 border-4 border-[#4E5BA6]/20 border-t-[#4E5BA6] rounded-full animate-spin" />
                        <span className="text-[#4E5BA6] font-bold text-sm tracking-wide">Đang đồng bộ dữ liệu từ Tổng cục Thuế...</span>
                    </div>
                </div>
            )}
            <ConfirmationModal
                open={isRepresentativeModalOpen}
                onClose={closeRepresentativeModal}
                onConfirm={handleRepresentativeChange}
                title="Chọn người đại diện mới"
                content={representativeModalContent}
                confirmText="Cập nhật người đại diện"
                confirmType="info"
                isLoading={setRepresentativeMutation.isPending}
                loadingText="Đang cập nhật..."
                disableClose={setRepresentativeMutation.isPending}
                confirmDisabled={representativeCandidates.length === 0 || !selectedRepresentativeUserId}
            />
        </ConfigProvider>
    );
};

export default FormUpdateEnterprise;
