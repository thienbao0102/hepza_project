import { lazy } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";

const DashboardManager = lazy(() => import('@/pages/manager/ManagerDashboard'));
const Enterprise = lazy(() => import('@pages/admin/enterprises/Enterprise'));
const IndustrialSymbiosisPage = lazy(() => import('@pages/company/IndustrialSymbiosisPage'));
const ImportEnterprise = lazy(() => import('@/features/enterprises/components/ImportEnterprise'));
const ExportEnterprise = lazy(() => import("@/features/enterprises/components/ExportEnterprise"));
const CompanyDetails = lazy(() => import('@/pages/company/company_details/CompanyDetails'));
const ZoneDetail = lazy(() => import('@features/industrialzone/components/ZoneDetail'));
const IndustrialZones = lazy(() => import('@/pages/admin/industrialzone/IndustrialZones'));
const ManagerNotificationsPage = lazy(() => import('@pages/manager/notifications/ManagerNotificationsPage'));
const AdminCreateNotificationPage = lazy(() => import('@pages/admin/notifications/AdminCreateNotificationPage'));
const ProfilePage = lazy(() => import('@pages/company/ProfilePage'));

// --- USER ---
const UserPage = lazy(() => import('@pages/admin/user/UserPage'));
const CreateUser = lazy(() => import('@pages/admin/user/CreateUserPage'));
const UpdateUser = lazy(() => import('@pages/admin/user/UpdateUserPage'));
const TrashUserPage = lazy(() => import('@pages/admin/user/TrashUserPage'));

// --- ENTERPRISE FORMS ---
const FormAddEnterprise = lazy(() => import('@/features/enterprises/components/FormAddEnterprise'));
const FormUpdateEnterprise = lazy(() => import('@/features/enterprises/components/FormUpdateEnterprise'));

// --- RESOURCES ---
const ResourcesDashboardCompany = lazy(() => import('@pages/company/resources/ResourcesDashboardCompany.jsx'));
const CompanyChemicalResources = lazy(() => import('@pages/company/resources/CompanyChemicalResources.jsx'));
const CompanyWaterResources = lazy(() => import('@pages/company/resources/CompanyWaterResources.jsx'));
const CompanyCombusionResources = lazy(() => import('@pages/company/resources/CompanyCombusionResources.jsx'));
const CompanyMaterialResources = lazy(() => import('@pages/company/resources/CompanyMaterialResources.jsx'));
const CompanyElectricalResources = lazy(() => import('@pages/company/resources/CompanyElectricalResources.jsx'));
const ResourceReportForm = lazy(() => import('@features/resources/components/resourcesReportForm'));
const ResourcesReportListPage = lazy(() => import('@pages/company/resources/ReportListPage.jsx'));
const ResourceReportDetailPage = lazy(() => import('@/features/resources/components/resourcesReportDetail.jsx'));

// --- WASTE & CO2 ---
const WastesDashboardCompany = lazy(() => import('@pages/company/wastes/WastesDashboardCompany.jsx'));
const CompanySolidWastes = lazy(() => import('@pages/company/wastes/CompanySolidWastes.jsx'));
const CompanyWastewater = lazy(() => import('@pages/company/wastes/CompanyWastewater.jsx'));
const CompanyEmissions = lazy(() => import('@pages/company/wastes/CompanyEmissions.jsx'));
const Co2CompanyPage = lazy(() => import('@pages/company/Co2CompanyPage.jsx'));

// --- SOLUTIONS (Manager Components) ---
const ManagerSolutionPage = lazy(() => import('@pages/solution/SolutionPage'));
const FormCreateSolution = lazy(() => import('@/features/admin/components/solution/FormCreateSolution'));
const AllSolutionsPage = lazy(() => import('@pages/company/solution/AllSolutionsPage'));
const SolutionDetailPage = lazy(() => import('@pages/company/solution/SolutionDetailPage'));
const FormUpdateSolution = lazy(() => import('@/features/admin/components/solution/FormUpdateSolution'));


