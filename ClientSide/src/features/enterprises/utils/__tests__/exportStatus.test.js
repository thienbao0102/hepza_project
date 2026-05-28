import { describe, expect, it } from 'vitest';
import {
    canDownloadExport,
    canReExport,
    getExportStatusLabel,
    normalizeExportStatus,
} from '../exportStatus';

describe('exportStatus', () => {
    it('normalizes equivalent completed statuses to one canonical status', () => {
        expect(normalizeExportStatus('success')).toBe('completed');
        expect(normalizeExportStatus('thành công')).toBe('completed');
        expect(normalizeExportStatus('completed')).toBe('completed');
    });

    it('always displays completed statuses in Vietnamese', () => {
        expect(getExportStatusLabel('success')).toBe('Thành công');
        expect(getExportStatusLabel('thành công')).toBe('Thành công');
    });

    it('uses normalized status for export actions', () => {
        expect(canDownloadExport({ status: 'success' })).toBe(true);
        expect(canDownloadExport({ status: 'thành công' })).toBe(true);
        expect(canReExport({ status: 'failed' })).toBe(true);
        expect(canReExport({ status: 'success' })).toBe(false);
    });
});
