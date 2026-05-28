import React, { useState } from 'react';
import { useExportContext } from '@/app/providers/export/ExportProvider';
import { Loader2, CheckCircle2, XCircle, Download, X, ChevronDown, ChevronUp, Clock, AlertCircle } from 'lucide-react';
import { normalizeExportStatus } from '../../utils/exportStatus';

const getTaskStatusText = (task) => {
    if (task.status === 'done') return 'Hoàn thành và đã tải xuống';
    if (task.status === 'error') return task.error || 'Xuất dữ liệu thất bại';

    const serverStatus = normalizeExportStatus(task.serverStatus);
    if (task.serverStatus === 'queued') return 'Đang chờ xử lý...';
    if (serverStatus === 'processing') {
        if (task.totalRecords > 0) {
            return `Đang xử lý ${task.processedRecords || 0}/${task.totalRecords} bản ghi`;
        }
        if (task.processedRecords > 0) {
            return `Đã xử lý ${task.processedRecords} bản ghi`;
        }
        return 'Đang xử lý dữ liệu...';
    }
    if (serverStatus === 'completed') return 'Hoàn thành xuất dữ liệu';
    if (serverStatus === 'expired') return 'File đã hết hạn, vui lòng xuất lại';
    if (serverStatus === 'failed') return task.error || 'Xuất dữ liệu thất bại';

    return 'Đang chuẩn bị export...';
};

const getProgressValue = (task) => {
    const progress = Number(task.progress || 0);
    if (task.status === 'done') return 100;
    if (task.status === 'running') return Math.max(10, Math.min(99, progress));
    return Math.max(0, Math.min(100, progress));
};

const FloatingExportStatus = () => {
    const { tasks, removeTask, clearCompleted, downloadBlob } = useExportContext();
    const [collapsed, setCollapsed] = useState(false);

    if (tasks.length === 0) return null;

    const runningCount = tasks.filter(t => t.status === 'running').length;
    const doneCount = tasks.filter(t => t.status === 'done').length;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] w-[360px] animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden backdrop-blur-sm">
                {/* Header */}
                <div
                    className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#4E5BA6] to-[#6366F1] text-white cursor-pointer select-none"
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <div className="flex items-center gap-2.5">
                        <span className="text-sm font-semibold">Xuất dữ liệu</span>
                        {runningCount > 0 && (
                            <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">
                                {runningCount} đang xử lý
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {doneCount > 0 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); clearCompleted(); }}
                                className="text-xs text-white/70 hover:text-white transition-colors"
                            >
                                Xóa xong
                            </button>
                        )}
                        {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </div>

                {/* Task List */}
                {!collapsed && (
                    <div className="max-h-[280px] overflow-y-auto">
                        {tasks.map(task => (
                            <div key={task.id} className="px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                        {normalizeExportStatus(task.serverStatus) === 'expired' && (
                                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                        )}
                                        {task.status === 'running' && task.serverStatus === 'queued' && (
                                            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                                        )}
                                        {task.status === 'running' && task.serverStatus !== 'queued' && normalizeExportStatus(task.serverStatus) !== 'expired' && (
                                            <Loader2 className="w-4 h-4 text-[#4E5BA6] animate-spin shrink-0" />
                                        )}
                                        {task.status === 'done' && (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                        )}
                                        {task.status === 'error' && (
                                            <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-gray-800 truncate">{task.label}</p>
                                            {task.status === 'running' && (
                                                <p className="text-xs text-gray-400 mt-0.5">{getTaskStatusText(task)}</p>
                                            )}
                                            {task.status === 'done' && (
                                                <p className="text-xs text-emerald-500 mt-0.5">{getTaskStatusText(task)}</p>
                                            )}
                                            {task.status === 'error' && (
                                                <p className="text-xs text-red-400 mt-0.5 truncate">{getTaskStatusText(task)}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        {task.status === 'done' && task.blobUrl && (
                                            <button
                                                onClick={() => downloadBlob(task.blobUrl, task.fileName)}
                                                className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 transition-colors"
                                                title="Tải lại"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                        {task.status !== 'running' && (
                                            <button
                                                onClick={() => removeTask(task.id)}
                                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                                title="Xóa"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Progress bar */}
                                {task.status === 'running' && (
                                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-[#4E5BA6] to-[#6366F1] rounded-full transition-all duration-500 ease-out"
                                            style={{ width: `${getProgressValue(task)}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FloatingExportStatus;
