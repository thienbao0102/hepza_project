const mongoose = require('mongoose');
require('dotenv').config();

// Các models cần xóa dữ liệu
const NotificationTemplate = require('../models/notificationTemplateModel');
const NotificationSendLog = require('../models/notificationSendLogModel');
const NotificationInstance = require('../models/notificationInstanceModel');

async function clearAllNotificationData() {
    console.log('🔌 Đang kết nối tới Database...');
    try {
        await mongoose.connect(process.env.ATLAS_URI);
        console.log('✅ Kết nối Database thành công.');
    } catch (connError) {
        console.error('❌ Lỗi kết nối Database:', connError);
        return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log('🔄 Đang tiến hành dọn dẹp toàn bộ dữ liệu Thông báo (Notifications)...');

        // 1. Xóa tất cả các thông báo hiển thị cho từng user (NotificationInstances)
        const instanceResult = await NotificationInstance.deleteMany({}).session(session);
        console.log(`- Xóa ${instanceResult.deletedCount} NotificationInstances (Các thông báo nhỏ cho từng người dùng).`);

        // 2. Xóa các bản ghi lịch sử gửi email/thông báo tổng (NotificationSendLogs)
        const logResult = await NotificationSendLog.deleteMany({}).session(session);
        console.log(`- Xóa ${logResult.deletedCount} NotificationSendLogs (Lịch sử gửi đợt thông báo).`);

        // 3. Xóa các Template/Mẫu thông báo gốc chứa nội dung chính (NotificationTemplates)
        const templateResult = await NotificationTemplate.deleteMany({}).session(session);
        console.log(`- Xóa ${templateResult.deletedCount} NotificationTemplates (Mẫu nội dung thông báo gốc).`);

        // Commit transaction nếu tất cả đều thành công
        await session.commitTransaction();
        console.log('✅ Đã dọn dẹp xong toàn bộ Dữ liệu Thông báo hệ thống.');

    } catch (error) {
        // Nếu có lỗi ở bất kỳ bước nào, sẽ rollback lại toàn bộ trạng thái trước khi xóa
        await session.abortTransaction();
        console.error('❌ Có lỗi xảy ra trong quá trình xóa dữ liệu thông báo. Đã hoàn tác (Rollback) mọi thứ.', error);
    } finally {
        session.endSession();
        await mongoose.connection.close();
        console.log('🔌 Đã đóng kết nối với Database.');
    }
}

clearAllNotificationData();