// --- Helper Component cho ZoneGuard (Giữ logic cũ của bạn) ---
const ZoneGuard = ({ user, children }) => {
    const { zoneId } = useParams();
    // Nếu chưa load user thì chờ (hoặc handle loading ở cấp cao hơn)
    if (!user) return null;
    // Nếu user không quản lý zone này -> Có thể handle redirect 403 ở đây
    // const allowed = user.zone_id?.includes(zoneId);
    return children;
};

// --- Export Function nhận vào User để xử lý logic redirect động ---
const getManagerRoutes = (user) => [
    {
        path: "/manager/overview",
        element: <DashboardManager />,
    },
    {
        path: "/manager/business",
        element: <Outlet />,
        children: [
            { index: true, element: <Enterprise /> },
            { path: "import-enterprise", element: <ImportEnterprise /> },
            { path: "create-business", element: <FormAddEnterprise /> },
            { path: "update-business/:company_id", element: <FormUpdateEnterprise /> },
        ]
    },
    {
        path: "/manager/business/:id",
        element: <CompanyDetails />,
    },
    {
        path: "/manager/industrial-symbiosis",
        element: <IndustrialSymbiosisPage />,
    },
    {
        path: "/manager/industrialZone",
        element: <Outlet />,
        children: [
            {
                index: true,
                // Logic redirect động dựa vào user
                element: <IndustrialZones />
            },
            {
                path: ":zoneId",
                element: (
                    <ZoneGuard user={user}>
                        <ZoneDetail />
                    </ZoneGuard>
                )
            },
        ]
    },
    {
        path: "/manager/resources",
        element: <Outlet />,
        children: [
            { index: true, element: <ResourcesDashboardCompany /> },
            { path: "chemicalResources", element: <CompanyChemicalResources /> },
            { path: "materialResources", element: <CompanyMaterialResources /> },
            { path: "electricalResources", element: <CompanyElectricalResources /> },
            { path: "waterResources", element: <CompanyWaterResources /> },
            { path: "combustionResources", element: <CompanyCombusionResources /> },
            { path: "resources-list", element: <ResourcesReportListPage /> },
            { path: "resources-list/:reportId", element: <ResourceReportDetailPage /> },
        ]
    },
    {
        path: "/manager/waste",
        element: <Outlet />,
        children: [
            { index: true, element: <WastesDashboardCompany /> },
            { path: "solid-waste", element: <CompanySolidWastes /> },
            { path: "wastewater", element: <CompanyWastewater /> },
            { path: "gas-waste", element: <CompanyEmissions /> },
        ]
    },
    {
        path: "/manager/CO2",
        element: <Co2CompanyPage />,
    },
    {
        path: "/manager/solutions",
        element: <Outlet />,
        children: [
            { index: true, element: <ManagerSolutionPage /> },
            { path: "create", element: <FormCreateSolution /> },
            { path: "all", element: <AllSolutionsPage /> },
            { path: ":solutionId", element: <SolutionDetailPage /> },
            { path: ":solutionId/edit", element: <FormUpdateSolution /> },
        ]
    },
    {
        path: "/manager/notifications",
        element: <ManagerNotificationsPage />,
    },
    {
        path: "/manager/notifications/create",
        element: <AdminCreateNotificationPage />,
    },
    {
        path: "/manager/notifications/detail/:id",
        element: <AdminCreateNotificationPage />,
    },
    {
        path: "/manager/notifications/edit/:id",
        element: <AdminCreateNotificationPage />,
    },
    {
        path: "/manager/user",
        element: <Outlet />,
        children: [
            { index: true, element: <UserPage /> },
            { path: "create", element: <CreateUser /> },
            { path: "update/:userId", element: <UpdateUser /> },
            { path: "trash", element: <TrashUserPage /> },
        ]
    },
    {
        path: "/manager/profile",
        element: <ProfilePage />,
    },
    {
        path: "/manager/reports",
        element: <ExportEnterprise />,
    },
];

export default getManagerRoutes;