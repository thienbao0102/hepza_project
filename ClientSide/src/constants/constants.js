// Ép HTTPS trên production + bỏ dấu / thừa cuối URL
const _raw = import.meta.env.VITE_SERVER_URL || '';
export const HOST = _raw
    .replace(/\/$/, '')                                    // bỏ / cuối
    .replace(/^http:\/\/(?!localhost)/, 'https://');        // http → https (trừ localhost)

// Authentication Routes
export const AUTH_ROUTES = `${HOST}/api/auth`;
export const SIGNIN_ROUTE = `${AUTH_ROUTES}/login`; // Đăng nhập
export const FORGET_ROUTE = `${AUTH_ROUTES}/request-password-reset`; // Yêu cầu reset mật khẩu
export const RESETP_INIT_ROUTE = `${AUTH_ROUTES}/reset-password/init`; // Khởi tạo reset mật khẩu từ link email
export const RESETP_ROUTE = `${AUTH_ROUTES}/reset-password`; // Reset mật khẩu
export const LOGOUT_ROUTE = `${AUTH_ROUTES}/logout`; // Đăng xuất
export const ME_ROUTE = `${AUTH_ROUTES}/me`; // Lấy thông tin user đã xác thực
export const CHANGE_PASSWORD_ROUTE = `${AUTH_ROUTES}/change-password`; // Thay đổi mật khẩu
export const REFRESH_TOKEN_ROUTE = `${AUTH_ROUTES}/refresh`; // Refresh token định kỳ để giữ đăng nhập và tăng tính bảo mật

// Company Routes
export const COMPANY_ROUTES = `${HOST}/api/companies`;
export const ADD_COMPANY_ROUTE = `${COMPANY_ROUTES}/add-company`; // Thêm 1 company (chỉ admin)
export const ADD_LIST_COMPANY_ROUTE = `${COMPANY_ROUTES}/add-list-company`; // Thêm danh sách company từ file (chỉ admin)
export const GET_ALL_COMPANIES_ROUTE = `${COMPANY_ROUTES}/get-all-companies`; // Lấy tất cả company theo điều kiện với phân trang
export const GET_MANAGED_COMPANIES_ROUTE = `${COMPANY_ROUTES}/get-managed-companies`; // Lấy danh sách doanh nghiệp thuộc quản lý của Manager
export const DELETE_COMPANY_ROUTE = (companyId) => `${COMPANY_ROUTES}/delete-company/${companyId}`; // Xóa company theo ID (chỉ admin)
export const DELETE_COMPANIES_ROUTE = `${COMPANY_ROUTES}/delete-companies`; // Xóa nhiều company (chỉ admin)
export const RESTORE_COMPANY_ROUTE = (companyId) => `${COMPANY_ROUTES}/restore-company/${companyId}`; // Khôi phục 1 company (chỉ admin)
export const RESTORE_COMPANIES_ROUTE = `${COMPANY_ROUTES}/restore-companies`; // Khôi phục nhiều company (chỉ admin)
export const GET_COMPANY_ROUTE = (companyId) => `${COMPANY_ROUTES}/get-company/${companyId}`; // Lấy thông tin company theo ID
export const LOOKUP_TAX_CODE_ROUTE = (taxCode) => `${COMPANY_ROUTES}/tax-lookup/${taxCode}`; // Tra cứu MST để tự động điền tên và địa chỉ doanh nghiệp
export const GET_DELETED_COMPANIES_ROUTE = `${COMPANY_ROUTES}/get-deleted-companies`; // Lấy tất cả company bị xóa mềm theo điều kiện với phân trang (chỉ admin)
export const UPDATE_COMPANY_ROUTE = (companyId) => `${COMPANY_ROUTES}/update-company/${companyId}`; // Cập nhật thông tin company (admin hoặc chính công ty đó)
export const PREVIEW_SOFT_DELETE_ROUTE = `${COMPANY_ROUTES}/preview-soft-delete`; // Xem trước dữ liệu sẽ bị xóa mềm (chỉ admin)
export const PREVIEW_HARD_DELETE_ROUTE = `${COMPANY_ROUTES}/preview-hard-delete`; // Xem trước dữ liệu sẽ bị xóa cứng (chỉ admin)
export const HARD_DELETE_COMPANY_ROUTE = (companyId) => `${COMPANY_ROUTES}/hard-delete-company/${companyId}`; // Xóa cứng 1 company (chỉ admin)
export const HARD_DELETE_COMPANIES_ROUTE = `${COMPANY_ROUTES}/hard-delete-companies`; // Xóa cứng nhiều company (chỉ admin)
export const PREVIEW_IMPORT_COMPANY_ROUTE = `${COMPANY_ROUTES}/preview-import-company`; // Xem trước và kiểm tra dữ liệu import từ file (chỉ admin)
export const ADD_LICENSE_ROUTE = (companyId) => `${COMPANY_ROUTES}/add_license/${companyId}`; // Thêm giấy phép cho công ty (chỉ công ty đó)
export const UPDATE_LICENSE_ROUTE = (companyId) => `${COMPANY_ROUTES}/update_license/${companyId}`; // Cập nhật giấy phép của công ty (chỉ công ty đó)
export const DELETE_LICENSE_ROUTE = (companyId) => `${COMPANY_ROUTES}/delete_license/${companyId}`; // Xóa giấy phép của công ty (chỉ công ty đó)
export const GET_LICENSE_ROUTE = (companyId) => `${COMPANY_ROUTES}/get_license/${companyId}`; // Lấy giấy phép của công ty theo ID (admin, manager, công ty đó)
export const DELETE_MULTIPLE_LICENSES_ROUTE = (companyId) => `${COMPANY_ROUTES}/delete_licenses/${companyId}`; // Xóa nhiều giấy phép của công ty (chỉ công ty đó)

