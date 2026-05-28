class VersionConflictError extends Error {
    constructor(message = 'Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại.') {
        super(message);
        this.name = 'VersionConflictError';
        this.statusCode = 409;
        this.code = 'VERSION_CONFLICT';
    }
}

class MissingVersionError extends Error {
    constructor(message = 'Thiếu phiên bản dữ liệu hiện tại. Vui lòng tải lại trang trước khi lưu.') {
        super(message);
        this.name = 'MissingVersionError';
        this.statusCode = 409;
        this.code = 'VERSION_REQUIRED';
    }
}

class StateConflictError extends Error {
    constructor(message = 'Bản ghi này vừa được người khác thay đổi trạng thái. Vui lòng tải lại dữ liệu trước khi tiếp tục.') {
        super(message);
        this.name = 'StateConflictError';
        this.statusCode = 409;
        this.code = 'STATE_CONFLICT';
    }
}

module.exports = { VersionConflictError, MissingVersionError, StateConflictError };
