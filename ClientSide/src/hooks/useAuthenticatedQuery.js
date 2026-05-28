import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@app/providers/auth/AuthProvider';

/**
 * Hook tùy chỉnh bao bọc useQuery của TanStack Query để tự động
 * vô hiệu hóa các truy vấn khi người dùng chưa được xác thực.
 *
 * @param {Object} queryOptions - Các tùy chọn cho truy vấn, tương tự useQuery.
 * @returns Kết quả từ hook useQuery.
 */
export const useAuthenticatedQuery = (queryOptions) => {
  const { isAuthenticated } = useAuth();

  const { enabled, ...restOptions } = queryOptions;

  // Truy vấn chỉ được kích hoạt khi người dùng đã xác thực VÀ điều kiện 'enabled' ban đầu được đáp ứng.
  // Nếu 'enabled' không được cung cấp, nó mặc định là true, vì vậy truy vấn chỉ phụ thuộc vào isAuthenticated.
  const isQueryEnabled = isAuthenticated && (enabled ?? true);

  return useQuery({
    ...restOptions,
    enabled: isQueryEnabled,
  });
};
