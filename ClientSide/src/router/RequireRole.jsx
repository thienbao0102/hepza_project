// components/auth/RequireRole.jsx
import { Navigate, useLocation } from "react-router-dom";

const RequireRole = ({ user, allowedRoles = [], isLoading = false, children }) => {
    const location = useLocation();

    // Nếu đang loading (user đang fetch từ backend)
    if (isLoading) {
        return <div className="p-4 text-gray-500">Đang kiểm tra quyền truy cập…</div>;
    }

    // Nếu chưa login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Nếu không có quyền
    if (!allowedRoles.includes(user.role)) {
        return <Navigate to="/403" state={{ from: location }} replace />;
    }

    return children;
};

export default RequireRole;


