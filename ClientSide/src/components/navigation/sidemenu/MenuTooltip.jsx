import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useLayoutEffect, useMemo } from "react";
import clsx from "clsx";
import ActionButtonGroup from "@components/navigation/sidemenu/ActionButtonGroup";
import LiquidSubmenu from "@components/navigation/sidemenu/LiquidSubmenu";
import { Bell, List } from "lucide-react";

const BRAND = "#4E5BA6";
const BRAND_LIGHT = "rgba(78,91,166,0.08)";

const MenuTooltip = ({ tooltipData, className, onMouseEnter, onMouseLeave, notifications = [], userRole }) => {
    const title = tooltipData.title || "";
    const x = tooltipData.x || 0;
    const y = tooltipData.y || 0;
    const ref = useRef(null);
    const [tooltipHeight, setTooltipHeight] = useState(0);
    const children = tooltipData.tooltipMenu;
    const [isVisible, setIsVisible] = useState(tooltipData.visible);
    const [snapshot, setSnapshot] = useState({ title: "", x: 0, y: 0, children: null });
    const [hasShown, setHasShown] = useState(false);
    const [isHoverOnTooltip, setIsHoverOnTooltip] = useState(false);
    const hideTimeoutRef = useRef(null);
    const showTimeoutRef = useRef(null);

    useLayoutEffect(() => {
        if (ref.current) setTooltipHeight(ref.current.offsetHeight);
    }, [tooltipData]);

    const filterItemsByRole = (items = []) => {
        if (!Array.isArray(items)) return [];
        return items.filter(item => {
            if (!item) return false;
            if (!item.roles || item.roles.length === 0) return true;
            return userRole ? item.roles.includes(userRole) : false;
        });
    };

    const filteredChildren = useMemo(() => {
        if (!children) return null;
        const next = { ...children };

        const resolveItemHref = (item) => {
            if (!item || !item.href) return item;
            const resolvedHref = (userRole && typeof item.href === 'object' && item.href !== null)
                ? item.href[userRole]
                : item.href;
            return { ...item, href: resolvedHref };
        };

        if (next.subMenu?.items) {
            next.subMenu = {
                ...next.subMenu,
                items: filterItemsByRole(next.subMenu.items).map(resolveItemHref)
            };
        }
        if (next.section?.items) {
            next.section = {
                ...next.section,
                items: filterItemsByRole(next.section.items).map(resolveItemHref)
            };
        }
        if (next.actionButtons) {
            next.actionButtons = filterItemsByRole(next.actionButtons).map(resolveItemHref);
        }

        return next;
    }, [children, userRole]);

    useEffect(() => {
        if (tooltipData.visible) {
            if (hideTimeoutRef.current) { clearTimeout(hideTimeoutRef.current); hideTimeoutRef.current = null; }

            setSnapshot(prev => {
                if (prev.title === title && prev.x === x && prev.y === y && prev.children === filteredChildren) return prev;
                return { title, x, y, children: filteredChildren };
            });

            showTimeoutRef.current = setTimeout(() => { setIsVisible(true); setHasShown(true); }, 500);
        } else {
            if (showTimeoutRef.current) { clearTimeout(showTimeoutRef.current); showTimeoutRef.current = null; }
            setIsVisible(false);
            setHasShown(false);
        }

        return () => {
            if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        };
    }, [tooltipData.visible, x, y, title, filteredChildren]);

    const hasChildren = snapshot.children && Object.keys(snapshot.children).length > 0;

    return (
        <AnimatePresence>
            {(isVisible || isHoverOnTooltip) && (
                <motion.div
                    ref={ref}
                    className="absolute z-50"
                    animate={{
                        top: (() => {
                            const paddingBottom = 20;
                            const rawTop = hasChildren ? snapshot.y / 1.5 : snapshot.y - 20;
                            let resultTop = Math.min(rawTop, window.innerHeight - paddingBottom);
                            return Math.max(resultTop, 0);
                        })(),
                        left: snapshot.x,
                    }}
                    initial={false}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                >
                    <motion.div
                        className={clsx(
                            "text-sm text-nowrap",
                            className
                        )}
                        style={{
                            background: "rgba(255, 255, 255, 0.95)",
                            backdropFilter: "blur(12px)",
                            boxShadow: "0 10px 40px rgba(78,91,166,0.12), 0 4px 12px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(78,91,166,0.08)",
                            borderRadius: "20px",
                            padding: "8px",
                            minWidth: hasChildren ? "240px" : undefined,
                        }}
                        initial={hasShown ? false : { opacity: 0, scale: 0.88, x: -12, y: 4 }}
                        animate={{ opacity: 1, scale: 1, x: 17, y: 0 }}
                        exit={{ opacity: 0, scale: 0.88, x: -12, y: 4 }}
                        transition={{ type: "spring", stiffness: 480, damping: 30, mass: 0.8 }}
                    >
                        {hasChildren ? (
                            <div className="flex flex-col gap-2">
                                {/* Header strip */}
                                <div
                                    className="px-3 py-2.5 flex items-center gap-2 justify-center rounded-2xl"
                                    style={{
                                        // Sử dụng dải màu với độ trong suốt thấp (ví dụ: 15% - hậu tố 26 trong hex)
                                        background: `linear-gradient(135deg, #c8cffaff 0%, #c8cffaff 100%)`,
                                    }}
                                >
                                    <span className="font-bold text-[13px] tracking-wide" style={{ color: '#4E5BA6' }}>
                                        {snapshot.title}
                                    </span>
                                </div>

                                <div className="p-2 flex flex-col gap-1 rounded-2xl"
                                    style={{
                                        background: "#fff",
                                        boxShadow: "0 8px 32px rgba(78,91,166,0.13), 0 2px 8px rgba(0,0,0,0.07), inset 0 0 0 1px rgba(78,91,166,0.1)",
                                    }}
                                >
                                    {snapshot.children.subMenu && (
                                        <LiquidSubmenu
                                            title={snapshot.children.subMenu.title || []}
                                            items={snapshot.children.subMenu.items}
                                            userRole={userRole}
                                        />
                                    )}

                                    {snapshot.children.notification && (
                                        <div className="flex flex-col gap-2 pt-1">
                                            {/* Section header */}
                                            <div className="flex items-center gap-1.5 px-1">
                                                <Bell className="w-3.5 h-3.5 text-[#4E5BA6]" />
                                                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#4E5BA6]">
                                                    Thông báo chưa đọc
                                                </span>
                                            </div>

                                            <div className="flex flex-col gap-1.5">
                                                {notifications.length > 0
                                                    ? notifications.slice(0, 3).map(n => (
                                                        <Notification key={n.id} notification={n} />
                                                    ))
                                                    : (
                                                        <div className="flex flex-col items-center gap-1 py-3 text-gray-400">
                                                            <Bell className="w-5 h-5 opacity-40" />
                                                            <p className="text-xs">Không có thông báo mới</p>
                                                        </div>
                                                    )
                                                }
                                                {notifications.length > 3 && (
                                                    <p className="text-[#4E5BA6] text-xs font-medium cursor-pointer hover:underline text-center py-1">
                                                        +{notifications.length - 3} thông báo khác
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {snapshot.children.section && (
                                        <LiquidSubmenu
                                            title={snapshot.children.section.title || ""}
                                            items={snapshot.children.section.items}
                                        />
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Simple label tooltip */
                            <div className="flex items-center gap-2 px-1 rounded-2xl">

                                <span
                                    className="size-1.5 rounded-full flex-shrink-0"
                                    style={{ background: BRAND }}
                                />
                                <span className="font-medium text-gray-700">{snapshot.title}</span>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

/* ── Notification card ─────────────────────────────────────── */
const Notification = ({ notification }) => {
    const dateDeliverAt = formatISODateToVietnamese(notification?.deliveredAt);
    return (
        <div
            className="p-2.5 rounded-xl flex flex-col gap-1"
            style={{
                background: "linear-gradient(135deg, rgba(78,91,166,0.05) 0%, rgba(104,117,200,0.08) 100%)",
                border: "1px solid rgba(78,91,166,0.1)",
            }}
        >
            <p className="text-[13px] font-semibold text-gray-800 line-clamp-1 leading-snug">
                {notification.title || "Không rõ"}
            </p>
            <p
                className="text-xs text-gray-500 line-clamp-2 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: notification.body }}
            />
            <p className="text-[10px] text-[#4E5BA6]/60 font-medium mt-0.5">{dateDeliverAt || "Không rõ"}</p>
        </div>
    );
};

function formatISODateToVietnamese(isoString) {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Ngày không hợp lệ";
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

export default MenuTooltip;
