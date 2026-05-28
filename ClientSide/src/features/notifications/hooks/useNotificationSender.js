import { useMutation, useQueryClient } from '@tanstack/react-query';
// Giả sử các handler API của bạn được import vào đây
import {
    handlerSendNotification,
    handlerSendImmediateNotification
} from '@services/notificationService';

// Key cho React Query để quản lý cache
const NOTIFICATION_QUERY_KEYS = {
    userNotifications: 'userNotifications',
    sendHistory: 'sendHistory',
};

/**
 * Hook xử lý việc GỬI THÔNG BÁO DỰA TRÊN TEMPLATE (thêm job vào queue).
 * @returns {object} Chứa mutate function, trạng thái (isLoading, isError, isSuccess), và dữ liệu trả về.
 */
export const useSendNotification = () => {
    const queryClient = useQueryClient();

    // useMutation cho hành động POST
    return useMutation({
        // Hàm gọi API thực tế
        mutationFn: ({ template_id, target }) =>
            handlerSendNotification(template_id, target),

        // Xử lý sau khi Gửi thành công
        onSuccess: (data) => {
            // Hiển thị thông báo thành công cho người dùng
            console.log("Gửi thông báo thành công:", data.message);

            // Tùy chọn: Vô hiệu hóa và làm mới các query liên quan
            queryClient.invalidateQueries({ queryKey: [NOTIFICATION_QUERY_KEYS.sendHistory] });
        },

        // Xử lý khi Gửi thất bại
        onError: (error) => {
            console.error("Lỗi khi gửi thông báo:", error.message);
            // Có thể thêm logic hiển thị toast/alert cho người dùng
        },
    });
};


/**
 * Hook xử lý việc GỬI THÔNG BÁO NGAY LẬP TỨC (Immediate).
 * @returns {object} Chứa mutate function, trạng thái (isLoading, isError, isSuccess), và dữ liệu trả về.
 */
export const useSendImmediateNotification = () => {
    const queryClient = useQueryClient();

    return useMutation({
        // Hàm gọi API thực tế
        mutationFn: (data) => handlerSendImmediateNotification(data),

        // Xử lý sau khi Gửi thành công
        onSuccess: (data) => {
            console.log("Gửi thông báo ngay lập tức thành công. Job ID:", data.jobId);

            // Tùy chọn: Vô hiệu hóa và làm mới các query liên quan (ví dụ: lịch sử gửi)
            queryClient.invalidateQueries({ queryKey: [NOTIFICATION_QUERY_KEYS.sendHistory] });
        },

        // Xử lý khi Gửi thất bại
        onError: (error) => {
            console.error("Lỗi khi gửi thông báo ngay lập tức:", error.message);
        },
    });
};