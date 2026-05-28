import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
    Layout
} from "lucide-react";
import { useCreateUser } from '@features/admin/hooks/useUserQueries';
import { useHeader } from '@/components/common/Header/HeaderContext';
import useZones from '@features/industrialzone/hooks/useZones';
import { useCompanies } from "@features/company/hooks/useCompanyQueries";
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

const CreateUser = () => {
    const navigate = useNavigate();
    const { setHeaderConfig, setBreadcrumbItems } = useHeader();
    const createUserMutation = useCreateUser();
    const { data: user } = useAuthenticatedUser();
    const currentRole = user?.role || user?.user?.role;
    const currentZoneId = user?.zone_id || user?.user?.zone_id || '';
    const currentZoneName = user?.zone_name || user?.user?.zone_name || '';
    const isManager = currentRole === 'manager';

    const [currentStep, setCurrentStep] = useState(1);
    const steps = [
        { id: 1, key: "personal", title: 'Thông tin cá nhân', icon: User, subtitle: "Cung cấp các thông tin định danh cơ bản của người dùng." },
        { id: 2, key: "organization", title: 'Phân quyền & Tổ chức', icon: Shield, subtitle: "Xác định vai trò và đơn vị quản lý trực thuộc." },
        { id: 3, key: "security", title: 'Bảo mật & Hoàn tất', icon: KeyRound, subtitle: "Xác nhận lại thông tin và khởi tạo tài khoản hệ thống." }
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
    });

    const [errors, setErrors] = useState({});

    // Fetching Data
    const { data: zonesData } = useZones({ page: 1, limit: 1000 });
    const allZones = zonesData?.zones || [];
    const resolvedManagerZoneName = resolveManagerZoneLabel({
        zoneName: currentZoneName,
        zoneId: currentZoneId,
        zones: allZones,
    });
    // Khi role là manager, chỉ hiển thị KCN chưa có manager
    const zones = formData.role === 'manager'
        ? allZones.filter(z => !z.managers_ids || z.managers_ids.length === 0)
        : allZones;

    const { data: companiesData, isLoading: isCompaniesLoading } = useCompanies({
        page: 1,
        limit: 1000,
        filters: formData.zoneId ? { zone_id: formData.zoneId } : {}
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
            title: isManager ? "Tạo tài khoản người dùng" : "Tạo tài khoản người dùng",
            description: isManager ? "Cấp quyền truy cập hệ thống cho các doanh nghiệp" : "Cấp quyền truy cập hệ thống cho cán bộ hoặc doanh nghiệp",
            showWeather: true,
            showDatePicker: false
        });

        const basePath = isManager ? '/manager' : '/admin';
        setBreadcrumbItems([
            { key: `${basePath}/user`, title: "Người dùng" },
            { key: `${basePath}/user/create`, title: "Tạo mới" },
        ]);
    }, [isManager, setHeaderConfig, setBreadcrumbItems]);

    useEffect(() => {
        if (!isManager) return;

        setHeaderConfig({
            title: "Thêm nhân sự doanh nghiệp",
            description: `Tạo tài khoản cho doanh nghiệp thuộc ${currentZoneName || 'khu công nghiệp được phân công'}`,
            showWeather: true,
            showDatePicker: false
        });

        setBreadcrumbItems([
            { key: "/manager/user", title: "Người dùng" },
            { key: "/manager/user/create", title: "Thêm nhân sự" },
        ]);
    }, [currentZoneName, isManager, setBreadcrumbItems, setHeaderConfig]);

    useEffect(() => {
        if (!isManager) return;

        setHeaderConfig({
            title: buildManagerScopedTitle("Thêm nhân sự doanh nghiệp", resolvedManagerZoneName),
            description: `Tạo tài khoản doanh nghiệp trong phạm vi ${resolvedManagerZoneName}.`,
            showWeather: true,
            showDatePicker: false
        });

        setBreadcrumbItems([
            { key: "/manager/user", title: "Nhân sự doanh nghiệp" },
            { key: "/manager/user/create", title: `Thêm nhân sự | ${resolvedManagerZoneName}` },
        ]);
    }, [isManager, resolvedManagerZoneName, setBreadcrumbItems, setHeaderConfig]);

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

    const handleAddAccount = () => {
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

        const userData = {
            full_name: formData.fullName.trim().replace(/\s+/g, ' '),
            email: normalizeEmailInput(formData.email),
            role: formData.role,
            phone_number: normalizePhoneInput(formData.phoneNumber),
            ...(formData.role === 'company' && { company_id: formData.companyId }),
            zone_id: formData.zoneId
        };

        createUserMutation.mutate(userData, {
            onSuccess: () => {
                toast.success('Thành công', 'Tài khoản đã được tạo và gửi thông tin về email.');
                const basePath = isManager ? '/manager' : '/admin';
                setTimeout(() => navigate(`${basePath}/user`), 1000);
            },
            onError: (error) => {
                const { title, description } = mapErrorToNotification(error, 'CREATE_USER');
                toast.error(title ?? 'Không thể tạo tài khoản.', description ?? (error.response?.data?.message || ''));
            }
        });
    };

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
                                    <h4 className="font-bold text-[#4E5BA6] text-sm mb-2">Hướng dẫn</h4>
                                    <ul className="text-xs text-[#4E5BA6]/80 space-y-2 list-disc pl-3 leading-relaxed">
                                        {activeSection === "personal" && (
                                            <>
                                                <li>Nhập chính xác Email để nhận mật khẩu khởi tạo.</li>
                                                <li>Số điện thoại dùng để xác thực 2 lớp (nếu có).</li>
                                            </>
                                        )}
                                        {activeSection === "organization" && (
                                            <>
                                                <li>Quyền Quản lý KCN dùng cho cán bộ Ban quản lý.</li>
                                                <li>Quyền Doanh nghiệp cần chọn đúng đơn vị trực thuộc.</li>
                                            </>
                                        )}
                                        {activeSection === "security" && (
                                            <>
                                                <li>Mật khẩu sẽ được hệ thống tạo ngẫu nhiên.</li>
                                                <li>Người dùng nên đổi mật khẩu ngay lần đầu đăng nhập.</li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto flex flex-col gap-3">
                            <button
                                onClick={handleAddAccount}
                                disabled={createUserMutation.isPending || currentStep !== steps.length}
                                className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group ${currentStep === steps.length
                                    ? "bg-[#4E5BA6] text-white shadow-lg shadow-[#4E5BA6]/30 hover:bg-[#3d4885]"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                {createUserMutation.isPending ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <span>Tạo tài khoản</span>
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
                            {activeSection === "security" && <Shield size={300} />}
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
                                            {!isManager && (
                                                <div className="space-y-4">
                                                    <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                        Phân quyền hệ thống <span className="text-red-500">*</span>
                                                    </label>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {[
                                                            { value: "manager", label: "Quản lý KCN/KCX", icon: Shield, desc: "Dành cho cán bộ Ban quản lý" },
                                                            { value: "company", label: "Doanh nghiệp", icon: Building2, desc: "Dành cho nhân sự tại nhà máy" },
                                                        ].map((role) => (
                                                            <button
                                                                key={role.value}
                                                                onClick={() => handleChange("role", role.value)}
                                                                className={`p-5 rounded-2xl border-2 transition-all duration-200 text-left flex gap-4 ${formData.role === role.value
                                                                    ? "bg-[#4E5BA6]/5 border-[#4E5BA6] shadow-md shadow-[#4E5BA6]/10"
                                                                    : "bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50"
                                                                    }`}
                                                            >
                                                                <div className={`p-3 rounded-xl ${formData.role === role.value ? "bg-[#4E5BA6] text-white" : "bg-gray-100 text-gray-400"}`}>
                                                                    <role.icon size={24} />
                                                                </div>
                                                                <div>
                                                                    <p className={`font-bold ${formData.role === role.value ? "text-[#4E5BA6]" : "text-gray-700"}`}>{role.label}</p>
                                                                    <p className="text-xs text-gray-500 mt-1">{role.desc}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

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

                                                {(formData.role === "company" || isManager) && (
                                                    <div className={isManager ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}>
                                                        <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide">
                                                            Đơn vị trực thuộc (Doanh nghiệp) <span className="text-red-500">*</span>
                                                        </label>
                                                        <Select
                                                            className="w-full"
                                                            placeholder={formData.zoneId ? "Chọn doanh nghiệp" : "Vui lòng chọn KCN trước"}
                                                            value={formData.companyId || undefined}
                                                            onChange={(val) => handleChange("companyId", val)}
                                                            disabled={!formData.zoneId || isCompaniesLoading}
                                                            showSearch
                                                            optionFilterProp="label"
                                                            options={companies.map(c => {
                                                                const count = c.user_slots_count ?? c.active_users_count ?? 0;
                                                                const isFull = count >= 3;
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
                                                                            Đã đăng ký: {count}/3 {disabled && '(Đã đầy)'}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            }}
                                                        />
                                                        {errors.companyId && <p className="text-xs text-red-500 mt-1">{errors.companyId}</p>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {activeSection === "security" && (
                                        <div className="space-y-8">
                                            <div className="p-6 rounded-2xl bg-[#4E5BA6]/5 border border-[#4E5BA6]/20 flex gap-5 items-center">
                                                <div className="p-4 bg-white rounded-2xl shadow-sm text-[#4E5BA6]">
                                                    <KeyRound size={32} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-[#4E5BA6] text-lg">Cấp phát tài khoản tự động</h4>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        Mật khẩu khởi tạo sẽ được hệ thống mã hóa và gửi trực tiếp tới email: <b>{formData.email || "---"}</b>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="p-5 rounded-xl border border-gray-100 bg-gray-50/50">
                                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tên đăng nhập</p>
                                                    <p className="font-semibold text-gray-700">{formData.email || "Chưa cung cấp"}</p>
                                                </div>
                                                <div className="p-5 rounded-xl border border-gray-100 bg-gray-50/50">
                                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Trạng thái mặc định</p>
                                                    <div className="flex items-center gap-2">
                                                        <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                                                        <p className="font-semibold text-gray-700">Kích hoạt</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                                                <AlertCircle className="text-amber-600 shrink-0" size={20} />
                                                <p className="text-xs text-amber-700 leading-relaxed font-medium">
                                                    Vui lòng kiểm tra kỹ các thông tin trước khi xác nhận. Tài khoản sau khi tạo sẽ được phân quyền truy cập ngay lập tức vào các dữ liệu thuộc phạm vi quản lý.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

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

export default CreateUser;

