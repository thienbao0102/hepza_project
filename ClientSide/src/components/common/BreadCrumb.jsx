import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Breadcrumb } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useHeader } from './Header/HeaderContext';

// Bảng dịch tên
const breadcrumbNameMap = {
    // --- Business ---
    '/business': 'Doanh nghiệp',
    '/admin/business': 'Quản lý Doanh nghiệp',
    '/admin/business/:id/edit': 'Chỉnh sửa Doanh nghiệp',
    '/business/update-business': 'Cập nhật doanh nghiệp',
    '/admin/business/import-enterprise': 'Tạo doanh nghiệp mới',
    '/admin/business/export-enterprise': 'Xuất dữ liệu doanh nghiệp',
    '/manager/business/import-enterprise': 'Tạo doanh nghiệp mới',

    // --- Industrial Zones ---
    '/admin/industrialZone': 'Quản lý Khu công nghiệp',
    '/admin/industrialZone/create': 'Tạo khu công nghiệp mới',
    '/industrialZone/update-zone': 'Cập nhật khu công nghiệp',
    '/admin/industrialZone/:id': 'Chi tiết khu công nghiệp',

    // --- Solutions ---
    '/solutions/update-solution': 'Cập nhật giải pháp',
    '/admin/solutions': 'Quản lý Giải pháp',
    '/admin/solutions/create': 'Đăng giải pháp mới',
    '/admin/solutions/:id/edit': 'Chỉnh sửa giải pháp',
    '/admin/solutions/:id': 'Chi tiết giải pháp',

    // --- User ---
    '/user': 'Người dùng',
    '/user/update': 'Cập nhật người dùng',
    '/admin/user': 'Quản lý Người dùng',
    '/admin/user/create': 'Thêm người dùng mới',

    // --- Resources ---
    '/resources': 'Tài nguyên',
    '/admin/resources': 'Quản lý Tài nguyên',
    '/admin/resources/waterResources': 'Nước',
    '/admin/resources/chemicalResources': 'Hóa chất',
    '/admin/resources/electricalResources': 'Điện',
    '/admin/resources/materialResources': 'Nguyên vật liệu',
    '/admin/resources/combustionResources': 'Chất đốt',
    '/admin/waste': 'Quản lý chất thải',
    '/resources/chemicalResources': 'Hóa chất',

    // --- Notifications ---
    '/company/notifications': 'Thông báo',
    '/admin/notifications': 'Thông báo',
    '/notifications': 'Thông báo', // Fallback for prefix stripping
    '/admin/notifications/create': 'Tạo mới',
    '/notifications/create': 'Tạo mới',
    '/admin/notifications/detail': 'Chi tiết',
    '/notifications/detail': 'Chi tiết',
    '/admin/notifications/edit': 'Chỉnh sửa',
    '/notifications/edit': 'Chỉnh sửa',
    '/manager/notifications': 'Thông báo',
    '/manager/notifications/detail': 'Chi tiết',
    '/manager/notifications/edit': 'Chỉnh sửa',
    '/admin/error-logs': 'Báo cáo lỗi',
    '/admin/industry': 'Quản lý Ngành nghề',
    '/industry': 'Ngành nghề',

    '/industrialZone': 'Khu công nghiệp',
    '/solutions': 'Giải pháp',
    '/admin/business/create-business': 'Thêm doanh nghiệp mới',
};

const getActivePrefix = (pathname) => {
    if (pathname.startsWith('/admin')) return '/admin';
    if (pathname.startsWith('/manager')) return '/manager';
    // Nếu không phải admin/manager, coi như là root/company
    return '';
};

const buildDynamicLink = (basePath, prefix, title, isLast) => {
    // Nếu basePath là '/', ta dùng luôn prefix làm link (VD: /admin)
    const finalPath = (basePath === '/' || basePath === prefix) ? prefix : `${prefix}${basePath}`;

    // Xử lý các đường dẫn đặc biệt không có prefix (như /login, /404)
    if (basePath.startsWith('/login') || basePath.startsWith('/403')) {
        return <Link to={basePath}>{title}</Link>;
    }

    // Ngăn navigate về các trang intermediate update (không có ID)
    const disabledPaths = [
        '/business/update-business',
        '/industrialZone/update-zone',
        '/user/update',
        '/solutions/update-solution',
        '/notifications/detail',
        '/notifications/edit'
    ];

    // Disable link if it's an ID segment (numeric, looks like ID, or hex string) in notification/zone path
    const isIdSnippet = !isNaN(Number(title)) ||
        (typeof title === 'string' && (title.startsWith('#') || /^[0-9a-fA-F]{24}$/.test(title) || /^[0-9a-fA-F]{8,32}$/.test(title)));

    // Path segments that typically contain IDs we want to disable
    const restrictedSegments = ['notifications', 'industrialZone', 'business', 'user', 'solutions', 'templates'];
    const isRestrictedPath = restrictedSegments.some(seg => finalPath.includes(seg));

    if (disabledPaths.includes(basePath) || (isIdSnippet && isRestrictedPath)) {
        return (
            <span
                className="text-gray-400 cursor-default select-none pointer-events-none"
                style={{ pointerEvents: 'none', cursor: 'default' }}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
            >
                {title}
            </span>
        );
    }

    // Nếu là mục cuối cùng (không link), chỉ trả về <span>
    if (isLast) {
        return <span>{title}</span>;
    }

    // Trả về Link đã chèn prefix
    return <Link to={finalPath}>{title}</Link>;
};

