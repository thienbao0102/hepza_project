import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import {
    initExport,
    startCompletedExportDownload,
    updateExportHistoryStatus,
    getExportStatus
} from '@/services/exportFileService';
import { exportToExcel } from '@/features/enterprises/components/ExportHelper/ExportExcel';
import { isExportExpired, isExportFailed, normalizeExportStatus } from '@/features/enterprises/utils/exportStatus';
import toast from '@/utils/toast';

const ExportContext = createContext(null);
const EXPORT_POLL_INTERVAL_MS = 1500;
const EXPORT_POLL_MAX_ATTEMPTS = 480;
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const useExportContext = () => {
    const ctx = useContext(ExportContext);
    if (!ctx) throw new Error('useExportContext must be used within ExportProvider');
    return ctx;
};

export const ExportProvider = ({ children }) => {
    // List of active export tasks: { id, status, label, progress, error, blobUrl, fileName }
    const [tasks, setTasks] = useState([]);
    const taskIdCounter = useRef(0);

    const addTask = useCallback((label) => {
        const id = ++taskIdCounter.current;
        const task = { id, status: 'running', label, progress: 0, error: null, blobUrl: null, fileName: null };
        setTasks(prev => [task, ...prev]);
        return id;
    }, []);

    const updateTask = useCallback((id, updates) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    }, []);

    const removeTask = useCallback((id) => {
        setTasks(prev => {
            const task = prev.find(t => t.id === id);
            if (task?.blobUrl) window.URL.revokeObjectURL(task.blobUrl);
            return prev.filter(t => t.id !== id);
        });
    }, []);

    const clearCompleted = useCallback(() => {
        setTasks(prev => {
            prev.filter(t => t.status !== 'running').forEach(t => {
                if (t.blobUrl) window.URL.revokeObjectURL(t.blobUrl);
            });
            return prev.filter(t => t.status === 'running');
        });
    }, []);

    useEffect(() => {
        return () => {
            setTasks(prev => {
                prev.forEach(t => {
                    if (t.blobUrl) window.URL.revokeObjectURL(t.blobUrl);
                });
                return prev;
            });
        };
    }, []);

    // Download helper
    const downloadBlob = useCallback((blobUrl, fileName) => {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    const pollExportStatus = useCallback(async (exportId, taskId, onHistoryUpdate) => {
        for (let attempt = 0; attempt < EXPORT_POLL_MAX_ATTEMPTS; attempt++) {
            const history = await getExportStatus(exportId);
            const status = history?.status;
            const normalizedStatus = normalizeExportStatus(status);
            const progress = Number(history?.progress || 0);

            updateTask(taskId, {
                exportId,
                serverStatus: status,
                progress: normalizedStatus === 'completed' ? 100 : Math.max(10, Math.min(99, progress)),
                processedRecords: history?.processed_records || 0,
                totalRecords: history?.total_records || 0,
                fileName: history?.name || null,
            });

            if (onHistoryUpdate) onHistoryUpdate();

            if (normalizedStatus === 'completed') return history;
            if (isExportFailed(status)) throw new Error(history?.error_message || 'Xuất dữ liệu thất bại');
            if (isExportExpired(status)) throw new Error('File xuất dữ liệu đã hết hạn, vui lòng xuất lại.');

            await wait(EXPORT_POLL_INTERVAL_MS);
        }

        throw new Error('Quá thời gian chờ xuất dữ liệu, vui lòng kiểm tra lại lịch sử xuất file.');
    }, [updateTask]);

    const downloadCompletedExport = useCallback((exportId, fileName) => {
        return startCompletedExportDownload(exportId, fileName || `Export_${exportId}.xlsx`).url;
    }, []);

    // Background export for resource/waste data
    const startExportData = useCallback(async ({ periodKeyStart, periodKeyEnd, includeCodes, option, zoneIdToExport, companyIdsToExport, isZoneScope, onHistoryUpdate }) => {
        const label = includeCodes.includes(2) && includeCodes.includes(3) ? 'Tài nguyên & Chất thải'
            : includeCodes.includes(2) ? 'Dữ liệu Tài nguyên'
                : 'Dữ liệu Chất thải';

        const taskId = addTask(`Xuất ${label}`);

        try {
            updateTask(taskId, { progress: 10 });

            const res = await initExport({
                periodKeyStart, periodKeyEnd,
                include: includeCodes,
                option,
                zone_id: zoneIdToExport,
                company_ids: option === 1 ? companyIdsToExport : undefined,
                isZoneScope,
                fileType: 'xlsx'
            });

            if (!res?.success || !res?.export_id) {
                throw new Error('Không thể khởi tạo export');
            }

            updateTask(taskId, { progress: 20, exportId: res.export_id });

            toast.success('Đã bắt đầu xuất dữ liệu', `${label} đang được xử lý nền.`);

            const history = await pollExportStatus(res.export_id, taskId, onHistoryUpdate);
            const fileName = history?.name || res.name || `Export_${res.export_id}.xlsx`;
            downloadCompletedExport(res.export_id, fileName);

            updateTask(taskId, {
                status: 'done',
                progress: 100,
                fileName
            });

            toast.success('Xuất dữ liệu thành công', `${label} đã sẵn sàng tải xuống.`);
            if (onHistoryUpdate) onHistoryUpdate();
        } catch (error) {
            console.error('Background export failed:', error);
            updateTask(taskId, {
                status: 'error',
                error: error.message || 'Lỗi không xác định'
            });
            toast.error('Xuất dữ liệu thất bại', error.message || 'Lỗi không xác định');
        }
    }, [addTask, updateTask, pollExportStatus, downloadCompletedExport]);

    // Background export for company info
    const startExportInfo = useCallback(async ({ periodKeyStart, periodKeyEnd, dataToExport, option, zoneIdToExport, companyIdsToExport, onHistoryUpdate }) => {
        const taskId = addTask('Xuất thông tin doanh nghiệp');

        try {
            updateTask(taskId, { progress: 10 });

            const infoExportRes = await initExport({
                periodKeyStart, periodKeyEnd,
                include: [0],
                option,
                zone_id: zoneIdToExport,
                company_ids: option === 1 ? companyIdsToExport : undefined,
                fileType: 'xlsx'
            });

            updateTask(taskId, { progress: 40 });

            if (infoExportRes?.export_id) {
                const { blob, fileName } = await exportToExcel(dataToExport);
                const blobUrl = window.URL.createObjectURL(blob);

                updateTask(taskId, { progress: 80 });

                // Auto download
                downloadBlob(blobUrl, fileName);

                await updateExportHistoryStatus(infoExportRes.export_id, 'thành công', dataToExport.length);

                updateTask(taskId, {
                    status: 'done',
                    progress: 100,
                    blobUrl,
                    fileName
                });

                toast.success('Xuất thành công', `Đã xuất ${dataToExport.length} doanh nghiệp.`);
            }

            if (onHistoryUpdate) onHistoryUpdate();
        } catch (error) {
            console.error('Background export info failed:', error);
            updateTask(taskId, {
                status: 'error',
                error: error.message || 'Lỗi không xác định'
            });
            toast.error('Xuất thất bại', error.message || 'Lỗi không xác định');
        }
    }, [addTask, updateTask, downloadBlob]);

    return (
        <ExportContext.Provider value={{
            tasks,
            startExportData,
            startExportInfo,
            removeTask,
            clearCompleted,
            downloadBlob,
            downloadCompletedExport,
            pollExportStatus,
            hasRunningTasks: tasks.some(t => t.status === 'running')
        }}>
            {children}
        </ExportContext.Provider>
    );
};
