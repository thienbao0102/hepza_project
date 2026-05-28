const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

// Hàm tạo tên file với hash
const generateFileName = (file) => {
  const hash = crypto.createHash('md5').update(file.originalname).digest('hex');
  return `${hash}-${Date.now()}-${file.originalname}`;
};

// Cấu hình storage chung
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadsDir = 'uploads/';
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    cb(null, generateFileName(file));
  },
});

// Hàm tính hash MD5 của file
async function getFileHash(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash('md5').update(fileBuffer).digest('hex');
}

// Middleware kiểm tra duplicate bằng filename prefix (MD5 hash)
// Filename format: {md5(originalname)}-{timestamp}-{originalname}
// → Duplicate = cùng hash prefix + cùng originalname → KHÔNG cần đọc content
const processUploadedFiles = async (req, res, next) => {
  const files = Array.isArray(req.files) ? req.files : req.file ? [req.file] : [];
  if (!files.length) return next();

  const uploadsDir = 'uploads/';
  let existingFiles;
  try {
    existingFiles = await fs.readdir(uploadsDir);
  } catch {
    existingFiles = [];
  }

  for (const file of files) {
    // Trích xuất hash prefix từ filename: {hash}-{timestamp}-{name}
    const hashPrefix = file.filename.split('-')[0];
    if (!hashPrefix) {
      logger.debug(`Saved new file: ${file.filename}`);
      continue;
    }

    // Tìm file cũ có cùng hash prefix (= cùng nội dung gốc)
    const duplicate = existingFiles.find(f =>
      f !== file.filename && f.startsWith(hashPrefix + '-')
    );

    if (duplicate) {
      // Xóa file mới, dùng file cũ đã tồn tại
      await fs.unlink(file.path).catch((err) => {
        logger.warn(`Failed to delete duplicate file ${file.path}:`, err);
      });
      file.path = path.join(uploadsDir, duplicate);
    } else {
      logger.debug(`Saved new file: ${file.filename}`);
      // Thêm vào danh sách để các file sau trong cùng request có thể dedup
      existingFiles.push(file.filename);
    }
  }

  next();
};

// Multer instance cho image only (industrial zones)
const imageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (jpg, jpeg, png, webp) are allowed'));
    }
  },
});

// Multer instance cho document uploads (environmental reports - PDF/DOC up to 500MB)
const documentStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadsDir = 'uploads/env-reports/';
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      cb(null, uploadsDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    cb(null, generateFileName(file));
  },
});

const documentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOC/DOCX files are allowed'));
    }
  },
});
// Multer instance cho mixed uploads (images + PDF — business symbiosis, waste resources)
const mixedUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/heic', 'image/heif', 'image/gif',
      'application/pdf',
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'application/x-zip-compressed',
      'multipart/x-zip'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Định dạng file không được hỗ trợ (${file.originalName || file.mimetype}). Vui lòng tải lên ảnh (JPG, PNG, HEIC) hoặc tài liệu (PDF, DOC/DOCX, XLS/XLSX).`));
    }
  },
});

module.exports = {
  imageUpload,
  documentUpload,
  mixedUpload,
  processUploadedFiles,
};
