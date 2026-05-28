import { Select, DatePicker, ConfigProvider } from 'antd';
import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
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
    Info,
    AlertCircle
} from "lucide-react";
import { handlerGetAllZones } from "@services/zoneService";
import { handlerGetAllIndustries, handlerGetAllIndustryGroups } from "@services/industryService";
import { handlerLookupTaxCode } from "@services/taxLookupService";
import { useCompanies } from "@features/company/hooks/useCompanyQueries";
import { useAddCompany } from "@features/enterprises/hooks/useCompanyMutations";
import { mapErrorToNotification } from "@/utils/Error/mapErrorToNotification";
import { useHeader } from '@/components/common/Header/HeaderContext';
import locale from 'antd/es/date-picker/locale/vi_VN';
import { useAuthenticatedUser } from '@features/auth/hooks/useAuthQueries';
import { buildIdNameMaps, normalizeSelectionToIds } from '@/utils/industryValueUtils';

// --- Linear Style Components ---

const LinearInput = ({ label, required, error, className, ...props }) => (
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
                hover:bg-white hover:border-gray-200 ${className}`}
                {...props}
            />
        </div>
        {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
);

const FormAddEnterprise = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const steps = [
        { id: 1, key: "basic", title: 'Thông tin chung', icon: Building2, subtitle: "Cung cấp các thông tin cơ bản về tên, địa chỉ và mã số định danh của doanh nghiệp." },
        { id: 2, key: "details", title: 'Lĩnh vực hoạt động', icon: Briefcase, subtitle: "Phân loại lĩnh vực sản xuất kinh doanh để nhận các báo cáo môi trường tương ứng." },
        { id: 3, key: "contact", title: 'Liên hệ & Quy mô', icon: Users, subtitle: "Thông tin người phụ trách và các chỉ số vận hành cơ bản của đơn vị." }
    ];
    const activeSection = steps[currentStep - 1].key;
    const activeIndex = currentStep - 1;

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
    const [formData, setFormData] = useState({
        company_id: "",
        company_name: "",
        company_registration_number_base: "", // 10 số MST gốc
        company_registration_number_branch: "", // 3 số chi nhánh (tùy chọn)
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
    });

    const [allZones, setAllZones] = useState([]);
    const [industryGroups, setIndustryGroups] = useState([]);
    const { data: companiesData } = useCompanies({ page: 1, limit: 9999 });
    const [allIndustries, setAllIndustries] = useState([]);
    const [isTaxLookupLoading, setIsTaxLookupLoading] = useState(false);
    const companies = companiesData?.companies || [];
    const addCompanyMutation = useAddCompany();
    const { setHeaderConfig, setBreadcrumbItems } = useHeader();
    const { data: user } = useAuthenticatedUser();
    const currentRole = user?.role || user?.user?.role;
    const currentZoneId = user?.zone_id || user?.user?.zone_id || "";
    const currentZoneName = user?.zone_name || user?.user?.zone_name || "";
    const isManager = currentRole === 'manager';
    const resolvedManagerZoneName = currentZoneName || allZones.find(
        (zone) => String(zone.zone_id || zone.id) === String(currentZoneId || '')
    )?.zone_name || currentZoneId;

    // Auto-fill zone for manager
    useEffect(() => {
        if (isManager && currentZoneId) {
            setFormData(prev => ({
                ...prev,
                zone_id: currentZoneId
            }));
        }
    }, [currentZoneId, isManager]);

    // Data Fetching Logic (Same as before)
    const fallbackIndustryGroups = [
        'Cơ khí, điện, điện tử',
        'Hoá dược, cao su, nhựa',
        'Chế biến lương thực, thực phẩm',
        'Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất',
        'May mặc, thuộc da, dệt nhuộm',
        'Khác'
    ];

    const groupMaps = React.useMemo(
        () => buildIdNameMaps(industryGroups, 'group_id', 'group_name'),
        [industryGroups]
    );

    useEffect(() => {
        setHeaderConfig({
            title: isManager
                ? `Tạo doanh nghiệp | ${resolvedManagerZoneName || currentZoneId || "KCN được phân công"}`
                : "Tạo hồ sơ doanh nghiệp",
            description: isManager
                ? `Doanh nghiệp tạo mới sẽ tự động thuộc ${resolvedManagerZoneName || currentZoneId || "khu công nghiệp được phân công"}`
                : "Nhập thông tin doanh nghiệp mới vào hệ thống quản lý tập trung",
            showWeather: true,
            showDatePicker: true
        });

        const basePath = isManager ? "/manager" : "/admin";
        setBreadcrumbItems([
            { key: `${basePath}/business`, title: "Doanh nghiệp" },
            { key: `${basePath}/business/create-business`, title: "Tạo mới" },
        ]);
    }, [currentZoneId, isManager, resolvedManagerZoneName, setBreadcrumbItems, setHeaderConfig]);

    useEffect(() => {
        const abortController = new AbortController();
        const fetchZones = async () => {
            try {
                const { zones } = await handlerGetAllZones(1, 1000, undefined, abortController.signal);
                if (zones) setAllZones(zones);
            } catch (error) { console.error("Failed to fetch industrial zones:", error); }
        };
        const fetchIndustryGroups = async () => {
            try {
                const { groups } = await handlerGetAllIndustryGroups({ page: 1, limit: 1000 }, undefined, undefined, abortController.signal);
                if (Array.isArray(groups)) setIndustryGroups(groups);
            } catch (error) { console.error("Failed to fetch industry groups:", error); }
        };
        const fetchIndustries = async () => {
            try {
                const { industries } = await handlerGetAllIndustries({ page: 1, limit: 1000 }, undefined, undefined, undefined, abortController.signal);
                if (industries) setAllIndustries(industries);
            } catch (error) { console.error("Failed to fetch industries:", error); }
        };
        fetchZones();
        fetchIndustryGroups();
        fetchIndustries();
        return () => { abortController.abort(); };
    }, []);

    useEffect(() => {
        if (formData.zone_id && companies.length > 0) {
            const companiesInZone = companies.filter((c) => c.zone_id === formData.zone_id).length;
            const nextCompanyNumber = (companiesInZone + 1).toString().padStart(5, "0");
            const newCompanyId = `${formData.zone_id}DN${nextCompanyNumber}`;
            setFormData((prev) => {
                if (prev.company_id !== newCompanyId) return { ...prev, company_id: newCompanyId };
                return prev;
            });
        }
    }, [formData.zone_id, companies]);

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

    const selectedGroupIds = React.useMemo(
        () => normalizeSelectionToIds(formData.industry_group, groupMaps),
        [formData.industry_group, groupMaps]
    );

    useEffect(() => {
        if (!industryGroups.length) return;
        setFormData((prev) => {
            if (!Array.isArray(prev.industry) || prev.industry.length === 0) return prev;
            const allowedIndustryIds = new Set(
                allIndustries
                    .filter((item) => selectedGroupIds.length === 0 || selectedGroupIds.includes(item.group_id))
                    .map((item) => item.industry_id)
            );
            const filteredIndustries = prev.industry.filter((industryId) => allowedIndustryIds.has(industryId));
            if (filteredIndustries.length === prev.industry.length) return prev;
            return { ...prev, industry: filteredIndustries };
        });
    }, [industryGroups.length, allIndustries, selectedGroupIds]);

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
        e.preventDefault();
        const representativeName = formData.full_name?.trim();
        const representativeEmail = formData.email?.trim();
        const representativePhone = formData.phone_number?.trim();

        if (!representativeName || !representativeEmail || !representativePhone) {
            toast.error(
                'Thiếu tài khoản đại diện',
                'Khi tạo doanh nghiệp, bạn phải nhập đủ họ tên, email và số điện thoại của tài khoản đại diện.'
            );
            return;
        }

        // Client-side validation: zone (khu công nghiệp) is required
        if (!formData.zone_id) {
            const { title, description } = mapErrorToNotification({ message: 'zone required' }, 'CREATE_COMPANY');
            const finalTitle = title || 'Thêm doanh nghiệp không thành công';
            const finalDescription = description || 'Vui lòng chọn khu công nghiệp.';
            toast.error(finalTitle, finalDescription);
            return;
        }

        const mstBase = formData.company_registration_number_base?.trim();
        const mstBranch = formData.company_registration_number_branch?.trim();
        const company_registration_number = mstBase
            ? (mstBranch ? `${mstBase}-${mstBranch}` : mstBase)
            : null;

        const selectedZone = allZones.find(z => z.zone_id === formData.zone_id);
        const dataToSubmit = {
            ...formData,
            full_name: representativeName,
            email: representativeEmail,
            phone_number: representativePhone,
            company_registration_number,
            zone_name: selectedZone ? selectedZone.zone_name : '',
            total_workers: Number(formData.total_workers),
            founded_year: formData.founded_year ? Number(formData.founded_year) : null,
        };
        // Xóa 2 field tạm trước khi gửi
        delete dataToSubmit.company_registration_number_base;
        delete dataToSubmit.company_registration_number_branch;
        addCompanyMutation.mutate(dataToSubmit, {
            onSuccess: () => {
                toast.success("Thành công", "Đã thêm doanh nghiệp thành công!");
                setTimeout(() => {
                    const basePath = window.location.pathname.startsWith('/admin') ? '/admin' : '/manager';
                    navigate(`${basePath}/business`);
                }, 1000);
            },
            onError: (error) => {
                const { title, description } = mapErrorToNotification(error, 'CREATE_COMPANY');
                const finalTitle = title || 'Thêm doanh nghiệp không thành công';
                const finalDescription = description || error.response?.data?.message || 'Đã xảy ra lỗi khi thêm doanh nghiệp.';
                toast.error(finalTitle, finalDescription);
            },
        });
    };

    const companyTypeOptions = ["Nhà nước", "Tư nhân", "Liên doanh", "FDI", "Hợp tác xã", "Khác"];

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#4E5BA6',
                    borderRadius: 12,
                    colorBorder: 'transparent',
                    colorBgContainer: '#F9FAFB', // gray-50
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
                    {/* Left Sidebar (25-30%) */}
                    <div className="md:col-span-3 xl:col-span-3 flex flex-col h-full gap-5">

                        {/* Navigation Tabs */}
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

                        {/* Context/Regulations Card */}
                        <div className="bg-[#4E5BA6]/5 rounded-[20px] p-5 border border-[#4E5BA6]/20 flex flex-col gap-3">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-[#4E5BA6]/10 rounded-xl shrink-0">
                                    <Info size={18} className="text-[#4E5BA6]" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#4E5BA6] text-sm mb-2">Quy định & Lưu ý</h4>
                                    <ul className="text-xs text-[#4E5BA6]/80 space-y-2 list-disc pl-3 leading-relaxed">
                                        {activeSection === "basic" && (
                                            <>
                                                <li>Tên doanh nghiệp viết in hoa theo giấy phép ĐKKD.</li>
                                                <li>Mã số doanh nghiệp là mã số xác định doanh nghiệp .</li>
                                                <li>Địa chỉ trụ sở phải chi tiết đến số nhà, đường, phường/xã.</li>
                                            </>
                                        )}
                                        {activeSection === "details" && (
                                            <>
                                                <li>Phân loại ngành nghề cấp 6 mục theo hệ môi trường.</li>
                                                <li>Chọn chính xác nhóm ngành để hệ thống gợi ý biểu mẫu môi trường phù hợp.</li>
                                                <li>Với ngành nghề có điều kiện, cần đính kèm giấy phép con sau khi tạo.</li>
                                            </>
                                        )}
                                        {activeSection === "contact" && (
                                            <>
                                                <li>Người đại diện pháp luật chịu trách nhiệm về thông tin khai báo.</li>
                                                <li>Số điện thoại và Email dùng để nhận thông báo từ cơ quan quản lý.</li>
                                                <li>Quy mô nhân sự và doanh thu cập nhật theo kỳ báo cáo gần nhất(tuỳ chọn).</li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="mt-auto flex flex-col gap-3">
                            <button
                                onClick={handleSubmit}
                                disabled={addCompanyMutation.isPending || activeSection !== "contact"}
                                className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group ${activeSection === "contact"
                                    ? "bg-[#4E5BA6] text-white shadow-lg shadow-[#4E5BA6]/30 hover:bg-[#3d4885] hover:shadow-xl"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                {addCompanyMutation.isPending ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Lưu Doanh Nghiệp</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => navigate(-1)}
                                className="w-full py-3.5 rounded-xl bg-white text-gray-500 font-semibold border border-gray-200 hover:bg-gray-50 hover:text-gray-700 transition-all"
                            >
                                Hủy bỏ
                            </button>
                        </div>
                    </div>

                    {/* Right Content (70-75%) */}
                    <div className="md:col-span-9 xl:col-span-9 bg-white rounded-[2.5rem] shadow-xl shadow-gray-100 border border-gray-100 flex flex-col overflow-hidden relative">
                        {/* Header Decoration */}
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
                                            Bước {currentStep}
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
                                                    placeholder="Ví dụ: CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI ABC (Viết in hoa)"
                                                    className="font-medium"
                                                />
                                            </div>

                                            {/* MST Split Input */}
                                            <div className="col-span-1 xl:col-span-2 space-y-1.5">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                    Mã Số Thuế (MST) <span className="text-red-500">*</span>
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
                                                    <span className="text-gray-400 font-bold text-lg">—</span>
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
                                                    <span className="text-xs text-gray-400 font-medium ml-1">(Chi nhánh)</span>
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
                                                    Nhập 10 số MST gốc. Nếu là chi nhánh/văn phòng đại diện, thêm 3 số phụ (VD: 001, 002).
                                                </p>
                                            </div>

                                            <div className="col-span-1 space-y-2">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                    Khu Công Nghiệp <span className="text-red-500">*</span>
                                                </label>
                                                <Select
                                                    className="w-full text-base"
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
                                                    Mã Số (Tự động)
                                                </label>
                                                <div className="h-[44px] px-3 flex items-center bg-gray-50 rounded-xl border border-transparent text-[#4E5BA6] font-mono text-base font-bold">
                                                    {formData.company_id || "Chờ chọn khu công nghiệp..."}
                                                </div>
                                            </div>

                                            <div className="col-span-1 space-y-2">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                    Năm Thành Lập
                                                </label>
                                                <DatePicker
                                                    picker="year"
                                                    locale={locale}
                                                    className="w-full text-base"
                                                    placeholder="-- Chọn năm thành lập --"
                                                    value={formData.founded_year ? dayjs(String(formData.founded_year), 'YYYY') : null}
                                                    onChange={(date) => handleChange('founded_year', date ? date.year() : "")}
                                                    size="middle"
                                                />
                                            </div>

                                            <div className="col-span-1 space-y-2">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                    Loại hình
                                                </label>
                                                <Select
                                                    className="w-full text-base"
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
                                                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeSection === "details" && (
                                        <div className="space-y-8">
                                            <div className="space-y-2">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                    Nhóm Ngành Chính <span className="text-red-500">*</span>
                                                </label>
                                                <Select
                                                    mode="multiple"
                                                    className="w-full"
                                                    placeholder="-- Chọn một hoặc nhiều lãnh vực kinh doanh chính --"
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
                                                    Ngành Nghề Chi Tiết <span className="text-red-500">*</span>
                                                </label>
                                                <Select
                                                    mode="multiple"
                                                    className="w-full"
                                                    placeholder={hasSelectedGroup ? "-- Tìm kiếm và chọn mã ngành cấp 4 --" : "Vui lòng chọn nhóm ngành trước để lọc dữ liệu"}
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
                                                    <h4 className="font-bold text-[#4E5BA6] mb-1 text-base">Gợi ý từ hệ thống Hepza</h4>
                                                    <p className="text-sm text-gray-600 leading-relaxed">
                                                        Dựa trên nghành nghề đã chọn, hệ thống sẽ tự động tổng hợp danh mục các <b>Báo cáo bảo vệ môi trường</b> và <b>Nghị định liên quan</b> dành riêng cho đơn vị của bạn.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeSection === "contact" && (
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-5">
                                            <LinearInput
                                                label="Người Đại Diện"
                                                required
                                                name="full_name"
                                                value={formData.full_name}
                                                onChange={handleChange}
                                                placeholder="Nhập đầy đủ tên người đại diện pháp luật"
                                            />
                                            <LinearInput
                                                label="Quy Mô (Người)"
                                                type="number"
                                                name="total_workers"
                                                value={formData.total_workers}
                                                onChange={handleChange}
                                                placeholder="Tổng số nhân sự hiện tại (Lao động)"
                                            />
                                            <LinearInput
                                                label="Email người đại diện"
                                                required
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="dia-chi-email@ten-cong-ty.com"
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
                                                inputMode="numeric"
                                                maxLength={11}
                                                placeholder="Ví dụ: 0283xxxxxxx"
                                            />
                                            <LinearInput
                                                label="Website"
                                                name="website"
                                                value={formData.website}
                                                onChange={handleChange}
                                                placeholder="https://www.example.com"
                                            />
                                            <LinearInput
                                                label="Thị Trường Chính"
                                                name="market"
                                                value={formData.market}
                                                onChange={handleChange}
                                                placeholder="Ví dụ: Nội địa, Nhật Bản, EU..."
                                            />
                                            <div className="col-span-1 xl:col-span-2">
                                                <div className="mb-4 rounded-2xl border border-[#4E5BA6]/15 bg-[#4E5BA6]/5 px-4 py-3 text-sm text-[#38406f]">
                                                    Doanh nghiệp mới sẽ được tạo kèm tài khoản đại diện đầu tiên. Người này có thể chuyển quyền đại diện lại cho nhân sự khác sau.
                                                </div>
                                                <LinearInput
                                                    label="Doanh Thu Dự Kiến (VNĐ)"
                                                    name="revenue"
                                                    value={formData.revenue}
                                                    onChange={handleChange}
                                                    placeholder="Kê khai doanh thu năm gần nhất hoặc dự kiến năm tới"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer Navigation Area */}
                        <div className="p-6 bg-white border-t border-gray-50 flex items-center justify-between shrink-0">
                            <button
                                onClick={handleBack}
                                disabled={currentStep === 1}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${currentStep === 1
                                    ? "text-gray-200 cursor-not-allowed uppercase text-[11px] tracking-tight"
                                    : "text-gray-500 hover:bg-gray-100 uppercase text-[11px] tracking-wider"
                                    }`}
                            >
                                <ArrowLeft size={16} />
                                <span>Quay lại</span>
                            </button>

                            <div className="flex items-center gap-4">
                                {currentStep !== steps.length && (
                                    <button
                                        onClick={handleNext}
                                        className="flex items-center gap-2 px-10 py-3 bg-[#4E5BA6] text-white rounded-xl font-bold shadow-lg shadow-[#4E5BA6]/20 hover:bg-[#3d4885] transition-all group uppercase text-[12px] tracking-widest"
                                    >
                                        <span>Tiếp theo</span>
                                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ConfigProvider>
    );
};

export default FormAddEnterprise;
