import React, { useState, useRef, useEffect } from "react";
import dayjs from "dayjs";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const CustomMonthYearPicker = ({ value, onChange, disabledFuture = true, hideAllYear = false }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const parseYear = (v) => {
        if (!v) return dayjs().year();
        if (v.startsWith("00/")) return Number(v.split("/")[1]) || dayjs().year();
        const d = dayjs(v, "MM/YYYY", true);
        return d.isValid() ? d.year() : dayjs().year();
    };

    const [viewYear, setViewYear] = useState(parseYear(value));

    useEffect(() => {
        setViewYear(parseYear(value));
    }, [value]);

    const isAllYear = value?.startsWith("00/");
    const current = isAllYear ? null : dayjs(value, "MM/YYYY", true);
    const now = dayjs();

    const months = Array.from({ length: 12 }, (_, i) => dayjs().year(viewYear).month(i));

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative h-full inline-block" ref={ref}>
            <style>{`
                @keyframes shimmer-slide {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes soft-glow {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(78, 91, 166, 0.3), 0 0 8px rgba(78, 91, 166, 0.1); }
                    50% { box-shadow: 0 0 0 5px rgba(78, 91, 166, 0), 0 0 16px rgba(78, 91, 166, 0.25); }
                }
            `}</style>

            {/* Trigger */}
            <motion.div
                className={`flex items-center gap-2.5 px-4 h-full rounded-xl cursor-pointer select-none transition-colors duration-300 relative overflow-hidden
                    ${open
                        ? 'bg-[#4E5BA6] text-white ring-2 ring-[#4E5BA6]/40'
                        : 'text-[#4E5BA6]'
                    }`}
                style={!open ? {
                    background: 'linear-gradient(90deg, rgba(78,91,166,0.08) 0%, rgba(78,91,166,0.18) 40%, rgba(78,91,166,0.08) 60%, rgba(78,91,166,0.08) 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer-slide 3s ease-in-out infinite, soft-glow 2.5s ease-in-out infinite',
                } : {}}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setOpen(!open)}
            >
                <span className="font-semibold text-sm whitespace-nowrap relative z-10">
                    {value?.startsWith("00/") ? `Cả năm ${value.split("/")[1]}` : current.format("MM/YYYY")}
                </span>
                <motion.div
                    animate={!open ? { rotate: [0, -12, 12, -8, 0] } : { rotate: 0 }}
                    transition={!open ? { duration: 1.5, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" } : {}}
                    className="relative z-10"
                >
                    <Calendar className="size-[18px]" strokeWidth={2} />
                </motion.div>
            </motion.div>

            {/* Dropdown */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute right-0 z-50 mt-2 bg-white shadow-2xl rounded-2xl p-4 w-64 border border-gray-100"
                    >
                        {/* Header chọn năm */}
                        <div className="flex justify-between items-center mb-3">
                            <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setViewYear((y) => y - 1)}
                                className="p-1.5 hover:bg-[#4E5BA6]/10 rounded-lg transition-colors"
                            >
                                <ChevronLeft size={18} className="text-[#4E5BA6]" />
                            </motion.button>
                            <motion.span
                                key={viewYear}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="font-bold text-[#4E5BA6] text-lg"
                            >
                                {viewYear}
                            </motion.span>
                            <motion.button
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setViewYear((y) => y + 1)}
                                className="p-1.5 hover:bg-[#4E5BA6]/10 rounded-lg transition-colors"
                                disabled={disabledFuture && viewYear >= now.year()}
                            >
                                <ChevronRight
                                    size={18}
                                    className={disabledFuture && viewYear >= now.year() ? "opacity-30" : "text-[#4E5BA6]"}
                                />
                            </motion.button>
                        </div>

                        {/* Option: All Year */}
                        {!hideAllYear && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                    onChange(`00/${viewYear}`);
                                    setOpen(false);
                                }}
                                className={`
                                w-full py-2.5 mb-3 rounded-xl text-sm font-medium transition-all border
                                ${value === `00/${viewYear}`
                                        ? "bg-[#4E5BA6] text-white border-[#4E5BA6] shadow-md shadow-[#4E5BA6]/20"
                                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-[#4E5BA6]/5 hover:border-[#4E5BA6]/30"
                                    }
                            `}
                            >
                                Cả năm {viewYear}
                            </motion.button>
                        )}

                        {/* Months grid */}
                        <div className="grid grid-cols-3 gap-1.5">
                            {months.map((monthObj, idx) => {
                                const isDisabled = disabledFuture && monthObj.isAfter(now, "month");
                                const isSelected = !isAllYear && current?.format("MM/YYYY") === monthObj.format("MM/YYYY");

                                return (
                                    <motion.button
                                        key={idx}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.02, duration: 0.2 }}
                                        whileHover={!isDisabled ? { scale: 1.08 } : {}}
                                        whileTap={!isDisabled ? { scale: 0.95 } : {}}
                                        disabled={isDisabled}
                                        onClick={() => {
                                            onChange(monthObj.format("MM/YYYY"));
                                            setOpen(false);
                                        }}
                                        className={`
                                            py-2.5 rounded-xl text-sm font-medium transition-all
                                            ${isDisabled ? "text-gray-300 cursor-not-allowed" : "hover:bg-[#4E5BA6]/10 text-gray-600"}
                                            ${isSelected ? "bg-[#4E5BA6] hover:!bg-[#5f6fcc] text-white shadow-md shadow-[#4E5BA6]/25" : ""}
                                        `}
                                    >
                                        Th {monthObj.format("M")}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CustomMonthYearPicker;
