const mongoose = require('mongoose');
require('dotenv').config();

// Các models cần xóa dữ liệu
const Resource = require('../models/resourceModel');
const InputResource = require('../models/inputResourcesModel');
const WasteResource = require('../models/wasteResourcesModel');
const FuelResource = require('../models/fuelResourcesModel');
const Product = require('../models/productModel');
const SummaryRecord = require('../models/summaryRecordsModel');
const Emission = require('../models/emissionModel');
const WasteSellOffer = require('../models/wasteSellOfferModel');
const WasteBuyDemand = require('../models/wasteBuyDemandModel');
const ResourceVersion = require('../models/resourceVersionModel');
// Nếu bạn đang xài model cũ WasteBuyDemandModel2, thì mở comment bên dưới
// const WasteBuyDemand2 = require('../models/WasteBuyDemandModel2');

// Kết nối DB
mongoose.connect(process.env.ATLAS_URI);

async function clearAllResourceData() {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        console.log('🔄 Đang tiến hành dọn dẹp dữ liệu Khai báo và Cộng sinh...');

        // 1. Xóa các báo cáo và phiên bản
        const summaryResult = await SummaryRecord.deleteMany({}).session(session);
        console.log(`- Xóa ${summaryResult.deletedCount} SummaryRecords (Báo cáo tổng hợp).`);

        const versionResult = await ResourceVersion.deleteMany({}).session(session);
        console.log(`- Xóa ${versionResult.deletedCount} ResourceVersions (Phiên bản dữ liệu).`);

        // 2. Xóa các dữ liệu chi tiết trong một chu kỳ khai báo
        const inputResult = await InputResource.deleteMany({}).session(session);
        console.log(`- Xóa ${inputResult.deletedCount} InputResources (Đầu vào).`);

        const wasteResult = await WasteResource.deleteMany({}).session(session);
        console.log(`- Xóa ${wasteResult.deletedCount} WasteResources (Phế liệu/Chất thải).`);

        const fuelResult = await FuelResource.deleteMany({}).session(session);
        console.log(`- Xóa ${fuelResult.deletedCount} FuelResources (Nguyên liệu đốt).`);

        // Fuel detail deletion removed

        const productResult = await Product.deleteMany({}).session(session);
        console.log(`- Xóa ${productResult.deletedCount} Products (Sản phẩm đầu ra).`);

        // 3. Xóa Bảng Gốc Resource (Bảng cha nối tất cả các con trên lại)
        const resourceResult = await Resource.deleteMany({}).session(session);
        console.log(`- Xóa ${resourceResult.deletedCount} Resources (Bảng gốc kỳ báo cáo).`);

        // 4. Xóa Rác thải hệ quả (Khí thải, Phát thải)
        const emissionResult = await Emission.deleteMany({}).session(session);
        console.log(`- Xóa ${emissionResult.deletedCount} Emissions (Khí thải/Phát thải).`);

        // 5. Xóa Dữ liệu Cộng sinh công nghiệp (Cổng trao đổi phế liệu)
        const sellResult = await WasteSellOffer.deleteMany({}).session(session);
        console.log(`- Xóa ${sellResult.deletedCount} WasteSellOffers (Tin bán phế liệu).`);

        const buyResult = await WasteBuyDemand.deleteMany({}).session(session);
        console.log(`- Xóa ${buyResult.deletedCount} WasteBuyDemands (Tin mua phế liệu).`);

        // Nếu có dùng model model 2:
        // await WasteBuyDemand2.deleteMany({}).session(session);

        // Commit transaction nếu tất cả đều thành công
        await session.commitTransaction();
        console.log('✅ Đã dọn dẹp xong toàn bộ Dữ liệu Khai báo (Resources/Wastes) và Cộng sinh.');

    } catch (error) {
        // Nếu có lỗi ở bất kỳ bước nào, sẽ rollback lại toàn bộ trạng thái trước khi xóa
        await session.abortTransaction();
        console.error('❌ Có lỗi xảy ra trong quá trình xóa dữ liệu. Đã hoàn tác (Rollback) mọi thứ.', error);
    } finally {
        session.endSession();
        mongoose.connection.close();
        console.log('🔌 Đã đóng kết nối với Database.');
    }
}

clearAllResourceData();
