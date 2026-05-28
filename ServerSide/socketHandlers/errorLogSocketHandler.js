const { registerDomainHandlers } = require('./registerDomainHandlers');
const {
  prepareErrorLogPayload,
  rollbackUploadedErrorLogAssets,
  collectErrorLogAssetUrls,
} = require('../utils/errorLogAssetUtils');

const getErrorLogModel = () => require('../models/errorLog');

const registerErrorLogHandlers = (socket) => {
  registerDomainHandlers(socket, [
    {
      event: 'errorLog:getAll',
      execute: async () => {
        const ErrorLog = getErrorLogModel();
        const errors = await ErrorLog.find().populate('userId', 'username email').sort({ createdAt: -1 });
        return { success: true, data: errors };
      },
    },
    {
      event: 'errorLog:create',
      execute: async ({ payload }) => {
        const ErrorLog = getErrorLogModel();
        let uploadedUrls = [];

        try {
          const preparedPayload = await prepareErrorLogPayload(payload || {});
          uploadedUrls = preparedPayload.uploadedUrls;
          const newError = new ErrorLog(preparedPayload.errorData);
          await newError.save();
          return { success: true, data: newError };
        } catch (error) {
          await rollbackUploadedErrorLogAssets(uploadedUrls);
          throw error;
        }
      },
    },
    {
      event: 'errorLog:updateStatus',
      execute: async ({ payload }) => {
        const ErrorLog = getErrorLogModel();
        const id = payload?.id || payload?._id;
        const { status } = payload || {};
        const updatedError = await ErrorLog.findByIdAndUpdate(id, { status }, { new: true });
        return { success: true, data: updatedError };
      },
    },
    {
      event: 'errorLog:delete',
      execute: async ({ payload }) => {
        const ErrorLog = getErrorLogModel();
        const id = payload?.id || payload?._id || payload;
        const deletedError = await ErrorLog.findByIdAndDelete(id);
        if (!deletedError) throw new Error('Báo cáo lỗi không tồn tại');
        await rollbackUploadedErrorLogAssets(collectErrorLogAssetUrls(deletedError));
        return { success: true, message: 'Đã xóa báo cáo lỗi thành công' };
      },
    },
  ]);
};

module.exports = { registerErrorLogHandlers };