// User Management Routes
export const USER_ROUTES = `${HOST}/api/users`;
export const CREATE_ACCOUNT_USER_ROUTE = `${USER_ROUTES}/create-account`; // Đăng ký user (chỉ admin)
export const UPDATE_USER_ROUTE = (userId) => `${USER_ROUTES}/update-user/${userId}`; // Cập nhật user (chỉ admin)
export const DELETE_USER_ROUTE = (userId) => `${USER_ROUTES}/delete-user/${userId}`; // Xóa user (chỉ admin)
export const DELETE_USERS_ROUTE = `${USER_ROUTES}/delete-users`; // Xóa nhiều user (chỉ admin)
export const GET_USERS_BY_ROLE_ROUTE = (role) => `${USER_ROUTES}/get-users/${role}`; // Lấy danh sách user theo role (chỉ admin)
export const GET_USER_BY_ID_ROUTE = (userId) => `${USER_ROUTES}/get-user/${userId}`; // Lấy thông tin user theo ID (chỉ admin)
export const RESTORE_USER_ROUTE = (userId) => `${USER_ROUTES}/restore-user/${userId}`; // Khôi phục user (chỉ admin)
export const UPDATE_MY_PROFILE_ROUTE = `${USER_ROUTES}/profile/update_profile`; // Người dùng tự cập nhật thông tin cá nhân
export const VERIFY_EMAIL_OTP_ROUTE = `${USER_ROUTES}/profile/verify_email_otp`; // Xác thực OTP email khi người dùng đổi email
export const GET_DELETED_USERS_ROUTE = (role) => `${USER_ROUTES}/get-deleted-users/${role}`; // Lấy tất cả user bị xóa mềm theo role với phân trang (chỉ admin)
export const HARD_DELETE_USER_ROUTE = (userId) => `${USER_ROUTES}/hard-delete-user/${userId}`; // Xóa cứng 1 user (chỉ admin)
export const HARD_DELETE_USERS_ROUTE = `${USER_ROUTES}/hard-delete-users`; // Xóa cứng nhiều user (chỉ admin)
export const RESTORE_USERS_ROUTE = `${USER_ROUTES}/restore-users`; // Khôi phục nhiều user (chỉ admin)
export const PREVIEW_SOFT_DELETE_USER_ROUTE = `${USER_ROUTES}/preview-soft-delete`; // Xem trước dữ liệu sẽ bị xóa mềm (chỉ admin)
export const PREVIEW_HARD_DELETE_USER_ROUTE = `${USER_ROUTES}/preview-hard-delete`; // Xem trước dữ liệu sẽ bị xóa cứng (chỉ admin)
export const ADMIN_RESET_PASSWORD_ROUTE = (userId) => `${USER_ROUTES}/admin-reset-password/${userId}`; // Admin đặt lại mật khẩu user (chỉ admin)

