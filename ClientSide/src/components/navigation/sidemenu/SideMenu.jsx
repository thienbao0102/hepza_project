import React from "react";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronDown } from "lucide-react";
import clsx from "clsx";
import packageJson from '../../../../package.json';
import { useAuth } from "@app/providers/auth/AuthProvider";
import MenuTooltip from "@components/navigation/sidemenu/MenuTooltip";
import { Star, User, LogOut, Settings2 } from "lucide-react";
import ConfirmationModal from "@components/common/ConfirmationModal";
import { useUserNotifications } from "@features/notifications/hooks/useUserNotifications";
import { useSocketListener } from "@/hooks/useSocketListener";

import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from '@lib/queryClient';
import { useSideMenuLayout } from "./useSideMenuLayout";
import toast from "@/utils/toast";
import FeedbackDrawer from "@components/common/FeedbackDrawer";
import { BugOutlined } from "@ant-design/icons";
import { useOnlineCount } from "@features/dashboard/hooks/useOnlineCount";
import OnlineUsersModal from "@features/dashboard/components/OnlineUsersModal";
import logoHepza from "../../../assets/LogoHepza.png";

/* ─── Framer Motion Variants ──────────────────────────────────── */
const labelVariants = {
    hidden: { opacity: 0, x: -8, width: 0 },
    visible: {
        opacity: 1,
        x: 0,
        width: "auto",
        transition: { type: "spring", stiffness: 380, damping: 28, mass: 0.8 }
    },
    exit: {
        opacity: 0,
        x: -8,
        width: 0,
        transition: { duration: 0.15, ease: "easeIn" }
    },
};

const badgeVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
        scale: 1,
        opacity: 1,
        transition: { type: "spring", stiffness: 500, damping: 28 }
    },
    exit: { scale: 0, opacity: 0, transition: { duration: 0.12 } },
};

const submenuVariants = {
    hidden: { height: 0, opacity: 0 },
    visible: {
        height: "auto",
        opacity: 1,
        transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] }
    },
    exit: {
        height: 0,
        opacity: 0,
        transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] }
    },
};

const profilePopupVariants = {
    hidden: { opacity: 0, x: -16, scale: 0.94, pointerEvents: "none" },
    visible: {
        opacity: 1,
        x: 0,
        scale: 1,
        pointerEvents: "auto",
        transition: { type: "spring", stiffness: 420, damping: 28, mass: 0.9 }
    },
    exit: {
        opacity: 0,
        x: -16,
        scale: 0.94,
        pointerEvents: "none",
        transition: { duration: 0.18, ease: "easeIn" }
    },
};

