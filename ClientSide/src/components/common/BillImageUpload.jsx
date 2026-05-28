import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import toast from '@/utils/toast';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const BillImageUpload = ({ currentImage, onUpload, isUploading = false, label = 'Hóa đơn', disabled = false }) => {
    const [preview, setPreview] = useState(currentImage || null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const dragCounter = useRef(0);

    useEffect(() => {
        setPreview(currentImage || null);
    }, [currentImage]);

    const processFile = useCallback((file) => {
        if (!file) return;

        if (!ALLOWED_TYPES.includes(file.type)) {
            toast.error('Định dạng không hỗ trợ', 'Chỉ chấp nhận file ảnh (JPG, PNG, WebP)');
            return;
        }

        if (file.size > MAX_SIZE) {
            toast.error('File quá lớn', 'Dung lượng ảnh tối đa là 10MB.');
            return;
        }

        if (preview && preview.startsWith('blob:')) {
            URL.revokeObjectURL(preview);
        }
        setPreview(URL.createObjectURL(file));
        onUpload(file);
    }, [preview, onUpload]);

    const handleFileChange = (e) => {
        processFile(e.target.files?.[0]);
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setIsDragging(false);

        if (disabled || isUploading) return;

        const file = e.dataTransfer.files?.[0];
        processFile(file);
    };

    const handleRemove = () => {
        if (preview && preview.startsWith('blob:')) {
            URL.revokeObjectURL(preview);
        }
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onUpload(null);
    };

    const dragProps = {
        onDragEnter: handleDragEnter,
        onDragLeave: handleDragLeave,
        onDragOver: handleDragOver,
        onDrop: handleDrop,
    };

    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">{label}</label>

            {preview ? (
                <div className="relative group w-fit" {...dragProps}>
                    <img
                        src={preview}
                        alt={label}
                        className="w-32 h-32 object-cover rounded-xl border-2 border-slate-200 shadow-sm"
                        loading="lazy"
                    />
                    {!disabled && (
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="size-3" />
                        </button>
                    )}
                    {isUploading && (
                        <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                            <Loader2 className="size-6 text-white animate-spin" />
                        </div>
                    )}
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isUploading}
                    className={clsx(
                        "w-32 h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-200",
                        disabled
                            ? "border-slate-200 bg-slate-50 cursor-not-allowed"
                            : isDragging
                                ? "border-blue-500 bg-blue-50 scale-105 shadow-lg"
                                : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer"
                    )}
                    {...dragProps}
                >
                    {isUploading ? (
                        <Loader2 className="size-6 text-blue-500 animate-spin" />
                    ) : (
                        <>
                            <Upload className={clsx("size-5 transition-colors", isDragging ? "text-blue-500" : "text-slate-400")} />
                            <span className={clsx("text-xs font-medium transition-colors", isDragging ? "text-blue-600" : "text-slate-500")}>
                                {isDragging ? 'Thả ảnh vào đây' : 'Kéo thả hoặc bấm'}
                            </span>
                        </>
                    )}
                </button>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
                disabled={disabled || isUploading}
            />
        </div>
    );
};

export default BillImageUpload;
