import { lazy } from "react";
import { Navigate, Outlet } from "react-router-dom";

// --- DASHBOARD ---
const DashboardAdmin = lazy(() => import('@pages/admin/dashboard/AdminDashboard'));
const ProfilePage = lazy(() => import('@pages/company/ProfilePage'));

// --- BUSINESS ---
const Enterprise = lazy(() => import('@/pages/admin/enterprises/Enterprise'));
const FormAddEnterprise = lazy(() => import('@/features/enterprises/components/FormAddEnterprise'));
const FormUpdateEnterprise = lazy(() => import('@/features/enterprises/components/FormUpdateEnterprise'));
const ImportEnterprise = lazy(() => import('@/features/enterprises/components/ImportEnterprise'));
const ExportEnterprise = lazy(() => import("@/features/enterprises/components/ExportEnterprise"));
const CompanyDetails = lazy(() => import('@/pages/company/company_details/CompanyDetails'));

// --- RESOURCES ---
const ResourcesDashboardCompany = lazy(() => import('@pages/company/resources/ResourcesDashboardCompany'));
const CompanyChemicalResources = lazy(() => import('@pages/company/resources/CompanyChemicalResources'));
const CompanyWaterResources = lazy(() => import('@pages/company/resources/CompanyWaterResources'));
const CompanyCombusionResources = lazy(() => import('@pages/company/resources/CompanyCombusionResources'));
const CompanyMaterialResources = lazy(() => import('@pages/company/resources/CompanyMaterialResources'));
const CompanyElectricalResources = lazy(() => import('@pages/company/resources/CompanyElectricalResources'));
const ResourceReportForm = lazy(() => import('@features/resources/components/resourcesReportForm'));
const ResourcesReportListPage = lazy(() => import('@pages/company/resources/ReportListPage'));
const ResourceReportDetailPage = lazy(() => import('@/features/resources/components/resourcesReportDetail'));

// --- WASTE & CO2 ---
const WastesDashboardAdmin = lazy(() => import('@pages/admin/wastes/WastesDashboardAdmin'));
const AdminSolidWastes = lazy(() => import('@pages/admin/wastes/AdminSolidWastes'));
const AdminWastewater = lazy(() => import('@pages/admin/wastes/AdminWastewater'));
const AdminGasWaste = lazy(() => import('@pages/admin/wastes/AdminGasWaste'));
const WastesDashboardCompany = lazy(() => import('@pages/company/wastes/WastesDashboardCompany'));
const CompanySolidWastes = lazy(() => import('@pages/company/wastes/CompanySolidWastes'));
const CompanyWastewater = lazy(() => import('@pages/company/wastes/CompanyWastewater'));
const CompanyEmissions = lazy(() => import('@pages/company/wastes/CompanyEmissions'));
const AdminCo2ManagementPage = lazy(() => import('@pages/company/Co2CompanyPage'));
// Các component demo placeholder
const Resource4 = () => <div className="absolute left-1/2 top-1/2 text-2xl -translate-x-1/2 -translate-y-1/2 text-center">Đang được phát triển</div>;
const Resource5 = () => <div className="absolute left-1/2 top-1/2 text-2xl -translate-x-1/2 -translate-y-1/2 text-center"> Đang được phát triển</div>;

// --- ZONES ---
const IndustrialZones = lazy(() => import('@/pages/admin/industrialzone/IndustrialZones'));
const TrashZonePage = lazy(() => import('@/pages/admin/industrialzone/TrashZonePage'));
const ZoneDetail = lazy(() => import('@features/industrialzone/components/ZoneDetail'));
const FormAddZone = lazy(() => import('@/features/industrialzone/components/FormAddZone'));
const FormUpdateZone = lazy(() => import('@/features/industrialzone/components/FormUpdateZone'));

// --- USER ---
const UserPage = lazy(() => import('@pages/admin/user/UserPage'));
const CreateUser = lazy(() => import('@pages/admin/user/CreateUserPage'));
const EditUserPage = lazy(() => import('@pages/admin/user/management/EditManagementPage'));
const UpdateUser = lazy(() => import('@pages/admin/user/UpdateUserPage'));
const EditBusinessPage = lazy(() => import('@pages/admin/user/business/EditBusinesstPage'));
const DetailManagementPage = lazy(() => import('@pages/admin/user/management/DetailManagementPage'));
const TrashUserPage = lazy(() => import('@pages/admin/user/TrashUserPage'));

// --- SOLUTIONS ---
const SolutionAdmin = lazy(() => import('@pages/solution/SolutionPage'));
const FormCreateSolution = lazy(() => import('@/features/admin/components/solution/FormCreateSolution'));
const AllSolutionsPage = lazy(() => import('@pages/company/solution/AllSolutionsPage'));
const SolutionDetailPage = lazy(() => import('@pages/company/solution/SolutionDetailPage'));
const FormUpdateSolution = lazy(() => import('@/features/admin/components/solution/FormUpdateSolution'));