// Zone Routes
export const ZONE_ROUTES = `${HOST}/api/zones`;
export const GET_ALL_ZONES_ROUTE = `${ZONE_ROUTES}/get-all-zones`; // Lấy tất cả khu công nghiệp chưa phân trang (chỉ admin và manager)
export const GET_ZONE_ROUTE = (zoneId) => `${ZONE_ROUTES}/get-zone/${zoneId}`; // Lấy thông tin 1 khu công nghiệp (chỉ admin và manager)
export const CREATE_ZONE_ROUTE = `${ZONE_ROUTES}/add-zone`; // Tạo khu công nghiệp mới (chỉ admin)
export const UPDATE_ZONE_ROUTE = (zoneId) => `${ZONE_ROUTES}/update-zone/${zoneId}`; // Cập nhật khu công nghiệp (chỉ admin)
export const DELETE_ZONE_ROUTE = (zoneId) => `${ZONE_ROUTES}/delete-zone/${zoneId}`; // Xóa khu công nghiệp (chỉ admin)
export const DELETE_ZONES_ROUTE = `${ZONE_ROUTES}/delete-zones`; // Xóa nhiều khu công nghiệp (chỉ admin)
export const RESTORE_ZONE_ROUTE = (zoneId) => `${ZONE_ROUTES}/restore-zone/${zoneId}`; // Khôi phục khu công nghiệp (chỉ admin)
export const RESTORE_ZONES_ROUTE = `${ZONE_ROUTES}/restore-zones`; // Khôi phục nhiều khu công nghiệp (chỉ admin)
export const HARD_DELETE_ZONE_ROUTE = (zoneId) => `${ZONE_ROUTES}/hard-delete-zone/${zoneId}`; // Xóa cứng 1 khu công nghiệp (chỉ admin)
export const HARD_DELETE_ZONES_ROUTE = `${ZONE_ROUTES}/hard-delete-zones`; // Xóa cứng nhiều khu công nghiệp (chỉ admin)
export const PREVIEW_SOFT_DELETE_ZONE_ROUTE = `${ZONE_ROUTES}/preview-soft-delete`; // Xem trước dữ liệu sẽ bị xóa mềm (chỉ admin)
export const PREVIEW_HARD_DELETE_ZONE_ROUTE = `${ZONE_ROUTES}/preview-hard-delete`; // Xem trước dữ liệu sẽ bị xóa cứng (chỉ admin)

// Solution Routes
export const SOLUTION_ROUTES = `${HOST}/api/solution`;
export const GET_SOLUTION_DATA_ROUTE = `${SOLUTION_ROUTES}/get-solution-data`;
export const GET_SOLUTION_ROUTE = (solutionId) => `${SOLUTION_ROUTES}/${solutionId}`;
export const ADD_SOLUTION_ROUTE = `${SOLUTION_ROUTES}/add-solution`;
export const UPDATE_SOLUTION_ROUTE = (solutionId) => `${SOLUTION_ROUTES}/update-solution/${solutionId}`;
export const DELETE_SOLUTION_ROUTE = (solutionId) => `${SOLUTION_ROUTES}/delete-solution/${solutionId}`;

// Hashtag Routes
export const HASHTAG_ROUTES = `${HOST}/api/hashtags`;
export const GET_ALL_HASHTAGS_ROUTE = `${HASHTAG_ROUTES}/get-all-hashtags`;
export const ADD_HASHTAG_ROUTE = `${HASHTAG_ROUTES}/add-hashtag`;

