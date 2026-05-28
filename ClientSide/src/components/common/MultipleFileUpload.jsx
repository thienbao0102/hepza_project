import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, X, Loader2, FileText, Image as ImageIcon } from 'lucide-react';
import clsx from 'clsx';
import toast from '@/utils/toast';

const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/jpg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed',
    'multipart/x-zip',
];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

const MultipleFileUpload = ({ currentFiles = [], onUpload, isUploading = false, label = 'Tài liệu đính kèm', disabled = false }) => {
    // previews = [{ file: File or null, url: string, name: string, type: string, id: string }]
    const [previews, setPreviews] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const dragCounter = useRef(0);

    // Initialize from currentFiles
    useEffect(() => {
        if (!currentFiles || currentFiles.length === 0) {
            setPreviews([]);
            return;
        }

        const newPreviews = currentFiles.map(cf => {
            if (cf.file) {
                return {
                    id: cf.id || cf.url || Math.random().toString(36).substr(2, 9),
                    file: cf.file,
                    url: URL.createObjectURL(cf.file),
                    name: cf.file.name,
                    type: cf.file.type
                };
            } else if (cf.url) {
                // Existing Cloudinary URL
                return {
                    id: cf.id || cf.url || Math.random().toString(36).substr(2, 9),
                    file: null,
                    url: cf.url,
                    name: cf.originalName || 'Existing File',
                    type: cf.mimeType || 'application/octet-stream'
                };
            }
            return cf;
        });

        setPreviews(newPreviews);

        // Cleanup URLs on unmount
        return () => {
            newPreviews.forEach(p => {
                if (p.file && p.url.startsWith('blob:')) {
                    URL.revokeObjectURL(p.url);
                }
            });
        };
    }, [currentFiles]);

    const processFiles = useCallback((filesList) => {
        if (!filesList || filesList.length === 0) return;

        const filesArray = Array.from(filesList);

        if (previews.length + filesArray.length > MAX_FILES) {
            toast.warning('Giới hạn số lượng', `Chỉ được phép upload tối đa ${MAX_FILES} file.`);
            return;
        }

        const validFiles = filesArray.filter(file => {
            if (!ALLOWED_TYPES.includes(file.type)) {
                toast.error('File không hợp lệ', `File "${file.name}" không đúng định dạng cho phép.`);
                return false;
            }
            if (file.size > MAX_SIZE) {
                toast.error('File quá lớn', `File "${file.name}" vượt quá dung lượng tối đa 10MB.`);
                return false;
            }
            return true;
        });

        if (validFiles.length > 0) {
            const newFileObjects = validFiles.map(f => ({ file: f }));
            onUpload([...currentFiles, ...newFileObjects]);
        }
    }, [previews.length, currentFiles, onUpload]);

    const handleFileChange = (e) => {
        processFiles(e.target.files);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset input
        }
    };

    const handleRemove = (idToRemove) => {
        const itemToRemove = previews.find(p => p.id === idToRemove);
        if (itemToRemove && itemToRemove.url.startsWith('blob:')) {
            URL.revokeObjectURL(itemToRemove.url);
        }

        const indexToRemove = previews.findIndex(p => p.id === idToRemove);
        if (indexToRemove !== -1) {
            const newFiles = [...currentFiles];
            newFiles.splice(indexToRemove, 1);
            onUpload(newFiles);
        }
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
        processFiles(e.dataTransfer.files);
    };

    const dragProps = {
        onDragEnter: handleDragEnter,
        onDragLeave: handleDragLeave,
        onDragOver: handleDragOver,
        onDrop: handleDrop,
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-slate-700">{label} ({previews.length}/{MAX_FILES})</label>
                <span className="text-[11px] font-medium text-slate-400">Tối đa 10MB/file</span>
            </div>

            <div className="flex flex-col gap-2">
                {previews.map((preview) => {
                    const isDocument = !String(preview.type || '').startsWith('image/');

                    return (
                        <div key={preview.id} className="group flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500">
                                {isDocument ? <FileText className="size-4" /> : <ImageIcon className="size-4" />}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-600" title={preview.name}>
                                {preview.name}
                            </span>

                            {!disabled && !isUploading && (
                                <button
                                    type="button"
                                    onClick={() => handleRemove(preview.id)}
                                    className="shrink-0 rounded-full p-1 text-slate-400 opacity-70 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                    );
                })}

                {previews.length < MAX_FILES && (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled || isUploading}
                        className={clsx(
                            "min-h-11 w-full border border-dashed rounded-xl flex items-center justify-center gap-2 px-3 py-2 transition-all duration-200",
                            disabled
                                ? "border-slate-200 bg-slate-50 cursor-not-allowed"
                                : isDragging
                                    ? "border-blue-500 bg-blue-50 shadow-sm"
                                    : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer"
                        )}
                        {...dragProps}
                    >
                        {isUploading ? (
                            <Loader2 className="size-4 text-blue-500 animate-spin" />
                        ) : (
                            <>
                                <Upload className={clsx("size-4 transition-colors", isDragging ? "text-blue-500" : "text-slate-400")} />
                                <span className={clsx("text-xs text-center font-medium transition-colors", isDragging ? "text-blue-600" : "text-slate-500")}>
                                    {isDragging ? 'Thả file vào đây' : 'Thêm file đính kèm'}
                                </span>
                            </>
                        )}
                    </button>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                className="hidden"
                multiple
                onChange={handleFileChange}
                disabled={disabled || isUploading}
            />
        </div>
    );
};

export default MultipleFileUpload;
