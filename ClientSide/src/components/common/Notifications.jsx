import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, X, Info } from "lucide-react";
import { useSideMenuLayout } from "../navigation/sidemenu/useSideMenuLayout";

const typeStyles = {
    success: {
        icon: (
            <CheckCircle2 className="w-8 h-8 flex-shrink-0 text-[#00AF58] stroke-[3]" />
        ),
        hoverBg: "hover:bg-[#00AF58]/8",
        text: "text-[#00AF58]",
    },
    error: {
        icon: <X className="w-8 h-8 flex-shrink-0 text-[#AF0000] stroke-[3]" />,
        hoverBg: "hover:bg-[#AF0000]/8 ",
        text: "text-[#AF0000]",
    },
    warning: {
        icon: (
            <AlertTriangle className="w-8 h-8 flex-shrink-0 text-[#DD8800] stroke-[2.5]" />
        ),
        bgClass: "bg-amber-50/95 backdrop-blur-[4px] border border-amber-300 shadow-[0_4px_20px_rgba(217,119,6,0.15)]",
        hoverBg: "hover:bg-amber-100/90",
        text: "text-[#DD8800]",
    },
    info: {
        icon: <Info className="w-8 h-8 flex-shrink-0 text-[#4E5BA6] stroke-[3]" />,
        hoverBg: "hover:bg-[#4E5BA6]/8",
        text: "text-[#4E5BA6]",
    },
};

const AppNotification = ({
    open,
    type = "info",
    title,
    description,
    onClose,
    duration = 5000,
    offset = 20,
    actionText,
    onActionClick,
    sender,
}) => {
    const { sideMenuWidth } = useSideMenuLayout();

    useEffect(() => {
    }, [sideMenuWidth])

    // Tự động đóng toast sau thời gian duration
    useEffect(() => {
        if (open && duration) {
            const timer = setTimeout(() => {
                onClose?.();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [open, duration, onClose]);

    const styleSet = typeStyles[type] || typeStyles.info;

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: -30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -30 }}
                    transition={{
                        layout: { duration: 0.25, ease: "easeOut" },
                        duration: 0.2
                    }}
                    className={`fixed z-[2147483647] w-auto`}
                    style={{ left: `calc(40% + ${sideMenuWidth} / 2)`, top: offset, transform: 'translateX(-50%)', zIndex: 2147483647 }}
                >
                    <div
                        className={`inline-flex items-center gap-3 rounded-[20px] px-3.5 py-4 overflow-hidden 
              transition-all duration-200 ease-in-out hover:scale-[1.02] 
              ${styleSet.bgClass || 'bg-[rgba(215,215,215,0.46)] backdrop-blur-[3px] border border-white shadow-sm'} 
              ${styleSet.hoverBg}`}
                    >
                        {styleSet.icon}
                        <div className="flex flex-col justify-center gap-0.5">
                            {sender && (
                                <p className={`font-bold text-sm leading-tight max-w-[280px] truncate ${type === 'warning' ? 'text-amber-800' : 'text-gray-900'}`}>
                                    {sender}
                                </p>
                            )}
                            <p
                                className={`font-semibold text-base leading-tight max-w-[320px] ${styleSet.text}`}
                            >
                                {title}
                            </p>
                            {description && (
                                <p
                                    className={`font-normal text-sm leading-tight ${styleSet.text}`}
                                >
                                    {description}
                                </p>
                            )}
                        </div>
                        {actionText && onActionClick && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onActionClick();
                                    onClose?.();
                                }}
                                className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold bg-white shadow-sm hover:shadow-md transition-all active:scale-95 ${styleSet.text}`}
                            >
                                {actionText}
                            </button>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AppNotification;
