const { registerDomainHandlers } = require('./registerDomainHandlers');

const getExportService = () => require('../services/exportService');
const getExportHistoryService = () => require('../services/exportHistoryService');
const getExportJobService = () => require('../services/exportJobService');
const getActor = (socket) => socket.userDetails || socket.user || {};

const registerExportHandlers = (socket) => {
  registerDomainHandlers(socket, [
    {
      // NOTE: export:resourceWaste streams an Excel file as binary blob.
      // Socket.IO cannot stream binary responses — this MUST go through HTTP.
      // The client-side FormData guard + transport-selector handles this.
      // This stub exists only for completeness; if called via socket it will fail gracefully.
      event: 'export:resourceWaste',
      execute: async () => {
        throw new Error('File export must use HTTP transport. This operation streams binary data (Excel) which cannot be sent via Socket.IO.');
      },
    },
    {
      event: 'export:init',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const { company_ids, periodKeyStart, periodKeyEnd, include, option, zone_id, isZoneScope } = payload || {};

        const companyIdArr = await getExportService().checkExportPermission(
          actor,
          company_ids,
          zone_id || actor.zone_id,
          option ? Number(option) : undefined
        );

        let includeArr = include || [];
        if (!Array.isArray(includeArr)) includeArr = [includeArr];
        includeArr = includeArr.map((v) => Number(v));

        let scopePrefix = 'Theo_Doanh_Nghiep_';
        if (Number(option) === 3) {
          scopePrefix = 'Tat_Ca_';
        } else if (Number(option) === 2 || isZoneScope) {
          scopePrefix = 'Theo_KCN_';
        }

        let dataTypeName = '';
        if (includeArr.includes(0)) {
          dataTypeName = 'Thong_Tin_Doanh_Nghiep';
        } else if (includeArr.includes(2) && includeArr.includes(3)) {
          dataTypeName = 'Tai_Nguyen_Va_Chat_Thai';
        } else if (includeArr.includes(2)) {
          dataTypeName = 'Tai_Nguyen';
        } else if (includeArr.includes(3)) {
          dataTypeName = 'Chat_Thai';
        } else {
          dataTypeName = 'Du_Lieu_Xuat';
        }
        dataTypeName = scopePrefix + dataTypeName;

        const encodedFileName = `${dataTypeName}_${periodKeyStart}-${periodKeyEnd}.xlsx`;
        const niceFileName = decodeURIComponent(encodedFileName);

        const historyData = {
          user_id: actor.user_id,
          company_ids: companyIdArr,
          periodKeyStart: Number(periodKeyStart),
          periodKeyEnd: Number(periodKeyEnd),
          infor_export: buildIncludeDescription(includeArr),
          resource_types: includeArr,
          option: option ? Number(option) : 1,
          zone_id,
          name: niceFileName,
          creator: actor.full_name || actor.username || 'Unknown',
          status: 'queued',
          processed_records: 0,
          total_records: 0,
          progress: 0,
        };

        const exportHistory = await getExportService().saveExportHistory(historyData);
        getExportJobService().enqueueExportJob(exportHistory.toObject ? exportHistory.toObject() : exportHistory);
        return {
          export_id: exportHistory.export_id,
          status: 'queued',
          name: exportHistory.name,
          message: 'Đã tạo yêu cầu xuất dữ liệu'
        };
      },
    },
    {
      event: 'export:getStatus',
      execute: async ({ payload }) => {
        const actor = getActor(socket);
        const exportId = payload?.export_id || payload?.exportId || payload;
        const history = await getExportHistoryService().getExportHistoryByExportIdForUser(exportId, actor.user_id);
        if (!history) {
          const error = new Error('Không tìm thấy lịch sử xuất dữ liệu.');
          error.statusCode = 404;
          throw error;
        }
        return history;
      },
    },
    {
      event: 'export:getHistory',
      execute: async () => {
        const actor = getActor(socket);
        const histories = await getExportHistoryService().getExportHistoriesByUserId(actor.user_id);
        return histories;
      },
    },
    {
      event: 'export:deleteHistoryItem',
      execute: async ({ payload }) => {
        const id = payload?.id || payload;
        await getExportHistoryService().deleteExportHistory(id);
        return { success: true, message: 'Xóa lịch sử thành công' };
      },
    },
    {
      event: 'export:pinHistoryItem',
      execute: async ({ payload }) => {
        const { exportId, status, total_records } = payload || {};
        const id = exportId || payload?.id;
        await getExportHistoryService().updateExportHistoryStatus(id, status, total_records);
        return { success: true, message: 'Cập nhật trạng thái thành công' };
      },
    },
  ]);
};

const INCLUDE_TEXT_MAP = {
  0: 'Thông tin doanh nghiệp',
  2: 'Dữ liệu tài nguyên',
  3: 'Chất thải',
};

const buildIncludeDescription = (includeArr = []) => {
  if (!includeArr || includeArr.length === 0) return 'Chưa chọn loại dữ liệu';
  if (includeArr.includes(0)) return INCLUDE_TEXT_MAP[0];
  return includeArr.map((v) => INCLUDE_TEXT_MAP[v]).filter(Boolean).join(' + ');
};

module.exports = { registerExportHandlers };
