import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef } from "react";
import { Link } from "react-router-dom";

const ActionButtonGroup = ({ buttons }) => {
    const [activeId, setActiveId] = useState(null);
    const [blobPos, setBlobPos] = useState({ width: 0, height: 0, left: 0, top: 0 });
    const containerRef = useRef(null);

    const handleMouseEnter = (e, id) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        setBlobPos({
            width: rect.width,
            height: rect.height,
            left: rect.left - containerRect.left,
            top: rect.top - containerRect.top,
        });

        setActiveId(id);
    };

    return (
        <div
            ref={containerRef}
            className="relative flex items-stretch justify-between gap-1 p-1 rounded-2xl"
            style={{ background: "rgba(78,91,166,0.05)" }}
        >
            {/* Liquid blob */}
            <div className="absolute inset-0 pointer-events-none z-0 p-1">
                <AnimatePresence>
                    {activeId && (
                        <motion.div
                            key="blob"
                            layoutId="action-blob"
                            className="absolute rounded-xl"
                            style={{
                                background: "rgba(78,91,166,0.10)",
                                width: blobPos.width,
                                height: blobPos.height,
                                left: blobPos.left,
                                top: blobPos.top,
                            }}
                            transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.8 }}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Buttons */}
            {buttons.map((btn) => {
                const Wrapper = btn.href ? Link : "div";
                return (
                    <Wrapper
                        key={btn.id}
                        to={btn.href}
                        onMouseEnter={(e) => handleMouseEnter(e, btn.id)}
                        onMouseLeave={() => setActiveId(null)}
                        className="relative flex flex-col items-center justify-center gap-1 p-3 flex-grow rounded-xl cursor-pointer z-10 transition-colors duration-150"
                    >
                        {btn.icon ? (
                            <span className="flex items-center justify-center text-[#4E5BA6] w-5 h-5">
                                {btn.icon}
                            </span>
                        ) : (
                            <span className="flex items-center justify-center text-[#4E5BA6] w-5 h-5">
                                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            </span>
                        )}
                        <p className="text-[11px] font-medium text-gray-600 leading-none text-center">
                            {btn.label}
                        </p>
                    </Wrapper>
                );
            })}
        </div>
    );
};

export default ActionButtonGroup;
