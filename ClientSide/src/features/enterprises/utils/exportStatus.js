const STATUS_ALIASES = {
    success: 'completed',
    completed: 'completed',
    'thành công': 'completed',
    done: 'completed',
    queued: 'processing',
    processing: 'processing',
    running: 'processing',
    'đang tải': 'processing',
    'đang xử lý': 'processing',
    failed: 'failed',
    failure: 'failed',
    error: 'failed',
    'thất bại': 'failed',
    'chưa xuất tệp': 'failed',
    expired: 'expired',
    'hết hạn': 'expired',
};

const STATUS_LABELS = {
    completed: 'Thành công',
    processing: 'Đang xử lý',
    failed: 'Thất bại',
    expired: 'Hết hạn',
    unknown: 'Không xác định',
};

export const EXPORT_STATUS_STYLES = {
    completed: { bg: '#ECFDF5', color: '#10B981', border: '#A7F3D0' },
    processing: { bg: '#FEFCE8', color: '#CA8A04', border: '#FEF08A' },
    failed: { bg: '#FEF2F2', color: '#EF4444', border: '#FECACA' },
    expired: { bg: '#FFF7ED', color: '#F97316', border: '#FED7AA' },
    unknown: { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' },
};

export const normalizeExportStatus = (status) => {
    const normalized = typeof status === 'string' ? status.trim().toLowerCase() : '';
    return STATUS_ALIASES[normalized] || 'unknown';
};

export const getExportStatusLabel = (status) => STATUS_LABELS[normalizeExportStatus(status)];

export const getExportStatusStyle = (status) => EXPORT_STATUS_STYLES[normalizeExportStatus(status)];

export const isExportProcessing = (status) => normalizeExportStatus(status) === 'processing';

export const isExportFailed = (status) => normalizeExportStatus(status) === 'failed';

export const isExportExpired = (status) => normalizeExportStatus(status) === 'expired';

export const canDownloadExport = (row) => normalizeExportStatus(row?.status) === 'completed';

export const canReExport = (row) => ['failed', 'expired'].includes(normalizeExportStatus(row?.status));
