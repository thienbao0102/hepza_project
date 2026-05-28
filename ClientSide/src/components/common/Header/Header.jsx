import React from "react";
import { Outlet, useLocation } from "react-router-dom"; // Dùng Outlet để render trang con
import { useHeader } from "./HeaderContext"; // Import Context vừa tạo
import CustomMonthYearPicker from "@components/ui/CustomDatePicker";
import AppBreadcrumb from "@components/common/BreadCrumb";
import WeatherWidget from "@components/common/WeatherWidget";
import { AnimatePresence, motion } from "framer-motion";
import { DataActions } from "@/components/ui/Button";
import { useSideMenuLayout } from "@/components/navigation/sidemenu/useSideMenuLayout";
import { Menu } from "lucide-react";

const MainLayout = () => {
    const location = useLocation();
    const pathSnippets = location.pathname.split("/").filter((i) => i);
    const { isMobile, toggleMobile } = useSideMenuLayout();

    // Lấy dữ liệu từ Context thay vì props
    const {
        title,
        description,
        date,
        setDate,
        showWeather,
        showDatePicker,
        showTotalItem,
        totalItem,
        rightContent,
        hideAllYear,
    } = useHeader();

    return (
        <div className="flex flex-col h-screen px-3 py-2 overflow-hidden gap-2 md:pl-4">
            {/* --- PHẦN HEADER (CỐ ĐỊNH) --- */}
            <header className="w-full shrink-0 ">
                <div className="flex w-full justify-between gap-2 2xl:gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        {/* Hamburger menu — mobile only */}
                        {isMobile && (
                            <button
                                onClick={toggleMobile}
                                className="flex items-center justify-center size-9 rounded-lg bg-[#4E5BA6]/10 hover:bg-[#4E5BA6]/20 transition-colors shrink-0 cursor-pointer"
                                aria-label="Open menu"
                            >
                                <Menu className="size-5 text-[#4E5BA6]" strokeWidth={2} />
                            </button>
                        )}
                        <span className="flex flex-col">
                            {/* Logic Breadcrumb giữ nguyên */}
                            {!pathSnippets.includes("overview") && (
                                <AppBreadcrumb location={location} />
                            )}
                            {/* Title lấy từ Context */}
                            <h2 className="text-xl md:text-2xl font-bold text-[#4E5BA6] uppercase leading-tight">
                                {title || "Đang tải..."}
                            </h2>
                            {/* Description lấy từ Context */}
                            {description && <p className="text-gray-500 font-medium text-sm md:text-base">{description}</p>}
                        </span>
                        {showTotalItem && (
                            <div className="text-sm size-7 p-1 aspect-square bg-[#4E5BA6]/20 rounded-full text-[#4E5BA6] font-medium flex items-center justify-center">
                                {totalItem}
                            </div>
                        )}
                    </div>

                    <div className="h-9 flex gap-2 flex-wrap">
                        <AnimatePresence>
                            {rightContent && ( // Giả định date có giá trị khi hiển thị
                                <motion.div
                                    className="h-full"
                                    key="data-actions"
                                    initial={{ opacity: 0, width: 0 }} // Bắt đầu từ mờ và bên trái
                                    animate={{ opacity: 1, width: "auto" }} // Kết thúc tại vị trí gốc
                                    exit={{ opacity: 0, width: 0 }} // Animation biến mất: mờ dần và di chuyển sang phải
                                >
                                    {rightContent}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {/* Tương tự cho DatePicker... */}
                            {showDatePicker && ( // Giả định date có giá trị khi hiển thị
                                <motion.div
                                    className="h-full"
                                    key="date-picker"
                                    initial={{ opacity: 0, width: 0 }} // Bắt đầu từ mờ và bên trái
                                    animate={{ opacity: 1, width: "auto" }} // Kết thúc tại vị trí gốc
                                    exit={{ opacity: 0, width: 0 }} // Animation biến mất: mờ dần và di chuyển sang phải
                                >
                                    <CustomMonthYearPicker value={date} onChange={setDate} hideAllYear={hideAllYear} />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {/* Chỉ hiển thị nếu showWeather là true — hidden on mobile */}
                            {showWeather && !isMobile && (
                                <motion.div
                                    className="h-full"
                                    key="weather-widget" // Key là bắt buộc cho AnimatePresence
                                    initial={{ opacity: 0, width: 0 }} // Bắt đầu từ mờ và bên trái
                                    animate={{ opacity: 1, width: "auto" }} // Kết thúc tại vị trí gốc
                                    exit={{ opacity: 0, width: 0 }} // Animation biến mất: mờ dần và di chuyển sang phải
                                >
                                    <WeatherWidget />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            {/* --- PHẦN NỘI DUNG TRANG (THAY ĐỔI) --- */}
            <main className="flex-1 bg-gray-50 overflow-hidden">
                {/* Outlet là nơi nội dung các trang con (Dashboard, User...) sẽ hiện ra */}
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;
