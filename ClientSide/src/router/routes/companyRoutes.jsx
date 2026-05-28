import { lazy } from "react";
import { Navigate, Outlet } from "react-router-dom";

// --- DASHBOARD ---
// --- DASHBOARD ---
const DashboardCompany = lazy(() => import('@pages/company/CompanyDashboard'));
const MyCompany = lazy(() => import('@pages/company/company_details/MyCompany'));
const ProfilePage = lazy(() => import('@pages/company/ProfilePage'));

// --- INDUSTRIAL ZONE & SOLUTIONS ---
const IndustrialZones = lazy(() => import('@/pages/admin/industrialzone/IndustrialZones'));
const ZoneDetail = lazy(() => import('@features/industrialzone/components/ZoneDetail'));
const SolutionUser = lazy(() => import('@pages/solution/SolutionPage'));
const SolutionDetailPage = lazy(() => import('@pages/company/solution/SolutionDetailPage'));
const AllSolutionsPage = lazy(() => import('@pages/company/solution/AllSolutionsPage'));

const IndustrialSymbiosisPage = lazy(() => import('@pages/company/IndustrialSymbiosisPage'));
const MarketBuyPage = lazy(() => import('@pages/company/symbiosis/MarketBuyPage'));
const MarketSellPage = lazy(() => import('@pages/company/symbiosis/MarketSellPage'));
const ExportEnterprise = lazy(() => import("@/features/enterprises/components/ExportEnterprise"));

// --- FEATURES ---
const Analytics = () => <div className="absolute left-1/2 top-1/2 text-2xl -translate-x-1/2 -translate-y-1/2 text-center">Đang được phát triển</div>;
const Co2CompanyPage = lazy(() => import('@pages/company/Co2CompanyPage.jsx'));

// --- RESOURCES ---
const ResourcesDashboardCompany = lazy(() => import('@pages/company/resources/ResourcesDashboardCompany'));
const CompanyChemicalResources = lazy(() => import('@pages/company/resources/CompanyChemicalResources.jsx'));
const CompanyMaterialResources = lazy(() => import('@pages/company/resources/CompanyMaterialResources.jsx'));
const CompanyElectricalResources = lazy(() => import('@pages/company/resources/CompanyElectricalResources.jsx'));
const CompanyWaterResources = lazy(() => import('@pages/company/resources/CompanyWaterResources.jsx'));
const CompanyCombusionResources = lazy(() => import('@pages/company/resources/CompanyCombusionResources.jsx'));
const ResourceReportForm = lazy(() => import('@features/resources/components/resourcesReportForm'));
const ResourcesReportListPage = lazy(() => import('@pages/company/resources/ReportListPage.jsx'));
const ResourceReportDetailPage = lazy(() => import('@/features/resources/components/resourcesReportDetail.jsx'));
const ImportResource = lazy(() => import('@features/resources/components/ImportResource'));

// --- WASTE ---
const WastesDashboardCompany = lazy(() => import('@pages/company/wastes/WastesDashboardCompany'));
const CompanySolidWastes = lazy(() => import('@pages/company/wastes/CompanySolidWastes'));
const CompanyWastewater = lazy(() => import('@pages/company/wastes/CompanyWastewater'));
const CompanyEmissions = lazy(() => import('@pages/company/wastes/CompanyEmissions'));
const Resource5 = () => <div className="absolute left-1/2 top-1/2 text-2xl -translate-x-1/2 -translate-y-1/2 text-center"> Đang được phát triển</div>;

// --- NOTIFICATIONS ---
const NotificationsPage = lazy(() => import('@pages/notifications/NotificationsPage'));
const NotificationDetailPage = lazy(() => import('@pages/notifications/NotificationDetailPage'));

const companyRoutes = [
    {
        path: "/overview",
        element: <DashboardCompany />,
    },
    {
        path: "/my-information",
        element: <Outlet />,
        children: [
            { index: true, element: <Navigate to="business" replace /> },
            { path: "account", element: <Navigate to="/company/profile" replace /> },
            { path: "business", element: <MyCompany /> },
            { path: "subaccounts", element: <MyCompany /> },
        ]
    },
    {
        path: "/company/profile",
        element: <ProfilePage />,
    },
    {
        path: "/business/cong-sinh-doanh-nghiep",
        element: <IndustrialSymbiosisPage />,
    },
    {
        path: "/business/symbiosis/market-buy",
        element: <MarketBuyPage />,
    },
    {
        path: "/business/symbiosis/market-sell",
        element: <MarketSellPage />,
    },
    {
        path: "/industrialZone",
        element: <Outlet />,
        children: [
            { index: true, element: <IndustrialZones /> },
            { path: ":zoneId", element: <ZoneDetail /> },
        ]
    },
    {
        path: "/solutions",
        element: <Outlet />,
        children: [
            { index: true, element: <SolutionUser /> },
            { path: ":solutionId", element: <SolutionDetailPage /> },
            { path: "all", element: <AllSolutionsPage /> },
        ]
    },
    {
        path: "/analytics",
        element: <Analytics />,
    },
    {
        path: "/reports",
        element: <ExportEnterprise />,
    },
    {
        path: "/resources",
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
            { path: "import-resources", element: <ImportResource /> },
        ]
    },
    {
        path: "/waste",
        element: <Outlet />,
        children: [
            { index: true, element: <WastesDashboardCompany /> },
            { path: "solid-waste", element: <CompanySolidWastes /> },
            { path: "wastewater", element: <CompanyWastewater /> },
            { path: "gas-waste", element: <CompanyEmissions /> },
            { path: "hazardous-waste", element: <Resource5 /> },
        ]
    },
    {
        path: "/CO2",
        element: <Co2CompanyPage />,
    },
    {
        path: "/company/notifications",
        element: <Outlet />,
        children: [
            { index: true, element: <NotificationsPage /> },
            { path: ":notificationId", element: <NotificationDetailPage /> },
        ]
    },
];

export default companyRoutes;
