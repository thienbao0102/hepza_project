import React, { Suspense, lazy, useEffect } from "react";
import { Navigate, useRoutes, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@app/providers/auth/AuthProvider";
import { useNetworkStatus } from "@hooks/useNetworkStatus";

// --- COMPONENTS & LAYOUTS ---
import LoadingSpinner from "@components/ui/LoadingSpinner.jsx";
import MainLayout from "@/components/common/Header/Header";
import { HeaderProvider } from "@/components/common/Header/HeaderContext";
import SideMenu from '@components/navigation/sidemenu/SideMenu';
import navItems from "@components/navigation/sidemenu/listNavItems";
import { useSideMenuLayout } from "@/components/navigation/sidemenu/useSideMenuLayout";
import { AnimatePresence, motion } from "framer-motion";

// --- ROUTE CONFIGS (Import các file đã tách) ---
import adminRoutes from "./routes/adminRoutes";
import companyRoutes from "./routes/companyRoutes";
import getManagerRoutes from "./routes/managerRoutes"; // Lưu ý: Đây là hàm trả về mảng

// --- AUTH PAGES (Lazy Load) ---
const LoginPage = lazy(() => import('@pages/auth/LoginPage'));
const ForgetPage = lazy(() => import('@pages/auth/ForgetPage'));
const ResetPasswordInit = lazy(() => import('@pages/auth/ResetPasswordInit'));
const ResetPasswordPage = lazy(() => import('@pages/auth/ResetPasswordPage'));
const ChangePasswordPage = lazy(() => import('@pages/auth/ChangePasswordPage'));
const CheckEmailPage = lazy(() => import('@pages/auth/CheckEmailPage'));
const PasswordResetSuccessPage = lazy(() => import('@pages/auth/PasswordResetSuccessPage'));

// --- ERROR PAGES ---
const NotFoundPage = lazy(() => import('@pages/error/NotFoundPage'));
const ForbbidenPage = lazy(() => import('@pages/error/ForbbidenPage'));
const ErrorServerPage = lazy(() => import('@pages/error/ErrorServerPage'));
const DisconnectNetworkPage = lazy(() => import('@pages/error/DisconnectNetworkPage'));

// --- HELPER COMPONENTS ---

const Loading = () => (
    <div className="flex items-center justify-center h-screen">
        <LoadingSpinner fullscreen tip="Đang tải hệ thống..." />
    </div>
);

const NetworkStatusHandler = () => {
    const isOnline = useNetworkStatus();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isOnline && location.pathname !== '/network-error') {
            navigate('/network-error', { replace: true, state: { from: location } });
        } else if (isOnline && location.pathname === '/network-error') {
            const from = location.state?.from?.pathname || '/';
            navigate(from, { replace: true });
        }
    }, [isOnline, location, navigate]);

    return null;
};

// Component bảo vệ route theo Role
const RequireRole = lazy(() => import("@router/RequireRole"));

// --- LAYOUTS ---

const PublicLayout = () => (
    <Suspense fallback={<Loading />}>
        <Outlet />
    </Suspense>
);

const ProtectedLayout = ({ user, loading }) => {
    const { isMobile, isMobileOpen, closeMobile } = useSideMenuLayout();

    if (loading) {
        return <Loading />;
    }

    // Lọc menu cho company
    const filteredNavItems = user?.role === 'company'
        ? navItems.filter(item => item.id !== 'nav_it_02')
        : navItems;

    return (
        <HeaderProvider>
            <div className="flex h-screen relative overflow-hidden">
                {/* ── Backdrop overlay (mobile only) ── */}
                <AnimatePresence>
                    {isMobile && isMobileOpen && (
                        <motion.div
                            key="sidebar-backdrop"
                            className="fixed inset-0 z-40 bg-black/40"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={closeMobile}
                        />
                    )}
                </AnimatePresence>

                {/* ── Sidebar ── */}
                <div
                    className={
                        isMobile
                            ? `fixed inset-y-0 left-0 z-50 h-full border-r border-gray-200 shadow-md w-fit transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`
                            : "sticky top-0 h-full border-r border-gray-200 shadow-md w-fit z-100"
                    }
                >
                    <Suspense fallback={null}>
                        <SideMenu navItems={filteredNavItems} user={user} />
                    </Suspense>
                </div>

                {/* ── Main content ── */}
                <div className="flex-1 overflow-y-auto h-full bg-gray-50 grow min-w-0">
                    <MainLayout>
                        <Suspense fallback={<Loading />}>
                            <Outlet />
                        </Suspense>
                    </MainLayout>
                </div>
            </div>
        </HeaderProvider>
    );
};

// --- MAIN ROUTER ---

const AppRouter = () => {
    const { user, loading } = useAuth();

    // Định nghĩa Role Groups
    const ROLES = {
        ADMIN: ["admin"],
        COMPANY: ["company"],
        MANAGER: ["manager"],
    };

    // Hàm Helper: Tự động bọc RoleBasedRoutes cho danh sách route
    const wrapRoutesWithRole = (routes, allowedRoles) => {
        return routes.map(route => ({
            ...route,
            element: (
                <Suspense fallback={<Loading />}>
                    <RequireRole user={user} allowedRoles={allowedRoles} isLoading={loading}>
                        {route.element}
                    </RequireRole>
                </Suspense>
            ),
            // Đệ quy nếu có children
            children: route.children ? wrapRoutesWithRole(route.children, allowedRoles) : undefined
        }));
    };

    // Cấu hình Routing tổng
    const routesConfig = [
        // 1. PUBLIC ROUTES (Login, Forgot Pass...)
        {
            element: <PublicLayout />,
            children: [
                { path: "/login", element: <LoginPage /> },
                { path: "/forgot-password", element: <ForgetPage /> },
                { path: "/reset-password", element: <ResetPasswordPage /> },
                { path: "/reset-password/init", element: <ResetPasswordInit /> },
                { path: "/check-email", element: <CheckEmailPage /> },
                { path: "/password-reset-success", element: <PasswordResetSuccessPage /> },
                {
                    path: "/change-password",
                    element: user?.firstLogin ? <ChangePasswordPage /> : <Navigate to="/" replace />
                },
            ]
        },

        // 2. PROTECTED ROUTES (Dashboard, Features...)
        {
            element: <ProtectedLayout user={user} loading={loading} />,
            children: [
                // Spread (...) các mảng route con đã được bọc Role
                ...wrapRoutesWithRole(adminRoutes, ROLES.ADMIN),
                ...wrapRoutesWithRole(companyRoutes, ROLES.COMPANY),
                ...wrapRoutesWithRole(getManagerRoutes(user), ROLES.MANAGER), // Manager cần truyền user
            ]
        },

        // 3. ERROR & SYSTEM ROUTES
        { path: "/403", element: <ForbbidenPage /> },
        { path: "/network-error", element: <DisconnectNetworkPage /> },
        { path: "/server-error", element: <ErrorServerPage /> },

        // 4. ROOT REDIRECT (Logic đã fix lỗi undefined)
        {
            path: "/",
            element: (!user || !user.role)
                ? <Navigate to="/login" replace />
                : <Navigate to={user.role === 'company' ? '/overview' : `/${user.role}/overview`} replace />
        },

        // 5. 404 CATCH ALL
        { path: "*", element: <NotFoundPage /> }
    ];

    const element = useRoutes(routesConfig);

    // Xử lý loading toàn cục (tránh render sai route khi chưa load xong auth)
    if (loading) {
        return <Loading />;
    }

    return (
        <>
            <NetworkStatusHandler />
            {element}
        </>
    );
};

export default AppRouter;
