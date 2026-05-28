const commonConflict = {
  VERSION_CONFLICT: {
    title: 'Dữ liệu đã thay đổi',
    description: 'Bản ghi này vừa được người khác cập nhật. Vui lòng tải lại dữ liệu rồi thử lại.',
  },
  STATE_CONFLICT: {
    title: 'Trạng thái đã thay đổi',
    description: 'Bản ghi này vừa được người khác thay đổi trạng thái. Vui lòng tải lại dữ liệu rồi thử lại.',
  },
};

export const ERROR_MESSAGE_MAP = {
  CREATE_USER: {
    DUPLICATE_EMAIL: {
      title: 'Tạo tài khoản không thành công',
      description: 'Email này đã được sử dụng cho tài khoản khác.',
    },
    DUPLICATE_PHONE: {
      title: 'Tạo tài khoản không thành công',
      description: 'Số điện thoại này đã được sử dụng.',
    },
    DUPLICATE_USER_COMPANY: {
      title: 'Tạo tài khoản không thành công',
      description: 'Doanh nghiệp này đã có tài khoản quản lý.',
    },
    DUPLICATE_MANAGER_ZONE: {
      title: 'Tạo tài khoản không thành công',
      description: 'Khu công nghiệp này đã có quản lý.',
    },
    MISSING_ZONE: {
      title: 'Tạo tài khoản không thành công',
      description: 'Vui lòng chọn khu công nghiệp hoặc khu chế xuất.',
    },
    INTERNAL_ERROR: {
      title: 'Tạo tài khoản không thành công',
      description: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
    },
  },

  UPDATE_USER: {
    ...commonConflict,
    DUPLICATE_EMAIL: {
      title: 'Cập nhật tài khoản không thành công',
      description: 'Email này đã được sử dụng cho tài khoản khác.',
    },
    DUPLICATE_PHONE: {
      title: 'Cập nhật tài khoản không thành công',
      description: 'Số điện thoại này đã được sử dụng.',
    },
    DUPLICATE_USER_COMPANY: {
      title: 'Cập nhật tài khoản không thành công',
      description: 'Doanh nghiệp này đã có tài khoản quản lý.',
    },
    DUPLICATE_MANAGER_ZONE: {
      title: 'Cập nhật tài khoản không thành công',
      description: 'Khu công nghiệp này đã có quản lý.',
    },
    MISSING_ZONE: {
      title: 'Cập nhật tài khoản không thành công',
      description: 'Vui lòng chọn khu công nghiệp.',
    },
    MISSING_COMPANY: {
      title: 'Cập nhật tài khoản không thành công',
      description: 'Vui lòng chọn doanh nghiệp cho tài khoản công ty.',
    },
    USER_NOT_FOUND: {
      title: 'Cập nhật tài khoản không thành công',
      description: 'Không tìm thấy tài khoản cần cập nhật.',
    },
    INTERNAL_ERROR: {
      title: 'Cập nhật tài khoản không thành công',
      description: 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.',
    },
  },

  GET_COMPANY: {
    COMPANY_NOT_FOUND: {
      title: 'Không tìm thấy doanh nghiệp',
      description: 'Doanh nghiệp này không còn tồn tại hoặc đã bị xóa.',
    },
    INTERNAL_ERROR: {
      title: 'Lỗi tải doanh nghiệp',
      description: 'Không thể tải dữ liệu doanh nghiệp. Vui lòng thử lại sau.',
    },
  },

  CREATE_COMPANY: {
    DUPLICATE_COMPANY_NAME: {
      title: 'Thêm doanh nghiệp không thành công',
      description: 'Tên doanh nghiệp đã tồn tại trong hệ thống.',
    },
    DUPLICATE_EMAIL: {
      title: 'Thêm doanh nghiệp không thành công',
      description: 'Email người đại diện đã được sử dụng.',
    },
    DUPLICATE_PHONE: {
      title: 'Thêm doanh nghiệp không thành công',
      description: 'Số điện thoại người đại diện đã được sử dụng.',
    },
    MISSING_REPRESENTATIVE_ACCOUNT: {
      title: 'Thiếu tài khoản đại diện',
      description: 'Doanh nghiệp mới phải có đủ họ tên, email và số điện thoại của tài khoản đại diện.',
    },
    MISSING_ZONE: {
      title: 'Thêm doanh nghiệp không thành công',
      description: 'Vui lòng chọn khu công nghiệp.',
    },
    MISSING_INDUSTRY_GROUP: {
      title: 'Thêm doanh nghiệp không thành công',
      description: 'Vui lòng chọn ít nhất một nhóm ngành.',
    },
    MISSING_INDUSTRY: {
      title: 'Thêm doanh nghiệp không thành công',
      description: 'Vui lòng chọn ít nhất một ngành nghề.',
    },
    MISSING_COMPANY_TYPE: {
      title: 'Thêm doanh nghiệp không thành công',
      description: 'Vui lòng chọn loại hình doanh nghiệp.',
    },
    INTERNAL_ERROR: {
      title: 'Thêm doanh nghiệp không thành công',
      description: 'Đã xảy ra lỗi khi thêm doanh nghiệp. Vui lòng thử lại sau.',
    },
  },

  UPDATE_COMPANY: {
    ...commonConflict,
    DUPLICATE_COMPANY_NAME: {
      title: 'Cập nhật doanh nghiệp không thành công',
      description: 'Tên doanh nghiệp đã tồn tại trong hệ thống.',
    },
    COMPANY_NOT_FOUND: {
      title: 'Cập nhật doanh nghiệp không thành công',
      description: 'Không tìm thấy doanh nghiệp cần cập nhật.',
    },
    MISSING_ZONE: {
      title: 'Cập nhật doanh nghiệp không thành công',
      description: 'Vui lòng chọn khu công nghiệp.',
    },
    MISSING_COMPANY_TYPE: {
      title: 'Cập nhật doanh nghiệp không thành công',
      description: 'Vui lòng chọn loại hình doanh nghiệp.',
    },
    MISSING_INDUSTRY_GROUP: {
      title: 'Cập nhật doanh nghiệp không thành công',
      description: 'Vui lòng chọn ít nhất một nhóm ngành.',
    },
    MISSING_INDUSTRY: {
      title: 'Cập nhật doanh nghiệp không thành công',
      description: 'Vui lòng chọn ít nhất một ngành nghề.',
    },
    MISSING_ADDRESS: {
      title: 'Cập nhật doanh nghiệp không thành công',
      description: 'Vui lòng nhập địa chỉ doanh nghiệp.',
    },
    MISSING_FOUNDED_YEAR: {
      title: 'Cập nhật doanh nghiệp không thành công',
      description: 'Vui lòng chọn năm thành lập.',
    },
    MISSING_TOTAL_WORKERS: {
      title: 'Cập nhật doanh nghiệp không thành công',
      description: 'Vui lòng nhập số lượng nhân viên.',
    },
    INVALID_DATA: {
      title: 'Dữ liệu không hợp lệ',
      description: 'Vui lòng kiểm tra lại các trường thông tin vừa nhập.',
    },
    INTERNAL_ERROR: {
      title: 'Cập nhật doanh nghiệp không thành công',
      description: 'Đã xảy ra lỗi khi cập nhật doanh nghiệp. Vui lòng thử lại sau.',
    },
  },

  CREATE_LICENSE: {
    DUPLICATE_LICENSE_ID: {
      title: 'Thêm giấy phép không thành công',
      description: 'Số giấy phép này đã tồn tại trong hệ thống.',
    },
    MISSING_LICENSE_NAME: {
      title: 'Thêm giấy phép không thành công',
      description: 'Vui lòng nhập tên giấy phép.',
    },
    MISSING_LICENSE_ID: {
      title: 'Thêm giấy phép không thành công',
      description: 'Vui lòng nhập số giấy phép.',
    },
    INTERNAL_ERROR: {
      title: 'Thêm giấy phép không thành công',
      description: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    },
  },

  UPDATE_LICENSE: {
    DUPLICATE_LICENSE_ID: {
      title: 'Cập nhật giấy phép không thành công',
      description: 'Số giấy phép này đã trùng với một giấy phép khác.',
    },
    LICENSE_NOT_FOUND: {
      title: 'Cập nhật giấy phép không thành công',
      description: 'Không tìm thấy giấy phép cần cập nhật.',
    },
    INTERNAL_ERROR: {
      title: 'Cập nhật giấy phép không thành công',
      description: 'Đã xảy ra lỗi khi cập nhật giấy phép.',
    },
  },

  DELETE_LICENSE: {
    LICENSE_NOT_FOUND: {
      title: 'Xóa giấy phép không thành công',
      description: 'Giấy phép này không còn tồn tại.',
    },
    INTERNAL_ERROR: {
      title: 'Xóa giấy phép không thành công',
      description: 'Đã xảy ra lỗi khi xóa giấy phép.',
    },
  },

  CREATE_ZONE: {
    DUPLICATE_ZONE_NAME: {
      title: 'Thêm KCN không thành công',
      description: 'Tên khu công nghiệp này đã tồn tại trong hệ thống.',
    },
    MISSING_ZONE_NAME: {
      title: 'Thêm KCN không thành công',
      description: 'Vui lòng nhập tên khu công nghiệp.',
    },
    MISSING_LOCATION: {
      title: 'Thêm KCN không thành công',
      description: 'Vui lòng nhập địa chỉ hoặc vị trí của khu công nghiệp.',
    },
    MISSING_FOUNDED_YEAR: {
      title: 'Thêm KCN không thành công',
      description: 'Vui lòng chọn năm thành lập.',
    },
    MANAGER_NOT_FOUND: {
      title: 'Thêm KCN không thành công',
      description: 'Tài khoản quản lý được chọn không tồn tại hoặc đã bị khóa.',
    },
    INTERNAL_ERROR: {
      title: 'Thêm KCN không thành công',
      description: 'Vui lòng kiểm tra lại thông tin và thử lại.',
    },
  },

  UPDATE_ZONE: {
    ...commonConflict,
    DUPLICATE_ZONE_NAME: {
      title: 'Cập nhật KCN không thành công',
      description: 'Tên khu công nghiệp này đã được sử dụng.',
    },
    ZONE_NOT_FOUND: {
      title: 'Cập nhật KCN không thành công',
      description: 'Không tìm thấy thông tin khu công nghiệp.',
    },
    MISSING_LOCATION: {
      title: 'Cập nhật KCN không thành công',
      description: 'Vui lòng nhập địa chỉ hoặc vị trí.',
    },
    MISSING_FOUNDED_YEAR: {
      title: 'Cập nhật KCN không thành công',
      description: 'Vui lòng chọn năm thành lập.',
    },
    NO_CHANGES: {
      title: 'Không có thay đổi',
      description: 'Bạn chưa thay đổi thông tin nào nên không cần cập nhật.',
    },
    INTERNAL_ERROR: {
      title: 'Cập nhật KCN không thành công',
      description: 'Đã xảy ra lỗi khi cập nhật thông tin.',
    },
  },

  CREATE_SOLUTION: {
    DUPLICATE_SOLUTION_NAME: {
      title: 'Thêm giải pháp không thành công',
      description: 'Tên giải pháp này đã tồn tại trong hệ thống.',
    },
    MISSING_SOLUTION_NAME: {
      title: 'Thêm giải pháp không thành công',
      description: 'Vui lòng nhập tên giải pháp.',
    },
    MISSING_GROUP_SOLUTION: {
      title: 'Thêm giải pháp không thành công',
      description: 'Vui lòng chọn nhóm giải pháp.',
    },
    INVALID_TAGS: {
      title: 'Thêm giải pháp không thành công',
      description: 'Một số hashtag không hợp lệ hoặc không tồn tại.',
    },
    INVALID_LINK: {
      title: 'Liên kết không hợp lệ',
      description: 'URL tham khảo phải bắt đầu bằng http:// hoặc https://.',
    },
    INVALID_DATA: {
      title: 'Dữ liệu không hợp lệ',
      description: 'Vui lòng kiểm tra lại các trường thông tin đã nhập.',
    },
    INTERNAL_ERROR: {
      title: 'Thêm giải pháp không thành công',
      description: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
    },
  },

  UPDATE_SOLUTION: {
    ...commonConflict,
    DUPLICATE_SOLUTION_NAME: {
      title: 'Cập nhật giải pháp không thành công',
      description: 'Tên giải pháp này đã được sử dụng.',
    },
    SOLUTION_NOT_FOUND: {
      title: 'Cập nhật giải pháp không thành công',
      description: 'Giải pháp này không tồn tại hoặc đã bị xóa.',
    },
    MISSING_SOLUTION_NAME: {
      title: 'Cập nhật giải pháp không thành công',
      description: 'Vui lòng nhập tên giải pháp.',
    },
    MISSING_GROUP_SOLUTION: {
      title: 'Cập nhật giải pháp không thành công',
      description: 'Vui lòng chọn nhóm giải pháp.',
    },
    INVALID_TAGS: {
      title: 'Cập nhật giải pháp không thành công',
      description: 'Một số hashtag không hợp lệ hoặc không tồn tại.',
    },
    INVALID_LINK: {
      title: 'Liên kết không hợp lệ',
      description: 'URL tham khảo phải bắt đầu bằng http:// hoặc https://.',
    },
    INVALID_DATA: {
      title: 'Dữ liệu không hợp lệ',
      description: 'Vui lòng kiểm tra lại các trường thông tin đã nhập.',
    },
    INTERNAL_ERROR: {
      title: 'Cập nhật giải pháp không thành công',
      description: 'Đã xảy ra lỗi khi cập nhật giải pháp.',
    },
  },

  DELETE_SOLUTION: {
    SOLUTION_NOT_FOUND: {
      title: 'Xóa giải pháp không thành công',
      description: 'Giải pháp không tồn tại hoặc đã bị xóa.',
    },
    INTERNAL_ERROR: {
      title: 'Xóa giải pháp không thành công',
      description: 'Đã xảy ra lỗi khi xóa giải pháp. Vui lòng thử lại sau.',
    },
  },

  GET_SOLUTION: {
    SOLUTION_NOT_FOUND: {
      title: 'Giải pháp không tồn tại',
      description: 'Không tìm thấy thông tin giải pháp cần hiển thị.',
    },
    INTERNAL_ERROR: {
      title: 'Tải thông tin giải pháp không thành công',
      description: 'Không thể tải thông tin giải pháp. Vui lòng thử lại sau.',
    },
  },

  COMMON: {
    ...commonConflict,
    INTERNAL_ERROR: {
      title: 'Lỗi',
      description: 'Đã xảy ra lỗi. Vui lòng thử lại sau.',
    },
  },

  SEND_NOTIFICATION: {
    MISSING_TITLE: {
      title: 'Gửi thông báo không thành công',
      description: 'Vui lòng nhập tiêu đề thông báo.',
    },
    MISSING_BODY: {
      title: 'Gửi thông báo không thành công',
      description: 'Vui lòng nhập nội dung thông báo.',
    },
    TOO_MANY_REQUESTS: {
      title: 'Gửi thông báo quá nhanh',
      description: 'Vui lòng đợi khoảng 10 giây rồi thử lại.',
    },
    INTERNAL_ERROR: {
      title: 'Gửi thông báo không thành công',
      description: 'Không thể gửi thông báo. Vui lòng thử lại sau.',
    },
  },

  CREATE_TEMPLATE: {
    DUPLICATE_SOLUTION_NAME: {
      title: 'Lưu mẫu thông báo không thành công',
      description: 'Tên mẫu đã tồn tại trong hệ thống.',
    },
    INTERNAL_ERROR: {
      title: 'Lưu mẫu thông báo không thành công',
      description: 'Không thể lưu mẫu thông báo. Vui lòng thử lại sau.',
    },
  },

  CREATE_RESOURCE: {
    INVALID_DATA: {
      title: 'Gửi dữ liệu không thành công',
      description: 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.',
    },
    INTERNAL_ERROR: {
      title: 'Gửi dữ liệu không thành công',
      description: 'Không thể gửi dữ liệu. Vui lòng thử lại sau.',
    },
  },

  UPDATE_RESOURCE: {
    ...commonConflict,
    INTERNAL_ERROR: {
      title: 'Lưu dữ liệu không thành công',
      description: 'Không thể lưu dữ liệu. Vui lòng thử lại sau.',
    },
  },
};
