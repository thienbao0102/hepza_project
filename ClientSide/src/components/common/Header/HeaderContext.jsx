import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import React, { createContext, useContext, useEffect, useState } from "react";

const HeaderContext = createContext();

export const useHeader = () => useContext(HeaderContext);

export const HeaderProvider = ({ children }) => {
    // Các state mặc định
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(dayjs().format("MM/YYYY")); // Hoặc giá trị mặc định '12/2023'
    const [totalItem, setTotalItem] = useState('');
    const [breadcrumbItems, setBreadcrumbItems] = useState(null);
    const [rightContent, setRightContent] = useState(null);

    // Các config ẩn/hiện
    const [showWeather, setShowWeather] = useState(true);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTotalItem, setShowTotalItem] = useState(false);
    const [hideAllYear, setHideAllYear] = useState(false);

    // Hàm để trang con gọi cập nhật (Update) giao diện Header
    const setHeaderConfig = React.useCallback(({
        title,
        description,
        totalItem,
        showWeather = true,
        showDatePicker = false,
        showTotalItem = false,
        hideAllYear = false,
        breadcrumbItems = null,
        rightContent = null,
    }) => {
        setTitle(title);
        setDescription(description);
        setTotalItem(totalItem);
        setShowWeather(showWeather);
        setShowTotalItem(showTotalItem);
        setShowDatePicker(showDatePicker);
        setHideAllYear(hideAllYear);
        setBreadcrumbItems(breadcrumbItems);
        setRightContent(rightContent);
    }, []);

    return (
        <HeaderContext.Provider
            value={{
                title,
                description,
                date,
                setDate, // Cho phép Layout thay đổi Date
                showWeather,
                showDatePicker,
                showTotalItem,
                hideAllYear,
                totalItem,
                breadcrumbItems,
                setTotalItem,
                setHeaderConfig, // Hàm setup cho các trang con
                setBreadcrumbItems,
                rightContent,
            }}
        >
            {children}
        </HeaderContext.Provider>
    );
};