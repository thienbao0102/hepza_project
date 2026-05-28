const cacheManager = require('../lib/cacheManager');
const { getIo } = require('../config/socket');
const { pruneStaleOnlineUsers } = require('../utils/onlineTracker');

const getOnlineCount = async (req, res) => {
    try {
        const io = getIo();
        const onlineUserIds = await cacheManager.smembers('online_users_all');
        const activeUserIds = await pruneStaleOnlineUsers(io, onlineUserIds);

        res.status(200).json({
            message: 'Successfully retrieved online count',
            count: activeUserIds.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getOnlineUsersList = async (req, res) => {
    try {
        const io = getIo();
        const onlineUserIds = await cacheManager.smembers('online_users_all');
        const userIds = await pruneStaleOnlineUsers(io, onlineUserIds);

        if (!userIds || userIds.length === 0) {
            return res.status(200).json({ users: [] });
        }

        // 2. Fetch User profiles mapped with their zones and companies
        const User = require('../models/userModel');
        const usersData = await User.find({ user_id: { $in: userIds }, deleted_at: null }).lean();

        const companyIds = [...new Set(usersData.map(u => u.company_id).filter(Boolean))];
        const zoneIds = [...new Set(usersData.map(u => u.zone_id).filter(Boolean))];

        const Company = require('../models/companyModel');
        const Zone = require('../models/industrialZoneModel');

        const companies = await Company.find({ company_id: { $in: companyIds } }).select('company_id company_name').lean();
        const zones = await Zone.find({ zone_id: { $in: zoneIds } }).select('zone_id zone_name').lean();

        const companyMap = companies.reduce((acc, c) => ({ ...acc, [c.company_id]: c.company_name }), {});
        const zoneMap = zones.reduce((acc, z) => ({ ...acc, [z.zone_id]: z.zone_name }), {});

        const formattedUsers = usersData.map(u => {
            const data = {
                user_id: u.user_id,
                full_name: u.full_name,
                email: u.email,
                role: u.role,
                company_name: companyMap[u.company_id] || 'N/A',
                zone_name: zoneMap[u.zone_id] || 'N/A'
            };
            return data;
        });

        res.status(200).json({
            message: 'Successfully retrieved online users list',
            users: formattedUsers
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getOnlineCount,
    getOnlineUsersList
};
