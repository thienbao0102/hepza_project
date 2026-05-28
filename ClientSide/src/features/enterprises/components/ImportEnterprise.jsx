import { useEffect, useMemo, useState } from 'react';
import { read, utils } from 'xlsx';
import { useQuery } from '@tanstack/react-query';
import { useHeader } from '@/components/common/Header/HeaderContext';
import ImportStatsCards from '@/components/common/Import/ImportStatsCards';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import LeftPanel from './ImportHelper/LeftPanel';
import ProcessedTable from './ImportHelper/ProcessedTable';
import toast from '@/utils/toast';
import { buildIdNameMaps } from '@/utils/industryValueUtils';
import { queryKeys } from '@/lib/queryClient';
import { buildManagerScopedTitle } from '@/utils/managerScope';
import { usePreviewImportCompanies, useImportFileAddCompany } from '@/features/enterprises/hooks/useCompanyMutations';
import { useAuthenticatedUser } from '@features/auth/hooks/useAuthQueries';
import { handlerGetAllIndustries, handlerGetAllIndustryGroups } from '@services/industryService';
import { handlerGetAllZones } from '@services/zoneService';

const TEMPLATE_ADMIN_NAME = 'Template_Import_DoanhNghiep.xlsx';
const TEMPLATE_MANAGER_NAME = 'Template_Import_DoanhNghiep_Manager.xlsx';
const TEMPLATE_FORM_SHEET_NAME = 'Form_Nhap_Lieu';
const TEMPLATE_START_ROW = 15;
const TEMPLATE_END_ROW = 500;
const ADMIN_ZONE_COLUMN = 'B';
const ADMIN_ZONE_HELPER_COLUMN = 'AC';
const adminTemplateBlobCache = new Map();

let excelJsModulePromise = null;
let adminTemplateArrayBufferPromise = null;
const normalizeText = (value = '') =>

  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
