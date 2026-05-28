import {
    Home,
    Building2,
    Factory,
    Earth,
    Users,
    Lightbulb,
    LayoutDashboard,
    Trash,
    Sprout,
    Bell,
    Share2,
    Bug,
    ClipboardList,
    Layers,
} from "lucide-react";

/** Danh sách các item trong navigation của side menu - danh sách theo role */
const navItems = [
    {
        id: "nav_it_01",
        name: "Tổng quan",
        icon: Home,
        roles: ["admin", "company", "manager"],
        href: {
            admin: "/admin/overview",
            company: "/overview",
            manager: "/manager/overview"
        },
    },
    {
        id: "nav_it_02",
        name: "Doanh nghiệp",
        icon: Building2,
        roles: ["admin", "manager"],
        href: {
            admin: "/admin/business",
            manager: "/manager/business"
        },
    },
    {
        id: "nav_it_03",
        name: "Cộng sinh",
        icon: Share2,
        roles: ["company"],
        href: {
            company: "/business/cong-sinh-doanh-nghiep",
        }
    },
    {
        id: "nav_it_04",
        name: "Khu công nghiệp",
        icon: Factory,
        roles: ["admin", "company", "manager"],
        href: {
            admin: "/admin/industrialZone",
            company: "/industrialZone",
            manager: "/manager/industrialZone"
        }
    },
    {
        id: "nav_it_05",
        name: "Bản ghi và Khai báo",
        icon: ClipboardList,
        roles: ["company"],
        href: {
            company: "/resources/resources-list",
        },
        subPages: [
            { name: "Khai báo tài nguyên và Chất thải", href: "/resources/resource-form" },
            { name: "Danh sách bản ghi", href: "/resources/resources-list" },
        ],
        tooltipMenu: {
            subMenu: {
                items: [
                    { id: 1, label: "Khai báo tài nguyên và Chất thải", href: "/resources/resource-form" },
                    { id: 2, label: "Danh sách bản ghi", href: "/resources/resources-list" },
                ]
            }
        }
    },
    {
        id: "nav_it_06",
        name: "Tài nguyên",
        icon: Earth,
        roles: ["admin", "company", "manager"],
        href: {
            admin: "/admin/resources",
            company: "/resources",
            manager: "/manager/resources"
        },
        subPages: [
            {
                name: "Nguyên vật liệu",
                href: {
                    admin: "/admin/resources/materialResources",
                    company: "/resources/materialResources",
                    manager: "/manager/resources/materialResources"
                }
            },
            {
                name: "Điện",
                href: {
                    admin: "/admin/resources/electricalResources",
                    company: "/resources/electricalResources",
                    manager: "/manager/resources/electricalResources"
                }
            },
            {
                name: "Nước",
                href: {
                    admin: "/admin/resources/waterResources",
                    company: "/resources/waterResources",
                    manager: "/manager/resources/waterResources"
                }
            },
            {
                name: "Hóa chất",
                href: {
                    admin: "/admin/resources/chemicalResources",
                    company: "/resources/chemicalResources",
                    manager: "/manager/resources/chemicalResources"
                }
            },
            {
                name: "Chất đốt",
                href: {
                    admin: "/admin/resources/combustionResources",
                    company: "/resources/combustionResources",
                    manager: "/manager/resources/combustionResources"
                }
            },
        ],
        tooltipMenu: {
            actionButtons: [
                { id: "a", label: "Chức năng 1", href: "/action1", roles: ["manager"] },
                { id: "b", label: "Chức năng 2", href: "/action2", roles: ["manager"] },
                { id: "c", label: "Chức năng 3", href: "/action3", roles: ["manager"] },
            ],
            subMenu: {
                items: [
                    {
                        id: 1, label: "Nguyên vật liệu",
                        href: { admin: "/admin/resources/materialResources", company: "/resources/materialResources", manager: "/manager/resources/materialResources" }
                    },
                    {
                        id: 2, label: "Điện",
                        href: { admin: "/admin/resources/electricalResources", company: "/resources/electricalResources", manager: "/manager/resources/electricalResources" }
                    },
                    {
                        id: 3, label: "Nước",
                        href: { admin: "/admin/resources/waterResources", company: "/resources/waterResources", manager: "/manager/resources/waterResources" }
                    },
                    {
                        id: 4, label: "Hóa chất",
                        href: { admin: "/admin/resources/chemicalResources", company: "/resources/chemicalResources", manager: "/manager/resources/chemicalResources" }
                    },
                    {
                        id: 5, label: "Chất đốt",
                        href: { admin: "/admin/resources/combustionResources", company: "/resources/combustionResources", manager: "/manager/resources/combustionResources" }
                    },
                ]
            },
        }
    },
    {
        id: "nav_it_07",
        name: "Chất thải",
        icon: Trash,
        roles: ["admin", "company", "manager"],
        href: {
            admin: "/admin/waste",
            company: "/waste",
            manager: "/manager/waste"
        },
        subPages: [
            {
                name: "Chất thải rắn",
                href: { admin: "/admin/waste/solid-waste", company: "/waste/solid-waste", manager: "/manager/waste/solid-waste" }
            },
            {
                name: "Nước thải",
                href: { admin: "/admin/waste/wastewater", company: "/waste/wastewater", manager: "/manager/waste/wastewater" }
            },
            {
                name: "Khí thải",
                href: { admin: "/admin/waste/gas-waste", company: "/waste/gas-waste", manager: "/manager/waste/gas-waste" }
            },
        ],
        tooltipMenu: {
            subMenu: {
                items: [
                    {
                        id: 1, label: "Chất thải rắn",
                        href: { admin: "/admin/waste/solid-waste", company: "/waste/solid-waste", manager: "/manager/waste/solid-waste" }
                    },
                    {
                        id: 2, label: "Nước thải",
                        href: { admin: "/admin/waste/wastewater", company: "/waste/wastewater", manager: "/manager/waste/wastewater" }
                    },
                    {
                        id: 3, label: "Khí thải",
                        href: { admin: "/admin/waste/gas-waste", company: "/waste/gas-waste", manager: "/manager/waste/gas-waste" }
                    },
                ]
            },
        }
    },
    {
        id: "nav_it_08",
        name: "Phát thải CO₂",
        icon: Sprout,
        roles: ["admin", "company", "manager"],
        href: {
            admin: "/admin/CO2",
            company: "/CO2",
            manager: "/manager/CO2"
        }
    },
    {
        id: "nav_it_09",
        name: "Người dùng",
        icon: Users,
        roles: ["admin", "manager"],
        href: {
            admin: "/admin/user",
            manager: "/manager/user",
        }
    },
    {
        id: "nav_it_10",
        name: "Nghị định và Giải pháp",
        icon: Lightbulb,
        roles: ["admin", "company", "manager"],
        href: {
            admin: "/admin/solutions",
            company: "/solutions",
            manager: "/manager/solutions"
        },
    },
    {
        id: "nav_it_11",
        name: "Báo cáo",
        icon: LayoutDashboard,
        roles: ["admin", "company", "manager"],
        href: {
            admin: "/admin/reports",
            company: "/reports",
            manager: "/manager/reports"
        }
    },
    {
        id: "nav_it_12",
        name: "Thông báo",
        icon: Bell,
        roles: ["admin", "company", "manager"],
        href: {
            admin: "/admin/notifications",
            company: "/company/notifications",
            manager: "/manager/notifications"
        },
        badgeName: {
            admin: "adminNotificationsCount",
            company: "companyNotificationsCount",
            manager: "managerNotificationsCount",
        },
        tooltipMenu: {
            notification: {},
            section: {
                items: [
                    { id: 1, label: "Đi đến trang thông báo", href: "/company/notifications", roles: ["company"] },
                    { id: 2, label: "Đi đến trang thông báo", href: "/admin/notifications", roles: ["admin"] },
                    { id: 3, label: "Đi đến trang thông báo", href: "/manager/notifications", roles: ["manager"] },
                ]
            }
        }
    },
    {
        id: "nav_it_04b",
        name: "Ngành nghề",
        icon: Layers,
        roles: ["admin"],
        href: {
            admin: "/admin/industry",
        },
    },
    {
        id: "nav_it_13",
        name: "Báo cáo lỗi",
        icon: Bug,
        roles: ["admin"],
        href: {
            admin: "/admin/error-logs",
        },
    },

];

export default navItems;