// --- HÀM HELPER: Tìm title dựa trên URL (Hỗ trợ params :id) ---
const getBreadcrumbName = (currentUrl) => {
    // 1. Kiểm tra khớp chính xác 100% trước (Nhanh nhất)
    if (breadcrumbNameMap[currentUrl]) {
        return breadcrumbNameMap[currentUrl];
    }

    // 2. Nếu không khớp chính xác, kiểm tra các key có chứa param (vd: :id)
    // Duyệt qua từng key trong breadcrumbNameMap
    for (const key in breadcrumbNameMap) {
        // Chỉ xét các key có chứa dấu ':' (biểu thị param)
        if (!key.includes(':')) continue;

        const keyParts = key.split('/');
        const urlParts = currentUrl.split('/');

        // Nếu độ dài (số lượng segment) không bằng nhau -> Bỏ qua
        if (keyParts.length !== urlParts.length) continue;

        // So sánh từng phần
        let isMatch = true;
        for (let i = 0; i < keyParts.length; i++) {
            const keySegment = keyParts[i];
            const urlSegment = urlParts[i];

            // Nếu keySegment bắt đầu bằng ':' (vd: :id) -> Coi như khớp (wildcard)
            if (keySegment.startsWith(':')) {
                continue;
            }

            // Nếu segment tĩnh không khớp -> Sai pattern
            if (keySegment !== urlSegment) {
                isMatch = false;
                break;
            }
        }

        // Nếu khớp toàn bộ pattern -> Trả về title
        if (isMatch) {
            return breadcrumbNameMap[key];
        }
    }

    return null;
};

const buildDefaultBreadcrumbs = (location, breadcrumbNameMap) => {
    const pathSnippets = location.pathname.split('/').filter((i) => i);
    const activePrefix = getActivePrefix(location.pathname); // 👈 LẤY PREFIX

    // Logic Home Path (Giữ nguyên)
    const homePath = activePrefix ? `${activePrefix}/overview` : '/overview';

    // 2. Danh sách Skip
    const skipPaths = ['admin', 'manager', 'overview'];

    const extraBreadcrumbItems = pathSnippets.map((_, index) => {
        const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
        const snippet = pathSnippets[index];

        // Skip logic
        if (skipPaths.includes(snippet)) {
            return null;
        }

        // --- SỬ DỤNG HÀM HELPER THAY VÌ GỌI TRỰC TIẾP MAP ---
        const mapUrl = url.replace(activePrefix, '');
        let title = getBreadcrumbName(mapUrl);

        // Fallback title nếu không tìm thấy trong map
        if (!title) {
            // Nếu là ID (thường là số hoặc chuỗi dài), ta có thể hiển thị chính nó hoặc text "Chi tiết"
            // Cách đơn giản: Nếu không map được, cứ hiển thị snippet
            title = snippet;

            // Logic làm đẹp fallback
            if (snippet === 'create') title = 'Tạo mới';
            if (snippet === 'edit') title = 'Chỉnh sửa';

            // Nếu snippet trông giống ID (số), cứ hiển thị chính nó
            if (!isNaN(Number(snippet))) {
                title = snippet;
            }
        }

        const isLast = index === pathSnippets.length - 1;

        return {
            key: url,
            title: buildDynamicLink(mapUrl, activePrefix, title, isLast),
        };
    }).filter(item => item !== null);

    const homeItem = {
        key: 'home',
        title: <Link to={homePath}><HomeOutlined /></Link>
    };

    return [homeItem, ...extraBreadcrumbItems];
}

const AppBreadcrumb = () => {
    const location = useLocation();
    const { breadcrumbItems } = useHeader();
    const activePrefix = getActivePrefix(location.pathname);

    if (!location) return null;

    if (['/login', '/403', '/404'].includes(location.pathname)) {
        return null;
    }

    let finalItems;

    // 1. ƯU TIÊN SỬ DỤNG MẢNG BREADCRUMB TỪ CONTEXT (Do trang chi tiết gửi lên)
    if (breadcrumbItems && breadcrumbItems.length > 0) {
        const homePath = activePrefix ? `${activePrefix}/overview` : '/overview';

        const homeItem = {
            key: 'home',
            title: <Link to={homePath}><HomeOutlined /></Link>
        };

        // 💡 MAP qua mảng Context và chèn prefix vào đường dẫn
        const prefixedContextItems = breadcrumbItems.map(item => {
            // item.key là '/industrialZone' (đường dẫn cơ sở)
            const isLast = item.key === breadcrumbItems[breadcrumbItems.length - 1].key;

            // Check if item.key already has the prefix to avoid /admin/admin/user
            const hasPrefix = activePrefix && item.key.startsWith(activePrefix);
            const finalKey = hasPrefix ? item.key : `${activePrefix}${item.key}`;
            const basePath = hasPrefix ? item.key.replace(activePrefix, '') || '/' : item.key;

            return {
                key: finalKey, // Key của item luôn có prefix
                title: buildDynamicLink(basePath, activePrefix, item.title, isLast), // Chèn prefix vào Link
            }
        });

        finalItems = [homeItem, ...prefixedContextItems];

    } else {
        // 2. TÍNH TOÁN BREADCRUMB TỰ ĐỘNG (Fallback)
        finalItems = buildDefaultBreadcrumbs(location, breadcrumbNameMap);
    }
    return (
        <Breadcrumb items={finalItems} style={{ margin: '0 0' }} />
    );
};

export default AppBreadcrumb;