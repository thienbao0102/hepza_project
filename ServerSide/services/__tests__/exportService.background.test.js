jest.mock('../../dataAccess/resoureceAndWasteRepository', () => ({
    countExportData: jest.fn(),
    getProjectedStreamData: jest.fn(),
}));

jest.mock('../../dataAccess/companyRepository', () => ({
    getlistCompanyNameByIds: jest.fn(),
}));

jest.mock('exceljs', () => ({
    stream: {
        xlsx: {
            WorkbookWriter: jest.fn().mockImplementation(() => {
                const rows = [];
                const worksheet = {
                    columns: [],
                    addRow: jest.fn((row) => {
                        rows.push(row);
                        return { commit: jest.fn() };
                    }),
                    commit: jest.fn(),
                    rows,
                };
                return {
                    addWorksheet: jest.fn(() => worksheet),
                    commit: jest.fn().mockResolvedValue(undefined),
                    worksheet,
                };
            }),
        },
    },
}));

const repository = require('../../dataAccess/resoureceAndWasteRepository');
const companyRepository = require('../../dataAccess/companyRepository');
const exportService = require('../exportService');

async function* makeCursor(rows) {
    for (const row of rows) yield row;
}

describe('exportService background export helpers', () => {
    beforeEach(() => jest.clearAllMocks());

    test('counts selected resource and waste records', async () => {
        repository.countExportData
            .mockResolvedValueOnce(10)
            .mockResolvedValueOnce(5)
            .mockResolvedValueOnce(7);

        const total = await exportService.countExportRecords({
            company_ids: ['C001'],
            from: 202501,
            to: 202512,
            include: [2, 3],
        });

        expect(total).toBe(22);
        expect(repository.countExportData).toHaveBeenCalledTimes(3);
    });

    test('writes workbook to file and reports processed rows', async () => {
        companyRepository.getlistCompanyNameByIds.mockResolvedValue([
            { company_id: 'C001', company_name: 'Company 1', zone_name: 'Zone 1' },
        ]);
        repository.getProjectedStreamData
            .mockReturnValueOnce(makeCursor([{ company_id: 'C001', periodKey: 202501, main_group: 'material', name: 'Wood', quantity: 1, unit: 'kg' }]))
            .mockReturnValueOnce(makeCursor([{ company_id: 'C001', periodKey: 202501, main_group: 'co', fuelName: 'Coal', quantity: 2, unit: 'kg' }]))
            .mockReturnValueOnce(makeCursor([{ company_id: 'C001', periodKey: 202501, main_group: 'IND', wasteName: 'Waste', quantity: 3, unit: 'kg' }]));

        const progress = jest.fn();
        const result = await exportService.exportDataMultiCompanyToFile('tmp/exports/EX001.xlsx', {
            company_ids: ['C001'],
            from: 202501,
            to: 202512,
            include: [2, 3],
            onProgress: progress,
        });

        expect(result.totalRecords).toBe(3);
        expect(progress).toHaveBeenCalledWith(3);
    });
});
