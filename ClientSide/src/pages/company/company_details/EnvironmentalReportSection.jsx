import { useState, useRef, useMemo } from 'react';
import { FileText, Upload, Trash2, Download, FileUp, X, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useEnvReports, useUploadEnvReport, useDeleteEnvReport } from '@/features/resources/hooks/useEnvironmentalReport';
import { getDownloadUrl } from '@/services/environmentalReportService';
import { apiClient } from '@lib/api-client';
import { useIsAuthenticated } from '@/features/auth/hooks/useAuthQueries';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import toast from '@/utils/toast';
import dayjs from 'dayjs';

const MAX_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
    return `${size.toFixed(1)} ${units[i]}`;
};

const getFileIcon = (mimeType) => {
    if (mimeType === 'application/pdf') return '📄';
    return '📝';
};

const EnvironmentalReportSection = ({ company, role }) => {
    const companyId = company?.company_id || company?._id || company?.id;
    const { user } = useIsAuthenticated();
    const userRole = user?.user?.role || role;
    const isCompany = userRole === 'company';

    const { data: reports = [], isLoading } = useEnvReports(companyId);
    const uploadMutation = useUploadEnvReport();
    const deleteMutation = useDeleteEnvReport();

    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [note, setNote] = useState('');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [reportToDelete, setReportToDelete] = useState(null);
    const fileInputRef = useRef(null);

    // Filter reports by selected year
    const filteredReports = useMemo(() => {
        return reports.filter(r => r.year === selectedYear);
    }, [reports, selectedYear]);

    const handleFileSelect = (file) => {
        if (!file) return;

        if (!ALLOWED_TYPES.includes(file.type)) {
            toast({ type: 'error', title: 'Lỗi', description: 'Chỉ chấp nhận file PDF hoặc DOC/DOCX.' });
            return;
        }
        if (file.size > MAX_SIZE) {
            toast({ type: 'error', title: 'Lỗi', description: 'File quá lớn. Giới hạn tối đa 500MB.' });
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('year', selectedYear);
        formData.append('note', note);

        setIsUploading(true);
        setUploadProgress(0);

        uploadMutation.mutate({ formData, onProgress: setUploadProgress }, {
            onSuccess: () => {
                toast({ type: 'success', title: 'Thành công', description: `Đã tải lên báo cáo năm ${selectedYear}.` });
                setIsUploading(false);
                setUploadProgress(0);
                setNote('');
            },
            onError: (err) => {
                toast({ type: 'error', title: 'Lỗi tải lên', description: err?.message || 'Không thể tải lên báo cáo.' });
                setIsUploading(false);
                setUploadProgress(0);
            }
        });
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer?.files?.[0];
        handleFileSelect(file);
    };

    const handleDownload = async (report) => {
        try {
            const response = await apiClient.get(getDownloadUrl(report._id), {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', report.file_name);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            toast({ type: 'error', title: 'Lỗi', description: 'Không thể tải xuống file.' });
        }
    };

    const confirmDelete = () => {
        if (!reportToDelete) return;
        deleteMutation.mutate(reportToDelete, {
            onSuccess: () => {
                toast({ type: 'success', title: 'Thành công', description: 'Đã xóa báo cáo.' });
                setDeleteConfirmOpen(false);
                setReportToDelete(null);
            },
            onError: (err) => {
                toast({ type: 'error', title: 'Lỗi', description: err?.message || 'Không thể xóa báo cáo.' });
                setDeleteConfirmOpen(false);
                setReportToDelete(null);
            }
        });
    };

    return (
        <div className="col-span-full flex flex-col gap-2 xl:gap-3">
            {/* Header with year selector */}
            <div className="flex justify-between items-center pr-2">
                <p className="text-gray-900 font-bold text-lg xl:text-xl uppercase tracking-wide">
                    Báo cáo Môi trường
                </p>
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4E5BA6]/30 bg-white font-semibold"
                >
                    {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            {/* Upload Zone — company only */}
            {isCompany && (
                <div className="bg-white border border-black/10 rounded-2xl p-5 xl:p-6 shadow-sm">
                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-600 mb-1.5">Ghi chú (tùy chọn)</label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="VD: Báo cáo đánh giá tác động môi trường..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4E5BA6]/30"
                        />
                    </div>

                    {/* Drop zone */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200
                            ${dragOver ? 'border-[#4E5BA6] bg-[#4E5BA6]/5' : 'border-gray-200 hover:border-[#4E5BA6]/50 hover:bg-gray-50'}
                            ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx"
                            className="hidden"
                            onChange={(e) => handleFileSelect(e.target.files?.[0])}
                        />

                        {isUploading ? (
                            <div className="w-full max-w-md">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileUp className="w-5 h-5 text-[#4E5BA6] animate-pulse" />
                                    <span className="text-sm font-semibold text-gray-600">Đang tải lên... {uploadProgress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                        className="bg-[#4E5BA6] h-2.5 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="h-12 w-12 bg-[#4E5BA6]/10 rounded-2xl flex items-center justify-center">
                                    <Upload className="w-5 h-5 text-[#4E5BA6]" />
                                </div>
                                <div className="text-center">
                                    <p className="font-semibold text-gray-600 text-sm">
                                        Kéo thả hoặc bấm để chọn file
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        PDF, DOC, DOCX — Tối đa 500MB
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Reports List — filtered by selectedYear */}
            {isLoading ? (
                <div className="bg-white border border-black/10 rounded-2xl p-10 flex items-center justify-center">
                    <LoadingSpinner tip="Đang tải danh sách báo cáo..." />
                </div>
            ) : filteredReports.length === 0 ? (
                <div className="bg-white border border-black/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                    <div className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-2">
                        <FileText className="w-5 h-5 text-gray-300" />
                    </div>
                    <p className="font-bold text-gray-500 text-sm">Chưa có báo cáo năm {selectedYear}</p>
                    <p className="text-xs text-gray-400 mt-1">
                        {isCompany ? 'Hãy tải lên báo cáo ở phần trên.' : 'Doanh nghiệp chưa nộp báo cáo cho năm này.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white border border-black/10 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#4E5BA6]" />
                        <span className="font-bold text-gray-800 text-sm">Năm {selectedYear}</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                            {filteredReports.length} file
                        </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {filteredReports.map((report) => (
                            <div key={report._id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <span className="text-lg shrink-0">{getFileIcon(report.mime_type)}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-gray-800 truncate" title={report.file_name}>
                                            {report.file_name}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {formatFileSize(report.file_size)} • {dayjs(report.created_at).format('DD/MM/YYYY HH:mm')}
                                            {report.note && <span className="ml-2 text-gray-500">— {report.note}</span>}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                                    <button
                                        onClick={() => handleDownload(report)}
                                        className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#4E5BA6] bg-[#4E5BA6]/[0.06] hover:bg-[#4E5BA6]/[0.12] transition-colors"
                                        title="Tải xuống"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Tải
                                    </button>
                                    {isCompany && (
                                        <button
                                            onClick={() => { setReportToDelete(report._id); setDeleteConfirmOpen(true); }}
                                            className="cursor-pointer flex items-center justify-center p-1.5 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
                                            title="Xóa"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Delete confirmation */}
            <ConfirmationModal
                open={deleteConfirmOpen}
                onClose={() => { setDeleteConfirmOpen(false); setReportToDelete(null); }}
                onConfirm={confirmDelete}
                title="Xác nhận xóa báo cáo"
                content="Bạn có chắc chắn muốn xóa báo cáo này không? File sau khi xóa sẽ không thể khôi phục."
                confirmType="danger"
                confirmText="Xác nhận xóa"
                cancelText="Hủy"
            />
        </div>
    );
};

export default EnvironmentalReportSection;
