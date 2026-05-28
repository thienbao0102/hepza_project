const fs = require('fs');
const path = require('path');
const exportService = require('../services/exportService');
const { buildExcelMultiCompany } = require('../utils/exportExcel');
const { updateExportHistoryStatus } = require('../services/exportHistoryService');
const exportHistoryService = require('../services/exportHistoryService');
const exportJobService = require('../services/exportJobService');
const ExportHistory = require('../models/exportHistoryModel');
const dayjs = require('dayjs');

const exportResourceWaste = async (req, res) => {
  try {
    let { company_ids, periodKeyStart, periodKeyEnd, include, option, export_id, zone_id } = req.query;
    
    let exportHistory;
    let companyIdArr;
    let includeArr = [];

    // Nếu có export_id, tải dữ liệu hoàn toàn dựa trên lịch sử đã tạo
    if (export_id) {
      exportHistory = await ExportHistory.findOne({ export_id });
      if (!exportHistory) throw new Error('Không tìm thấy lịch sử xuất dữ liệu với mã này.');
      
      companyIdArr = exportHistory.company_ids;
      periodKeyStart = exportHistory.periodKeyStart;
      periodKeyEnd = exportHistory.periodKeyEnd;
      includeArr = exportHistory.resource_types || [1, 2, 3]; // Fallback
    } else {
      // Trường hợp không có export_id (gọi trực tiếp api cũ không qua init)
      const effectiveOption = option ? Number(option) : 1;
      companyIdArr = await exportService.checkExportPermission(
        req.user,
        effectiveOption === 3 ? null : company_ids, 
        zone_id || req.user.zone_id,
        effectiveOption
      );

      let rawInclude = include || req.query["include[]"] || [1];
      if (!Array.isArray(rawInclude)) rawInclude = [rawInclude];
      includeArr = rawInclude.map((v) => Number(v));

      const encodedFileName =
        companyIdArr.length === 1
          ? `$Data_Export_${periodKeyStart}-${periodKeyEnd}.xlsx`
          : `Multi_Company_${periodKeyStart}-${periodKeyEnd}.xlsx`;
      const niceFileName = decodeURIComponent(encodedFileName);

      const historyData = {
        user_id: req.user.user_id,
        company_ids: companyIdArr,
        periodKeyStart: Number(periodKeyStart),
        periodKeyEnd: Number(periodKeyEnd),
        infor_export: buildIncludeDescription(includeArr),
        resource_types: includeArr,
        name: niceFileName,
        creator: req.user.full_name || req.user.username || 'Unknown',
        status: 'chưa xuất tệp'
      };
      exportHistory = await exportService.saveExportHistory(historyData);
    }

    let encodedFileName = encodeURIComponent(exportHistory.name || `Data_Export.xlsx`);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodedFileName}`
    );

    let exportStats = { total: 0 };

    // bắt sự kiện thành công xuất file
    res.on('finish', async () => {
      try {
        await ExportHistory.findOneAndUpdate(
          { export_id: exportHistory.export_id },
          { status: 'thành công', total_records: exportStats.total }
        );
      } catch (err) {
        console.error('Error updating export set to finish:', err.message);
      }
    });

    // Nếu người dùng huỷ tải (VD: chuyển sang trang khác), cập nhật lại status lỗi để họ có thể thử nhấn tải lại.
    res.on('close', async () => {
      if (!res.writableFinished) {
         console.warn(`[Export] Stream bị ngắt kết nối bởi client (export_id: ${exportHistory.export_id})`);
         await ExportHistory.findOneAndUpdate(
           { export_id: exportHistory.export_id },
           { status: 'chưa xuất tệp' } // Reset về để bấm xuất lại được
         );
      }
    });

    // Thực thi streaming đẩy data liên tục vào obj `res`
    exportStats.total = await exportService.exportDataMultiCompanyStream(res, {
      company_ids: companyIdArr,
      from: Number(periodKeyStart),
      to: Number(periodKeyEnd),
      include: includeArr
    });

    // Sau khi commit workbook, response `.end()` sẽ tự được thư viện kích hoạt
  }
  catch (error) {
    console.error('Error exporting resource and waste data:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Lỗi server khi xuất dữ liệu tài nguyên và chất thải.' });
    }
  }
};

const initExport = async (req, res) => {
  try {
    const { company_ids, periodKeyStart, periodKeyEnd, include, option, zone_id } = req.body;
    const companyIdArr = await exportService.checkExportPermission(
      req.user,
      company_ids,
      zone_id || req.user.zone_id,
      option ? Number(option) : undefined
    );
    // lấy mảng include
    let includeArr = include || [];
    // Ép kiểu mảng
    if (!Array.isArray(includeArr)) includeArr = [includeArr];
    // Chuyển sang số
    includeArr = includeArr.map((v) => Number(v));

    // Determine scope prefix
    let scopePrefix = 'Theo_Doanh_Nghiep_';
    // Check isZoneScope explicit flag OR option 2
    if (Number(option) === 3) {
      scopePrefix = 'Tat_Ca_';
    } else if (Number(option) === 2 || req.body.isZoneScope) {
      scopePrefix = 'Theo_KCN_';
    }

    // Generate filename based on resource types selected
    let dataTypeName = '';
    if (includeArr.includes(0)) {
      dataTypeName = 'Thong_Tin_Doanh_Nghiep'; // Company Info
    } else if (includeArr.includes(2) && includeArr.includes(3)) {
      dataTypeName = 'Tai_Nguyen_Va_Chat_Thai';
    } else if (includeArr.includes(2)) {
      dataTypeName = 'Tai_Nguyen'; // resources
    } else if (includeArr.includes(3)) {
      dataTypeName = 'Chat_Thai'; // waste
    } else {
      dataTypeName = 'Du_Lieu_Xuat'; // default
    }

    // Prepend Scope
    dataTypeName = scopePrefix + dataTypeName;

    const encodedFileName = `${dataTypeName}_${periodKeyStart}-${periodKeyEnd}.xlsx`;
    const niceFileName = decodeURIComponent(encodedFileName);

    const historyData = {
      user_id: req.user.user_id,
      company_ids: companyIdArr,
      periodKeyStart: Number(periodKeyStart),
      periodKeyEnd: Number(periodKeyEnd),
      infor_export: buildIncludeDescription(includeArr),
      resource_types: includeArr,
      option: option ? Number(option) : 1, // Save the option mode
      zone_id: req.body.zone_id, // Save zone_id if present
      name: niceFileName,
      creator: req.user.full_name || req.user.username || 'Unknown',
      status: 'queued',
      processed_records: 0,
      total_records: 0,
      progress: 0,
    };

    const exportHistory = await exportService.saveExportHistory(historyData);
    exportJobService.enqueueExportJob(exportHistory.toObject ? exportHistory.toObject() : exportHistory);
    res.status(200).json({
      success: true,
      export_id: exportHistory.export_id,
      status: 'queued',
      name: exportHistory.name,
      message: 'Đã tạo yêu cầu xuất dữ liệu'
    });

  } catch (error) {
    console.error('Error init export:', error);
    res.status(500).json({ message: error.message || 'Lỗi server khi khởi tạo xuất dữ liệu.' });
  }
}

const getExportHistory = async (req, res) => {
  try {
    const { user } = req;
    const { getExportHistoriesByCompanyId, getExportHistoriesByUserId } = require('../services/exportHistoryService');

    // Filter history strictly by User ID (Creator) for all roles
    // This ensures users only see what THEY exported.
    const histories = await getExportHistoriesByUserId(user.user_id);
    res.json(histories);
  } catch (error) {
    console.error('Error getting export history:', error);
    res.status(500).json({ message: 'Lỗi server khi lấy lịch sử xuất file.' });
  }
};

const deleteExportHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteExportHistory: deleteHistoryService } = require('../services/exportHistoryService');
    await deleteHistoryService(id);
    res.json({ success: true, message: 'Xóa lịch sử thành công' });
  } catch (error) {
    console.error('Error deleting export history:', error);
    res.status(500).json({ message: 'Lỗi server khi xóa lịch sử xuất file.' });
  }
};

// Update export history status
const updateExportHistoryStatusController = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, total_records } = req.body;

    await updateExportHistoryStatus(id, status, total_records);
    res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
  } catch (error) {
    console.error('Error updating export history status:', error);
    res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái.' });
  }
};

const getExportStatus = async (req, res) => {
  try {
    const history = await exportHistoryService.getExportHistoryByExportIdForUser(req.params.export_id, req.user.user_id);
    if (!history) return res.status(404).json({ message: 'Không tìm thấy lịch sử xuất dữ liệu.' });
    return res.json(history);
  } catch (error) {
    console.error('Error getting export status:', error);
    return res.status(500).json({ message: 'Lỗi server khi lấy trạng thái xuất dữ liệu.' });
  }
};

const downloadExport = async (req, res) => {
  try {
    const history = await exportHistoryService.getExportHistoryByExportIdForUser(req.params.export_id, req.user.user_id);
    if (!history) return res.status(404).json({ message: 'Không tìm thấy lịch sử xuất dữ liệu.' });

    if (history.status === 'queued' || history.status === 'processing') {
      return res.status(202).json({ message: 'File đang được xử lý.' });
    }

    if (history.status === 'failed') {
      return res.status(422).json({ message: history.error_message || 'Xuất dữ liệu thất bại.' });
    }

    const exportDir = path.resolve(exportJobService.EXPORT_DIR);
    const filePath = history.file_path ? path.resolve(history.file_path) : '';
    const relativeFilePath = filePath ? path.relative(exportDir, filePath) : '';

    if (
      history.status === 'expired' ||
      !filePath ||
      relativeFilePath.startsWith('..') ||
      path.isAbsolute(relativeFilePath) ||
      !fs.existsSync(filePath)
    ) {
      await exportHistoryService.updateExportJobState(history.export_id, {
        status: 'expired',
        file_path: '',
        file_size: 0,
      });
      return res.status(410).json({ message: 'File xuất dữ liệu đã hết hạn, vui lòng xuất lại.' });
    }

    const encodedFileName = encodeURIComponent(history.name || `${history.export_id}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
    const stream = fs.createReadStream(filePath);
    stream.on('error', (streamError) => {
      console.error('Error streaming export file:', streamError.message);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Lỗi server khi đọc file xuất dữ liệu.' });
      }
    });
    return stream.pipe(res);
  } catch (error) {
    console.error('Error downloading export file:', error);
    return res.status(500).json({ message: 'Lỗi server khi tải file xuất dữ liệu.' });
  }
};

// Helper function
const INCLUDE_TEXT_MAP = {
  0: 'Thông tin doanh nghiệp',
  2: 'Dữ liệu tài nguyên',
  3: 'Chất thải',
};
const buildIncludeDescription = (includeArr = []) => {
  if (!includeArr || includeArr.length === 0) return 'Chưa chọn loại dữ liệu';
  if (includeArr.includes(0)) return INCLUDE_TEXT_MAP[0];

  return includeArr
    .map(v => INCLUDE_TEXT_MAP[v])
    .filter(Boolean)
    .join(' + ');
};

module.exports = {
  exportResourceWaste,
  getExportHistory,
  initExport,
  deleteExportHistory,
  getExportStatus,
  downloadExport,
  updateExportHistoryStatus: updateExportHistoryStatusController
};