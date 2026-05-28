const EnvironmentalReport = require('../models/environmentalReportModel');
const path = require('path');
const fs = require('fs').promises;
const { uploadOrReuseAttachment } = require('../config/cloudinary');
const { destroyUnusedCloudinaryUrls } = require('../utils/cloudinaryReferenceTracker');
const { CLOUDINARY_FOLDERS } = require('../utils/cloudinaryFolders');

// POST /upload — company uploads a report
exports.uploadReport = async (req, res) => {
  let uploadedFileUrl = null;
  try {
    if (!req.file) {
      return res.status(400).json({ isSuccess: false, message: 'Không có file được tải lên.' });
    }

    const { year, note } = req.body;
    const companyId = req.user.company_id;
    const userId = req.user._id || req.user.id;

    if (!year || !companyId) {
      // Cleanup uploaded file
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ isSuccess: false, message: 'Thiếu thông tin năm hoặc doanh nghiệp.' });
    }
    uploadedFileUrl = await uploadOrReuseAttachment(req.file.path, {
      folder: CLOUDINARY_FOLDERS.environmentalReports,
      resource_type: 'raw',
      mime_type: req.file.mimetype,
      original_filename: req.file.originalname,
    });

    const report = await EnvironmentalReport.create({
      company_id: companyId,
      year: Number(year),
      file_name: req.file.originalname,
      file_path: null,
      file_url: uploadedFileUrl,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      uploaded_by: userId,
      note: note || '',
    });

    return res.status(201).json({ isSuccess: true, data: report });
  } catch (error) {
    if (uploadedFileUrl) {
      await destroyUnusedCloudinaryUrls([uploadedFileUrl]);
    }
    console.error('[EnvReport] Upload error:', error);
    return res.status(500).json({ isSuccess: false, message: 'Lỗi khi tải lên báo cáo.' });
  }
};

// GET /:companyId — list reports for a company
exports.getReports = async (req, res) => {
  try {
    const { companyId } = req.params;
    const reports = await EnvironmentalReport.find({ company_id: companyId })
      .sort({ year: -1, created_at: -1 })
      .lean();

    return res.json({ isSuccess: true, data: reports });
  } catch (error) {
    console.error('[EnvReport] Get reports error:', error);
    return res.status(500).json({ isSuccess: false, message: 'Lỗi khi lấy danh sách báo cáo.' });
  }
};

// GET /download/:id — download a specific report file
exports.downloadReport = async (req, res) => {
  try {
    const report = await EnvironmentalReport.findById(req.params.id).lean();
    if (!report) {
      return res.status(404).json({ isSuccess: false, message: 'Không tìm thấy báo cáo.' });
    }

    if (report.file_url) {
      return res.redirect(report.file_url);
    }
    const filePath = path.resolve(report.file_path);
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ isSuccess: false, message: 'File không tồn tại trên server.' });
    }

    res.download(filePath, report.file_name);
  } catch (error) {
    console.error('[EnvReport] Download error:', error);
    return res.status(500).json({ isSuccess: false, message: 'Lỗi khi tải xuống báo cáo.' });
  }
};

// DELETE /:id — delete a report (company only)
exports.deleteReport = async (req, res) => {
  try {
    const report = await EnvironmentalReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ isSuccess: false, message: 'Không tìm thấy báo cáo.' });
    }

    // Only the owning company can delete
    const role = req.user.role;
    if (role === 'company' && report.company_id !== req.user.company_id) {
      return res.status(403).json({ isSuccess: false, message: 'Không có quyền xóa.' });
    }

    await EnvironmentalReport.findByIdAndDelete(req.params.id);

    if (report.file_url) {
      await destroyUnusedCloudinaryUrls([report.file_url]);
    } else if (report.file_path) {
      await fs.unlink(path.resolve(report.file_path)).catch(err =>
        console.warn('[EnvReport] Could not delete file:', err.message)
      );
    }

    return res.json({ isSuccess: true, message: 'Đã xóa báo cáo.' });
  } catch (error) {
    console.error('[EnvReport] Delete error:', error);
    return res.status(500).json({ isSuccess: false, message: 'Lỗi khi xóa báo cáo.' });
  }
};
