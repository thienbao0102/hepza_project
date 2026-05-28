/**
 * Socket handler for Business Symbiosis feature.
 * Replaces REST API endpoints with Socket.IO event handlers.
 */
const businessSysmbiosisService = require('../services/businessSysmbiosisService');
const { destroyUnusedCloudinaryUrls } = require('../utils/cloudinaryReferenceTracker');

const registerSymbiosisHandlers = (socket) => {
    // ===== GET RECOMMENDATIONS =====

    // Lấy danh sách gợi ý bán (cho nhu cầu mua của mình)
    socket.on('symbiosis:getBuyRecommendations', async (data, callback) => {
        try {
            const user = socket.userDetails;
            const buyDemandList = await businessSysmbiosisService.fetchBusinessSymbiosisByBuyDemand(user.company_id);
            const response = { message: "success to get buy demand list", data: buyDemandList, isSuccess: true };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:getBuyRecommendations:response', response);
        } catch (error) {
            console.log("socket symbiosis error", error);
            const response = { error: error.message, isSuccess: false };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:getBuyRecommendations:response', response);
        }
    });

    // Lấy danh sách gợi ý mua (cho nhu cầu bán của mình)
    socket.on('symbiosis:getSellRecommendations', async (data, callback) => {
        try {
            const user = socket.userDetails;
            const sellSupplyList = await businessSysmbiosisService.fetchBusinessSymbiosisBySellSupply(user.company_id);
            const response = { message: "success to get sell supply list", data: sellSupplyList, isSuccess: true };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:getSellRecommendations:response', response);
        } catch (error) {
            console.log("socket symbiosis error", error);
            const response = { error: error.message, isSuccess: false };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:getSellRecommendations:response', response);
        }
    });

    // ===== GET OWN LISTS =====

    // Lấy danh sách nhu cầu mua của doanh nghiệp
    socket.on('symbiosis:getBuyDemands', async (data, callback) => {
        try {
            const user = socket.userDetails;
            const buyDemandList = await businessSysmbiosisService.getBusinessSymbiosisBuyDemandList(user.company_id);
            const response = { message: "get list data buy demand success", data: buyDemandList, isSuccess: true };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:getBuyDemands:response', response);
        } catch (error) {
            console.log("socket symbiosis error", error);
            const response = { error: error.message, isSuccess: false };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:getBuyDemands:response', response);
        }
    });

    // Lấy danh sách nhu cầu bán của doanh nghiệp
    socket.on('symbiosis:getSellSupplies', async (data, callback) => {
        try {
            const user = socket.userDetails;
            const sellSupplyList = await businessSysmbiosisService.getBusinessSymbiosisSellSupplyList(user.company_id);
            const response = { message: "get list data sell supply success", data: sellSupplyList, isSuccess: true };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:getSellSupplies:response', response);
        } catch (error) {
            console.log("socket symbiosis error", error);
            const response = { error: error.message, isSuccess: false };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:getSellSupplies:response', response);
        }
    });

    // ===== ADD =====

    // Thêm nhu cầu mua
    socket.on('symbiosis:addBuyDemand', async (data, callback) => {
        try {
            const user = socket.userDetails;
            const newData = await businessSysmbiosisService.processBusinessSymbiosisBuyDemandCreate(
                user.user_id, user.company_id, user.zone_id, data
            );
            const response = { message: "success to insert buy demand data", data: newData, isSuccess: true };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:addBuyDemand:response', response);
        } catch (error) {
            console.log("socket symbiosis error", error);
            const response = { error: error.message, isSuccess: false };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:addBuyDemand:response', response);
        }
    });

    // Thêm nguồn cung bán
    socket.on('symbiosis:addSellSupply', async (data, callback) => {
        try {
            const user = socket.userDetails;
            const newData = await businessSysmbiosisService.processBusinessSymbiosisSellSupplyCreate(
                user.user_id, user.company_id, user.zone_id, data
            );
            const response = { message: "success to insert sell supply data", data: newData, isSuccess: true };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:addSellSupply:response', response);
        } catch (error) {
            console.log("socket symbiosis error", error);
            const response = { error: error.message, isSuccess: false };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:addSellSupply:response', response);
        }
    });

    // ===== DELETE =====

    // Xóa nhu cầu mua
    socket.on('symbiosis:deleteBuyDemand', async (data, callback) => {
        try {
            const user = socket.userDetails;
            const result = await businessSysmbiosisService.deleteBusinessSymbiosisBuyDemandById(data._id, user.company_id);
            if (!result) {
                const response = { error: "Unauthorized or record not found", isSuccess: false };
                if (typeof callback === 'function') return callback(response);
                return socket.emit('symbiosis:deleteBuyDemand:response', response);
            }
            // Cleanup Cloudinary: xóa file nếu không còn record nào tham chiếu đến
            destroyUnusedCloudinaryUrls(
                (result.attachments || []).map(att => att?.url).filter(Boolean)
            ).catch(err => console.warn('[symbiosis:deleteBuyDemand] Cloudinary cleanup failed (non-critical):', err.message));
            const response = { message: "delete buy demand success", isSuccess: true };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:deleteBuyDemand:response', response);
        } catch (error) {
            console.log("socket symbiosis error", error);
            const response = { error: error.message, isSuccess: false };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:deleteBuyDemand:response', response);
        }
    });

    // Xóa nguồn cung bán
    socket.on('symbiosis:deleteSellSupply', async (data, callback) => {
        try {
            const user = socket.userDetails;
            const result = await businessSysmbiosisService.deleteBusinessSymbiosisSellSupplyById(data._id, user.company_id);
            if (!result) {
                const response = { error: "Unauthorized or record not found", isSuccess: false };
                if (typeof callback === 'function') return callback(response);
                return socket.emit('symbiosis:deleteSellSupply:response', response);
            }
            // Cleanup Cloudinary: xóa file nếu không còn record nào tham chiếu đến
            destroyUnusedCloudinaryUrls(
                (result.attachments || []).map(att => att?.url).filter(Boolean)
            ).catch(err => console.warn('[symbiosis:deleteSellSupply] Cloudinary cleanup failed (non-critical):', err.message));
            const response = { message: "delete sell supply success", isSuccess: true };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:deleteSellSupply:response', response);
        } catch (error) {
            console.log("socket symbiosis error", error);
            const response = { error: error.message, isSuccess: false };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:deleteSellSupply:response', response);
        }
    });

    // ===== UPDATE =====

    // Cập nhật nhu cầu mua
    socket.on('symbiosis:updateBuyDemand', async (data, callback) => {
        try {
            const user = socket.userDetails;
            const { _id, ...updateData } = data;
            const updatedData = await businessSysmbiosisService.updateBusinessSymbiosisBuyDemandById(_id, user.company_id, updateData);
            if (!updatedData) {
                const response = { error: "Unauthorized or record not found", isSuccess: false };
                if (typeof callback === 'function') return callback(response);
                return socket.emit('symbiosis:updateBuyDemand:response', response);
            }
            const response = { message: "update buy demand success", data: updatedData, isSuccess: true };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:updateBuyDemand:response', response);
        } catch (error) {
            console.log("socket symbiosis error", error);
            const response = { error: error.message, isSuccess: false };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:updateBuyDemand:response', response);
        }
    });

    // Cập nhật nguồn cung bán
    socket.on('symbiosis:updateSellSupply', async (data, callback) => {
        try {
            const user = socket.userDetails;
            const { _id, ...updateData } = data;
            const updatedData = await businessSysmbiosisService.updateBusinessSymbiosisSellSupplyById(_id, user.company_id, updateData);
            if (!updatedData) {
                const response = { error: "Unauthorized or record not found", isSuccess: false };
                if (typeof callback === 'function') return callback(response);
                return socket.emit('symbiosis:updateSellSupply:response', response);
            }
            const response = { message: "update sell supply success", data: updatedData, isSuccess: true };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:updateSellSupply:response', response);
        } catch (error) {
            console.log("socket symbiosis error", error);
            const response = { error: error.message, isSuccess: false };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:updateSellSupply:response', response);
        }
    });

    // ===== SEARCH =====

    // Tìm kiếm và sắp xếp nhu cầu mua
    socket.on('symbiosis:searchBuyDemands', async (data, callback) => {
        try {
            const user = socket.userDetails;
            const { searchKey, sortKey, sortOrder } = data || {};
            const buyDemandList = await businessSysmbiosisService.searchAndSortBusinessSymbiosisByBuyDemand(
                user.company_id, searchKey, sortKey, sortOrder
            );
            const response = { message: "search data success", data: buyDemandList, isSuccess: true };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:searchBuyDemands:response', response);
        } catch (error) {
            console.log("socket symbiosis error", error);
            const response = { error: error.message, isSuccess: false };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:searchBuyDemands:response', response);
        }
    });

    // Tìm kiếm và sắp xếp nguồn cung bán
    socket.on('symbiosis:searchSellSupplies', async (data, callback) => {
        try {
            const user = socket.userDetails;
            const { searchKey, sortKey, sortOrder } = data || {};
            const sellSupplyList = await businessSysmbiosisService.searchAndSortBusinessSymbiosisBySellSupply(
                user.company_id, searchKey, sortKey, sortOrder
            );
            const response = { message: "search data success", data: sellSupplyList, isSuccess: true };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:searchSellSupplies:response', response);
        } catch (error) {
            console.log("socket symbiosis error", error);
            const response = { error: error.message, isSuccess: false };
            if (typeof callback === 'function') return callback(response);
            socket.emit('symbiosis:searchSellSupplies:response', response);
        }
    });
};

module.exports = { registerSymbiosisHandlers };
