const ErrorLog = require('../models/errorLog');
const {
  prepareErrorLogPayload,
  rollbackUploadedErrorLogAssets,
  collectErrorLogAssetUrls,
} = require('../utils/errorLogAssetUtils');

exports.createErrorLog = async (req, res) => {
  let uploadedUrls = [];

  try {
    const preparedPayload = await prepareErrorLogPayload(req.body);
    const errorData = preparedPayload.errorData;
    uploadedUrls = preparedPayload.uploadedUrls;

    const newError = new ErrorLog(errorData);
    await newError.save();
    res.status(201).json({ success: true, data: newError });
  } catch (error) {
    await rollbackUploadedErrorLogAssets(uploadedUrls);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllErrorLogs = async (req, res) => {
  try {
    const errors = await ErrorLog.find().populate('userId', 'username email').sort({ createdAt: -1 });
    const normalizedErrors = errors.map((errorLog) => {
      const plain = typeof errorLog.toObject === 'function' ? errorLog.toObject() : errorLog;
      return {
        ...plain,
        userId: plain.userId || {
          username: 'Tài khoản đã xóa',
          email: 'Tài khoản đã xóa',
        },
      };
    });
    res.status(200).json({ success: true, data: normalizedErrors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateErrorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedError = await ErrorLog.findByIdAndUpdate(id, { status }, { new: true });
    res.status(200).json({ success: true, data: updatedError });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteErrorLog = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedError = await ErrorLog.findByIdAndDelete(id);

    if (!deletedError) {
      return res.status(404).json({ success: false, message: 'Báo cáo lỗi không tồn tại' });
    }

    await rollbackUploadedErrorLogAssets(collectErrorLogAssetUrls(deletedError));

    res.status(200).json({ success: true, message: 'Đã xóa báo cáo lỗi thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
