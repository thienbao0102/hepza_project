import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ConfigProvider,
    Select,
    Input,
    Button,
    Spin,
    DatePicker
} from 'antd';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import toast from '@/utils/toast';
import { mapErrorToNotification } from '@/utils/Error/mapErrorToNotification';
import {
    ChevronRight,
    ChevronLeft,
    Save,
    X,
    Info,
    FileText,
    Calendar,
    ArrowLeft,
    AlertCircle,
    CheckCircle2,
    BookOpen
} from 'lucide-react';
import { useHeader } from '@/components/common/Header/HeaderContext';
import { useRegulation } from '@features/regulation/hooks/useRegulation';

// Reuse the LinearInput styled component from FormAddEnterprise
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

const FormCreateRegulation = () => {
    const navigate = useNavigate();
    const { setHeaderConfig, setBreadcrumbItems } = useHeader();
    const { addRegulation, loading } = useRegulation();

    const [currentStep, setCurrentStep] = useState(1);
    const steps = [
        { id: 1, key: "basic", title: 'Thông tin cơ bản', icon: Info, subtitle: "Cung cấp tiêu đề, số hiệu và phân loại loại hình văn bản pháp quy." },
        { id: 2, key: "summary", title: 'Nội dung tóm tắt', icon: FileText, subtitle: "Tóm lược các phần chính và quy định quan trọng của văn bản." },
        { id: 3, key: "extra", title: 'Thông tin bổ sung', icon: Calendar, subtitle: "Ngày có hiệu lực và các liên kết tra cứu văn bản gốc." }
    ];

    const [formData, setFormData] = useState({
        title: '',
        group: 'Nghị Định',
        summary: '',
        effectiveDate: null,
        link: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        setHeaderConfig({
            title: 'Thêm nghị định mới',
            description: 'Vui lòng điền thông tin văn bản pháp quy bên dưới',
            showWeather: true,
            showDatePicker: false,
        });

        setBreadcrumbItems([
            { key: `/admin/solutions`, title: "Giải pháp" },
            { key: `/admin/regulations/create`, title: "Thêm nghị định" },
        ]);
    }, [setHeaderConfig, setBreadcrumbItems]);

    const validateStep = (step) => {
        const newErrors = {};
        if (step === 1) {
            if (!formData.title) newErrors.title = 'Vui lòng nhập tiêu đề / số hiệu';
            if (!formData.group) newErrors.group = 'Vui lòng chọn loại văn bản';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(currentStep) && currentStep < 3) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        if (!validateStep(currentStep)) return;

        try {
            const payload = {
                ...formData,
                effectiveDate: formData.effectiveDate ? formData.effectiveDate.format('YYYY-MM-DD') : null
            };

            const result = await addRegulation(payload);
            if (result.success) {
                toast.success('Thành công', 'Thêm nghị định mới thành công');
                setTimeout(() => {
                    navigate('/admin/solutions', { state: { activeTab: 'decrees' } });
                }, 1000);
            } else {
                const { title, description } = mapErrorToNotification(result, 'COMMON');
                toast.error(title ?? 'Có lỗi xảy ra khi thêm nghị định', description ?? (result.error || 'Có lỗi xảy ra khi thêm nghị định'));
            }
        } catch (error) {
            const { title, description } = mapErrorToNotification(error, 'COMMON');
            toast.error(title ?? 'Lỗi hệ thống', description ?? 'Lỗi hệ thống, vui lòng thử lại sau');
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                    >
                        <LinearInput
                            label="Tiêu đề / Số hiệu"
                            required
                            placeholder="VD: Nghị định 08/2022/NĐ-CP"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            error={errors.title}
                        />
                        <div className="space-y-1.5 w-full">
                            <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                Loại văn bản <span className="text-red-500">*</span>
                            </label>
                            <Select
                                className="w-full h-11 custom-select-linear"
                                value={formData.group}
                                onChange={(val) => setFormData({ ...formData, group: val })}
                                options={[
                                    { label: 'Nghị Định', value: 'Nghị Định' },
                                    { label: 'Thông Tư', value: 'Thông Tư' },
                                    { label: 'Quyết Định Và Chỉ Thị', value: 'Quyết Định Và Chỉ Thị' },
                                    { label: 'Khác', value: 'Khác' }
                                ]}
                            />
                        </div>
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                    >
                        <div className="space-y-1.5 w-full">
                            <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide">
                                Tóm tắt nội dung
                            </label>
                            <Input.TextArea
                                rows={10}
                                placeholder="Nhập tóm tắt nội dung chính của nghị định..."
                                className="rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:border-[#4E5BA6] hover:bg-white hover:border-gray-200 transition-all text-base p-4 leading-relaxed"
                                value={formData.summary}
                                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                            />
                        </div>
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5 w-full">
                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide">
                                    Ngày hiệu lực
                                </label>
                                <DatePicker
                                    className="w-full h-11 rounded-xl bg-gray-50 border-transparent hover:bg-white hover:border-gray-200 focus:bg-white focus:border-[#4E5BA6] transition-all"
                                    format="DD/MM/YYYY"
                                    value={formData.effectiveDate}
                                    onChange={(date) => setFormData({ ...formData, effectiveDate: date })}
                                />
                            </div>
                            <LinearInput
                                label="Liên kết văn bản"
                                placeholder="https://..."
                                value={formData.link}
                                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                            />
                        </div>

                        <div className="p-5 rounded-2xl bg-[#4E5BA6]/5 border border-[#4E5BA6]/20 flex gap-4 items-start mt-4">
                            <CheckCircle2 className="shrink-0 text-[#4E5BA6] mt-1" size={24} />
                            <div>
                                <h4 className="font-bold text-[#4E5BA6] mb-1 text-base">Kiểm tra thông tin</h4>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Vui lòng kiểm tra kỹ các thông tin đã nhập trước khi lưu. Các nghị định sẽ được hiển thị công khai cho các doanh nghiệp tra cứu.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                );
            default:
                return null;
        }
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
            <div className="h-[calc(100dvh-64px)] bg-[#F8FAFC] pb-8 font-sans overflow-hidden flex items-center justify-center">
                <div className="w-full h-full grid grid-cols-1 md:grid-cols-12 gap-6 p-4">
                    {/* Left Sidebar */}
                    <div className="md:col-span-3 xl:col-span-3 flex flex-col h-full gap-5">
                        {/* Navigation Tabs */}
                        <div className="bg-white rounded-[20px] p-3 shadow-sm border border-gray-100 flex flex-col gap-2">
                            {steps.map((step) => (
                                <button
                                    key={step.id}
                                    onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
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

                        {/* Regulations Info Card */}
                        <div className="bg-[#4E5BA6]/5 rounded-[20px] p-5 border border-[#4E5BA6]/20 flex flex-col gap-3">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-[#4E5BA6]/10 rounded-xl shrink-0">
                                    <Info size={18} className="text-[#4E5BA6]" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-bold text-[#4E5BA6] text-sm mb-2">Quy định & Lưu ý</h4>
                                    <ul className="text-xs text-[#4E5BA6]/80 space-y-2 list-disc pl-3 leading-relaxed">
                                        {currentStep === 1 && (
                                            <>
                                                <li>Số hiệu phải khớp với văn bản gốc (VD: 08/2022/NĐ-CP).</li>
                                                <li>Chọn đúng loại văn bản để phân loại chính xác trong kho dữ liệu.</li>
                                            </>
                                        )}
                                        {currentStep === 2 && (
                                            <>
                                                <li>Tóm tắt các điểm quan trọng nhất để doanh nghiệp dễ dàng nắm bắt.</li>
                                                <li>Độ dài khuyến nghị từ 200 - 500 từ.</li>
                                            </>
                                        )}
                                        {currentStep === 3 && (
                                            <>
                                                <li>Ngày hiệu lực dùng để thông báo cho doanh nghiệp khi văn bản có hiệu lực.</li>
                                                <li>Liên kết văn bản nên trỏ về trang Thư Viện Pháp Luật hoặc Cổng thông tin Chính phủ.</li>
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
                                disabled={loading || currentStep !== 3}
                                className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group ${currentStep === 3
                                    ? "bg-[#4E5BA6] text-white shadow-lg shadow-[#4E5BA6]/30 hover:bg-[#3d4885] hover:shadow-xl"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Lưu Nghị Định</span>

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

                    {/* Right Content */}
                    <div className="md:col-span-9 xl:col-span-9 bg-white rounded-[2.5rem] shadow-xl shadow-gray-100 border border-gray-100 flex flex-col overflow-hidden relative">
                        {/* Header Decoration */}
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none text-[#4E5BA6]">
                            <BookOpen size={300} />
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
                                {renderStepContent()}
                            </AnimatePresence>
                        </div>

                        {/* Footer Controls */}
                        <div className="absolute bottom-6 right-8 left-8 flex justify-between items-center pointer-events-none">
                            <div className="pointer-events-auto">
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
                            </div>
                            <div className="pointer-events-auto">
                                {currentStep < 3 && (
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

            <style jsx global>{`
                .custom-select-linear .ant-select-selector {
                    border-radius: 12px !important;
                    background-color: #F8FAFC !important;
                    border: 1px solid transparent !important;
                    height: 44px !important;
                    padding: 0 12px !important;
                    display: flex !important;
                    align-items: center !important;
                    transition: all 0.2s ease-in-out !important;
                }
                .custom-select-linear .ant-select-selection-item {
                    font-size: 14px !important;
                    color: #111827 !important;
                    font-weight: 500 !important;
                }
                .custom-select-linear.ant-select-focused .ant-select-selector {
                    background-color: white !important;
                    border-color: #4E5BA6 !important;
                    box-shadow: 0 0 0 4px rgba(78, 91, 166, 0.1) !important;
                }
                .custom-select-linear:hover .ant-select-selector {
                    border-color: #E5E7EB !important;
                    background-color: white !important;
                }
            `}</style>
        </ConfigProvider>
    );
};

export default FormCreateRegulation;