// Industry Routes
export const INDUSTRY_ROUTES = `${HOST}/api/industries`;
export const GET_ALL_INDUSTRY_GROUPS_ROUTE = `${INDUSTRY_ROUTES}/get-all-groups`; // Lấy tất cả nhóm ngành
export const GET_ALL_INDUSTRIES_ROUTE = `${INDUSTRY_ROUTES}/get-all-industries`; // Lấy tất cả ngành
export const GET_INDUSTRY_GROUP_BY_ID_ROUTE = (groupId) => `${INDUSTRY_ROUTES}/get-group/${groupId}`; // Lấy nhóm ngành theo ID
export const GET_INDUSTRY_BY_ID_ROUTE = (industryId) => `${INDUSTRY_ROUTES}/get-industry/${industryId}`; // Lấy ngành theo ID
export const CREATE_INDUSTRY_GROUP_ROUTE = `${INDUSTRY_ROUTES}/add-group`; // Tạo nhóm ngành (admin)
export const CREATE_INDUSTRY_ROUTE = `${INDUSTRY_ROUTES}/add-industry`; // Tạo ngành (admin)
export const UPDATE_INDUSTRY_GROUP_ROUTE = (groupId) => `${INDUSTRY_ROUTES}/update-group/${groupId}`; // Cập nhật nhóm ngành (admin)
export const UPDATE_INDUSTRY_ROUTE = (industryId) => `${INDUSTRY_ROUTES}/update-industry/${industryId}`; // Cập nhật ngành (admin)
export const DELETE_INDUSTRY_GROUP_ROUTE = (groupId) => `${INDUSTRY_ROUTES}/delete-group/${groupId}`; // Xóa nhóm ngành (admin)
export const DELETE_INDUSTRY_ROUTE = (industryId) => `${INDUSTRY_ROUTES}/delete-industry/${industryId}`; // Xóa ngành (admin)

// Summary dashboard routes
export const GET_SUMMARY_RECORD_ROUTE = `${HOST}/api/report/get-summary-record`; // Lấy bảng ghi tổng hợp theo khoảng thời gian
export const GET_SUMMARY_RECORD_BY_PERIODKEY_ROUTE = `${HOST}/api/report/get-summary-record-by-periodkey`; // Lấy bảng ghi tổng hợp theo ngày tháng

// Emission routers
export const GET_EMISSION_DATA_ROUTER = `${HOST}/api/emission/get-emission-data`;

// Resource and waste reoutes
export const ADD_RESOURCE_WASTE_DATA_ROUTE = `${HOST}/api/resource-waste/insert-data`;//insert data resource and waste
export const UPDATE_RESOURCE_WASTE_DATA_ROUTE = `${HOST}/api/resource-waste/update-data`;//update data resource and waste
export const GET_DATA_RESOURCE_WASTE_ROUTE = `${HOST}/api/resource-waste/get-data-resource`;//get data resource or waste
export const GET_ALL_DATA_WITH_HISTOTY_ROUTE = `${HOST}/api/resource-waste/get-all-data-resource-with-history`;//get all data with history
export const IMPORT_RESOURCE_DATA_ROUTE = `${HOST}/api/resource-waste/import-data`; // Import resources from Excel

// export file routes
export const EXPORT_ROUTERS = `${HOST}/api/export`; //export file
export const EXPORT_FILE_RESOURCE_ROUTES = `${EXPORT_ROUTERS}/export-resource-waste`; //export file resource and waste data single or multiple companies
export const INIT_EXPORT_ROUTE = `${EXPORT_ROUTERS}/init`; // Initialize export
export const GET_EXPORT_STATUS_ROUTE = (exportId) => `${EXPORT_ROUTERS}/${exportId}/status`; // Get export status
export const GET_EXPORT_DOWNLOAD_ROUTE = (exportId) => `${EXPORT_ROUTERS}/${exportId}/download`; // Download completed export
export const GET_EXPORT_HISTORY_ROUTE = `${EXPORT_ROUTERS}/history`; // Get export history

