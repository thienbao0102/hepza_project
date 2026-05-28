const fs = require('fs');
const path = require('path');
const exportHistoryService = require('./exportHistoryService');
const exportJobService = require('./exportJobService');

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;
let cleanupTimer = null;

const isPathInsideExportDir = (filePath) => {
    if (!filePath) return false;
    const exportDir = path.resolve(exportJobService.EXPORT_DIR);
    const resolvedPath = path.resolve(filePath);
    const relativePath = path.relative(exportDir, resolvedPath);
    return Boolean(relativePath) && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
};

const deleteExportFile = (filePath) => {
    if (!isPathInsideExportDir(filePath)) return false;
    if (!fs.existsSync(filePath)) return false;
    fs.unlinkSync(filePath);
    return true;
};

const cleanupExpiredExports = async (now = new Date()) => {
    const expiredExports = await exportHistoryService.findExpiredCompletedExports(now);
    let deletedFiles = 0;

    for (const history of expiredExports) {
        try {
            if (deleteExportFile(history.file_path)) deletedFiles++;
            await exportHistoryService.markExportExpired(history.export_id);
        } catch (error) {
            console.error('[ExportCleanup] Failed to clean export file:', error.message);
        }
    }

    return { expired: expiredExports.length, deletedFiles };
};

const startExportCleanup = () => {
    if (cleanupTimer) return cleanupTimer;

    cleanupExpiredExports().catch((error) => {
        console.error('[ExportCleanup] Initial cleanup failed:', error.message);
    });

    cleanupTimer = setInterval(() => {
        cleanupExpiredExports().catch((error) => {
            console.error('[ExportCleanup] Scheduled cleanup failed:', error.message);
        });
    }, CLEANUP_INTERVAL_MS);

    return cleanupTimer;
};

const stopExportCleanup = () => {
    if (!cleanupTimer) return;
    clearInterval(cleanupTimer);
    cleanupTimer = null;
};

module.exports = {
    CLEANUP_INTERVAL_MS,
    cleanupExpiredExports,
    deleteExportFile,
    startExportCleanup,
    stopExportCleanup,
};
