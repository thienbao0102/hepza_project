import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Select, DatePicker, ConfigProvider, Divider } from 'antd';
import toast from '@/utils/toast';
import { mapErrorToNotification } from '@/utils/Error/mapErrorToNotification';
import dayjs from "dayjs";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    User,
    Shield,
    KeyRound,
    CheckCircle2,
    ChevronRight,
    Info,
    AlertCircle,
    Building2,
    Layout,
    RefreshCw
} from "lucide-react";
import { useUser, useUpdateUser, useAdminResetPassword } from '@features/admin/hooks/useUserQueries';
import { useHeader } from '@/components/common/Header/HeaderContext';
import useZones from '@features/industrialzone/hooks/useZones';
import { useCompanies } from "@features/company/hooks/useCompanyQueries";
import LoadingSpinner from '@components/ui/LoadingSpinner';
import ConfirmationModal from '@components/common/ConfirmationModal';
import locale from 'antd/es/date-picker/locale/vi_VN';
import { useAuthenticatedUser } from '@features/auth/hooks/useAuthQueries';
import { buildManagerScopedTitle, resolveManagerZoneLabel } from '@/utils/managerScope';
import {
    normalizeEmailInput,
    normalizePhoneInput,
    validateEmail,
    validateFullName,
    validatePhoneNumber,
} from '@/utils/userInputValidation';

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

