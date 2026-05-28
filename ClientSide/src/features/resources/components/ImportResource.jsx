import React, { useState, useEffect } from 'react';
import { useHeader } from '@/components/common/Header/HeaderContext';
import { read, utils } from 'xlsx';

// Sub-components & Utils
import ResourceStatsCards from './ImportResourceHelper/ResourceStatsCards';
import ResourceLeftPanel from './ImportResourceHelper/ResourceLeftPanel';
import ResourcePreviewTable from './ImportResourceHelper/ResourcePreviewTable';
import {
  SHEET_CONFIGS,
  VALID_SHEET_NAMES,
} from './ImportResourceHelper/importResourceUtils';
import toast from '@/utils/toast';

import { lookupWasteCode } from '@/services/wasteCodeService';
import { useImportResources } from '../hooks/useResourceMutations';

const ImportResource = () => {
  const { setHeaderConfig, setBreadcrumbItems } = useHeader();
  const [file, setFile] = useState(null);
  const [importSummary, setImportSummary] = useState(null);

  // Hook for import
  const importMutation = useImportResources();

  // Period state (default: current month)
  const getCurrentPeriodKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return parseInt(`${year}${month}`);
  };
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriodKey());

  // Data states
  const [tableData, setTableData] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    warning: 0,
    error: 0,
  });
  const [sheetStats, setSheetStats] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePeriodChange = value => {
    setSelectedPeriod(value);
    setImportSummary(null);
  };

  useEffect(() => {
    setHeaderConfig({
      title: 'Đồng bộ dữ liệu tài nguyên',
      description:
        'Tải tệp mẫu, điền dữ liệu và tải lên tệp Excel để đồng bộ vào hệ thống.',
      showWeather: false,
      showDatePicker: false,
    });
    setBreadcrumbItems([
      {
        key: 'resources/import',
        title: 'Đồng bộ dữ liệu tài nguyên',
      },
    ]);
  }, [setHeaderConfig]);

  const handleProcessFile = file => {
    setFile(file);
    setTableData([]);
    setStats({ total: 0, valid: 0, warning: 0, error: 0 });
    setSheetStats({});
    setImportSummary(null);
  };

  const handleCheckFile = async () => {
    if (!file) return;
    setIsProcessing(true);

    const reader = new FileReader();

    reader.onload = async e => {
      // Yield the thread to allow React to paint the "isProcessing = true" state and start the spinner animation
      await new Promise(resolve => setTimeout(resolve, 50));

      try {
        const data = new Uint8Array(e.target.result);
        const workbook = read(data, { type: 'array' });

        const processedItemsMap = new Map();
        const newSheetStats = {};

        for (const sheetName of workbook.SheetNames) {
          if (!VALID_SHEET_NAMES.includes(sheetName)) continue;

          const worksheet = workbook.Sheets[sheetName];
          const config = SHEET_CONFIGS[sheetName];
          if (!config) continue;

          // Parse sheet data, skip first 2 rows (instruction + header)
          const rawRows = utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
          });

          // Find header row
          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
            const row = rawRows[i];
            if (row && row.length > 0) {
              const firstCell = String(row[0]).toLowerCase();
              // Check if this looks like a header
              if (
                config.columns.some(col =>
                  firstCell.includes(col.toLowerCase().slice(0, 5))
                )
              ) {
                headerRowIndex = i;
                break;
              }
            }
          }

          if (headerRowIndex === -1) headerRowIndex = 1; // Default to row 2 (0-indexed = 1)

          const dataRows = rawRows.slice(headerRowIndex + 1);
          let sheetRowCount = 0;

          for (const row of dataRows) {
            if (!row || row.length === 0) continue;

            const subGroupLabel = String(row[0] || '').trim();
            if (!subGroupLabel) continue;

            // Map subgroup label to code
            const subGroupCode = config.subGroupMap[subGroupLabel];

            let rowStatus = 'valid';
            let rowErrors = [];

            // Validate subgroup - default to always validate
            if (!subGroupCode) {
              rowStatus = 'error';
              rowErrors.push(`Nhóm phụ "${subGroupLabel}" không hợp lệ`);
            }

            let name, quantity, unit, note, codeWaste, treatmentMethods, wasteStatus;

            if (config.mainGroup === 'wa') {
              name = String(row[0] || '').trim(); // Nguồn nước
              quantity = Number(row[1]) || 0; // Số lượng
              unit = config.defaultUnit; // Mặc định m3
              note = String(row[2] || '').trim(); // Ghi chú
            } else if (config.mainGroup === 'waste') {
              name = String(row[1] || '').trim();
              codeWaste = String(row[2] || '').trim();
              wasteStatus = String(row[3] || '').trim();
              quantity = Number(row[4]) || 0;
              unit = String(row[5] || config.defaultUnit).trim();
              treatmentMethods = String(row[6] || '').trim();

              if (String(subGroupCode).toUpperCase() === 'GASW') {
                unit = 'mg/l';
              }

              if (String(subGroupCode).toUpperCase() === 'HA' && codeWaste && !wasteStatus) {
                rowStatus = 'error';
                rowErrors.push('Thiếu trạng thái');
              }

              // Call backend lookup if we only have codeWaste
              if (!name && codeWaste) {
                try {
                  const result = await lookupWasteCode(codeWaste);
                  if (result && result.name) {
                    name = result.name;
                  } else {
                    name = `${codeWaste}`;
                  }
                } catch (err) {
                  console.warn('Failed to lookup waste code:', err);
                  name = `${codeWaste}`;
                }
              }
            } else {
              name = String(row[1] || '').trim();
              quantity = Number(row[2]) || 0;
              unit = String(row[3] || config.defaultUnit).trim();
              note = String(row[4] || '').trim();
            }

            if (!name) {
              rowStatus = 'error';
              rowErrors.push('Thiếu tên');
            }

            if (quantity <= 0) {
              if (rowStatus !== 'error') {
                rowStatus = 'warning';
                rowErrors.push('Số lượng = 0');
              }
            }

            if (name && quantity > 0) {
              const finalSubCode =
                subGroupCode ||
                config.subGroupMap['Khác'] ||
                Object.values(config.subGroupMap)[0];
              const wasteKey = config.mainGroup === 'waste'
                ? `_${String(codeWaste || '').toLowerCase()}_${String(wasteStatus || '').toLowerCase()}`
                : '';
              const key = `${config.mainGroup}_${finalSubCode}_${name.toLowerCase()}${wasteKey}`;

              if (processedItemsMap.has(key)) {
                const existing = processedItemsMap.get(key);
                existing.quantity += quantity;

                if (note) {
                  existing.note = existing.note ? `${existing.note} | ${note}` : note;
                }
                if (treatmentMethods) {
                  existing.treatmentMethods = existing.treatmentMethods ? `${existing.treatmentMethods} | ${treatmentMethods}` : treatmentMethods;
                }

                if (rowStatus === 'warning' && existing.status === 'valid') {
                  existing.status = 'warning';
                }
                if (rowErrors.length > 0) {
                  existing.errors = [
                    ...new Set([...existing.errors, ...rowErrors]),
                  ];
                }
              } else {
                const newItem = {
                  sheetName,
                  mainGroup: config.mainGroup,
                  subGroup: finalSubCode,
                  subGroupLabel,
                  name,
                  quantity,
                  unit,
                  status: rowStatus,
                  wasteStatus,
                  errors: rowErrors,
                };

                if (config.mainGroup === 'waste') {
                  newItem.codeWaste = codeWaste;
                  newItem.treatmentMethods = treatmentMethods;
                } else {
                  newItem.note = note;
                }

                processedItemsMap.set(key, newItem);
              }
              sheetRowCount++;
            }
          }

          if (sheetRowCount > 0) {
            newSheetStats[sheetName] = sheetRowCount;
          }
        }

        const allProcessedData = Array.from(processedItemsMap.values());
        let validCount = 0;
        let warningCount = 0;
        let errorCount = 0;

        allProcessedData.forEach(item => {
          if (item.status === 'valid') validCount++;
          else if (item.status === 'warning') warningCount++;
          else errorCount++;
        });

        setTableData(allProcessedData);
        setSheetStats(newSheetStats);
        setStats({
          total: allProcessedData.length,
          valid: validCount,
          warning: warningCount,
          error: errorCount,
        });

        if (allProcessedData.length === 0) {
          toast.warning(
            'Không có dữ liệu',
            'File không chứa dữ liệu hợp lệ trong các sheet tài nguyên'
          );
        } else {
          toast.success(
            'Kiểm tra hoàn tất',
            `Đã tìm thấy ${allProcessedData.length} tài nguyên riêng biệt từ ${Object.keys(newSheetStats).length} sheet`
          );
        }
      } catch (error) {
        console.error('Error checking file:', error);
        toast.error('Lỗi kiểm tra tệp', error.message || 'Đã có lỗi xảy ra');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (stats.valid === 0) {
      toast.warning('Không có dữ liệu hợp lệ', 'Vui lòng kiểm tra lại file');
      return;
    }

    const validData = tableData.filter(
      item => item.status === 'valid' || item.status === 'warning'
    );

    // Group data by mainGroup for API
    const groupedPayload = {};

    // --- Unit conversion helper ---
    const convertUnitForBackend = (quantity, unit) => {
      const numValue = Number(quantity) || 0;
      const unitLower = (unit || '').toLowerCase().trim();

      if (unitLower === 'kg') {
        return { quantity: numValue / 1000, unit: 'tấn' };
      }
      if (unitLower === 'lít' || unitLower === 'lit') {
        return { quantity: numValue / 1000, unit: 'm³' };
      }
      if (unitLower === 'mwh') {
        return { quantity: numValue * 1000, unit: 'kWh' };
      }
      return { quantity: numValue, unit };
    };

    validData.forEach(item => {
      if (!groupedPayload[item.mainGroup]) {
        groupedPayload[item.mainGroup] = [];
      }

      // Convert units for non-electricity items
      const isElectricity = item.mainGroup === 'el';
      const isGasWaste = item.mainGroup === 'waste' && String(item.subGroup).toUpperCase() === 'GASW';
      const isHazardWaste = item.mainGroup === 'waste' && String(item.subGroup).toUpperCase() === 'HA';
      const converted = isElectricity
        ? { quantity: item.quantity, unit: item.unit }
        : isGasWaste
          ? { quantity: item.quantity, unit: 'mg/l' }
          : convertUnitForBackend(item.quantity, item.unit);

      groupedPayload[item.mainGroup].push({
        name: item.name,
        quantity: converted.quantity,
        unit: converted.unit,
        sub_group: item.subGroup,
        note: item.note,
        ...(item.mainGroup === 'waste' && {
          ...(isHazardWaste ? {
            codeWaste: item.codeWaste,
            status: item.wasteStatus,
            treatmentMethods: item.treatmentMethods
          } : {})
        }),
      });
    });

    setIsProcessing(true);
    try {
      const response = await importMutation.mutateAsync({
        periodKey: selectedPeriod,
        data: groupedPayload,
      });

      const summary = response?.summary || {};
      const added = summary.added ?? 0;
      const updated = summary.updated ?? 0;
      const skipped = summary.skipped ?? 0;
      const totalChanges = summary.total ?? (added + updated + skipped);

      setImportSummary({
        added,
        updated,
        skipped,
        total: totalChanges,
        periodKey: selectedPeriod,
      });

      toast.success(
        'Đồng bộ dữ liệu thành công',
        added + updated > 0
          ? `Đã thêm ${added}, cập nhật ${updated}, bỏ qua ${skipped} bản ghi`
          : skipped > 0
            ? `Đã bỏ qua ${skipped} bản ghi đã tồn tại`
            : 'Đồng bộ xong nhưng không có thay đổi dữ liệu'
      );

      // Clear state
      setTableData([]);
      setStats({ total: 0, valid: 0, warning: 0, error: 0 });
      setSheetStats({});
      setFile(null);
    } catch (error) {
      console.error('Import error:', error);
      toast.error(
        'Lỗi đồng bộ dữ liệu',
        error.message || 'Đã có lỗi xảy ra khi đồng bộ dữ liệu'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/templates/Template_Import_Resources.xlsx');
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Template_Import_Resources.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Lỗi tải file', 'Không thể tải file mẫu.');
    }
  };

  const handleRemoveFile = e => {
    e.stopPropagation();
    setFile(null);
    setTableData([]);
    setStats({ total: 0, valid: 0, warning: 0, error: 0 });
    setSheetStats({});
    setImportSummary(null);
  };

  const formatPeriodLabel = periodKey => {
    const value = String(periodKey || '');
    if (value.length !== 6) return value;
    return `Tháng ${value.slice(4)}/${value.slice(0, 4)}`;
  };

  const importSummaryHasActualChanges =
    (importSummary?.added || 0) + (importSummary?.updated || 0) > 0;

  const importSummaryContent = importSummary ? (
    <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-4'>
      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-wider text-emerald-700'>
            Kết quả đồng bộ
          </p>
          <p className='text-sm text-emerald-800'>
            {formatPeriodLabel(importSummary.periodKey)}
          </p>
        </div>
        {!importSummaryHasActualChanges && (
          <span className='rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700'>
            Không có thay đổi
          </span>
        )}
      </div>

      <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3'>
        <div className='rounded-lg border border-emerald-100 bg-white p-3 shadow-sm'>
          <p className='text-xs font-semibold uppercase tracking-wider text-emerald-600'>
            Thêm mới
          </p>
          <p className='mt-1 text-2xl font-bold text-emerald-700'>{importSummary?.added || 0}</p>
        </div>
        <div className='rounded-lg border border-amber-100 bg-white p-3 shadow-sm'>
          <p className='text-xs font-semibold uppercase tracking-wider text-amber-600'>
            Cập nhật
          </p>
          <p className='mt-1 text-2xl font-bold text-amber-700'>{importSummary?.updated || 0}</p>
        </div>
        <div className='rounded-lg border border-slate-200 bg-white p-3 shadow-sm'>
          <p className='text-xs font-semibold uppercase tracking-wider text-slate-600'>
            Bỏ qua
          </p>
          <p className='mt-1 text-2xl font-bold text-slate-700'>{importSummary?.skipped || 0}</p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className='bg-gray-50 h-full overflow-y-auto font-sans flex flex-col'>
      {/* Top Stats & Template */}
      <ResourceStatsCards
        file={file}
        stats={stats}
        onDownloadTemplate={handleDownloadTemplate}
        extraContent={importSummaryContent}
      />

      <div className='grid grid-cols-1 lg:grid-cols-5 gap-6 pb-3 flex-1 h-0 min-h-0'>
        {/* Left Column: Upload & Options */}
        <ResourceLeftPanel
          file={file}
          onFileSelect={handleProcessFile}
          onRemoveFile={handleRemoveFile}
          selectedPeriod={selectedPeriod}
          onPeriodChange={handlePeriodChange}
        />

        {/* Right Column: Preview Table */}
        <div className='bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex flex-col overflow-hidden lg:col-span-3'>
          <div className='mb-4'>
            <div className='flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2 mb-3'>
              <div>
                <h3 className='font-bold text-sm text-[#4B5563] uppercase tracking-wider mb-1'>
                  Kiểm tra & Đồng bộ dữ liệu
                </h3>
                <p className='text-xs text-gray-500'>
                  Sau khi chọn tệp, nhấn "Kiểm tra tệp" để xem chi tiết trước khi đồng bộ.
                </p>
              </div>
              <button
                onClick={handleImport}
                disabled={stats.valid === 0 || isProcessing}
                className={`text-sm font-medium px-5 py-2 rounded-lg shadow-sm transition
                                    ${stats.valid > 0 && !isProcessing
                    ? 'bg-[#4E5BA6] text-white hover:bg-[#4E5BA6]/80 cursor-pointer'
                    : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
                  }
                                `}
              >
                {isProcessing ? 'Đang xử lý...' : `Bắt đầu đồng bộ dữ liệu`}
              </button>
            </div>

            <div className='flex gap-3 text-[10px] sm:text-xs text-[#111827] items-center flex-wrap'>
              <div className='flex items-center gap-1.5 rounded-full border border-[#D1D5DB] px-2 py-0.5'>
                <div className='w-2 h-2 rounded-full bg-green-500'></div>
                <span>Hợp lệ</span>
              </div>
              <div className='flex items-center gap-1.5 rounded-full border border-[#D1D5DB] px-2 py-0.5'>
                <div className='w-2 h-2 rounded-full bg-orange-500'></div>
                <span>Cảnh báo</span>
              </div>
              <div className='flex items-center gap-1.5 rounded-full border border-[#D1D5DB] px-2 py-0.5'>
                <div className='w-2 h-2 rounded-full bg-red-500'></div>
                <span>Lỗi</span>
              </div>
              <div className='ml-auto flex items-center gap-1.5 rounded-full border border-[#D1D5DB] px-2 py-0.5'>
                Hiển thị: {tableData.length} dòng
              </div>
            </div>
          </div>

          <ResourcePreviewTable
            tableData={tableData}
            file={file}
            onCheckFile={handleCheckFile}
            isProcessing={isProcessing}
          />
        </div>
      </div>
    </div>
  );
};

export default ImportResource;
