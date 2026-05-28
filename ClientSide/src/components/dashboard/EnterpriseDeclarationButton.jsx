import React, { useState, useEffect } from "react";
import { Button } from "@mui/material";
import { Modal, Table, Tabs, Tag, DatePicker } from "antd";
import { Building2, Check, X } from "lucide-react";
import { useEnterpriseDeclaration } from "../../hooks/useEnterpriseDeclaration";
import SearchBox from "../ui/SearchBox";
import ButtonFilter from "../ui/ButtonFilter";
import Pagination from "../common/Pagination";
import { handlerGetAllZones } from "../../services/zoneService";
import { useAuth } from "@app/providers/auth/AuthProvider";
import { useAuthenticatedUser } from "@features/auth/hooks/useAuthQueries";
import dayjs from "dayjs";

const EnterpriseDeclarationButton = ({ periodKey, date, resourceCategory, zoneId, customTrigger }) => {
    const { user: authContextUser } = useAuth();
    const { data: authData } = useAuthenticatedUser();
    const currentRole =
        authContextUser?.role ||
        authContextUser?.user?.role ||
        authData?.role ||
        authData?.user?.role;
    const isAdmin = currentRole === "admin";
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(zoneId ? "3" : "1");
    const [searchText, setSearchText] = useState("");
    const [selectedFilters, setSelectedFilters] = useState(() => (zoneId ? { zone_id: zoneId } : {}));
    const [zoneList, setZoneList] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);

    // Derived states cho Picker
    const initDate = periodKey ? dayjs(`${periodKey.toString().substring(0, 4)}-${periodKey.toString().substring(4, 6)}-01`) : dayjs();
    const [selectedDate, setSelectedDate] = useState(initDate);
    const [localPeriodKey, setLocalPeriodKey] = useState(periodKey);
    const [localYear, setLocalYear] = useState(Number(initDate.format("YYYY")));

    // Sync lại prop từ Component cha vào State local khi mà Modal mở lên 
    // vì React không tự update useState khi prop ban đầu thay đổi
    useEffect(() => {
        if (open && periodKey) {
            const syncDate = dayjs(`${periodKey.toString().substring(0, 4)}-${periodKey.toString().substring(4, 6)}-01`);
            setSelectedDate(syncDate);
            setLocalPeriodKey(periodKey);
            setLocalYear(Number(syncDate.format("YYYY")));
        }

        // Tự động set filter zone_id nếu được truyền vào từ Dashboard
        if (open && zoneId) {
            setSelectedFilters(prev => ({ ...prev, zone_id: zoneId }));
        }
    }, [open, periodKey, zoneId]);

    const { loading, declared, undeclared, yearlyMatrix, fetchDeclarationStatus } = useEnterpriseDeclaration();

    // Fetch zones list
    useEffect(() => {
        if (isAdmin && open && zoneList.length === 0) {
            handlerGetAllZones({ limit: 100 })
                .then(res => setZoneList(res?.zones || []))
                .catch(err => console.error("Filter zone error", err));
        }
    }, [isAdmin, open, zoneList.length]);

    // Handle Time selection
    const handleDateChange = (dateObj) => {
        if (!dateObj) return;
        setSelectedDate(dateObj);

        if (activeTab === "3") {
            setLocalYear(Number(dateObj.format("YYYY")));
        } else {
            setLocalPeriodKey(Number(dateObj.format("YYYYMM")));
            setLocalYear(Number(dateObj.format("YYYY")));
        }
    };

    const handleTabChange = (key) => {
        setActiveTab(key);
        setCurrentPage(0); // Reset trang khi đổi tab
        if (key !== "3") {
            const currentYearInPeriod = String(localPeriodKey).substring(0, 4);
            if (currentYearInPeriod !== String(localYear)) {
                const newPeriod = Number(`${localYear}${String(selectedDate.month() + 1).padStart(2, '0')}`);
                setLocalPeriodKey(newPeriod);
            }
        }
    };

    const isFirstFetch = React.useRef(true);

    // Lắng nghe đổi thay đổi gọi API
    useEffect(() => {
        if (!open) {
            isFirstFetch.current = true;
            return;
        }

        const runFetch = () => {
            setCurrentPage(0);
            fetchDeclarationStatus(localPeriodKey, localYear, searchText, selectedFilters, resourceCategory);
        };

        if (isFirstFetch.current) {
            runFetch();
            isFirstFetch.current = false;
            return;
        }

        const timeoutId = setTimeout(runFetch, 500);

        return () => clearTimeout(timeoutId);
    }, [open, localPeriodKey, localYear, searchText, selectedFilters, fetchDeclarationStatus, resourceCategory]);

    // Bộ lọc (Filter)
    const filterOptions = isAdmin
        ? {
            zone_id: zoneList.map(z => ({ value: z.zone_id, label: z.zone_name }))
        }
        : {};
    const fieldLabels = isAdmin
        ? {
            zone_id: 'Khu công nghiệp'
        }
        : {};

    const handleFilter = (filters) => {
        setSelectedFilters(filters);
    };

    const renderTableWithCustomPagination = (data, columns, pageSize, extraTableProps = {}) => {
        const totalPages = Math.ceil((data?.length || 0) / pageSize) || 1;
        const pagedData = data.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

        return (
            <div>
                <Table
                    loading={loading}
                    dataSource={pagedData}
                    rowKey="company_id"
                    pagination={false}
                    size="small"
                    columns={columns}
                    {...extraTableProps}
                />
                {data?.length > 0 && (
                    <div className="pb-4 mt-2">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => setCurrentPage(page)}
                        />
                    </div>
                )}
            </div>
        );
    };

    const highlightText = (text, highlight) => {
        if (!highlight || !text) return text;

        const normText = String(text).normalize('NFC');
        const normHighlight = highlight.trim().normalize('NFC');

        if (!normHighlight) return text;

        const escapedHighlight = normHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedHighlight})`, "gi");
        const parts = normText.split(regex);

        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === normHighlight.toLowerCase() ? (
                        <mark key={i} className="bg-yellow-200 text-yellow-900 px-0.5 rounded font-semibold">
                            {part}
                        </mark>
                    ) : (
                        <span key={i}>{part}</span>
                    )
                )}
            </span>
        );
    };

    // Hiển thị lưới năm từ API
    const renderYearlyGrid = () => {
        const columns = [
            {
                title: 'Tên Doanh nghiệp',
                dataIndex: 'company_name',
                key: 'name',
                fixed: 'left',
                width: 250,
                sorter: (a, b) => (a.company_name || '').localeCompare(b.company_name || ''),
                render: (text) => highlightText(text, searchText)
            },
            ...Array.from({ length: 12 }).map((_, i) => ({
                title: `T${i + 1}`,
                key: `m${i + 1}`,
                width: 60,
                align: 'center',
                sorter: (a, b) => {
                    const valA = a.declarations?.[`m${i + 1}`] ? 1 : 0;
                    const valB = b.declarations?.[`m${i + 1}`] ? 1 : 0;
                    return valA - valB;
                },
                render: (_, record) => {
                    const isDeclared = record.declarations?.[`m${i + 1}`] || false;
                    return isDeclared ? <Check size={16} className="text-green-500 mx-auto" /> : <X size={16} className="text-red-400 mx-auto" opacity={0.3} />;
                }
            }))
        ];

        return renderTableWithCustomPagination(yearlyMatrix, columns, 8, { scroll: { x: 800 } });
    };

    const columnsDec = [
        {
            title: 'Tên Doanh nghiệp',
            dataIndex: 'company_name',
            key: 'name',
            sorter: (a, b) => (a.company_name || '').localeCompare(b.company_name || ''),
            render: (text) => highlightText(text, searchText)
        },
        {
            title: 'Mã số DN',
            dataIndex: 'company_id',
            key: 'code',
            sorter: (a, b) => (a.company_id || '').localeCompare(b.company_id || ''),
            render: (text) => highlightText(text, searchText)
        },
        {
            title: 'Khu công nghiệp',
            dataIndex: 'zone_name',
            key: 'zone',
            sorter: (a, b) => (a.zone_name || '').localeCompare(b.zone_name || '')
        },
        { title: 'Trạng thái', key: 'status', render: () => <Tag color="success">Đã báo cáo</Tag> }
    ];

    const columnsUndec = [
        {
            title: 'Tên Doanh nghiệp',
            dataIndex: 'company_name',
            key: 'name',
            sorter: (a, b) => (a.company_name || '').localeCompare(b.company_name || ''),
            render: (text) => highlightText(text, searchText)
        },
        {
            title: 'Mã số DN',
            dataIndex: 'company_id',
            key: 'code',
            sorter: (a, b) => (a.company_id || '').localeCompare(b.company_id || ''),
            render: (text) => highlightText(text, searchText)
        },
        {
            title: 'Khu công nghiệp',
            dataIndex: 'zone_name',
            key: 'zone',
            sorter: (a, b) => (a.zone_name || '').localeCompare(b.zone_name || '')
        },
        { title: 'Trạng thái', key: 'status', render: () => <Tag color="error">Chưa báo cáo</Tag> }
    ];

    const items = [
        {
            key: '1',
            label: 'Đã báo cáo',
            children: renderTableWithCustomPagination(declared, columnsDec, 7)
        },
        {
            key: '2',
            label: 'Chưa báo cáo',
            children: renderTableWithCustomPagination(undeclared, columnsUndec, 7)
        },
        {
            key: '3',
            label: 'Tổng quan năm',
            children: renderYearlyGrid()
        }
    ].filter(item => {
        // Nếu có zoneId (đang xem trong KCN), chỉ hiện Tổng quan năm
        if (zoneId) return item.key === "3";
        return true;
    });

    // Picker loại nào tuỳ theo tab
    const isYearTab = activeTab === "3";

    return (
        <>
            {customTrigger ? (
                typeof customTrigger === 'function' ? (
                    customTrigger(() => setOpen(true))
                ) : (
                    <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }} className="cursor-pointer">
                        {customTrigger}
                    </div>
                )
            ) : (
                <Button
                    variant="outlined"
                    onClick={() => setOpen(true)}
                    startIcon={<Building2 size={16} />}
                    sx={{
                        height: "36px",
                        borderRadius: "12px",
                        borderColor: "rgba(229, 231, 233, 1)",
                        backgroundColor: "#ffffff",
                        color: "#374151",
                        textTransform: "none",
                        fontWeight: 500,
                        marginLeft: 1,
                        "&:hover": { backgroundColor: "#f9fafb" }
                    }}
                >
                    Trạng thái Khai báo
                </Button>
            )}

            <Modal
                title={
                    <div className="flex items-center justify-between mr-8">
                        <span>Danh sách Khai báo Tài nguyên & Chất thải</span>
                        <DatePicker
                            picker={zoneId || isYearTab ? "year" : "month"}
                            format={zoneId || isYearTab ? "YYYY" : "MM/YYYY"}
                            value={selectedDate}
                            onChange={handleDateChange}
                            allowClear={false}
                        />
                    </div>
                }
                open={open}
                onCancel={() => setOpen(false)}
                footer={null}
                width={1000}
                centered
                destroyOnClose
            >
                <div className="flex items-center gap-2 mb-4">
                    <SearchBox
                        placeholder="Tìm kiếm doanh nghiệp..."
                        rootClassName="w-[300px]"
                        defaultValue={searchText}
                        onSearch={(val) => setSearchText(val)}
                        debounceDelay={0}
                    />
                    {isAdmin && !zoneId && (
                        <ButtonFilter
                            filterOptions={filterOptions}
                            fieldLabels={fieldLabels}
                            selectedFilters={selectedFilters}
                            setSelectedFilters={setSelectedFilters}
                            onFilter={handleFilter}
                        />
                    )}
                </div>
                <Tabs activeKey={activeTab} onChange={handleTabChange} items={items} />
            </Modal>
        </>
    );
};

export default EnterpriseDeclarationButton;
