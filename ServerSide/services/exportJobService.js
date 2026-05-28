const fs = require('fs');
const path = require('path');
const exportService = require('./exportService');
const exportHistoryService = require('./exportHistoryService');

const EXPORT_TTL_MS = 24 * 60 * 60 * 1000;
const EXPORT_DIR = path.join(__dirname, '..', 'tmp', 'exports');
const activeJobs = new Set();

const ensureExportDir = () => {
    if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR, { recursive: true });
};

const getExportFilePath = (exportId) => path.join(EXPORT_DIR, `${exportId}.xlsx`);

const safeUnlink = (filePath) => {
    try {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (error) {
        console.error('[ExportJob] Failed to delete partial export:', error.message);
    }
};

const runExportJob = async (history) => {
    const exportId = history.export_id;
    const filePath = getExportFilePath(exportId);

    try {
        ensureExportDir();
        let totalRecords = 0;

        try {
            totalRecords = await exportService.countExportRecords({
                company_ids: history.company_ids,
                from: Number(history.periodKeyStart),
                to: Number(history.periodKeyEnd),
                include: history.resource_types || [],
            });
        } catch (error) {
            totalRecords = 0;
        }

        await exportHistoryService.updateExportJobState(exportId, {
            status: 'processing',
            started_at: new Date(),
            total_records: totalRecords,
            processed_records: 0,
            progress: 0,
            error_message: '',
        });

        let lastProgressUpdate = 0;
        const updateProgress = async (processedRecords) => {
            if (processedRecords - lastProgressUpdate < 100 && processedRecords !== totalRecords) return;
            lastProgressUpdate = processedRecords;
            const progress = totalRecords > 0 ? Math.min(99, Math.floor((processedRecords / totalRecords) * 100)) : 0;
            await exportHistoryService.updateExportJobState(exportId, {
                processed_records: processedRecords,
                progress,
            });
        };

        const result = await exportService.exportDataMultiCompanyToFile(filePath, {
            company_ids: history.company_ids,
            from: Number(history.periodKeyStart),
            to: Number(history.periodKeyEnd),
            include: history.resource_types || [],
            onProgress: updateProgress,
        });

        const completedAt = new Date();
        const fileSize = fs.statSync(filePath).size;

        await exportHistoryService.updateExportJobState(exportId, {
            status: 'success',
            processed_records: result.totalRecords,
            total_records: totalRecords || result.totalRecords,
            progress: 100,
            file_path: filePath,
            file_size: fileSize,
            completed_at: completedAt,
            expires_at: new Date(completedAt.getTime() + EXPORT_TTL_MS),
            error_message: '',
        });
    } catch (error) {
        safeUnlink(filePath);
        await exportHistoryService.updateExportJobState(exportId, {
            status: 'failed',
            error_message: error.message || 'Không thể xuất dữ liệu.',
            completed_at: new Date(),
        });
    }
};

const enqueueExportJob = (history) => {
    if (!history?.export_id || activeJobs.has(history.export_id)) return;
    activeJobs.add(history.export_id);
    setImmediate(async () => {
        try {
            await runExportJob(history);
        } finally {
            activeJobs.delete(history.export_id);
        }
    });
};

module.exports = {
    EXPORT_DIR,
    EXPORT_TTL_MS,
    enqueueExportJob,
    runExportJob,
    getExportFilePath,
};
