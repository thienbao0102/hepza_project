import { describe, it, expect, vi } from 'vitest';
import { requestViaTransport } from '@/lib/transport-selector';
import { buildCompletedExportDownloadUrl, getExportHistory, initExport } from '@/services/exportFileService';

vi.mock('@/lib/transport-selector', () => ({ requestViaTransport: vi.fn() }));

describe('exportFileService socket compatibility', () => {
  it('returns unchanged shape for getExportHistory', async () => {
    const payload = { success: true, history: [] };
    requestViaTransport.mockResolvedValue(payload);

    const rs = await getExportHistory();

    expect(rs).toEqual(payload);
  });

  it('builds completed export download url instead of the streaming export endpoint', () => {
    const url = buildCompletedExportDownloadUrl('EX001');

    expect(url).toContain('/api/export/EX001/download');
    expect(url).not.toContain('/export-resource-waste');
  });

  it('normalizes socket init export response to match http success shape', async () => {
    requestViaTransport.mockResolvedValue({ export_id: 'EX001', status: 'queued', name: 'file.xlsx' });

    const rs = await initExport({ include: [2] });

    expect(rs).toEqual({ success: true, export_id: 'EX001', status: 'queued', name: 'file.xlsx' });
  });
});