const splitMultiValue = (value) => {

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (value === undefined || value === null) {
    return [];
  }
  return String(value)
    .split(/[;\n|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const collectMultiFieldValues = (row, keys) =>

  keys.flatMap((key) => splitMultiValue(row[key]));
const findTemplateKeyRowIndex = (rows = []) =>

  rows.findIndex((row) => {
    const normalizedRow = row.map((cell) => normalizeText(cell));
    return normalizedRow.includes('ten_doanh_nghiep')
      && normalizedRow.includes('nguoi_dai_dien_email')
      && normalizedRow.includes('nguoi_dai_dien_so_dien_thoai');
  });
const triggerTemplateDownload = (blob, filename) => {

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const getExcelJsModule = async () => {

  if (!excelJsModulePromise) {
    excelJsModulePromise = import('exceljs');
  }
  return excelJsModulePromise;
};

const getAdminTemplateArrayBuffer = async () => {

  if (!adminTemplateArrayBufferPromise) {
    adminTemplateArrayBufferPromise = fetch(`/templates/${TEMPLATE_ADMIN_NAME}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Không thể tải file mẫu admin từ hệ thống.');
        }
        return response.arrayBuffer();
      });
  }
  return adminTemplateArrayBufferPromise;
};

const setExcelListValidation = (cell, formula) => {

  cell.dataValidation = {
    type: 'list',
    allowBlank: true,
    formulae: [formula],
    showInputMessage: true,
    showErrorMessage: true,
    errorTitle: 'Giá trị không hợp lệ!',
    error: 'Vui lòng chọn đúng dữ liệu trong danh sách gợi ý của hệ thống.',
  };

};

const buildAdminTemplateBlob = async (zoneNames) => {

  const zoneCacheKey = [...zoneNames].join('||');
  if (adminTemplateBlobCache.has(zoneCacheKey)) {
    return adminTemplateBlobCache.get(zoneCacheKey);
  }
  const [{ default: ExcelJS }, templateArrayBuffer] = await Promise.all([
    getExcelJsModule(),
    getAdminTemplateArrayBuffer(),
  ]);
  if (!Array.isArray(zoneNames) || zoneNames.length === 0) {
    throw new Error('Hiện chưa có KCN/KCX nào trong hệ thống để tạo danh sách chọn.');
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateArrayBuffer.slice(0));
  const worksheet = workbook.getWorksheet(TEMPLATE_FORM_SHEET_NAME) || workbook.worksheets[0];
  worksheet.getColumn(ADMIN_ZONE_HELPER_COLUMN).hidden = true;
  for (let row = 2; row <= TEMPLATE_END_ROW; row += 1) {
    worksheet.getCell(`${ADMIN_ZONE_HELPER_COLUMN}${row}`).value = null;
  }
  zoneNames.forEach((zoneName, index) => {
    worksheet.getCell(`${ADMIN_ZONE_HELPER_COLUMN}${index + 2}`).value = zoneName;
  });
  const zoneValidationFormula = `$${ADMIN_ZONE_HELPER_COLUMN}$2:$${ADMIN_ZONE_HELPER_COLUMN}$${zoneNames.length + 1}`;
  for (let row = TEMPLATE_START_ROW; row <= TEMPLATE_END_ROW; row += 1) {
    setExcelListValidation(worksheet.getCell(`${ADMIN_ZONE_COLUMN}${row}`), zoneValidationFormula);
  }
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  adminTemplateBlobCache.set(zoneCacheKey, blob);
  return blob;
};

const parseTemplateRows = (rows = []) => {

  const keyRowIndex = findTemplateKeyRowIndex(rows);
  if (keyRowIndex === -1) {
    throw new Error('Không tìm thấy dòng machine key hợp lệ trong file mẫu.');
  }
  const keys = rows[keyRowIndex].map((cell) => normalizeText(cell));
  return rows
    .slice(keyRowIndex + 1)
    .map((row) => {
      const entry = {};
      keys.forEach((key, index) => {
        if (!key) return;
        entry[key] = row[index];
      });
      return entry;
    })
    .filter((row) => String(row.ten_doanh_nghiep || '').trim());
};

const ImportEnterprise = () => {

  const { setHeaderConfig, setBreadcrumbItems } = useHeader();
  const [file, setFile] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [stats, setStats] = useState({ total: 0, valid: 0, warning: 0, error: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImportSubmitting, setIsImportSubmitting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [isDownloadingTemplateFallback, setIsDownloadingTemplateFallback] = useState(false);
  const [preparedAdminTemplateBlob, setPreparedAdminTemplateBlob] = useState(null);
  const [industryGroups, setIndustryGroups] = useState([]);
  const [allIndustries, setAllIndustries] = useState([]);
  const previewMutation = usePreviewImportCompanies();
  const importMutation = useImportFileAddCompany();
  const { data: authenticatedUser } = useAuthenticatedUser();
  const currentUser = authenticatedUser?.user || authenticatedUser || {};
  const isManager = currentUser?.role === 'manager';
  const shouldPreloadZones = Boolean(currentUser?.user_id) && (currentUser?.role === 'admin' || Boolean(currentUser?.zone_id));
  const zoneQueryParams = useMemo(() => ({
    page: 1,
    limit: 2000,
    search: '',
    filters: {},
    scope: 'import-template',
  }), []);
  const { data: zonesCatalogResponse, isFetching: isZonesCatalogFetching } = useQuery({
    queryKey: queryKeys.zones.list(zoneQueryParams),
    queryFn: ({ signal }) => handlerGetAllZones(
      {
        page: zoneQueryParams.page,
        limit: zoneQueryParams.limit,
        search: zoneQueryParams.search,
        filters: zoneQueryParams.filters,
      },
      undefined,
      undefined,
      undefined,
      signal,
    ),
    enabled: shouldPreloadZones,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
  });
  const zones = useMemo(
    () => (Array.isArray(zonesCatalogResponse?.zones) ? zonesCatalogResponse.zones : []),
    [zonesCatalogResponse?.zones],
  );
  const resolvedManagedZoneLabel = useMemo(() => {
    if (currentUser?.zone_name) {
      return currentUser.zone_name;
    }
    const matchedZone = zones.find(
      (zone) => String(zone?.zone_id || '').trim() === String(currentUser?.zone_id || '').trim(),
    );
    return matchedZone?.zone_name || 'KCN bạn đang quản lý';
  }, [currentUser?.zone_id, currentUser?.zone_name, zones]);
  const groupMaps = useMemo(
    () => buildIdNameMaps(industryGroups, 'group_id', 'group_name'),
    [industryGroups],
  );
  const normalizedGroupIdByValue = useMemo(() => {
    const map = {};
    industryGroups.forEach((group) => {
      map[normalizeText(group.group_id)] = group.group_id;
      map[normalizeText(group.group_name)] = group.group_id;
    });
    return map;
  }, [industryGroups]);
  const normalizedIndustryIdByValue = useMemo(() => {
    const map = {};
    allIndustries.forEach((industry) => {
      map[normalizeText(industry.industry_id)] = industry.industry_id;
      map[normalizeText(industry.industry_name)] = industry.industry_id;
      map[normalizeText(industry.industry_code)] = industry.industry_id;
      map[normalizeText(`${industry.industry_code} - ${industry.industry_name}`)] = industry.industry_id;
    });
    return map;
  }, [allIndustries]);
  useEffect(() => {
    const abortController = new AbortController();
    const loadReferenceData = async () => {
      try {
        const [groupResponse, industryResponse] = await Promise.all([
          handlerGetAllIndustryGroups({ page: 1, limit: 1000 }, undefined, undefined, abortController.signal),
          handlerGetAllIndustries({ page: 1, limit: 1000 }, undefined, undefined, undefined, abortController.signal),
        ]);
        if (Array.isArray(groupResponse?.groups)) {
          setIndustryGroups(groupResponse.groups);
        }
        if (Array.isArray(industryResponse?.industries)) {
          setAllIndustries(industryResponse.industries);
        }
      } catch (_error) {
        // Keep the import screen usable even if dictionary lookups fail.
      }
    };

    loadReferenceData();
    return () => abortController.abort();
  }, [currentUser?.zone_id, isManager]);
  useEffect(() => {
    const title = isManager
      ? buildManagerScopedTitle('Nhập dữ liệu doanh nghiệp', resolvedManagedZoneLabel)
      : 'Tạo doanh nghiệp mới từ file';
    const description = isManager
      ? `Tải file mẫu và import doanh nghiệp vào ${resolvedManagedZoneLabel}.`
      : 'Tải file mẫu, kiểm tra dữ liệu và tạo doanh nghiệp cùng tài khoản đại diện ngay từ file import.';
    setHeaderConfig({
      title,
      description,
      showWeather: false,
      showDatePicker: false,
    });
    setBreadcrumbItems([
      {
        key: 'business/import-enterprise',
        title: 'Nhập dữ liệu doanh nghiệp',
      },
    ]);
  }, [isManager, resolvedManagedZoneLabel, setBreadcrumbItems, setHeaderConfig]);
  const handleProcessFile = (selectedFile) => {
    if (isDownloadingTemplate || isImportSubmitting) return;
    setTableData([]);
    setStats({ total: 0, valid: 0, warning: 0, error: 0 });
    setIsProcessing(false);
    previewMutation.reset?.();
    importMutation.reset?.();
    setFile(selectedFile);
  };

  const handleRemoveFile = (event) => {
    if (isDownloadingTemplate || isImportSubmitting) return;
    event.stopPropagation();
    setFile(null);
    setTableData([]);
    setStats({ total: 0, valid: 0, warning: 0, error: 0 });
  };

  const handleCheckFile = async () => {
    if (!file || isDownloadingTemplate || isImportSubmitting) return;
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        const parsedRows = parseTemplateRows(rawRows);
        const apiPayload = parsedRows.map((row) => {
          const rawIndustryGroups = collectMultiFieldValues(row, ['nhom_nganh', 'nhom_nganh_2', 'nhom_nganh_3', 'industry_group']);
          const rawIndustries = collectMultiFieldValues(row, ['nganh_nghe', 'nganh_nghe_2', 'nganh_nghe_3', 'nganh_nghe_chi_tiet', 'industry']);
          const representativeName = String(row.nguoi_dai_dien_ho_ten || row.full_name || '').trim();
          const representativeEmail = String(row.nguoi_dai_dien_email || row.email || '').trim();
          const phoneRaw = String(row.nguoi_dai_dien_so_dien_thoai || row.phone_number || row.so_dien_thoai || '').trim();
          const normalizedIndustryGroups = rawIndustryGroups.map((value) => {
            const trimmedValue = String(value).trim();
            const normalizedValue = normalizeText(trimmedValue);
            return groupMaps.nameById?.[trimmedValue]
              ? trimmedValue
              : normalizedGroupIdByValue[normalizedValue] || trimmedValue;
          });
          const normalizedIndustries = rawIndustries.map(
            (value) => normalizedIndustryIdByValue[normalizeText(value)] || String(value).trim(),
          );
          return {
            company_name: String(row.ten_doanh_nghiep || row.company_name || '').trim(),
            company_registration_number: String(row.so_dk_kd || row.company_registration_number || '').trim(),
            zone_name: isManager ? '' : String(row.khu_cong_nghiep || row.zone_name || '').trim(),
            founded_year: String(row.nam_thanh_lap || row.founded_year || '').trim(),
            address: String(row.dia_chi || row.address || '').trim(),
            industry_group: normalizedIndustryGroups.length > 1 ? normalizedIndustryGroups : (normalizedIndustryGroups[0] || ''),
            industry: normalizedIndustries.length > 1 ? normalizedIndustries : (normalizedIndustries[0] || ''),
            company_type: String(row.loai_hinh_doanh_nghiep || row.company_type || '').trim(),
            total_workers: String(row.so_luong_nhan_vien || row.total_workers || '').trim(),
            website: String(row.website || '').trim(),
            revenue: String(row.doanh_thu || row.revenue || '').trim(),
            market: String(row.thi_truong || row.market || '').trim(),
            env_legal_id: String(row.ma_moi_truong || row.env_legal_id || '').trim(),
            full_name: representativeName,
            email: representativeEmail,
            phone_number: phoneRaw,
            create_account: true,
          };

        });
        if (apiPayload.length === 0) {
          throw new Error('Không tìm thấy dữ liệu hợp lệ trong file.');
        }
        const response = await previewMutation.mutateAsync({
          excelData: apiPayload,
          createAccounts: true,
        });
        let validCount = 0;
        let errorCount = 0;
        const processedRows = response.results.map((item, index) => {
          const isValidRow = item.status === 'valid_with_user';
          if (isValidRow) {
            validCount += 1;
          } else {
            errorCount += 1;
          }
          return {
            id: index,
            ...item,
            name: item.company_name,
            industrial_park: isManager ? resolvedManagedZoneLabel : item.zone_name,
            established_year: item.founded_year,
            employee_count: item.total_workers,
            representative: item.full_name,
            phone: item.phone_number,
            tax_id: item.company_registration_number,
            type: item.company_type,
            status: isValidRow ? 'valid' : 'error',
            errors: isValidRow ? [] : [item.message || 'Dữ liệu không hợp lệ'],
          };

        });
        setTableData(processedRows);
        setStats({
          total: processedRows.length,
          valid: validCount,
          warning: 0,
          error: errorCount,
        });
        toast.success(
          'Kiểm tra hoàn tất',
          `Đã kiểm tra ${processedRows.length} doanh nghiệp. Có ${validCount} dòng hợp lệ và ${errorCount} dòng cần sửa.`,
        );
      } catch (error) {
        toast.error('Lỗi kiểm tra tệp', error.message || 'Đã có lỗi xảy ra.');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (stats.valid === 0 || isDownloadingTemplate || isImportSubmitting) return;
    const validData = tableData
      .filter((item) => item.status === 'valid')
      .map(({
        id: _id,
        status: _status,
        errors: _errors,
        name: _name,
        industrial_park: _industrialPark,
        established_year: _establishedYear,
        employee_count: _employeeCount,
        representative: _representative,
        tax_id: _taxId,
        type: _type,
        ...data
      }) => data);
    setIsProcessing(true);
    setIsImportSubmitting(true);
    try {
      const response = await importMutation.mutateAsync({
        createAccounts: true,
        data: validData,
      });
      toast.success(
        'Import thành công',
        `Đã import ${response.summary?.success || 0} doanh nghiệp.`,
      );
      setTableData([]);
      setStats({ total: 0, valid: 0, warning: 0, error: 0 });
      setFile(null);
    } catch (error) {
      toast.error('Lỗi import', error.message);
    } finally {
      setIsProcessing(false);
      setIsImportSubmitting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    if (isDownloadingTemplate || isImportSubmitting) {
      return;
    }
    const templateName = isManager ? TEMPLATE_MANAGER_NAME : TEMPLATE_ADMIN_NAME;
    setIsDownloadingTemplate(true);
    try {
      if (isManager) {
        const link = document.createElement('a');
        link.href = `/templates/${templateName}`;
        link.setAttribute('download', templateName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
      if (preparedAdminTemplateBlob) {
        triggerTemplateDownload(preparedAdminTemplateBlob, templateName);
        return;
      }
      if (isZonesCatalogFetching && zones.length === 0) {
        throw new Error('Danh sách KCN/KCX đang được đồng bộ. Vui lòng thử lại sau vài giây.');
      }
      const activeZoneNames = [...new Set(
        zones
          .map((zone) => String(zone?.zone_name || '').trim())
          .filter(Boolean),
      )].sort((left, right) => left.localeCompare(right, 'vi'));
      setIsDownloadingTemplateFallback(true);
      const fallbackBlob = await buildAdminTemplateBlob(activeZoneNames);
      setPreparedAdminTemplateBlob(fallbackBlob);
      triggerTemplateDownload(fallbackBlob, templateName);
    } catch (error) {
      toast.error('Lỗi tải file mẫu', error.message || 'Không thể tạo file mẫu admin.');
    } finally {
      setIsDownloadingTemplateFallback(false);
      setIsDownloadingTemplate(false);
    }
  };

  const pageOverlayTip = isImportSubmitting
    ? 'Đang tạo doanh nghiệp và tài khoản đại diện từ file import...'
    : (isDownloadingTemplateFallback ? 'Đang chuẩn bị file mẫu doanh nghiệp...' : '');
  const shouldShowPageOverlay = Boolean(pageOverlayTip);
  return (
    <div className="relative flex h-full flex-col overflow-y-auto bg-gray-50 font-sans">
      {shouldShowPageOverlay ? (
        <LoadingSpinner
          tip={pageOverlayTip}
          wrapperClassName="absolute inset-0 z-20 bg-white/70 backdrop-blur-sm"
        />
      ) : null}
      <ImportStatsCards
        file={file}
        stats={stats}
        templateName={isManager ? TEMPLATE_MANAGER_NAME : TEMPLATE_ADMIN_NAME}
        onDownloadTemplate={handleDownloadTemplate}
        isDownloadingTemplate={isDownloadingTemplate}
        isPreparingTemplate={isDownloadingTemplateFallback}
      />
      <div className="grid h-full flex-1 grid-cols-1 gap-6 pb-3 lg:grid-cols-5">
        <LeftPanel
          file={file}
          isManager={isManager}
          managedZoneLabel={resolvedManagedZoneLabel}
          onFileSelect={handleProcessFile}
          onRemoveFile={handleRemoveFile}
        />
        <div className="flex h-full min-h-[500px] flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:col-span-3">
          <div className="mb-4">
            <div className="mb-3 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-[#4B5563]">
                  Kiểm tra và xem trước dữ liệu
                </h3>
                <p className="text-xs text-gray-500">
                  Sau khi chọn tệp, nhấn "Kiểm tra tệp" để xác nhận dữ liệu doanh nghiệp, tài khoản đại diện và ngành nghề trước khi import.
                </p>
              </div>
              <button
                className={`rounded-lg px-5 py-2 text-sm font-medium shadow-sm transition ${stats.valid > 0 && !isProcessing
                  ? 'cursor-pointer bg-[#4E5BA6] text-white hover:bg-[#414b8b]'
                  : 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'}`}
                disabled={stats.valid === 0 || isProcessing || isDownloadingTemplate || isImportSubmitting}
                onClick={handleImport}
              >
                {isProcessing ? 'Đang xử lý...' : 'Bắt đầu tạo dữ liệu'}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[10px] text-[#111827] sm:text-xs">
              <div className="flex items-center gap-1.5 rounded-[999px] border border-[#D1D5DB] px-2 py-[3px]">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span>Hợp lệ: tạo doanh nghiệp và tài khoản đại diện</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-[999px] border border-[#D1D5DB] px-2 py-[3px]">
                <div className="h-2 w-2 rounded-full bg-red-500"></div>
                <span>Thiếu, sai hoặc trùng dữ liệu bắt buộc</span>
              </div>
              {isManager ? (
                <div className="flex items-center gap-1.5 rounded-[999px] border border-[#C7D2FE] bg-[#EEF2FF] px-2 py-[3px] text-[#3730A3]">
                  <span>KCN áp dụng: {resolvedManagedZoneLabel}</span>
                </div>
              ) : null}
              <div className="ml-auto flex items-center gap-1.5 rounded-[999px] border border-[#D1D5DB] px-2 py-[3px]">
                Hiển thị: {tableData.length} dòng
              </div>
            </div>
          </div>
          <ProcessedTable
            file={file}
            isManager={isManager}
            isProcessing={isProcessing}
            tableData={tableData}
            onCheckFile={handleCheckFile}
          />
        </div>
      </div>
    </div>
  );
};

export default ImportEnterprise;
