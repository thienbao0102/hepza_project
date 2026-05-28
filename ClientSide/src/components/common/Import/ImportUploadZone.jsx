import React, { useState } from 'react';
import { CloudUpload, FileSpreadsheet, Trash2 } from 'lucide-react';

const ImportUploadZone = ({ file, onFileSelect, onRemoveFile, accept = ".xlsx,.xls,.csv", hint = "Hỗ trợ .xlsx, .xls, .csv. Giới hạn 10MB." }) => {
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-1">
                <h3 className="font-bold text-sm text-[#4B5563] uppercase tracking-wider">Tải tệp dữ liệu</h3>
            </div>
            <p className="text-xs text-[#6B7280] mb-4">{hint}</p>

            <div
                className={`flex-grow border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors relative min-h-[200px]
                    ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-[#9CA3AF] bg-white hover:bg-gray-50'}
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {/* Empty State / Drag State */}
                {!file && (
                    <div className="flex flex-col items-center">
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={handleChange}
                            onClick={(e) => e.target.value = null}
                            accept={accept}
                        />
                        <div className="bg-[#4E5BA6] rounded-full p-3 text-white mb-4 shadow-md">
                            <CloudUpload size={40} />
                        </div>
                        <p className="text-sm font-medium text-gray-700">Kéo thả tệp Excel vào đây</p>
                        <p className="text-xs text-gray-400 mt-1">Hoặc chọn tệp từ máy tính</p>

                        <div className="flex gap-3 mt-4 relative">
                            <button className="bg-[#4E5BA6] text-white text-sm font-medium px-6 py-2 rounded-full hover:bg-[#4E5BA6]/80 transition pointer-events-none">
                                Tải tệp lên
                            </button>
                        </div>
                    </div>
                )}

                {/* File Selected State */}
                {file && (
                    <div className="flex flex-col items-center justify-center w-full h-full p-6 bg-blue-50/50 rounded-xl border-2 border-[#4E5BA6]/30 relative z-20">
                        {/* Success Icon */}
                        <div className="relative mb-4">
                            <div className="bg-blue-100 border border-blue-300 rounded-full p-4 relative z-10 shadow-sm">
                                <FileSpreadsheet className="text-[#4E5BA6] w-10 h-10" />
                            </div>
                        </div>

                        {/* File Details */}
                        <div className="text-center mb-6">
                            <h4 className="text-base font-bold text-gray-800 break-all max-w-[250px] mx-auto line-clamp-2" title={file.name}>
                                {file.name}
                            </h4>
                            <div className="flex items-center justify-center gap-2 mt-2">
                                <span className="px-2.5 py-0.5 bg-blue-100 text-[#4E5BA6] text-xs font-semibold rounded-md border border-blue-200">
                                    Đã tải tệp lên
                                </span>
                                <span className="text-xs text-gray-500 font-medium">
                                    {(file.size / 1024).toFixed(0)} KB
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                {/* Invisible input strictly layered over the 'Change File' button */}
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={handleChange}
                                    onClick={(e) => e.target.value = null}
                                    accept={accept}
                                />
                                <button className="bg-white text-[#4E5BA6] border border-[#4E5BA6]/50 text-sm font-semibold px-5 py-2 rounded-lg hover:bg-blue-50 transition relative">
                                    Đổi tệp khác
                                </button>
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); onRemoveFile(e); }}
                                className="bg-white text-red-600 border border-red-200 text-sm font-semibold px-5 py-2 rounded-lg hover:bg-red-50 hover:border-red-300 transition relative z-20 flex items-center gap-1.5"
                            >
                                <Trash2 className="w-4 h-4" />
                                Xóa
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportUploadZone;
