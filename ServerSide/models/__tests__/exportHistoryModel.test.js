const ExportHistory = require('../exportHistoryModel');

const baseHistory = {
    user_id: 'USR001',
    company_ids: ['KCN001DN00001'],
    periodKeyStart: 202501,
    periodKeyEnd: 202512,
    resource_types: [2, 3],
};

describe('exportHistoryModel', () => {
    test('supports background export job lifecycle fields', () => {
        const doc = new ExportHistory({
            ...baseHistory,
            status: 'processing',
            processed_records: 125,
            total_records: 500,
            progress: 25,
            file_path: 'tmp/exports/EX001.xlsx',
            file_size: 123456,
            expires_at: new Date('2026-05-19T00:00:00.000Z'),
            error_message: '',
            started_at: new Date('2026-05-18T00:00:00.000Z'),
            completed_at: null,
        });

        const validation = doc.validateSync();

        expect(validation).toBeUndefined();
        expect(doc.status).toBe('processing');
        expect(doc.processed_records).toBe(125);
        expect(doc.total_records).toBe(500);
        expect(doc.progress).toBe(25);
        expect(doc.file_path).toBe('tmp/exports/EX001.xlsx');
    });

    test.each(['queued', 'processing', 'success', 'failed', 'expired', 'thành công', 'chưa xuất tệp'])(
        'accepts %s status',
        (status) => {
            const doc = new ExportHistory({ ...baseHistory, status });

            expect(doc.validateSync()).toBeUndefined();
        }
    );

    test.each([-1, 101])('rejects progress value %s', (progress) => {
        const doc = new ExportHistory({ ...baseHistory, progress });

        expect(doc.validateSync()).toBeDefined();
    });
});
