import React, { useState, useEffect, useRef } from 'react';
import { Drawer, Button, Input, Form, ConfigProvider } from 'antd';
import {
    CloudUploadOutlined,
    DeleteOutlined,
    BugOutlined,
    CloseOutlined,
    MessageOutlined,
    FileImageOutlined
} from '@ant-design/icons';
import { useErrorLog } from '@/hooks/useErrorLog';
import toast from '@/utils/toast';

const FeedbackDrawer = ({ open, onClose }) => {
    const [form] = Form.useForm();
    const { createLog, isCreating } = useErrorLog();
    const [screenshots, setScreenshots] = useState([]);
    const [isHoveringUpload, setIsHoveringUpload] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const MAX_IMAGES = 5;
    const fileInputRef = useRef(null);

    // Reset when drawer opens
    useEffect(() => {
        if (open) {
            form.resetFields();
            setScreenshots([]);
        }
    }, [open, form]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const remaining = MAX_IMAGES - screenshots.length;
        if (remaining <= 0) {
            toast.warning('Đã đủ ảnh', `Tối đa ${MAX_IMAGES} ảnh!`);
            return;
        }

        const filesToProcess = files.slice(0, remaining);
        if (files.length > remaining) {
            toast.warning('Giới hạn ảnh', `Chỉ thêm được ${remaining} ảnh nữa (tối đa ${MAX_IMAGES}).`);
        }

        filesToProcess.forEach(file => {
            if (!file.type.startsWith('image/')) {
                toast.error('Lỗi định dạng', `"${file.name}" không phải file ảnh!`);
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Ảnh quá lớn', `"${file.name}" vượt quá 5MB!`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                setScreenshots(prev => {
                    if (prev.length >= MAX_IMAGES) return prev;
                    return [...prev, event.target.result];
                });
            };
            reader.readAsDataURL(file);
        });

        // Reset input để có thể chọn lại cùng file
        e.target.value = '';
    };

    // Helper: process image files (shared by file input, paste, and drag)
    const processImageFiles = (files) => {
        const remaining = MAX_IMAGES - screenshots.length;
        if (remaining <= 0) {
            toast.warning('Đã đủ ảnh', `Tối đa ${MAX_IMAGES} ảnh!`);
            return;
        }

        const imageFiles = files.filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) {
            toast.error('Lỗi định dạng', 'Không tìm thấy file ảnh hợp lệ!');
            return;
        }

        const filesToProcess = imageFiles.slice(0, remaining);
        if (imageFiles.length > remaining) {
            toast.warning('Giới hạn ảnh', `Chỉ thêm được ${remaining} ảnh nữa (tối đa ${MAX_IMAGES}).`);
        }

        filesToProcess.forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Ảnh quá lớn', `"${file.name || 'Screenshot'}" vượt quá 5MB!`);
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setScreenshots(prev => {
                    if (prev.length >= MAX_IMAGES) return prev;
                    return [...prev, event.target.result];
                });
            };
            reader.readAsDataURL(file);
        });
    };

    // Clipboard paste handler (Ctrl+V)
    useEffect(() => {
        if (!open) return;

        const handlePaste = (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            const imageFiles = [];
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) imageFiles.push(file);
                }
            }

            if (imageFiles.length > 0) {
                e.preventDefault();
                processImageFiles(imageFiles);
                toast.success('Dán ảnh', `Đã dán ${imageFiles.length} ảnh từ clipboard`);
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [open, screenshots.length]);

    // Drag & drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer?.files || []);
        if (files.length > 0) {
            processImageFiles(files);
        }
    };

    const handleRemoveScreenshot = (index) => {
        setScreenshots(prev => prev.filter((_, i) => i !== index));
    };

    const onFinish = async (values) => {
        try {
            await createLog({
                message: values.title || 'Phản hồi từ người dùng',
                stack: values.description || '',
                url: window.location.href,
                browser: navigator.userAgent,
                screenshots: screenshots,
                screenshot: screenshots[0] || null, // backwards compat
                status: 'pending'
            });

            toast.success('Gửi thành công', 'Cảm ơn đóng góp của bạn!');

            onClose();
        } catch (error) {
            console.error('Submit feedback failed:', error);
            toast.error('Gửi thất bại', 'Đã có lỗi xảy ra. Vui lòng thử lại sau.');
        }
    };

    return (
        <ConfigProvider
            theme={{
                components: {
                    Drawer: {
                        colorBgElevated: 'rgba(255, 255, 255, 0.95)',
                    },
                    Input: {
                        colorPrimary: '#4E5BA6',
                        algorithm: true, // Enable default algorithms
                        colorBgContainer: '#f9fafb',
                    },
                    Button: {
                        colorPrimary: '#4E5BA6',
                        colorPrimaryHover: '#3d4885',
                        borderRadius: 8,
                    }
                },
                token: {
                    fontFamily: 'Be Vietnam Pro, sans-serif',
                }
            }}
        >
            <Drawer
                title={null} // Custom header
                placement="right"
                onClose={onClose}
                open={open}
                width={480}
                closable={false}
                styles={{
                    mask: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.2)' },
                    body: { padding: 0 },
                    wrapper: { boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' }
                }}
            >
                <div className="flex flex-col h-full bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">

                    {/* --- HEADER --- */}
                    <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white/50 sticky top-0 z-10 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4E5BA6] to-[#6a78c9] flex items-center justify-center shadow-lg shadow-indigo-200">
                                <BugOutlined className="text-white text-xl" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 leading-tight">Góp ý & Báo lỗi</h3>
                                <p className="text-xs text-gray-500 font-medium">Chúng tôi luôn lắng nghe bạn</p>
                            </div>
                        </div>
                        <Button
                            type="text"
                            shape="circle"
                            icon={<CloseOutlined className="text-gray-400" />}
                            onClick={onClose}
                            className="hover:bg-gray-100 transition-colors"
                        />
                    </div>

                    {/* --- CONTENT --- */}
                    <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={onFinish}
                            requiredMark={false}
                        >
                            {/* Title Input */}
                            <Form.Item
                                name="title"
                                label={<span className="text-sm font-semibold text-gray-700">Tiêu đề</span>}
                                rules={[
                                    { required: true, message: 'Vui lòng nhập tiêu đề' },
                                    { whitespace: true, message: 'Tiêu đề không được để trống' },
                                    { min: 5, message: 'Tiêu đề phải có ít nhất 5 ký tự' },
                                    { max: 100, message: 'Tiêu đề quá dài (tối đa 100 ký tự)' }
                                ]}
                            >
                                <Input
                                    prefix={<MessageOutlined className="text-gray-400 mr-1" />}
                                    placeholder="Tóm tắt ngắn gọn vấn đề..."
                                    className="rounded-lg py-2.5 border-gray-200 hover:border-[#4E5BA6] focus:border-[#4E5BA6] focus:shadow-sm transition-all"
                                    maxLength={100}
                                    showCount
                                />
                            </Form.Item>

                            {/* Description Input */}
                            <Form.Item
                                name="description"
                                label={<span className="text-sm font-semibold text-gray-700">Chi tiết vấn đề</span>}
                                rules={[
                                    { required: true, message: 'Vui lòng nhập mô tả' },
                                    { whitespace: true, message: 'Mô tả không được để trống' },
                                    { min: 10, message: 'Mô tả phải có ít nhất 10 ký tự' },
                                    { max: 1000, message: 'Mô tả quá dài (tối đa 1000 ký tự)' }
                                ]}
                            >
                                <Input.TextArea
                                    rows={5}
                                    placeholder="Mô tả chi tiết các bước để tái hiện lỗi hoặc ý kiến đóng góp của bạn..."
                                    className="rounded-lg py-2.5 border-gray-200 hover:border-[#4E5BA6] focus:border-[#4E5BA6] transition-all resize-none text-[15px]"
                                    maxLength={1000}
                                    showCount
                                />
                            </Form.Item>

                            {/* Upload Area */}
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Đính kèm ảnh minh họa</label>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileChange}
                                />

                                {/* Preview grid */}
                                {screenshots.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        {screenshots.map((src, idx) => (
                                            <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-50">
                                                <img src={src} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveScreenshot(idx)}
                                                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                                                >
                                                    <DeleteOutlined style={{ fontSize: 12 }} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Upload button / Drop zone */}
                                {screenshots.length < MAX_IMAGES && (
                                    <div
                                        onClick={handleUploadClick}
                                        onMouseEnter={() => setIsHoveringUpload(true)}
                                        onMouseLeave={() => setIsHoveringUpload(false)}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`
                                            cursor-pointer group flex flex-col items-center justify-center py-6 px-4 
                                            border-2 border-dashed rounded-xl transition-all duration-300
                                            ${isDragging
                                                ? 'border-[#4E5BA6] bg-indigo-100/60 scale-[1.02] shadow-lg shadow-indigo-100'
                                                : isHoveringUpload
                                                    ? 'border-[#4E5BA6] bg-indigo-50/50'
                                                    : 'border-gray-200 bg-gray-50/30 hover:bg-gray-50'
                                            }
                                        `}
                                    >
                                        <div className={`
                                            w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-300
                                            ${isDragging || isHoveringUpload ? 'bg-[#4E5BA6] text-white scale-110 shadow-lg shadow-indigo-200' : 'bg-gray-100 text-gray-400'}
                                        `}>
                                            <CloudUploadOutlined className="text-lg" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-700 mb-0.5">
                                            {isDragging ? 'Thả ảnh vào đây...' : screenshots.length === 0 ? 'Nhấn, dán (Ctrl+V) hoặc kéo ảnh vào' : 'Thêm ảnh'}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {screenshots.length}/{MAX_IMAGES} ảnh · JPG, PNG (Tối đa 5MB/ảnh)
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Tech Info Widget */}
                            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3 items-start">
                                <div className="mt-0.5 text-[#4E5BA6]">
                                    <FileImageOutlined />
                                </div>
                                <div className="text-xs text-slate-600 leading-relaxed">
                                    <span className="font-semibold text-[#4E5BA6]">Thông tin hệ thống:</span> Chúng tôi sẽ tự động thu thập URL và thông tin trình duyệt để hỗ trợ xử lý vấn đề chính xác hơn.
                                </div>
                            </div>
                        </Form>
                    </div>

                    {/* --- FOOTER --- */}
                    <div className="px-6 py-4 border-t border-gray-100 bg-white sticky bottom-0 z-10 flex justify-end gap-3 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
                        <Button
                            size="large"
                            onClick={onClose}
                            className="bg-gray-50 border-gray-200 text-gray-600 font-medium hover:bg-gray-100 hover:text-gray-800"
                        >
                            Đóng
                        </Button>
                        <Button
                            type="primary"
                            size="large"
                            onClick={() => form.submit()}
                            loading={isCreating}
                            className="bg-gradient-to-r from-[#4E5BA6] to-[#5b6bc2] border-none shadow-lg shadow-indigo-200 hover:shadow-indigo-300 font-semibold px-8"
                        >
                            Gửi Phản Hồi
                        </Button>
                    </div>
                </div>
            </Drawer>
        </ConfigProvider>
    );
};

export default FeedbackDrawer;
