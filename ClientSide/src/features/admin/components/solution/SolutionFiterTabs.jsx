import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

const TABS = [
    { label: "Giải pháp", value: "solution" },
    { label: "Nghị Định", value: "decree" },
];

export default function SolutionFilterTabs({ activeTab, setActiveTab, setPage }) {
    const tabsRef = useRef([]);
    const tabListRef = useRef(null);
    const [indicatorStyle, setIndicatorStyle] = useState({
        width: 0,
        left: 0,
    });

    useEffect(() => {
        if (tabsRef.current.length > 0 && tabListRef.current) {
            const activeTabIndex = TABS.findIndex((tab) => tab.value === activeTab);
            const activeTabElement = tabsRef.current[activeTabIndex];

            if (activeTabElement) {
                const tabWidth = activeTabElement.getBoundingClientRect().width;
                const tabLeft = activeTabElement.getBoundingClientRect().left;
                const containerLeft = tabListRef.current.getBoundingClientRect().left;

                setIndicatorStyle({
                    width: tabWidth,
                    left: tabLeft - containerLeft,
                });
            }
        }

        setPage(1);

    }, [activeTab]);

    return (
        <div className="flex-shrink-0">
            <div
                ref={tabListRef}
                role="tablist"
                className="relative grid items-center w-full max-w-xs grid-cols-2 px-1 overflow-hidden transition rounded-[12px] h-11 bg-[#F7F7F8] border border-[#E5E7E9]"
            >
                <motion.div
                    className="absolute top-0 bottom-0 left-0 my-auto bg-white rounded-[10px] shadow-sm h-[34px] border border-[#E5E7E9]"
                    animate={{
                        width: indicatorStyle.width,
                        left: indicatorStyle.left,
                    }}
                    transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                    }}
                />

                {TABS.map((tab, index) => (
                    <button
                        key={tab.value}
                        ref={(el) => (tabsRef.current[index] = el)}
                        role="tab"
                        aria-selected={activeTab === tab.value}
                        className="relative block h-10 px-4 rounded-[10px]"
                        onClick={() => setActiveTab(tab.value)}
                    >
                        <span
                            className={`text-xs sm:text-sm text-[#626576] font-medium ${activeTab === tab.value ? "text-opacity-100" : "text-opacity-70"
                                }`}
                        >
                            {tab.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}