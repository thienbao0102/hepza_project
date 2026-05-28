import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Input, Select, Spin, ConfigProvider } from 'antd';
import toast from '@/utils/toast';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Info,
    FileText,
    Link as LinkIcon,
    ChevronRight,
    Search,
    Plus,
    Trash2,
    CheckCircle2,
    Hash,
    Layers,
    ExternalLink
} from 'lucide-react';
import { GROUP_SOLUTIONS } from '@utils/solutionUtils';
import { useAllHashtags, useCreateHashtag } from '@features/admin/hooks/useHashtagQueries';
import { handlerCreateSolution, handlerGetSolutionDetail, handlerUpdateSolution } from '@services/solutionService';
import { queryKeys } from '@lib/queryClient';
import { useHeader } from '@/components/common/Header/HeaderContext';
import { mapErrorToNotification } from '@/utils/Error/mapErrorToNotification';

const { TextArea } = Input;

const ReactQuill = React.lazy(() =>
    Promise.all([
        import('react-quill-new'),
        import('react-quill-new/dist/quill.snow.css'),
    ]).then(([module]) => ({ default: module.default }))
);

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

const FormCreateSolution = ({ mode = 'create' }) => {
    const navigate = useNavigate();
    const { solutionId } = useParams();
    const decodedSolutionId = solutionId ? decodeURIComponent(solutionId) : '';
    const isEditMode = mode === 'edit' && Boolean(decodedSolutionId);
    const { setHeaderConfig, setBreadcrumbItems } = useHeader();
    const queryClient = useQueryClient();
    const quillRef = useRef(null);

    const [currentStep, setCurrentStep] = useState(1);
    const steps = [
        { id: 1, key: "basic", title: 'Thông tin cơ bản', icon: Info, subtitle: "Tên gọi, phân loại và các từ khóa định danh của giải pháp." },
        { id: 2, key: "content", title: 'Nội dung chi tiết', icon: FileText, subtitle: "Trình bày chi tiết cách thức triển khai và lợi ích của giải pháp." },
        { id: 3, key: "references", title: 'Nguồn tham khảo', icon: LinkIcon, subtitle: "Đính kèm các liên kết tài liệu hướng dẫn hoặc nguồn tin uy tín." }
    ];
    const activeSection = steps[currentStep - 1].key;
    const activeIndex = currentStep - 1;

    const [formData, setFormData] = useState({
        solution_name: '',
        tags: [],
        des_short: '',
        group_solution: '',
        des_long: '',
        links: [''],
    });

    const [tagOptions, setTagOptions] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCreatingTag, setIsCreatingTag] = useState(false);
    const [isLoadingSolution, setIsLoadingSolution] = useState(false);
    const [errors, setErrors] = useState({});

    const { data: hashtagData = [], isLoading: isHashtagLoading } = useAllHashtags();
    const createHashtagMutation = useCreateHashtag();

    const quillModules = useMemo(
        () => ({
            toolbar: [
                [{ header: [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ list: 'ordered' }, { list: 'bullet' }],
                ['link'],
                ['clean'],
            ],
        }),
        []
    );

    const quillFormats = useMemo(
        () => ['header', 'bold', 'italic', 'underline', 'strike', 'list', 'link'],
        []
    );

    useEffect(() => {
        const title = isEditMode ? 'Chỉnh sửa giải pháp' : 'Thêm giải pháp mới';
        const description = isEditMode ? `Đang chỉnh sửa: ${decodedSolutionId}` : 'Vui lòng điền thông tin bên dưới';

        setHeaderConfig({
            title: title,
            description: description,
            showWeather: true,
            showDatePicker: false,
        });

        setBreadcrumbItems(isEditMode ? [
            { key: '/admin/solutions', title: "Giải pháp" },
            { key: '/solutions/update-solution', title: "Cập nhật giải pháp" },
            { key: `/admin/solutions/${solutionId}/edit`, title: formData.solution_name || solutionId },
        ] : [
            { key: `/admin/solutions`, title: "Giải pháp" },
            { key: `/admin/solutions/create`, title: "Thêm mới" },
        ]);
        // Only trigger on mode or ID change to prevent infinite loops
    }, [isEditMode, decodedSolutionId, solutionId]);

    useEffect(() => {
        if (Array.isArray(hashtagData)) {
            const mapped = hashtagData
                .map((item) => {
                    const name = item?.name?.trim();
                    if (!name) return null;
                    return { label: name, value: name };
                })
                .filter(Boolean);
            setTagOptions(mapped);
        }
    }, [hashtagData]);

    useEffect(() => {
        if (!isEditMode) return;

        const fetchDetail = async () => {
            try {
                setIsLoadingSolution(true);
                const detail = await handlerGetSolutionDetail(decodedSolutionId);
                if (!detail) throw new Error('Giải pháp không tồn tại');

                const linkValue = Array.isArray(detail.link)
                    ? detail.link
                    : detail.link ? [detail.link] : [''];

                setFormData({
                    solution_name: detail.solution_name || '',
                    tags: Array.isArray(detail.tags) ? detail.tags : [],
                    des_short: detail.des_short || '',
                    group_solution: detail.group_solution || '',
                    des_long: detail.des_long || '',
                    links: linkValue.length > 0 ? linkValue : [''],
                });
            } catch (error) {
                const { title, description } = mapErrorToNotification(error, 'GET_SOLUTION');
                toast.error(title ?? 'Không thể tải thông tin giải pháp', description ?? (error.message || ''));
                navigate('/admin/solutions');
            } finally {
                setIsLoadingSolution(false);
            }
        };

        fetchDetail();
    }, [isEditMode, decodedSolutionId]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const validateStep = (step) => {
        let newErrors = {};
        if (step === "basic") {
            if (!formData.solution_name.trim()) newErrors.solution_name = "Tên giải pháp là bắt buộc";
            if (!formData.tags.length) newErrors.tags = "Vui lòng chọn ít nhất 1 hashtag";
        } else if (step === "content") {
            if (!formData.group_solution) newErrors.group_solution = "Vui lòng chọn nhóm giải pháp";
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

    const handleLinkChange = (index, value) => {
        const nextLinks = formData.links.map((link, i) => (i === index ? value : link));
        setFormData(prev => ({ ...prev, links: nextLinks }));
    };

    const addLink = () => {
        setFormData(prev => ({ ...prev, links: [...prev.links, ''] }));
    };

    const removeLink = (index) => {
        if (formData.links.length === 1) return;
        setFormData(prev => ({
            ...prev,
            links: prev.links.filter((_, i) => i !== index)
        }));
    };

    const handleTagsChange = (values) => {
        const normalized = values.map(v => v.startsWith('#') ? v : `#${v.trim()}`).filter(Boolean);
        handleChange('tags', Array.from(new Set(normalized)));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!validateStep("basic") || !validateStep("content")) {
            setCurrentStep(!validateStep("basic") ? 1 : 2);
            return;
        }

        setIsSubmitting(true);
        try {
            // Ensure hashtags exist
            const tagsToCreate = formData.tags.filter(tag => !tagOptions.some(opt => opt.value === tag));
            for (const tag of tagsToCreate) {
                await createHashtagMutation.mutateAsync({ name: tag });
            }

            const payload = {
                solution_name: formData.solution_name.trim(),
                des_short: formData.des_short.trim(),
                tags: formData.tags,
                group_solution: formData.group_solution,
                des_long: formData.des_long,
                link: formData.links.filter(l => l.trim()).join(', ') || ''
            };

            if (isEditMode) {
                await handlerUpdateSolution(decodedSolutionId, payload);
                toast.success('Thành công', 'Cập nhật giải pháp thành công');
            } else {
                await handlerCreateSolution(payload);
                toast.success('Thành công', 'Tạo giải pháp thành công');
            }

            queryClient.invalidateQueries([queryKeys.solutions.all]);
            navigate('/admin/solutions');
        } catch (error) {
            const context = isEditMode ? 'UPDATE_SOLUTION' : 'CREATE_SOLUTION';
            const { title, description } = mapErrorToNotification(error, context);
            toast.error(title ?? 'Có lỗi xảy ra', description ?? (error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.'));
        } finally {
            setIsSubmitting(false);
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
            <div className="h-[calc(100dvh-64px)] bg-[#F8FAFC] pb-8 font-sans overflow-hidden flex items-center justify-center">
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
                                    <CheckCircle2 size={18} className="text-[#4E5BA6]" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#4E5BA6] text-sm mb-2">Quy định đăng</h4>
                                    <ul className="text-xs text-[#4E5BA6]/80 space-y-2 list-disc pl-3 leading-relaxed">
                                        <li>Cung cấp tiêu đề rõ ràng, mô tả đúng trọng tâm giải pháp.</li>
                                        <li>Sử dụng Hashtag để người dùng dễ dàng tìm kiếm.</li>
                                        <li>Trình bày nội dung chi tiết chuyên nghiệp, có cấu trúc.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto flex flex-col gap-3">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || currentStep !== steps.length}
                                className={`w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group ${currentStep === steps.length
                                    ? "bg-[#4E5BA6] text-white shadow-lg shadow-[#4E5BA6]/30 hover:bg-[#3d4885]"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    }`}
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <span>{isEditMode ? 'Cập nhật giải pháp' : 'Đăng giải pháp'}</span>
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
                            {activeSection === "basic" && <Info size={300} />}
                            {activeSection === "content" && <FileText size={300} />}
                            {activeSection === "references" && <LinkIcon size={300} />}
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
                                    {activeSection === "basic" && (
                                        <div className="space-y-6">
                                            <LinearInput
                                                label="Tên giải pháp"
                                                required
                                                value={formData.solution_name}
                                                onChange={(e) => handleChange("solution_name", e.target.value)}
                                                error={errors.solution_name}
                                                placeholder="VD: Hệ thống lọc bụi tĩnh điện thế hệ mới"
                                            />

                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                    HashTag <span className="text-red-500">*</span>
                                                </label>
                                                <Select
                                                    mode="tags"
                                                    value={formData.tags}
                                                    onChange={handleTagsChange}
                                                    options={tagOptions}
                                                    placeholder="Chọn hoặc nhập hashtag mới..."
                                                    className="w-full"
                                                    loading={isHashtagLoading}
                                                />
                                                {errors.tags && <p className="text-xs text-red-500 font-medium mt-1">{errors.tags}</p>}
                                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                    <Hash size={12} /> Nhấn Enter sau mỗi hashtag để xác nhận.
                                                </p>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide">
                                                    Mô tả ngắn
                                                </label>
                                                <TextArea
                                                    rows={4}
                                                    value={formData.des_short}
                                                    onChange={(e) => handleChange("des_short", e.target.value)}
                                                    placeholder="Tóm tắt về giải pháp trong 2-3 câu..."
                                                    className="rounded-xl bg-gray-50 border-transparent hover:border-gray-200 focus:border-[#4E5BA6] focus:bg-white transition-all text-sm"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {activeSection === "content" && (
                                        <div className="space-y-8">
                                            <div className="space-y-4">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                    Nhóm giải pháp <span className="text-red-500">*</span>
                                                </label>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {GROUP_SOLUTIONS.map((group) => {
                                                        const isSelected = formData.group_solution === group;
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={group}
                                                                onClick={() => handleChange("group_solution", group)}
                                                                className={`p-4 rounded-xl border-2 transition-all text-sm font-bold flex items-center gap-3 ${isSelected
                                                                    ? "bg-[#4E5BA6]/5 border-[#4E5BA6] text-[#4E5BA6] shadow-sm"
                                                                    : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                                                                    }`}
                                                            >
                                                                <Layers size={16} className={isSelected ? "text-[#4E5BA6]" : "text-gray-400"} />
                                                                <span>{group}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {errors.group_solution && <p className="text-xs text-red-500 font-medium">{errors.group_solution}</p>}
                                            </div>

                                            <div className="space-y-3">
                                                <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide">
                                                    Nội dung chi tiết
                                                </label>
                                                <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white shadow-inner">
                                                    <Suspense fallback={<div className="h-64 flex items-center justify-center bg-gray-50"><Spin /></div>}>
                                                        <ReactQuill
                                                            ref={quillRef}
                                                            value={formData.des_long}
                                                            onChange={(val) => handleChange("des_long", val)}
                                                            modules={quillModules}
                                                            formats={quillFormats}
                                                            placeholder="Mô tả chi tiết giải pháp..."
                                                            theme="snow"
                                                            className="min-h-[300px]"
                                                        />
                                                    </Suspense>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeSection === "references" && (
                                        <div className="space-y-8">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[12px] font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1">
                                                        Liên kết tham khảo
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={addLink}
                                                        className="flex items-center gap-1.5 text-[#4E5BA6] text-xs font-bold hover:underline"
                                                    >
                                                        <Plus size={14} /> Thêm liên kết
                                                    </button>
                                                </div>

                                                <div className="space-y-3">
                                                    {formData.links.map((link, index) => (
                                                        <div key={index} className="flex gap-3 items-start group">
                                                            <div className="flex-1">
                                                                <LinearInput
                                                                    placeholder="https://example.com/document"
                                                                    value={link}
                                                                    onChange={(e) => handleLinkChange(index, e.target.value)}
                                                                />
                                                            </div>
                                                            {formData.links.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeLink(index)}
                                                                    className="mt-2.5 p-2 text-gray-300 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="p-6 bg-[#4E5BA6]/5 rounded-2xl border border-[#4E5BA6]/10 flex gap-4">
                                                <div className="p-2 bg-white rounded-xl shadow-sm text-[#4E5BA6]">
                                                    <ExternalLink size={24} />
                                                </div>
                                                <div>
                                                    <h5 className="font-bold text-gray-900 text-sm">Gợi ý nguồn tài liệu</h5>
                                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                                        Nên dẫn link từ các trang chính phủ (.gov), trang tin khoa học uy tín hoặc website chính thức của nhà cung cấp giải pháp để tăng độ tin cậy.
                                                    </p>
                                                </div>
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

            <style>{`
                .ql-container.ql-snow {
                    border: none !important;
                }
                .ql-toolbar.ql-snow {
                    border: none !important;
                    border-bottom: 1px solid #f1f1f1 !important;
                    background: #fafafa;
                    padding: 12px !important;
                }
                .ql-editor {
                    min-height: 250px;
                    font-family: 'Inter', sans-serif !important;
                    font-size: 15px !important;
                    line-height: 1.6 !important;
                    padding: 20px !important;
                }
            `}</style>
        </ConfigProvider>
    );
};

export default FormCreateSolution;