//businessSysmbiosis routes
export const BUSINESS_SYMBIOSIS_ROUTES = `${HOST}/api/business-symbiosis`;
export const ADD_BUY_DEMAND_ROUTE = `${BUSINESS_SYMBIOSIS_ROUTES}/add-buy-demand`; // Thêm nhu cầu mua
export const ADD_SELL_SUPPLY_ROUTE = `${BUSINESS_SYMBIOSIS_ROUTES}/add-sell-supply`; // Thêm nhu cầu bán
export const GET_BUY_DEMANDS_ROUTE = `${BUSINESS_SYMBIOSIS_ROUTES}/buy-demand/list`; // Lấy danh sách nhu cầu mua
export const GET_SELL_SUPPLIES_ROUTE = `${BUSINESS_SYMBIOSIS_ROUTES}/sell-supply/list`; // Lấy danh sách nhu cầu bán
export const DELETE_BUY_DEMAND_ROUTE = (demandId) => `${BUSINESS_SYMBIOSIS_ROUTES}/buy-demand/delete/${demandId}`; // Xóa nhu cầu mua theo ID
export const DELETE_SELL_SUPPLY_ROUTE = (supplyId) => `${BUSINESS_SYMBIOSIS_ROUTES}/sell-supply/delete/${supplyId}`; // Xóa nhu cầu bán theo ID
export const UPDATE_BUY_DEMAND_ROUTE = (demandId) => `${BUSINESS_SYMBIOSIS_ROUTES}/buy-demand/update/${demandId}`; // Cập nhật nhu cầu mua theo ID
export const UPDATE_SELL_SUPPLY_ROUTE = (supplyId) => `${BUSINESS_SYMBIOSIS_ROUTES}/sell-supply/update/${supplyId}`; // Cập nhật nhu cầu bán theo ID
export const RECOMMENDATION_BUY_DEMAND_ROUTE = `${BUSINESS_SYMBIOSIS_ROUTES}/buy-demand/recommendations`;
export const RECOMMENDATION_SELL_SUPPLY_ROUTE = `${BUSINESS_SYMBIOSIS_ROUTES}/sell-supply/recommendations`;

// Notification Routes
export const NOTI_ROUTES = `${HOST}/api/notifications`;
export const CREATE_TEMPLATE_ROUTE = `${NOTI_ROUTES}/create-template`; // Tạo mẫu thông báo, và sẽ tự động lên lịch trình để tự động gửi, chỉ có schedule.type = MANUAL là chỉ tạo mà không lên lịch trình (chỉ admin)
export const UPDATE_TEMPLATE_ROUTE = (templateId) => `${NOTI_ROUTES}/update-template/${templateId}`; // Cập nhật mẫu thông báo (chỉ admin)
export const DISABLED_TEMPLATE_ROUTE = (templateId) => `${NOTI_ROUTES}/disable-template/${templateId}`; // vô hiệu hóa mẫu thông báo (chỉ admin)
export const GET_TEMPLATES_ROUTE = `${NOTI_ROUTES}/get-templates`; // Lấy danh sách mẫu thông báo (admin và manager) 
export const SEND_NOTIFICATION_ROUTE = `${NOTI_ROUTES}/send`; // Gửi thông báo từ 1 template đã tạo (admin và manager)
export const GET_USER_NOTIFICATIONS_ROUTE = `${NOTI_ROUTES}/my-notifications`; // Lấy thông báo của người dùng
export const MARK_NOTIFICATION_AS_READ_ROUTE = (notificationId) => `${NOTI_ROUTES}/read/${notificationId}`; // Đánh dấu thông báo đã đọc
export const PIN_NOTIFICATION_ROUTE = (notificationId) => `${NOTI_ROUTES}/pin/${notificationId}`; // Ghim thông báo (Giới hạn pin là 10)
export const UNPIN_NOTIFICATION_ROUTE = (notificationId) => `${NOTI_ROUTES}/unpin/${notificationId}`; // Bỏ ghim thông báo
export const GET_SEND_HISTORY_ROUTE = `${NOTI_ROUTES}/get-send-history`; // Lấy lịch sử gửi thông báo (chỉ admin)
export const RESTORE_TEMPLATE_ROUTE = (templateId) => `${NOTI_ROUTES}/restore-template/${templateId}`; // Khôi phục mẫu thông báo đã xóa (chỉ admin)
export const GET_TEMPLATE_BY_ID_ROUTE = (templateId) => `${NOTI_ROUTES}/get-template/${templateId}`; // Lấy mẫu thông báo theo ID (admin và manager)
export const SEND_IMMEDIATE_NOTIFICATION_ROUTE = `${NOTI_ROUTES}/send-immediate`; // Gửi thông báo ngay lập tức (chỉ admin và dành riêng cho schedule.type = IMMEDIATE)
export const HARD_DELETE_TEMPLATE_ROUTE = (templateId) => `${NOTI_ROUTES}/hard-delete-template/${templateId}`; // Xóa cứng mẫu thông báo (admin và manager)
export const GET_SEND_LOG_BY_ID_ROUTE = (logId) => `${NOTI_ROUTES}/get-send-log/${logId}`; // Lấy lịch sử gửi thông báo theo ID (chỉ admin và manager)
export const GET_SEND_LOG_SENDERS_ROUTE = `${NOTI_ROUTES}/get-send-log-senders`; // Lấy danh sách người gửi đã từng gửi thông báo
export const GET_NOTIFICATION_INSTANCE_BY_ID_ROUTE = (notificationInstanceId) => `${NOTI_ROUTES}/get-notification-instance/${notificationInstanceId}`; // Lấy instance thông báo theo ID (chỉ user đó mới xem được)
export const DELETE_NOTIFICATION_ROUTE = (notificationId) => `${NOTI_ROUTES}/delete/${notificationId}`; // Xóa 1 thông báo (user chỉ xóa được thông báo của mình)
export const DELETE_MULTIPLE_NOTIFICATIONS_ROUTE = `${NOTI_ROUTES}/delete-multiple`; // Xóa nhiều thông báo cùng lúc (user chỉ xóa được thông báo của mình)
export const REVOKE_SEND_LOGS_ROUTE = `${NOTI_ROUTES}/revoke-send-logs`; // Thu hồi thông báo theo nhiều template_ids (admin và manager)
export const ESTIMATE_RECIPIENTS_ROUTE = `${NOTI_ROUTES}/estimate-recipients`; // Ước lượng số người nhận dựa trên target (admin và manager)

