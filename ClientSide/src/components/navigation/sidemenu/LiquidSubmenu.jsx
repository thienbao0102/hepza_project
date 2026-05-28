import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";
import clsx from "clsx";

export default function LiquidSubmenu({ title, items = [], userRole }) {
    const location = useLocation();
    const [hoveredId, setHoveredId] = useState(null);
    const [blobPos, setBlobPos] = useState({
        width: 0,
        height: 0,
        left: 0,
        top: 0,
    });

    const containerRef = useRef(null);

    const resolveHref = (href) => (userRole && typeof href === 'object' && href !== null) ? href[userRole] : href;

    const handleEnter = (e, id) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const crect = containerRef.current.getBoundingClientRect();
        setBlobPos({
            width: rect.width,
            height: rect.height,
            left: rect.left - crect.left,
            top: rect.top - crect.top,
        });

        setHoveredId(id);
    };

    return (
        <div className="flex flex-col">
            {/* Section title */}
            {title && (
                <span className="title text-sm text-gray-500 font-normal px-2">
                    {title}
                </span>
            )}

            <div
                ref={containerRef}
                className="relative mt-1 flex flex-col gap-0"
            >
                {/* Hover Blob */}
                <AnimatePresence>
                    {hoveredId && (
                        <motion.div
                            layoutId="submenu-hover-blob"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute bg-gray-400/10 rounded-2xl z-0"
                            style={{
                                width: blobPos.width,
                                height: blobPos.height,
                                left: blobPos.left,
                                top: blobPos.top,
                            }}
                            transition={{ type: "spring", stiffness: 320, damping: 28 }}
                        />
                    )}
                </AnimatePresence>

                {items.map((it, idx) => {
                    const itemHref = resolveHref(it.href);
                    const isActive = location.pathname === itemHref;
                    const itemId = it.id ?? idx;

                    return (
                        <Link
                            key={itemId}
                            to={itemHref}
                            className="relative"
                        >
                            {/* Persistent Active Background */}
                            {isActive && (
                                <motion.div
                                    layoutId="submenu-active-blob"
                                    className="absolute inset-0 bg-[#4E5BA6]/10 rounded-2xl z-0 border border-[#4E5BA6]"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            <div
                                onMouseEnter={(e) => handleEnter(e, itemId)}
                                onMouseLeave={() => setHoveredId(null)}
                                className={clsx(
                                    "relative z-10 py-1.5 px-3 rounded-2xl flex gap-3 items-center cursor-pointer transition-colors",
                                    isActive ? "text-[#4E5BA6] font-semibold" : "text-gray-600"
                                )}
                            >

                                <p className="flex-1 text-sm">{it.label}</p>
                                <motion.div
                                    animate={hoveredId === itemId ? { x: [0, 4, 0] } : { x: 0 }}
                                    transition={{ duration: 0.4, ease: "easeInOut" }}
                                >
                                    <ChevronLeft className="w-4 h-4 rotate-180 ml-auto opacity-50" />
                                </motion.div>

                                {/* Active pill */}
                                {isActive && (
                                    <motion.span
                                        layoutId="liquid-active-pill"
                                        className="absolute inset-0 rounded-xl -z-10"
                                        style={{
                                            background: `linear-gradient(135deg, rgba(78,91,166,0.08) 0%, rgba(104,117,200,0.12) 100%)`,
                                            border: `1px solid rgba(78,91,166,0.15)`,
                                        }}
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    );
}
