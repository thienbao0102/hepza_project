import React from "react";

const TABS = [
    { label: "Doanh nghiệp", value: "company" },
    { label: "Ban quản lý", value: "manager" },
];

export default function UserFilterTabs({
    activeTab,
    setActiveTab,
    setPage,
    showManagerTab = true,
}) {
    const tabs = showManagerTab ? TABS : TABS.filter((tab) => tab.value !== "manager");

    const handleTabChange = (value) => {
        setActiveTab(value);
        if (typeof setPage === "function") {
            setPage(1);
        }
    };

    return (
        <div className="flex p-1.5 bg-slate-200/60 backdrop-blur-md rounded-2xl w-fit">
            {tabs.map((tab) => (
                <button
                    key={tab.value}
                    onClick={() => handleTabChange(tab.value)}
                    className={`
                        flex items-center gap-2.5 px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300
                        ${activeTab === tab.value
                            ? "bg-white text-[#4E5BA6] shadow-sm"
                            : "text-slate-500 hover:text-slate-700 hover:bg-white/40"}
                    `}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