// Regulation Routes
export const REGULATION_ROUTES = `${HOST}/api/regulations`;
export const GET_REGULATION_DATA_ROUTE = `${REGULATION_ROUTES}/get-regulation-data`;
export const ADD_REGULATION_ROUTE = `${REGULATION_ROUTES}/add-regulation`;
export const UPDATE_REGULATION_ROUTE = (id) => `${REGULATION_ROUTES}/update-regulation/${id}`;
export const DELETE_REGULATION_ROUTE = (id) => `${REGULATION_ROUTES}/delete-regulation/${id}`;
export const DELETE_REGULATIONS_ROUTE = `${REGULATION_ROUTES}/delete-regulations`;
export const GET_REGULATION_DETAIL_ROUTE = (id) => `${REGULATION_ROUTES}/${id}`;

// Error Log Routes
export const ERROR_LOG_ROUTES = `${HOST}/api/error-logs`;
export const CREATE_ERROR_LOG_ROUTE = `${ERROR_LOG_ROUTES}`; // Create error log
export const GET_ALL_ERROR_LOGS_ROUTE = `${ERROR_LOG_ROUTES}`; // Get all error logs
export const UPDATE_ERROR_STATUS_ROUTE = (id) => `${ERROR_LOG_ROUTES}/${id}/status`; // Update error status
export const DELETE_ERROR_LOG_ROUTE = (id) => `${ERROR_LOG_ROUTES}/${id}`; // Delete error log

// Filter thông báo user theo sender role, status và sort mới nhất, cũ nhất. (Done)
// Ghim thông báo (Giới hạn pin là 10). (Done)
// Tên template thông báo không được trùng. (Done)
// Template xóa cứng. (Done)
// Thêm giới hạn 100 thông báo 1 user. (Done)
// Không lưu template schedule.type = IMMEDIATE. (Done)
// Thêm lịch sử gửi cho role manager. (Done)

// Role manager chỉ quản lý thông tin cua khu công nghiệp và doanh nghiệp của họ.

// Enterprise List Routes (danh sách DN đã khai báo)
export const ENTERPRISE_LIST_ROUTES = `${HOST}/api/enterprise-list`;
export const GET_ENTERPRISE_LIST_ROUTE = ENTERPRISE_LIST_ROUTES; // Lấy danh sách DN đã khai báo (cursor-based)
export const GET_UNDECLARED_ENTERPRISE_LIST_ROUTE = `${ENTERPRISE_LIST_ROUTES}/undeclared`; // Lấy danh sách DN chưa khai báo

// Waste Code Lookup Routes
export const WASTE_CODE_ROUTES = `${HOST}/api/waste-codes`;
export const LOOKUP_WASTE_CODE_ROUTE = `${WASTE_CODE_ROUTES}/lookup`; // Tra cứu mã CTNH
export const SEARCH_WASTE_CODE_ROUTE = `${WASTE_CODE_ROUTES}/search`; // Tìm kiếm mã CTNH
