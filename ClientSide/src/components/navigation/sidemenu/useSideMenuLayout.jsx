import { createContext, useContext, useState, useMemo, useEffect, useCallback } from "react";

// 1. Tạo Context
const LayoutContext = createContext({
    sideMenuWidth: "70px",
    setSideMenuWidth: () => { },
    isMobile: false,
    isMobileOpen: false,
    toggleMobile: () => { },
    closeMobile: () => { },
});

// 2. Tạo Provider
export const LayoutProvider = ({ children }) => {
    const [sideMenuWidth, setSideMenuWidth] = useState("70px");
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Listen to viewport changes
    useEffect(() => {
        const mql = window.matchMedia("(max-width: 767px)");

        const handleChange = (e) => {
            const mobile = e.matches;
            setIsMobile(mobile);
            // Auto-close drawer when switching back to desktop
            if (!mobile) setIsMobileOpen(false);
        };

        mql.addEventListener("change", handleChange);
        return () => mql.removeEventListener("change", handleChange);
    }, []);

    const toggleMobile = useCallback(() => setIsMobileOpen((v) => !v), []);
    const closeMobile = useCallback(() => setIsMobileOpen(false), []);

    const contextValue = useMemo(
        () => ({
            sideMenuWidth,
            setSideMenuWidth,
            isMobile,
            isMobileOpen,
            toggleMobile,
            closeMobile,
        }),
        [sideMenuWidth, isMobile, isMobileOpen, toggleMobile, closeMobile]
    );

    return (
        <LayoutContext.Provider value={contextValue}>
            {children}
        </LayoutContext.Provider>
    );
};

// 3. Tạo Custom Hook để sử dụng
export const useSideMenuLayout = () => {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error("useLayout must be used within a LayoutProvider");
    }
    return context;
};