/* ─── Component ──────────────────────────────────── */
const SideMenu = ({ user, navItems }) => {
    const queryClient = useQueryClient();
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(() => {
        const saved = localStorage.getItem("sidebar-expanded");
        return saved !== null ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        localStorage.setItem("sidebar-expanded", JSON.stringify(isExpanded));
    }, [isExpanded]);

    const [openSubMenu, setOpenSubMenu] = useState(null);

    const location = useLocation();

    const [tooltipData, setTooltipData] = useState({ isMenuTooltip: false, visible: false, title: "", x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);
    const hideTimeoutRef = useRef(null);
    const hoveredRectRef = useRef(null);
    const hoveredTitleRef = useRef(null);
    const sideMenuRef = useRef(null);
    const processedIdsRef = useRef(new Set());

    const [isProfileClick, setIsProfileClick] = useState(false);

    const navigate = useNavigate();
    const { logout } = useAuth();

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Online Tracking states — UI hidden, keeping logic for potential re-enable
    // const isAdmin = user?.role === 'admin'; // already used elsewhere
    // const onlineCount = useOnlineCount({ enabled: isAdmin });
    // const visibleOnlineCount = Math.max(0, onlineCount - 1);
    // const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);

    const allowedNavItems = useMemo(() => {
        return navItems.filter(item => !item.roles || (user && item.roles.includes(user.role)));
    }, [navItems, user]);

    // Tìm item đang active dựa trên URL (ưu tiên khớp dài nhất)
    const activeItemId = useMemo(() => {
        let bestId = null;
        let longestMatch = -1;
        const userRole = user?.role;

        const resolve = (href) => (userRole && typeof href === 'object' && href !== null) ? href[userRole] : href;

        allowedNavItems.forEach(item => {
            const itemHref = resolve(item.href);
            // Kiểm tra link chính
            if (itemHref && itemHref !== "/" && location.pathname.startsWith(itemHref)) {
                if (itemHref.length > longestMatch) {
                    longestMatch = itemHref.length;
                    bestId = item.id;
                }
            }
            // Kiểm tra các trang con
            item.subPages?.forEach(sub => {
                const subHref = resolve(sub.href);
                if (subHref && location.pathname.startsWith(subHref)) {
                    if (subHref.length > longestMatch) {
                        longestMatch = subHref.length;
                        bestId = item.id;
                    }
                }
            });
        });

        // Case đặc biệt cho trang chủ
        if (!bestId && (location.pathname === "/overview" || location.pathname === "/admin/overview" || location.pathname === "/manager/overview")) {
            const homeItem = allowedNavItems.find(it => it.id === "nav_it_01");
            if (homeItem) bestId = homeItem.id;
        }

        return bestId;
    }, [allowedNavItems, location.pathname, user?.role]);

    // Khi hover vào nav item
    const handleNavMouseEnter = (title, rect, offset = 0) => {
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

        hoveredRectRef.current = rect;
        hoveredTitleRef.current = title;

        setTooltipData({
            visible: true,
            title,
            x: rect.left + rect.width + 8 + offset || 0,
            y: rect.top + rect.height / 2,
            tooltipMenu: allowedNavItems.find(item => item.name === title)?.tooltipMenu,
        });
    };

    const handleNavMouseLeave = () => {
        hideTimeoutRef.current = setTimeout(() => {
            setTooltipData(prev => ({ ...prev, visible: false }));
        }, 500);
    };

    const handleTooltipEnter = () => {
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
    const handleTooltipLeave = () => {
        hideTimeoutRef.current = setTimeout(() => {
            setTooltipData(prev => ({ ...prev, visible: false }));
        }, 500);
    };

    const { sideMenuWidth, setSideMenuWidth, isMobile, closeMobile } = useSideMenuLayout();

    // Force expanded mode on mobile (drawer always shows labels)
    useEffect(() => {
        if (isMobile && !isExpanded) {
            setIsExpanded(true);
        }
    }, [isMobile]);

    // Auto-close drawer on route change (mobile only)
    useEffect(() => {
        if (isMobile) {
            closeMobile();
        }
    }, [location.pathname]);

    useEffect(() => {
        const offset = isExpanded ? 116 : 0;

        if (tooltipData.visible && hoveredRectRef.current && hoveredTitleRef.current) {
            const rect = hoveredRectRef.current;
            const title = hoveredTitleRef.current;

            setTooltipData(prev => ({
                ...prev,
                offset,
                x: rect.left + rect.width + 8 + offset,
                y: rect.top + rect.height / 2,
                tooltipMenu: allowedNavItems.find(item => item.name === title)?.tooltipMenu,
            }));
        }
    }, [isExpanded]);

    const [targetExpandWidth, setTargetExpandWidth] = useState("200px");
    const [targetUnExpandWidth, setTargetUnExpandWidth] = useState("80px");

    useEffect(() => {
        const updateWidth = () => {
            const w = window.innerWidth;
            if (w < 640) setTargetExpandWidth("50vw");         // Mobile
            else if (w < 1024) setTargetExpandWidth("20vw");   // Tablet
            else setTargetExpandWidth("225px");                // Desktop
        };

        updateWidth();
        window.addEventListener("resize", updateWidth);
        return () => window.removeEventListener("resize", updateWidth);
    }, []);

    useEffect(() => {
        let newWidth;
        if (isExpanded) {
            newWidth = targetExpandWidth;
        } else {
            newWidth = targetUnExpandWidth;
        }

        setSideMenuWidth(newWidth);

    }, [isExpanded, targetExpandWidth, targetUnExpandWidth, setSideMenuWidth]);

    const filters = useMemo(() => ({
        page: 1,
        limit: 5,
        status: "delivered",
        sort: "newest",
        ...(user?.role === 'manager' ? { sender_role: 'admin' } : {}),
    }), [user?.role]);

    const NOTIFICATION_QUERY_KEY = queryKeys.notifications.userList(filters);

    const handleNewNotification = useCallback((data) => {
        if (data?.notification_I_id && processedIdsRef.current.has(data.notification_I_id)) return;

        if (data?.notification_I_id) {
            processedIdsRef.current.add(data.notification_I_id);
            setTimeout(() => {
                processedIdsRef.current.delete(data.notification_I_id);
            }, 5000);
        }

        queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY });

        const stripHtml = (html) => {
            if (!html) return "";
            const tmp = document.createElement("DIV");
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || "";
        };

        const rawBody = data?.body || '';
        const plainBody = stripHtml(rawBody);
        const displayBody = plainBody.length > 50 ? `${plainBody.substring(0, 50)}...` : plainBody;

        const isWarning = data?.label === 'Cảnh báo' || data?.type === 'Warning';
        const sender = data?.sender;
        const toastMethod = isWarning ? toast.warning : toast.info;

        toastMethod(data?.title || 'Thông báo mới', displayBody || 'Bạn vừa nhận được một thông báo mới.', {
            duration: 8000,
            sender: sender,
            actionText: 'Xem ngay',
            onActionClick: () => {
                const role = user?.role;
                if (role === 'company') navigate('/company/notifications');
                else if (role) navigate(`/${role}/notifications`);
            }
        });
    }, [queryClient, NOTIFICATION_QUERY_KEY, user?.role, navigate]);

    useSocketListener("newNotification", handleNewNotification, []);

    const { data: notificationData } = useUserNotifications(filters, {
        queryOptions: {
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
        }
    });

    const totalNotifications = notificationData?.totalItems ?? 0;

    const notificationCounts = useMemo(() => ({
        companyNotificationsCount: user?.role === 'company' ? totalNotifications : 0,
        adminNotificationsCount: user?.role === 'admin' ? totalNotifications : 0,
        managerNotificationsCount: user?.role === 'manager' ? totalNotifications : 0,
    }), [totalNotifications, user?.role]);

    return (
        <motion.div
            animate={{ width: isExpanded ? targetExpandWidth : targetUnExpandWidth }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="relative flex flex-col h-full text-black bg-white group"// border-r border-gray-200 shadow-md"
        >
            {/* ── Logo ──────────────────────────────────────────── */}
            <div className="relative flex items-center justify-center h-[64px] px-3"
                style={{ borderBottom: "1px solid rgba(78,91,166,0.08)" }}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="flex-shrink-0 flex items-center justify-center size-11 p-0 aspect-square rounded-lg bg-[#4E5BA6]/10">
                        <img
                            src={logoHepza}
                            alt="Logo"
                            className="size-full p-1"
                        />
                    </div>
                    <AnimatePresence initial={false}>
                        {isExpanded && (
                            <motion.h1
                                key="logo-text"
                                initial={{ opacity: 0, x: -10, width: 0 }}
                                animate={{ opacity: 1, x: 0, width: "auto", transition: { type: "spring", stiffness: 380, damping: 28 } }}
                                exit={{ opacity: 0, x: -10, width: 0, transition: { duration: 0.15 } }}
                                className="text-lg font-bold text-[#4E5BA6] whitespace-nowrap overflow-hidden"
                                style={{ letterSpacing: "0.06em" }}
                            >
                                HEPZA
                            </motion.h1>
                        )}
                    </AnimatePresence>
                </div>

                {/* Toggle button — hidden on mobile (drawer uses hamburger instead) */}
                {!isMobile && (
                    <motion.button
                        className="absolute -right-3 flex items-center justify-center size-6 rounded-full bg-[#4E5BA6] shadow-md cursor-pointer z-10 border-2 border-white"
                        onClick={() => setIsExpanded(!isExpanded)}
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.92 }}
                        transition={{ type: "spring", stiffness: 400, damping: 22 }}
                        onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const tooltipText = isExpanded ? "Thu gọn" : "Mở rộng";
                            handleNavMouseEnter(tooltipText, rect);
                        }}
                        onMouseLeave={handleNavMouseLeave}
                    >
                        <motion.div
                            animate={{ rotate: isExpanded ? 0 : 180 }}
                            transition={{ type: "spring", stiffness: 340, damping: 26 }}
                        >
                            <ChevronLeft className="size-3.5" color="#FFFFFF" strokeWidth={2.5} />
                        </motion.div>
                    </motion.button>
                )}
            </div>

            {/* ── Tooltip ────────────────────────────────────── */}
            <MenuTooltip
                tooltipData={tooltipData}
                className={""}
                userRole={user?.role}
                onMouseEnter={handleTooltipEnter}
                onMouseLeave={handleTooltipLeave}
                notifications={notificationData?.notifications}
            />

            {/* ── Nav Items ─────────────────────────────────────── */}
            <nav className="relative flex-1 px-2.5 py-3 overflow-hidden overflow-y-auto">
                <ul className="relative flex flex-col gap-0.5">
                    {allowedNavItems.map((item) => {
                        const userRole = user?.role;
                        const resolveHref = (href) => (userRole && typeof href === 'object' && href !== null) ? href[userRole] : href;
                        const itemHref = resolveHref(item.href); // Get href by user role

                        const isActive = activeItemId === item.id;
                        const isSubItemActive = item.subPages?.some((subItem) => {
                            const subHref = resolveHref(subItem.href);
                            return subHref && location.pathname.startsWith(subHref);
                        });
                        const hasChildren = item.subPages && item.subPages.length > 0;
                        const Icon = item.icon;

                        const badgeKey = typeof item.badgeName === 'object' && item.badgeName !== null
                            ? item.badgeName[userRole]
                            : item.badgeName;
                        const badgeCount = badgeKey ? notificationCounts[badgeKey] : 0;
                        const showBadge = badgeCount >= 1;

                        return (
                            <div key={item.id}>
                                <li
                                    key={item.name}
                                    data-tooltip-id={item.name}
                                    className="relative"
                                    onMouseEnter={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setIsHovering(true);
                                        handleNavMouseEnter(item.name, rect);
                                    }}
                                    onMouseLeave={handleNavMouseLeave}
                                >
                                    {/* Active background */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeBackground"
                                            className="absolute inset-0 rounded-xl z-0"
                                            style={{
                                                background: "linear-gradient(135deg, #4E5BA6 20%, #6875C8 80%)",
                                                boxShadow: "0 2px 12px rgba(78,91,166,0.28)",
                                            }}
                                            initial={false}
                                            transition={{ type: "spring", stiffness: 420, damping: 32 }}
                                        />
                                    )}

                                    {/* Collapsed sub-item dot indicator */}
                                    {isSubItemActive && !isExpanded && (
                                        <motion.span
                                            className="absolute w-1 h-1 rounded-full bg-[#4E5BA6] -bottom-0.5 left-1/2 -translate-x-1/2"
                                            initial={{ opacity: 0, scaleX: 0 }}
                                            animate={{ opacity: 1, scaleX: 1 }}
                                            exit={{ opacity: 0, scaleX: 0 }}
                                            transition={{ duration: 0.2 }}
                                        />
                                    )}

                                    <div className="flex z-0">
                                        <Link
                                            to={resolveHref(item.href)}
                                            className={clsx(
                                                "flex items-center p-2.5 gap-2.5 rounded-xl transition-colors w-full relative z-10",
                                                isActive
                                                    ? "text-white"
                                                    : "text-gray-500 hover:bg-[#4E5BA6]/8 hover:text-[#4E5BA6]",
                                                !isExpanded
                                                    ? "justify-center"
                                                    : "justify-start",
                                            )}
                                        >
                                            <Icon
                                                className={clsx(
                                                    "flex-shrink-0 h-[18px] aspect-square",
                                                    isActive ? "drop-shadow-sm" : ""
                                                )}
                                                strokeWidth={isActive ? 2.2 : 1.8}
                                            />

                                            {/* Badge (collapsed) */}
                                            <AnimatePresence>
                                                {!isExpanded && showBadge && (
                                                    <motion.span
                                                        key="badge-dot"
                                                        variants={badgeVariants}
                                                        initial="hidden"
                                                        animate="visible"
                                                        exit="exit"
                                                        className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white"
                                                    />
                                                )}
                                            </AnimatePresence>

                                            {/* Label */}
                                            <AnimatePresence initial={false}>
                                                {isExpanded && (
                                                    <motion.span
                                                        key="label"
                                                        variants={labelVariants}
                                                        initial="hidden"
                                                        animate="visible"
                                                        exit="exit"
                                                        className="whitespace-nowrap text-sm font-medium leading-none overflow-hidden"
                                                    >
                                                        {item.name}
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>

                                            {/* Badge (expanded) */}
                                            <AnimatePresence>
                                                {isExpanded && showBadge && (
                                                    <motion.span
                                                        key="badge-count"
                                                        variants={badgeVariants}
                                                        initial="hidden"
                                                        animate="visible"
                                                        exit="exit"
                                                        className="ml-auto min-w-[20px] h-5 px-1 rounded-full text-center flex justify-center items-center bg-red-500 text-white font-semibold text-[11px]"
                                                    >
                                                        {badgeCount > 99 ? '99+' : badgeCount}
                                                    </motion.span>
                                                )}
                                            </AnimatePresence>
                                        </Link>

                                        {/* Submenu toggle */}
                                        {hasChildren && isExpanded && (
                                            <button
                                                onClick={() => {
                                                    setOpenSubMenu(openSubMenu === item.name ? null : item.name);
                                                }}
                                                className={clsx(
                                                    "shrink-0 cursor-pointer p-2 rounded-xl absolute right-0 z-10 flex items-center justify-center h-full transition-colors",
                                                    isActive
                                                        ? "text-white/80 hover:text-white"
                                                        : "text-gray-400 hover:text-[#4E5BA6]"
                                                )}
                                            >
                                                <motion.div
                                                    animate={{ rotate: openSubMenu === item.name ? 180 : 0 }}
                                                    transition={{ type: "spring", stiffness: 380, damping: 26 }}
                                                >
                                                    <ChevronDown className="w-4 h-4" />
                                                </motion.div>
                                            </button>
                                        )}
                                    </div>
                                </li>

                                {/* Children (submenu) */}
                                <AnimatePresence initial={false}>
                                    {openSubMenu === item.name && isExpanded && (
                                        <motion.ul
                                            key="submenu"
                                            variants={submenuVariants}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            className="flex flex-col gap-0.5 mt-0.5 pl-3 overflow-hidden relative"
                                        >
                                            {/* Left accent line */}
                                            {/* <div className="absolute left-[10px] top-0 bottom-0 w-px bg-[#4E5BA6]/15 rounded-full" /> */}

                                            {item.subPages.map((child) => {
                                                const isChildActive = location.pathname === resolveHref(child.href);
                                                return (
                                                    <li key={child.name} className="relative">
                                                        {isChildActive && (
                                                            <motion.div
                                                                layoutId="childActiveBackground"
                                                                className="absolute inset-0 rounded-lg z-0"
                                                                style={{
                                                                    background: "linear-gradient(90deg, #EEF0FB 0%, #E8EAFF 100%)",
                                                                }}
                                                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                            />
                                                        )}
                                                        <Link
                                                            to={resolveHref(child.href)}
                                                            className={clsx(
                                                                "block px-3 py-2 pl-4 rounded-lg text-sm relative z-10 font-medium transition-colors",
                                                                isChildActive
                                                                    ? "text-[#4E5BA6]"
                                                                    : "text-gray-500 hover:bg-[#4E5BA6]/6 hover:text-[#4E5BA6]"
                                                            )}
                                                        >
                                                            {child.name}
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </motion.ul>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </ul>
            </nav>

            {/* ── User / Profile ────────────────────────────────── */}

            {/* Online tracking UI — hidden to save resources
            {isAdmin && (
            <div className="px-3 pb-2 pt-1 border-gray-200/50" style={{ borderTop: "1px solid rgba(78,91,166,0.08)", marginTop: "auto" }}>
                <div
                    onClick={() => { if (visibleOnlineCount > 0) setIsOnlineModalOpen(true); }}
                    className={clsx(
                        "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors shadow-sm border",
                        visibleOnlineCount > 0 ? "cursor-pointer border-emerald-100 bg-emerald-50 hover:bg-emerald-100/80" : "cursor-default border-gray-200 bg-gray-100/80",
                        isExpanded ? "" : "justify-center mx-auto"
                    )}
                >
                    <div className="relative flex shrink-0 h-2 w-2">
                        {visibleOnlineCount > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                        <span className={clsx("relative inline-flex rounded-full h-2 w-2", visibleOnlineCount > 0 ? "bg-emerald-500" : "bg-gray-400")}></span>
                    </div>

                    <AnimatePresence initial={false}>
                        {isExpanded && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                className="flex min-w-0 flex-1 overflow-hidden whitespace-nowrap items-center justify-between pointer-events-none"
                            >
                                <span className={clsx("text-[11px] font-semibold tracking-wide", visibleOnlineCount > 0 ? "text-emerald-800" : "text-gray-600")}>
                                    TRỰC TUYẾN
                                </span>
                                <span className={clsx("text-xs font-bold bg-white px-2 py-0.5 rounded-full ring-1", visibleOnlineCount > 0 ? "text-emerald-700 ring-emerald-200" : "text-gray-500 ring-gray-200")}>
                                    {visibleOnlineCount}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            )}
            */}

            {/* Profile Block */}
            <div
                className="relative flex flex-col items-center justify-center gap-1.5 px-2.5 pb-3 pt-1 cursor-pointer select-none"
                onClick={() => setIsProfileClick(!isProfileClick)}
            >
                {/* Profile popup */}
                <AnimatePresence>
                    {isProfileClick && (
                        <motion.div
                            key="profile-popup"
                            variants={profilePopupVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="absolute left-[calc(100%+12px)] bottom-3 w-68 rounded-2xl overflow-hidden z-50"
                            style={{
                                background: "rgba(255,255,255,0.92)",
                                backdropFilter: "blur(14px)",
                                WebkitBackdropFilter: "blur(14px)",
                                boxShadow: "0 8px 32px rgba(78,91,166,0.14), 0 2px 8px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.8)",
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* User info header */}
                            <div className="flex items-center gap-3 px-4 py-3.5"
                                style={{ borderBottom: "1px solid rgba(78,91,166,0.08)" }}
                            >
                                <div className="relative flex-shrink-0">
                                    <img
                                        src={user?.avatar || "/default-avatar.png"}
                                        alt="User Avatar"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = "/default-avatar.png";
                                        }}
                                        className="object-cover w-10 h-10 rounded-full ring-2 ring-[#4E5BA6]/15"
                                    />
                                    <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate">
                                        {user?.full_name || "Unknown name"}
                                    </p>
                                    <p className="text-xs text-gray-400 truncate">
                                        {user?.email || "Unknown email"}
                                    </p>
                                </div>
                            </div>

                            {/* Menu links */}
                            <div className="flex flex-col gap-0.5 p-2">
                                <PopupLink
                                    to={
                                        user?.role === 'admin' || user?.role === 'manager'
                                            ? `/${user?.role}/profile`
                                            : '/company/profile'
                                    }
                                    icon={<User className="w-4 h-4" />}
                                    label="Trang cá nhân"
                                />

                                <PopupButton
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsFeedbackOpen(true);
                                        setIsProfileClick(false);
                                    }}
                                    icon={<BugOutlined className="text-base leading-none" />}
                                    label="Báo cáo sự cố"
                                />
                            </div>

                            {/* Logout */}
                            <div className="px-2 pb-2"
                                style={{ borderTop: "1px solid rgba(78,91,166,0.08)", paddingTop: "8px" }}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowLogoutConfirm(true);
                                    }}
                                    className="flex items-center gap-2.5 px-3 py-2 w-full text-left text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors duration-200 text-sm font-medium"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Đăng xuất</span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* User avatar + info */}
                <motion.div
                    className="flex items-center w-full gap-2.5 px-2 py-2 rounded-xl transition-colors hover:bg-[#4E5BA6]/6"
                    whileTap={{ scale: 0.97 }}
                >
                    <div className="relative flex-shrink-0">
                        <div className="flex items-center justify-center size-8 overflow-hidden rounded-full ring-2 ring-[#4E5BA6]/20">
                            <img
                                src={user?.avatar || "/default-avatar.png"}
                                alt="User Avatar"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "/default-avatar.png";
                                }}
                                className="object-cover w-full h-full"
                            />
                        </div>
                        <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-400 ring-1.5 ring-white" />
                    </div>

                    <AnimatePresence initial={false}>
                        {isExpanded && (
                            <motion.div
                                key="user-info"
                                initial={{ opacity: 0, x: -8, width: 0 }}
                                animate={{ opacity: 1, x: 0, width: "auto", transition: { type: "spring", stiffness: 380, damping: 28 } }}
                                exit={{ opacity: 0, x: -8, width: 0, transition: { duration: 0.15 } }}
                                className="flex flex-col min-w-0 overflow-hidden"
                            >
                                <p className="text-xs font-semibold text-gray-700 truncate">{user?.full_name || "Unknown name"}</p>
                                <p className="text-[11px] text-gray-400 truncate">{user?.email || "Unknown email"}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Version */}
                <div className="flex items-center gap-1 text-[10px] text-gray-300 leading-none">
                    <AnimatePresence initial={false}>
                        {isExpanded && (
                            <motion.span
                                key="ver-label"
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                className="overflow-hidden whitespace-nowrap"
                            >
                                v
                            </motion.span>
                        )}
                    </AnimatePresence>
                    <span>{packageJson.version}</span>
                </div>
            </div>

            <ConfirmationModal
                open={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={() => {
                    logout();
                    setShowLogoutConfirm(false);
                }}
                title="Xác nhận đăng xuất"
                content="Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?"
                confirmText="Đăng xuất"
                cancelText="Hủy bỏ"
            />
            <FeedbackDrawer open={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />

            {/* Online modal — hidden
            {isAdmin && (
                <OnlineUsersModal isOpen={isOnlineModalOpen} onClose={() => setIsOnlineModalOpen(false)} />
            )}
            */}
        </motion.div>
    );
};

/* ─── Small reusable popup items ─────────────────────────────── */
const PopupLink = ({ to, icon, label }) => (
    <Link
        to={to}
        className="flex items-center gap-2.5 px-3 py-2 text-gray-600 rounded-xl hover:bg-[#4E5BA6]/8 hover:text-[#4E5BA6] transition-colors duration-200 text-sm font-medium"
    >
        {icon}
        <span>{label}</span>
    </Link>
);

const PopupButton = ({ onClick, icon, label }) => (
    <button
        onClick={onClick}
        className="flex items-center gap-2.5 px-3 py-2 w-full text-left text-gray-600 rounded-xl hover:bg-[#4E5BA6]/8 hover:text-[#4E5BA6] transition-colors duration-200 text-sm font-medium"
    >
        {icon}
        <span>{label}</span>
    </button>
);

export default React.memo(SideMenu, (prevProps, nextProps) => {
    if (prevProps.user !== nextProps.user) return false;
    if (prevProps.navItems !== nextProps.navItems) return false;
    return true;
});