const UpdateUserPage = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { setHeaderConfig, setBreadcrumbItems } = useHeader();
    const updateUserMutation = useUpdateUser();
    const resetPasswordMutation = useAdminResetPassword();
    const { data: user } = useAuthenticatedUser();
    const currentRole = user?.role || user?.user?.role;
    const currentZoneId = user?.zone_id || user?.user?.zone_id || '';
    const currentZoneName = user?.zone_name || user?.user?.zone_name || '';
    const isManager = currentRole === 'manager';
    const basePath = isManager ? '/manager' : '/admin';

    // Fetch user data
    const { data: userData, isLoading: isUserLoading, error: userError } = useUser(userId);

    const [currentStep, setCurrentStep] = useState(1);
    const steps = [
        { id: 1, key: "personal", title: 'Thông tin cá nhân', icon: User, subtitle: 'Cập nhật các thông tin cơ bản của người dùng.' },
        { id: 2, key: "organization", title: 'Phân quyền & Tổ chức', icon: Shield, subtitle: 'Điều chỉnh quyền hạn và đơn vị quản lý trực thuộc.' },
        { id: 3, key: "security", title: 'Bảo mật & Trạng thái', icon: KeyRound, subtitle: 'Quản lý trạng thái hoạt động và bảo mật tài khoản.' }
    ];
    const activeSection = steps[currentStep - 1].key;
    const activeIndex = currentStep - 1;

    const [formData, setFormData] = useState({
        role: isManager ? 'company' : 'manager',
        fullName: '',
        email: '',
        phoneNumber: '',
        zoneId: isManager ? currentZoneId : '',
        companyId: '',
        status: 'active',
        __v: null
    });

    const [errors, setErrors] = useState({});
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const isCompanyAccount = formData.role === 'company';
    const isRepresentativeCompanyAccount = Boolean(userData?.user?.is_company_representative);
    const rolePresentation = isCompanyAccount
        ? {
            label: 'Doanh nghiệp',
            desc: 'Tài khoản doanh nghiệp chỉ được cập nhật KCN và doanh nghiệp trực thuộc, không chuyển đổi sang quản lý KCN.',
            icon: Building2,
        }
        : {
            label: 'Quản lý KCN/KCX',
            desc: 'Tài khoản quản lý chỉ được cập nhật KCN phụ trách, không chuyển đổi sang tài khoản doanh nghiệp.',
            icon: Shield,
        };

    // Fetching Data for selects
    const { data: zonesData } = useZones({ page: 1, limit: 1000 });
    const allZones = zonesData?.zones || [];
    const resolvedManagerZoneName = resolveManagerZoneLabel({
        zoneName: currentZoneName,
        zoneId: currentZoneId,
        zones: allZones,
    });
    // Khi role là manager, chỉ hiển thị KCN chưa có manager và KCN hiện tại của user
    const currentUserZoneId = userData?.user?.zone_id;
    const zones = formData.role === 'manager'
        ? allZones.filter(z => (!z.managers_ids || z.managers_ids.length === 0) || z.zone_id === currentUserZoneId)
        : allZones;

    const { data: companiesData, isLoading: isCompaniesLoading } = useCompanies({
        page: 1,
        limit: 1000,
        filters: formData.zoneId ? {
            zone_id: formData.zoneId,
            ...(userData?.user?.company_id && { include_company_id: userData.user.company_id })
        } : {}
    });
    const companies = companiesData?.companies || [];

    useEffect(() => {
        if (!isManager) return;

        setFormData((prev) => ({
            ...prev,
            role: 'company',
            zoneId: currentZoneId || prev.zoneId,
        }));
    }, [currentZoneId, isManager]);

    useEffect(() => {
        setHeaderConfig({
            title: "Cập nhật người dùng",
            description: "Chỉnh sửa thông tin và phân quyền tài khoản",
            showWeather: true,
            showDatePicker: false
        });

        setBreadcrumbItems([
            { key: `${basePath}/user`, title: "Người dùng" },
            { key: `/user/update`, title: "Cập nhật người dùng" },
            { key: `/user/update/${userId}`, title: formData.fullName || userId },
        ]);
    }, [userId, isManager, formData.fullName, setHeaderConfig, setBreadcrumbItems]);

    useEffect(() => {
        if (!isManager) return;

        setHeaderConfig({
            title: "Cập nhật nhân sự doanh nghiệp",
            description: `Điều chỉnh tài khoản doanh nghiệp thuộc ${currentZoneName || 'khu công nghiệp được phân công'}`,
            showWeather: true,
            showDatePicker: false
        });

        setBreadcrumbItems([
            { key: "/manager/user", title: "Người dùng" },
            { key: "/manager/user/update", title: "Cập nhật nhân sự" },
            { key: `/manager/user/update/${userId}`, title: formData.fullName || userId },
        ]);
    }, [currentZoneName, formData.fullName, isManager, setBreadcrumbItems, setHeaderConfig, userId]);

    useEffect(() => {
        if (!isManager) return;

        setHeaderConfig({
            title: buildManagerScopedTitle("Cập nhật nhân sự doanh nghiệp", resolvedManagerZoneName),
            description: `Điều chỉnh tài khoản doanh nghiệp trong phạm vi ${resolvedManagerZoneName}.`,
            showWeather: true,
            showDatePicker: false
        });

        setBreadcrumbItems([
            { key: "/manager/user", title: "Nhân sự doanh nghiệp" },
            { key: "/manager/user/update", title: `Cập nhật nhân sự | ${resolvedManagerZoneName}` },
            { key: `/manager/user/update/${userId}`, title: formData.fullName || userId },
        ]);
    }, [formData.fullName, isManager, resolvedManagerZoneName, setBreadcrumbItems, setHeaderConfig, userId]);

    // Map user data to form data when fetched
    useEffect(() => {
        if (userData?.user) {
            const user = userData.user;
            const companyId = user.company_id || user.companyId || '';
            const role = user.role || (companyId ? 'company' : 'manager');

            setFormData({
                role: role,
                fullName: user.full_name || '',
                email: user.email || '',
                phoneNumber: user.phone_number || '',
                zoneId: user.zone_id || '',
                companyId: companyId,
                status: user.status || 'active',
                __v: user.__v ?? null
            });
        }
    }, [userData]);

    const handleChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const validateStep = (step) => {
        let newErrors = {};
        if (step === "personal") {
            const fullNameError = validateFullName(formData.fullName);
            const emailError = validateEmail(formData.email);
            const phoneError = validatePhoneNumber(formData.phoneNumber);

            if (fullNameError) newErrors.fullName = fullNameError;
            if (emailError) newErrors.email = emailError;
            if (phoneError) newErrors.phoneNumber = phoneError;
        } else if (step === "organization") {
            if (!formData.zoneId) newErrors.zoneId = "Vui lòng chọn khu công nghiệp";
            if (formData.role === "company" && !formData.companyId) newErrors.companyId = "Vui lòng chọn doanh nghiệp";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(activeSection)) {
            if (currentStep < steps.length) {
                setCurrentStep(prev => prev + 1);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleUpdateAccount = () => {
        const isPersonalValid = validateStep("personal");
        if (!isPersonalValid) {
            setCurrentStep(1);
            return;
        }

        const isOrganizationValid = validateStep("organization");
        if (!isOrganizationValid) {
            setCurrentStep(2);
            return;
        }

        const updateData = {
            full_name: formData.fullName.trim().replace(/\s+/g, ' '),
            email: normalizeEmailInput(formData.email),
            phone_number: normalizePhoneInput(formData.phoneNumber),
            ...(formData.role === 'company' && { company_id: formData.companyId }),
            zone_id: formData.zoneId,
            status: formData.status,
            __v: formData.__v
        };

        updateUserMutation.mutate({ userId, updateData }, {
            onSuccess: () => {
                toast.success('Thành công', 'Thông tin người dùng đã được cập nhật.');
                setTimeout(() => navigate(`${basePath}/user`, { state: { activeTab: formData.role } }), 1000);
            },
            onError: (error) => {
                const { title, description } = mapErrorToNotification(error, 'UPDATE_USER');
                toast.error(title ?? 'Không thể cập nhật tài khoản.', description ?? (error.response?.data?.message || ''));
            }
        });
    };

    if (isUserLoading) return <div className="flex h-full items-center justify-center"><LoadingSpinner /></div>;
    if (userError) return <div className="p-10 text-center text-red-500 font-bold bg-white rounded-3xl m-8">Lỗi khi tải thông tin người dùng.</div>;

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
                                    onClick={() => validateStep(activeSection) && setCurrentStep(step.id)}
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

                        <div className="bg-[#4E5BA6]/5 rounded-[20px] p-5 border border-[#4E5BA6]/20 flex flex-col gap-3">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-[#4E5BA6]/10 rounded-xl shrink-0">
                                    <Info size={18} className="text-[#4E5BA6]" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#4E5BA6] text-sm mb-2">Lưu ý cập nhật</h4>
                                    <ul className="text-xs text-[#4E5BA6]/80 space-y-2 list-disc pl-3 leading-relaxed">
                                        {activeSection === "personal" && (
                                            <>
                                                <li>Email là tên đăng nhập, hạn chế thay đổi nếu không cần thiết.</li>
                                                <li>Thông tin cá nhân sẽ hiển thị trên các báo cáo và chữ ký điện tử.</li>
                                            </>
                                        )}
                                        {activeSection === "organization" && (
                                            <>
                                                <li>Thay đổi Khu công nghiệp/Doanh nghiệp sẽ ảnh hưởng đến phạm vi dữ liệu người dùng có thể thấy.</li>
                                            </>
                                        )}
                                        {activeSection === "security" && (
                                            <>
                                                <li>Bạn có thể tạm khóa tài khoản bằng cách đổi trạng thái.</li>
                                                <li>Để đổi mật khẩu, vui lòng sử dụng tính năng "Gửi lại link reset mật khẩu".</li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto flex flex-col gap-3">
                            <button
                                onClick={handleUpdateAccount}
                                disabled={updateUserMutation.isPending || currentStep !== steps.length}
                                className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group ${currentStep === steps.length
                                    ? "bg-[#4E5BA6] text-white shadow-lg shadow-[#4E5BA6]/30 hover:bg-[#3d4885]"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                {updateUserMutation.isPending ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <span>Cập nhật tài khoản</span>
                                )}
                            </button>
                            <button
                                onClick={() => navigate(-1)}
                                className="w-full py-3.5 rounded-xl bg-white text-gray-500 font-semibold border border-gray-200 hover:bg-gray-50 transition-all"
                            >
                                Hủy bỏ
                            </button>
                        </div>
                    </div>

                    {/* Right Content */}
                    <div className="md:col-span-9 xl:col-span-9 bg-white rounded-[2.5rem] shadow-xl shadow-gray-100 border border-gray-100 flex flex-col overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-[#4E5BA6]">
                            {activeSection === "personal" && <User size={300} />}
                            {activeSection === "organization" && <Building2 size={300} />}
                            {activeSection === "security" && <RefreshCw size={300} />}
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

                        <div className="flex-1 overflow-y-auto p-8 pt-6 pb-20">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeSection}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-8"
                                >
                                    {activeSection === "personal" && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                            <div className="md:col-span-2">
                                                <LinearInput
                                                    label="Họ và tên người dùng"
                                                    required
                                                    name="fullName"
                                                    value={formData.fullName}
                                                    onChange={(e) => handleChange("fullName", e.target.value)}
                                                    error={errors.fullName}
                                                    placeholder="Ví dụ: Nguyễn Văn A"
                                                />
                                            </div>
                                            <LinearInput
                                                label="Email đăng nhập"
                                                required
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={(e) => handleChange("email", e.target.value)}
                                                onBlur={(e) => handleChange("email", normalizeEmailInput(e.target.value))}
                                                error={errors.email}
                                                placeholder="abc@example.com"
                                            />
                                            <LinearInput
                                                label="Số điện thoại"
                                                required
                                                type="tel"
                                                name="phoneNumber"
                                                value={formData.phoneNumber}
                                                onChange={(e) => handleChange("phoneNumber", normalizePhoneInput(e.target.value))}
                                                error={errors.phoneNumber}
                                                placeholder="090x xxx xxx"
                                                maxLength={11}
                                                inputMode="numeric"
                                            />
                                        </div>
                                    )}

                                    {activeSection === "organization" && (
                                        <div className="space-y-8">
                                            <div className="space-y-4">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide">
                                                    Loại tài khoản
                                                </label>
                                                <div className="rounded-2xl border border-[#4E5BA6]/15 bg-[#4E5BA6]/5 p-5">
                                                    <div className="flex items-start gap-4">
                                                        <div className="rounded-2xl bg-[#4E5BA6] p-3 text-white shadow-md shadow-[#4E5BA6]/20">
                                                            <rolePresentation.icon size={24} />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-bold text-[#4E5BA6]">{rolePresentation.label}</p>
                                                            <p className="text-xs leading-relaxed text-[#4E5BA6]/80">{rolePresentation.desc}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {!isManager && (
                                                    <div className="space-y-1.5">
                                                        <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide">
                                                            Khu công nghiệp quản lý <span className="text-red-500">*</span>
                                                        </label>
                                                        <Select
                                                            className="w-full"
                                                            placeholder="Chọn khu công nghiệp"
                                                            value={formData.zoneId || undefined}
                                                            onChange={(val) => {
                                                                handleChange("zoneId", val);
                                                                handleChange("companyId", "");
                                                            }}
                                                            disabled={isCompanyAccount && isRepresentativeCompanyAccount}
                                                            showSearch
                                                            optionFilterProp="children"
                                                        >
                                                            {zones.map(z => (
                                                                <Select.Option key={z.zone_id} value={z.zone_id}>{z.zone_name}</Select.Option>
                                                            ))}
                                                        </Select>
                                                        {errors.zoneId && <p className="text-xs text-red-500 mt-1">{errors.zoneId}</p>}
                                                    </div>
                                                )}

                                                {formData.role === "company" && (
                                                    <div className={isManager ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}>
                                                        <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide">
                                                            Đơn vị trực thuộc (Doanh nghiệp) <span className="text-red-500">*</span>
                                                        </label>
                                                        <Select
                                                            className="w-full"
                                                            placeholder={formData.zoneId ? "Chọn doanh nghiệp" : "Vui lòng chọn KCN trước"}
                                                            value={formData.companyId || undefined}
                                                            onChange={(val) => handleChange("companyId", val)}
                                                            disabled={!formData.zoneId || isCompaniesLoading || isRepresentativeCompanyAccount}
                                                            showSearch
                                                            optionFilterProp="label"
                                                            options={companies.map(c => {
                                                                const count = c.user_slots_count ?? c.active_users_count ?? 0;
                                                                const isFull = count >= 3 && formData.companyId !== c.company_id;
                                                                return {
                                                                    value: c.company_id,
                                                                    label: c.company_name,
                                                                    disabled: isFull,
                                                                    count: count
                                                                };
                                                            })}
                                                            optionRender={(option) => {
                                                                const { label, count, disabled } = option.data;
                                                                return (
                                                                    <div className="flex flex-col py-1 whitespace-normal break-words">
                                                                        <span className="font-semibold text-gray-800 leading-tight block pr-2">{label}</span>
                                                                        <span className={`text-[11px] mt-1 inline-block px-2 py-0.5 rounded-full w-max ${disabled ? 'bg-red-50 text-red-600 font-bold border border-red-200' : 'bg-gray-100 text-gray-600 font-medium'}`}>
                                                                            Đã đăng ký: {count}/3 {disabled && "(Đã đầy)"}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            }}
                                                        />
                                                        {errors.companyId && <p className="text-xs text-red-500 mt-1">{errors.companyId}</p>}
                                                    </div>
                                                )}

                                                {isCompanyAccount && isRepresentativeCompanyAccount ? (
                                                    <div className="md:col-span-2">
                                                        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                                                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                                                <div className="flex items-start gap-3">
                                                                    <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                                                                        <AlertCircle size={18} />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <p className="text-sm font-bold text-amber-900">
                                                                            Tài khoản này đang là người đại diện doanh nghiệp
                                                                        </p>
                                                                        <p className="text-xs leading-relaxed text-amber-800/90">
                                                                            Để tránh doanh nghiệp bị mất người đại diện, hệ thống không cho đổi KCN hoặc doanh nghiệp trực thuộc từ màn cập nhật người dùng.
                                                                            Hãy đổi người đại diện trước tại màn cập nhật doanh nghiệp, sau đó quay lại đây nếu cần điều chỉnh phạm vi tài khoản này.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {formData.companyId ? (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => navigate(`${basePath}/business/update-business/${formData.companyId}`)}
                                                                        className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                                                                    >
                                                                        Đi tới cập nhật doanh nghiệp
                                                                    </button>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    )}

                                    {activeSection === "security" && (
                                        <div className="space-y-8">
                                            <div className="space-y-3">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                    Trạng thái tài khoản
                                                </label>
                                                <div className="flex gap-4">
                                                    {[
                                                        { value: 'active', label: 'Đang hoạt động', color: 'bg-green-500' },
                                                        { value: 'inactive', label: 'Tạm khóa', color: 'bg-red-500' }
                                                    ].map((item) => (
                                                        <button
                                                            key={item.value}
                                                            onClick={() => handleChange('status', item.value)}
                                                            className={`flex-1 px-5 py-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${formData.status === item.value
                                                                ? "bg-white border-[#4E5BA6] shadow-md"
                                                                : "bg-gray-50 border-transparent text-gray-500 hover:bg-white hover:border-gray-200"
                                                                }`}
                                                        >
                                                            <div className={`size-2.5 rounded-full ${item.color} ${formData.status === item.value ? "animate-pulse" : "opacity-40"}`} />
                                                            <span className={`font-bold text-sm ${formData.status === item.value ? "text-gray-900" : ""}`}>{item.label}</span>
                                                            <div className={`ml-auto size-5 rounded-full border-2 flex items-center justify-center transition-all ${formData.status === item.value ? "border-[#4E5BA6] bg-[#4E5BA6]" : "border-gray-300"}`}>
                                                                {formData.status === item.value && <div className="size-2 bg-white rounded-full" />}
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="p-5 rounded-xl border border-gray-100 bg-gray-50/50">
                                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tên đăng nhập (Email)</p>
                                                    <p className="font-semibold text-gray-700">{formData.email || "---"}</p>
                                                </div>
                                                <div className="p-5 rounded-xl border border-gray-100 bg-gray-50/50">
                                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Lần cuối cập nhật</p>
                                                    <p className="font-semibold text-gray-700">{userData?.user?.updated_at ? dayjs(userData?.user?.updated_at).format('DD/MM/YYYY HH:mm') : "Chưa có thông tin"}</p>
                                                </div>
                                            </div>

                                            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4 items-center group cursor-pointer hover:bg-blue-100 transition-colors">
                                                <div className="p-3 bg-white rounded-xl shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
                                                    <RefreshCw size={24} />
                                                </div>
                                                <div className="flex-1">
                                                    <h5 className="font-bold text-blue-900 text-sm">Gửi lại link đặt lại mật khẩu</h5>
                                                    <p className="text-xs text-blue-700 mt-0.5">Một email sẽ được gửi đến <b>{formData.email}</b> kèm mật khẩu mới. Người dùng sẽ phải đổi mật khẩu khi đăng nhập lại.</p>
                                                </div>
                                                <button
                                                    onClick={() => setIsResetModalOpen(true)}
                                                    className="px-4 py-2 bg-white text-blue-600 rounded-lg text-xs font-bold border border-blue-200 shadow-sm transition-all hover:bg-blue-600 hover:text-white"
                                                >
                                                    Gửi ngay
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <ConfirmationModal
                            open={isResetModalOpen}
                            onClose={() => setIsResetModalOpen(false)}
                            onConfirm={async () => {
                                try {
                                    const data = await resetPasswordMutation.mutateAsync(userId);
                                    toast.success('Thành công', data?.message || 'Mật khẩu đã được đặt lại');
                                } catch (error) {
                                    toast.error('Lỗi', error?.response?.data?.message || error?.message || 'Không thể đặt lại mật khẩu');
                                    throw error;
                                }
                            }}
                            onAfterConfirm={() => setIsResetModalOpen(false)}
                            title="Đặt lại mật khẩu"
                            content={(
                                <div className="space-y-3 text-left">
                                    <p>
                                        Email đặt lại mật khẩu sẽ được gửi tới <b>{formData.email || "tài khoản này"}</b>.
                                    </p>
                                    <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-3 text-sm font-medium text-[#1D4ED8]">
                                        Người dùng sẽ nhận mật khẩu mới qua email và phải đổi lại mật khẩu ở lần đăng nhập tiếp theo.
                                    </div>
                                </div>
                            )}
                            confirmText="Gửi email đặt lại"
                            loadingText="Đang gửi email..."
                            confirmType="info"
                            isLoading={resetPasswordMutation.isPending}
                            disableClose={resetPasswordMutation.isPending}
                        />
                        {/* Footer Controls */}
                        <div className="p-6 bg-white flex items-center justify-between mt-auto">
                            <button
                                onClick={handleBack}
                                disabled={currentStep === 1}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all uppercase text-[11px] tracking-wider ${currentStep === 1 ? "text-gray-200 cursor-not-allowed" : "text-gray-500 hover:bg-gray-100"}`}
                            >
                                <ArrowLeft size={16} />
                                <span>Quay lại</span>
                            </button>

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
        </ConfigProvider>
    );
};

export default UpdateUserPage;
