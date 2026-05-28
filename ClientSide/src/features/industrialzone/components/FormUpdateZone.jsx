import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Select, DatePicker, ConfigProvider, Spin } from 'antd';
import dayjs from "dayjs";
import { motion, AnimatePresence } from "framer-motion";
import toast from '@/utils/toast';
import {
    Building2,
    MapPin,
    Calendar,
    Activity,
    Image as ImageIcon,
    Upload,
    X,
    ChevronRight,
    ArrowLeft,
    Info,
    CheckCircle2
} from "lucide-react";
import { useUpdateZone, useZone } from '@features/industrialzone/hooks/useZoneQueries';
import { mapErrorToNotification } from '@/utils/Error/mapErrorToNotification';
import { useHeader } from '@/components/common/Header/HeaderContext';
import locale from 'antd/es/date-picker/locale/vi_VN';

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

const FormUpdateZone = () => {
    const navigate = useNavigate();
    const { zone_id } = useParams();
    const [currentStep, setCurrentStep] = useState(1);
    const steps = [
        { id: 1, key: "info", title: 'Thông tin chung', icon: Building2, subtitle: "Điều chỉnh các thông tin pháp lý và vị trí địa lý của khu công nghiệp." },
        { id: 2, key: "image", title: 'Hình ảnh đại diện', icon: ImageIcon, subtitle: "Cập nhật hoặc thay thế hình ảnh nhận diện thực tế." }
    ];
    const activeSection = steps[currentStep - 1].key;
    const activeIndex = currentStep - 1;

    const [formData, setFormData] = useState({
        zone_name: '',
        zone_type: '',
        location: '',
        established_year: '',
        status: '',
        manager_id: 'none',
    });

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const { setHeaderConfig, setBreadcrumbItems } = useHeader();
    const updateZoneMutation = useUpdateZone();
    const { data: zoneDataResponse, isLoading: isZoneLoading } = useZone(zone_id ? zone_id : null);
    const fileInputRef = useRef(null);
    const zoneData = zoneDataResponse?.zone;
    const managerDisplayName = useMemo(() => {
        const primaryManager = zoneData?.managers?.[0];
        if (primaryManager?.full_name) {
            return primaryManager.user_id
                ? `${primaryManager.full_name} (${primaryManager.user_id})`
                : primaryManager.full_name;
        }

        const fallbackManagerId = zoneData?.managers_ids?.[0];
        return fallbackManagerId || 'Chưa có tài khoản quản lý';
    }, [zoneData]);

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
        if (zoneDataResponse?.zone) {
            const zoneData = zoneDataResponse.zone;
            setFormData({
                zone_name: zoneData.zone_name || "",
                zone_type: zoneData.zone_type || "",
                location: zoneData.location || "",
                established_year: zoneData.established_year || "",
                status: zoneData.status || "active",
                manager_id: zoneData.managers_ids?.[0] || 'none',
            });
            if (zoneData.image_url) {
                setImagePreview(zoneData.image_url);
            }

            // Update header config dynamically
            setHeaderConfig({
                title: `Cập Nhật: ${zoneData.zone_name}`,
                description: "Chỉnh sửa thông tin chi tiết khu công nghiệp / khu chế xuất",
                showWeather: true,
                showDatePicker: true
            });
        }
    }, [zoneDataResponse]);

    useEffect(() => {
        setBreadcrumbItems([
            { key: '/industrialZone', title: "Khu công nghiệp" },
            { key: '/industrialZone/update-zone', title: "Cập nhật khu công nghiệp" },
            { key: `/industrialZone/update-zone/${zone_id}`, title: formData.zone_name || zone_id },
        ]);
    }, [zone_id]);

    useEffect(() => () => {
        if (imagePreview && imageFile) URL.revokeObjectURL(imagePreview);
    }, [imageFile, imagePreview]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview('');
        if (fileInputRef.current) fileInputRef.current.value = null;
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        const newImageFile = imageFile instanceof File ? imageFile : null;
        const { manager_id, ...rest } = formData;
        const zonePayload = {
            ...rest,
            established_year: formData.established_year ? Number(formData.established_year) : null,
        };

        updateZoneMutation.mutate(
            { zoneId: zone_id, zoneData: zonePayload, imageFile: newImageFile },
            {
                onSuccess: () => {
                    toast.success("Thành công", "Cập nhật khu công nghiệp thành công!");
                    setTimeout(() => {
                        const basePath = window.location.pathname.startsWith('/admin') ? '/admin' : '/manager';
                        navigate(`${basePath}/industrialZone`);
                    }, 1000);
                },
                onError: (error) => {
                    const { title, description } = mapErrorToNotification(error, 'UPDATE_ZONE');
                    toast.error(title ?? 'Không thể cập nhật khu công nghiệp.', description ?? (error.message || ''));
                },
            }
        );
    };

    if (isZoneLoading) return <div className="flex justify-center items-center h-[calc(100dvh-64px)] text-gray-400 font-medium">Đang tải dữ liệu khu công nghiệp...</div>;

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

                        {/* Tips Card */}
                        <div className="bg-[#4E5BA6]/5 rounded-[20px] p-5 border border-[#4E5BA6]/20 flex flex-col gap-3">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-[#4E5BA6]/10 rounded-xl shrink-0">
                                    <Info size={18} className="text-[#4E5BA6]" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#4E5BA6] text-sm mb-2">Thông tin sửa đổi</h4>
                                    <ul className="text-xs text-[#4E5BA6]/80 space-y-2 list-disc pl-3 leading-relaxed">
                                        {activeSection === "info" && (
                                            <>
                                                <li>Cập nhật tên hoặc loại hình sẽ ảnh hưởng đến việc phân loại doanh nghiệp trong khu.</li>
                                                <li>Tài khoản quản lý được cập nhật ở màn người dùng và luôn đi theo vòng đời của khu công nghiệp này.</li>
                                                <li>Trạng thái "Ngưng hoạt động" sẽ ẩn khu này khỏi các danh mục lựa chọn mới.</li>
                                            </>
                                        )}
                                        {activeSection === "image" && (
                                            <>
                                                <li>Tải ảnh mới sẽ thay thế hoàn toàn ảnh cũ đang hiển thị trên hệ thống.</li>
                                                <li>Ảnh chụp rõ biển hiệu hoặc cổng KCN giúp định vị trực quan tốt nhất.</li>
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
                                disabled={updateZoneMutation.isPending || currentStep !== steps.length}
                                className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group ${currentStep === steps.length
                                    ? "bg-[#4E5BA6] text-white shadow-lg shadow-[#4E5BA6]/30 hover:bg-[#3d4885] hover:shadow-xl"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                {updateZoneMutation.isPending ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Cập nhật dữ liệu</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => navigate(-1)}
                                className="w-full py-3.5 rounded-xl bg-white text-gray-500 font-semibold border border-gray-200 hover:bg-gray-50 hover:text-gray-700 transition-all"
                            >
                                Hủy thay đổi
                            </button>
                        </div>
                    </div>

                    {/* Right Content */}
                    <div className="md:col-span-9 xl:col-span-9 bg-white rounded-[2.5rem] shadow-xl shadow-gray-100 border border-gray-100 flex flex-col overflow-hidden relative">
                        {/* Header Decoration */}
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-[#4E5BA6]">
                            <Building2 size={300} />
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
                                    {activeSection === "info" && (
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-5">
                                            <div className="col-span-1 xl:col-span-2">
                                                <LinearInput
                                                    label="Tên Khu Công Nghiệp"
                                                    required
                                                    name="zone_name"
                                                    value={formData.zone_name}
                                                    onChange={handleChange}
                                                    placeholder="Ví dụ: Khu Công Nghiệp Hiệp Phước"
                                                    className="font-medium"
                                                />
                                            </div>

                                            <div className="col-span-1 space-y-2">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                    Loại hình <span className="text-red-500">*</span>
                                                </label>
                                                <Select
                                                    className="w-full"
                                                    placeholder="-- Chọn loại hình --"
                                                    value={formData.zone_type || undefined}
                                                    onChange={(value) => handleSelectChange('zone_type', value)}
                                                    size="middle"
                                                    disabled
                                                >
                                                    <Select.Option value="KCN">Khu công nghiệp</Select.Option>
                                                    <Select.Option value="KCX">Khu chế xuất</Select.Option>
                                                </Select>
                                            </div>

                                            <div className="col-span-1 space-y-2">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                    Năm Thành Lập
                                                </label>
                                                <DatePicker
                                                    picker="year"
                                                    locale={locale}
                                                    className="w-full font-medium"
                                                    placeholder="-- Chọn năm thành lập --"
                                                    value={formData.established_year ? dayjs(String(formData.established_year), 'YYYY') : null}
                                                    onChange={(date) => {
                                                        setFormData(prev => ({ ...prev, established_year: date ? date.year() : "" }));
                                                    }}
                                                    size="middle"
                                                />
                                            </div>

                                            <div className="col-span-1 space-y-2">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                    Trạng thái hoạt động
                                                </label>
                                                <Select
                                                    className="w-full font-bold"
                                                    placeholder="-- Chọn trạng thái --"
                                                    value={formData.status || undefined}
                                                    onChange={(value) => handleSelectChange('status', value)}
                                                    size="middle"
                                                >
                                                    <Select.Option value="active">
                                                        <span className="text-green-600">Đang hoạt động</span>
                                                    </Select.Option>
                                                    <Select.Option value="off">
                                                        <span className="text-red-600">Ngưng hoạt động</span>
                                                    </Select.Option>
                                                </Select>
                                            </div>

                                            <div className="col-span-1 space-y-2">
                                                <LinearInput
                                                    label="Quản lý phụ trách"
                                                    value={managerDisplayName}
                                                    readOnly
                                                    disabled
                                                    className="cursor-not-allowed bg-gray-100 text-gray-600"
                                                />
                                                <p className="text-xs font-medium text-gray-400">
                                                    Muốn đổi người phụ trách, hãy cập nhật thông tin tài khoản manager ở màn người dùng.
                                                </p>
                                            </div>

                                            <div className="col-span-1 xl:col-span-2">
                                                <LinearInput
                                                    label="Địa chỉ / Vị trí"
                                                    name="location"
                                                    value={formData.location}
                                                    onChange={handleChange}
                                                    placeholder="Ví dụ: Lô Trung tâm, KCN Hiệp Phước, TP.HCM"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeSection === "image" && (
                                        <div className="space-y-6">
                                            <div className="p-8 border-2 border-dashed border-gray-200 rounded-[2rem] bg-gray-50/50 flex flex-col items-center justify-center transition-all hover:bg-gray-50 hover:border-[#4E5BA6]/30">
                                                {imagePreview ? (
                                                    <div className="relative w-full max-w-lg group">
                                                        <img src={imagePreview} alt="Preview" className="w-full h-64 object-cover rounded-2xl shadow-xl border-4 border-white" />
                                                        <button
                                                            onClick={handleRemoveImage}
                                                            className="absolute -top-3 -right-3 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                                        >
                                                            <X size={20} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-4 py-10">
                                                        <div className="p-5 bg-white rounded-3xl shadow-sm">
                                                            <ImageIcon size={48} className="text-gray-300" />
                                                        </div>
                                                        <div className="text-center">
                                                            <label htmlFor="image-upload" className="cursor-pointer">
                                                                <span className="text-[#4E5BA6] font-bold text-lg hover:underline decoration-2 underline-offset-4">Chọn ảnh từ thiết bị</span>
                                                                <input id="image-upload" type="file" accept="image/*" className="sr-only" onChange={handleImageChange} ref={fileInputRef} />
                                                            </label>
                                                            <p className="text-sm text-gray-400 mt-2">Dung lượng tối đa 10MB. Định dạng PNG, JPG, JPEG.</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-5 rounded-2xl bg-[#4E5BA6]/5 border border-[#4E5BA6]/20 flex gap-4 items-start">
                                                <Activity className="shrink-0 text-[#4E5BA6] mt-1" size={24} />
                                                <div>
                                                    <h4 className="font-bold text-[#4E5BA6] mb-1 text-base">Hiển thị trên bản đồ</h4>
                                                    <p className="text-sm text-gray-600 leading-relaxed font-medium">
                                                        Hình ảnh này sẽ đại diện cho khu công nghiệp trong các chế độ xem danh sách và ghim vị trí trên bản đồ quản lý tập trung.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Footer Navigation Area */}
                        <div className="p-6 bg-white flex items-center justify-between shrink-0">
                            <button
                                onClick={handleBack}
                                disabled={activeIndex === 0}
                                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeIndex === 0
                                    ? "text-gray-200 cursor-not-allowed uppercase text-[11px]"
                                    : "text-gray-500 hover:bg-gray-100 uppercase text-[11px]"
                                    }`}
                            >
                                <ArrowLeft size={16} />
                                <span>Quay lại</span>
                            </button>

                            <div className="flex items-center gap-4">
                                {activeSection !== "image" && (
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

export default FormUpdateZone;