// --- INDUSTRY ---
const IndustryPage = lazy(() => import('@pages/admin/industry/IndustryPage'));

// --- NOTIFICATIONS ---
const AdminNotificationsManagement = lazy(() => import('@pages/admin/notifications/AdminNotificationsManagement'));
const AdminCreateNotificationPage = lazy(() => import('@pages/admin/notifications/AdminCreateNotificationPage'));
const AdminErrorLogsPage = lazy(() => import('@pages/admin/errors/AdminErrorLogsPage'));

// --- REGULATIONS ---
const FormCreateRegulation = lazy(() => import('@features/admin/regulation/components/FormCreateRegulation'));
const FormUpdateRegulation = lazy(() => import('@features/admin/regulation/components/FormUpdateRegulation'));

const adminRoutes = [
    {
        path: "/admin/overview",
        element: <DashboardAdmin />,
    },
    {
        path: "/admin/profile",
        element: <ProfilePage />,
    },
    {
        path: "/admin/business",
        element: <Outlet />,
        children: [
            { index: true, element: <Enterprise /> },
            { path: "import-enterprise", element: <ImportEnterprise /> },
            { path: "export-enterprise", element: <ExportEnterprise /> },
            { path: "create-business", element: <FormAddEnterprise /> },
            { path: "update-business/:company_id", element: <FormUpdateEnterprise /> },
            { path: "business/:id", element: <CompanyDetails /> },
        ]
    },
    {
        path: "/admin/business/:id", // Route lẻ bên ngoài group (giữ theo code gốc của bạn)
        element: <CompanyDetails />
    },
    {
        path: "/admin/resources",
        element: <Outlet />,
        children: [
            { index: true, element: <ResourcesDashboardCompany /> },
            { path: "chemicalResources", element: <CompanyChemicalResources /> },
            { path: "materialResources", element: <CompanyMaterialResources /> },
            { path: "electricalResources", element: <CompanyElectricalResources /> },
            { path: "waterResources", element: <CompanyWaterResources /> },
            { path: "combustionResources", element: <CompanyCombusionResources /> },
            { path: "resource-form", element: <ResourceReportForm /> },
            { path: "resources-list", element: <ResourcesReportListPage /> },
            { path: "resources-list/:reportId", element: <ResourceReportDetailPage /> },
        ]
    },
    {
        path: "/admin/waste",
        element: <Outlet />,
        children: [
            { index: true, element: <WastesDashboardCompany /> },
            { path: "solid-waste", element: <CompanySolidWastes /> },
            { path: "wastewater", element: <CompanyWastewater /> },
            { path: "gas-waste", element: <CompanyEmissions /> },
        ]
    },
    {
        path: "/admin/CO2",
        element: <AdminCo2ManagementPage />,
    },
    {
        path: "/admin/industrialZone",
        element: <Outlet />,
        children: [
            { index: true, element: <IndustrialZones /> },
            { path: "trash", element: <TrashZonePage /> },
            { path: ":zone_id", element: <ZoneDetail /> },
            { path: "create-zone", element: <FormAddZone /> },
            { path: "update-zone/:zone_id", element: <FormUpdateZone /> },
        ]
    },
    {
        path: "/admin/user",
        element: <Outlet />,
        children: [
            { index: true, element: <UserPage /> },
            { path: "create", element: <CreateUser /> },
            { path: "update/:userId", element: <UpdateUser /> },
            { path: "edituser", element: <EditUserPage /> },
            { path: "editInforBusiness", element: <EditBusinessPage /> },
            { path: "management/:id", element: <DetailManagementPage /> },
            { path: "trash", element: <TrashUserPage /> },
        ]
    },
    {
        path: "/admin/solutions",
        element: <Outlet />,
        children: [
            { index: true, element: <SolutionAdmin /> },
            { path: "create", element: <FormCreateSolution /> },
            { path: "all", element: <AllSolutionsPage /> },
            { path: ":solutionId", element: <SolutionDetailPage /> },
            { path: ":solutionId/edit", element: <FormUpdateSolution /> },
        ]
    },
    {
        path: "/admin/notifications",
        element: <Outlet />,
        children: [
            { index: true, element: <AdminNotificationsManagement /> },
            { path: "create", element: <AdminCreateNotificationPage /> },
            { path: "detail/:id", element: <AdminCreateNotificationPage /> },
            { path: "edit/:id", element: <AdminCreateNotificationPage /> },
        ]
    },
    {
        path: "/admin/reports",
        element: <ExportEnterprise />,
    },
    {
        path: "/admin/regulations",
        element: <Outlet />,
        children: [
            { path: "create", element: <FormCreateRegulation /> },
            { path: ":regulationId/edit", element: <FormUpdateRegulation /> },
        ]
    },
    {
        path: "/admin/industry",
        element: <IndustryPage />,
    },
    {
        path: "/admin/error-logs",
        element: <AdminErrorLogsPage />,
    },
];

export default adminRoutes;