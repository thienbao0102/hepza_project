import { useEffect, useMemo, useState } from 'react';
import {
    Check,
    ChevronDown,
    Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SearchBox from '@components/ui/SearchBox';
import ButtonFilter from '@components/ui/ButtonFilter';
import Pagination from '@components/common/Pagination';
import { useDebounce } from '@hooks/useDebounce';
import { useResourceHistory } from '@/features/resources/hooks/useResourceHistory';
import IconButton from '@/components/ui/IconButton';

const STATUS_TABS = [
    { key: 'Chưa chỉnh sửa', label: 'Chưa chỉnh sửa' },
    { key: 'Đã chỉnh sửa', label: 'Đã chỉnh sửa' },
];
const QUARTER_TABS = [
    { key: 'Quý 1', label: 'Quý 1' },
    { key: 'Quý 2', label: 'Quý 2' },
    { key: 'Quý 3', label: 'Quý 3' },
    { key: 'Quý 4', label: 'Quý 4' },
];

const FILTER_OPTIONS = {
    label: ['Quý 1', 'Quý 2', 'Quý 3', 'Quý 4'],
    status: ['Chưa chỉnh sửa', 'Đã chỉnh sửa'],
};
const FILTER_FIELD_LABELS = {
    label: 'Lọc theo Quý',
    status: 'Lọc theo Trạng thái',
};

const DEFAULT_ITEMS_PER_PAGE = 20;
const DELETED_ACCOUNT_LABEL = 'Tài khoản đã xóa';

const getQuarterLabel = (periodKey) => {
    const month = Number(String(periodKey ?? '').slice(-2));
    if (!Number.isFinite(month) || month < 1 || month > 12) return 'Không xác định';
    const quarter = Math.ceil(month / 3);
    return `Quý ${quarter}`;
};

const formatDateTime = (dateStr) => {
    if (!dateStr || dateStr === 'Không có dữ liệu' || dateStr === 'Chưa có chỉnh sửa nào' || dateStr === 'Chưa có dữ liệu') return dateStr;
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const pad = (num) => String(num).padStart(2, '0');
        return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    } catch (e) {
        return dateStr;
    }
};

const normalizeHistoryToReports = (historyPayload, fallbackPeriodKey) => {
    if (!historyPayload) return [];

    const hasValidData = (item) => {
        if (!item) return false;
        if (item._id) return true;
        if (item.resource_change?.length > 0) return true;
        // Backend returns {input:[], fuel:[], waste:[], periodKey, ...}
        if (item.input?.length > 0 || item.fuel?.length > 0 || item.waste?.length > 0) return true;
        return false;
    };

    if (!Array.isArray(historyPayload)) {
        if (!hasValidData(historyPayload)) return [];
    }

    const getMonthLabel = (pkey) => {
        const month = String(pkey ?? '').slice(-2);
        return `Tháng ${month}`;
    };

    const normalizeItem = (item) => {
        const changes = item?.resource_change || [];
        const hasUpdates = changes.length > 1;
        const resolveAccountLabel = (actor) => {
            if (typeof actor === 'string' && actor.trim()) return actor.trim();
            if (actor?.email && String(actor.email).trim()) return String(actor.email).trim();
            if (actor?.name && String(actor.name).trim()) return String(actor.name).trim();
            return '';
        };

        // Try to get account from multiple sources
        const account =
            resolveAccountLabel(changes[0]?.modifiedBy) ||
            resolveAccountLabel(item?.createdBy) ||
            resolveAccountLabel(item?.created_by) ||
            resolveAccountLabel(item?.user) ||
            DELETED_ACCOUNT_LABEL;

        const lastEditedRaw = hasUpdates
            ? (changes[0]?.modifiedAt || 'Không có chỉnh sửa nào')
            : 'Không có chỉnh sửa nào';
        const lastEdited = formatDateTime(lastEditedRaw);

        const resolvedPeriodKey = item?.periodKey ?? fallbackPeriodKey;

        // Ensure ID is unique - prefer item._id from DB
        const uniqueId = item?._id || (resolvedPeriodKey ? `period-${resolvedPeriodKey}` : `history-${account}-${Math.random().toString(36).substr(2, 9)}`);

        return {
            id: uniqueId,
            periodKey: resolvedPeriodKey,
            quarter: getQuarterLabel(resolvedPeriodKey),
            month: getMonthLabel(resolvedPeriodKey),
            account,
            completedDate: formatDateTime(item?.created_at || 'Chưa có dữ liệu'),
            lastEdited,
            status: hasUpdates ? 'Đã chỉnh sửa' : 'Chưa chỉnh sửa',
        };
    };

    if (Array.isArray(historyPayload)) {
        return historyPayload.filter(hasValidData).map(normalizeItem);
    }

    return [normalizeItem(historyPayload)];
};
const getBasePathByRole = (role) => {
    if (role === 'admin') return '/admin/resources';
    if (role === 'manager') return '/manager/resources';
    return '/resources'; // company
};

const ReportTable = ({
    reports = [],
    loading = false,
    itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
    extraToolbarContent = null,
    role,
    companyId,
    zoneId,
    periodKey,
}) => {
    const navigate = useNavigate();

    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
    const [internalReports, setInternalReports] = useState(() => reports.map((item) => ({ ...item })));
    const [statusFilter, setStatusFilter] = useState('all');
    const [labelFilter, setLabelFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFilters, setSelectedFilters] = useState({});
    const [currentPage, setCurrentPage] = useState(0);
    const [compactQuarter, setCompactQuarter] = useState(false);
    const [quarterMenuOpen, setQuarterMenuOpen] = useState(false);
    const [yearMenuOpen, setYearMenuOpen] = useState(false);
    const basePath = getBasePathByRole(role);

    const isPersonal = role === 'company';
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const resolvedPeriodKeys = useMemo(() => {
        if (periodKey) return String(periodKey);

        // Generate all 12 months for the selectedYear
        const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
        return months.map(m => `${selectedYear}${m}`).join(',');
    }, [periodKey, selectedYear]);

    const shouldFetchHistory = Boolean(companyId && zoneId);
    const {
        data: historyData,
        isLoading: historyLoading,
        isFetching: historyFetching,
        error: historyError,
    } = useResourceHistory(
        {
            companyId,
            zoneId,
            periodKeys: resolvedPeriodKeys,
            role,
        },
        { enabled: shouldFetchHistory }
    );
    const apiReports = useMemo(
        () => normalizeHistoryToReports(historyData, null),
        [historyData]
    );
    const activeReports = shouldFetchHistory ? apiReports : reports;
    const isLoadingState = shouldFetchHistory ? (historyLoading || historyFetching) : loading;

    useEffect(() => {
        const normalized = activeReports.map((item) => ({ ...item }));
        setInternalReports(normalized);
        setCurrentPage(0);
    }, [activeReports]);

    useEffect(() => {
        const handleResize = () => {
            setCompactQuarter(window.innerWidth < 1540);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!compactQuarter) {
            setQuarterMenuOpen(false);
        }
    }, [compactQuarter]);

    const filteredReports = useMemo(() => {
        const normalizedSearch = debouncedSearchTerm.trim().toLowerCase();

        return internalReports.filter((item) => {
            const matchStatus = statusFilter === 'all' ? true : item.status === statusFilter;
            const matchLabel = labelFilter === 'all' ? true : item.quarter === labelFilter;
            const searchPool = `${item.quarter || ''} ${item.account || ''} ${item.status || ''} ${item.completedDate || ''} ${item.lastEdited || ''}`;
            const matchSearch =
                normalizedSearch.length === 0 ||
                searchPool.toLowerCase().includes(normalizedSearch);

            return matchStatus && matchLabel && matchSearch;
        });
    }, [internalReports, statusFilter, labelFilter, debouncedSearchTerm]);

    const totalPages = Math.max(1, Math.ceil(filteredReports.length / itemsPerPage));

    useEffect(() => {
        if (currentPage > totalPages - 1) {
            setCurrentPage(Math.max(totalPages - 1, 0));
        }
    }, [currentPage, totalPages]);

    useEffect(() => {
        setCurrentPage(0);
    }, [statusFilter, labelFilter, debouncedSearchTerm, itemsPerPage]);

    const paginatedReports = useMemo(() => {
        const start = currentPage * itemsPerPage;
        return filteredReports.slice(start, start + itemsPerPage);
    }, [filteredReports, currentPage, itemsPerPage]);


    const handleRowClick = (report) => {
        if (!report?.id) return;
        navigate(`${basePath}/resources-list/${report.id}`, {
            state: {
                companyId,
                zoneId,
                periodKey: report.periodKey,
                role,
            },
        });
    };



    return (
        <div className="flex flex-1 w-full flex-col gap-3">
            <section className="bg-white border overflow-visible h-full border-gray-200/80 rounded-2xl shadow-sm">


                <header className="flex flex-col gap-2 border-b border-gray-100 px-5 py-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap md:flex-nowrap">
                        <div className="flex flex-shrink-0 items-center gap-2 text-sm">
                        </div>
                        <div className="flex w-full flex-1 flex-wrap items-center justify-end gap-2">

                            <div className="flex items-center gap-2">
                                {STATUS_TABS.map((tab) => {
                                    const isActive = statusFilter === tab.key;
                                    return (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            onClick={() => setStatusFilter(prev => prev === tab.key ? 'all' : tab.key)}
                                            className={`flex h-9 cursor-pointer items-center rounded-full px-4 text-sm font-medium transition-colors ${isActive ? 'bg-[#4E5BA6]/10 text-[#4E5BA6]' : 'bg-[#4E5BA6]/10 text-gray-400'} hover:bg-gray-200`}
                                        >
                                            <span
                                                className={`inline-flex h-4 items-center justify-center transition-all duration-150 ${isActive ? 'w-4' : 'w-0 overflow-hidden'}`}
                                            >
                                                {isActive && <Check size={16} />}
                                            </span>
                                            <span className={`transition-all duration-150 ${isActive ? 'pl-1' : 'pl-0'}`}>
                                                {tab.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setYearMenuOpen((prev) => !prev)}
                                        className="flex h-9 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors bg-[#4E5BA6]/10 text-[#4E5BA6] hover:bg-gray-200"
                                    >
                                        <span>Năm {selectedYear}</span>
                                        <ChevronDown
                                            size={16}
                                            className={`text-[#4E5BA6] transition-transform ${yearMenuOpen ? 'rotate-180' : ''}`}
                                        />
                                    </button>
                                    {yearMenuOpen && (
                                        <div className="absolute left-0 mt-2 w-32 rounded-xl border border-gray-200 bg-white shadow-lg z-20 p-2 flex flex-col gap-1">
                                            {Array.from({ length: new Date().getFullYear() - 2023 + 1 }, (_, i) => 2023 + i).reverse().map((year) => {
                                                const isActive = selectedYear === year;
                                                return (
                                                    <button
                                                        key={year}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedYear(year);
                                                            setYearMenuOpen(false);
                                                        }}
                                                        className={`flex h-9 cursor-pointer items-center justify-between rounded-xl px-3 text-sm transition-colors ${isActive
                                                            ? 'bg-[#4E5BA6]/10 text-[#4E5BA6]'
                                                            : 'bg-white text-gray-400'
                                                            } hover:bg-gray-50`}
                                                    >
                                                        <span>{year}</span>
                                                        {isActive && <Check size={16} />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <span className="h-7 w-px bg-gray-300" />

                            <div className="flex items-center gap-2">
                                {compactQuarter ? (
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setQuarterMenuOpen((prev) => !prev)}
                                            className="flex cursor-pointer items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
                                        >
                                            <span>{labelFilter === 'all' ? 'Chọn quý' : labelFilter}</span>
                                            <ChevronDown
                                                size={16}
                                                className={`text-gray-500 transition-transform ${quarterMenuOpen ? 'rotate-180' : ''}`}
                                            />
                                        </button>
                                        {quarterMenuOpen && (
                                            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white shadow-lg z-10 p-2 flex flex-col gap-1">
                                                {QUARTER_TABS.map((tab) => {
                                                    const isActive = labelFilter === tab.key;
                                                    return (
                                                        <button
                                                            key={tab.key}
                                                            type="button"
                                                            onClick={() => {
                                                                setLabelFilter((prev) => (prev === tab.key ? 'all' : tab.key));
                                                                setQuarterMenuOpen(false);
                                                            }}
                                                            className={`flex h-9 cursor-pointer items-center justify-between rounded-xl px-3 text-sm transition-colors ${isActive
                                                                ? 'bg-[#4E5BA6]/10 text-[#4E5BA6]'
                                                                : 'bg-white text-gray-400'
                                                                } hover:bg-gray-50`}
                                                        >
                                                            <span className="transition-all duration-150">
                                                                {tab.label}
                                                            </span>
                                                            <span
                                                                className={`inline-flex items-center justify-center transition-all duration-150 ${isActive ? 'w-4 h-4' : 'w-0 h-0 overflow-hidden'
                                                                    }`}
                                                            >
                                                                {isActive && <Check size={16} />}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    QUARTER_TABS.map((tab) => {
                                        const isActive = labelFilter === tab.key;
                                        return (
                                            <button
                                                key={tab.key}
                                                type="button"
                                                onClick={() => setLabelFilter(prev => prev === tab.key ? 'all' : tab.key)}
                                                className={`flex h-9 cursor-pointer items-center rounded-full px-4 text-sm font-medium transition-colors ${isActive ? 'bg-[#4E5BA6]/10 text-[#4E5BA6]' : 'bg-[#4E5BA6]/10 text-gray-400'} hover:bg-gray-200`}
                                            >
                                                <span
                                                    className={`inline-flex h-4 items-center justify-center transition-all duration-150 ${isActive ? 'w-4' : 'w-0 overflow-hidden'}`}
                                                >
                                                    {isActive && <Check size={16} />}
                                                </span>
                                                <span className={`transition-all duration-150 ${isActive ? 'pl-1' : 'pl-0'}`}>
                                                    {tab.label}
                                                </span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            <ButtonFilter
                                onFilter={(filters) => {
                                }}
                                filterOptions={FILTER_OPTIONS}
                                fieldLabels={FILTER_FIELD_LABELS}
                                selectedFilters={selectedFilters}
                                setSelectedFilters={setSelectedFilters}
                            />
                            <SearchBox
                                placeholder="Tìm kiếm báo cáo..."
                                onSearch={(value) => setSearchTerm(value)}
                                debounceDelay={200}
                                rootClassName="max-w-xs"
                                className="!border-gray-200 !bg-gray-50"
                            />
                            {extraToolbarContent}

                        </div>
                    </div>
                </header>

                <header className="flex items-center gap-3 px-5 py-3 text-base font-semibold text-black bg-white border-b border-gray-100">
                    <div className="flex min-w-0 flex-1 items-center gap-4 pl-4">
                        <span className="h-7 w-px bg-gray-300" />
                        <div className="w-24 truncate text-center">Quý</div>
                        <span className="h-7 w-px bg-gray-300" />
                        <div className="w-24 truncate text-center">Tháng</div>
                        <span className="h-7 w-px bg-gray-300" />
                        <div className="flex-1 truncate text-center">Tài khoản khai báo</div>
                        <span className="h-7 w-px bg-gray-300" />
                        <div className="w-48 truncate text-center">Ngày hoàn thành</div>
                        <span className="h-7 w-px bg-gray-300" />
                        <div className="w-48 truncate text-center">Chỉnh sửa gần nhất</div>
                    </div>
                </header>
                <div className="divide-y divide-gray-100">
                    {isLoadingState ? (
                        <div className="flex h-40 items-center justify-center text-gray-500 text-sm">
                            Đang tải...
                        </div>
                    ) : historyError ? (
                        <div className="flex h-40 items-center justify-center text-center text-red-500 text-sm px-4">
                            Không thể tải dữ liệu khai báo. Vui lòng thử lại sau.
                        </div>
                    ) : filteredReports.length === 0 ? (
                        <div className="flex h-40 items-center justify-center text-gray-400 text-sm">
                            Không có báo cáo.
                        </div>
                    ) : (
                        paginatedReports.map((item) => {
                            const isEdited = item.status === 'Đã chỉnh sửa';
                            const rowClass = 'bg-white hover:bg-[#4E5BA6]/5';
                            const textStyle = isEdited ? 'text-gray-700' : 'text-gray-600';

                            return (
                                <article
                                    key={item.id}
                                    className={`flex flex-wrap items-center gap-3 px-5 py-3 text-sm transition-colors cursor-pointer ${rowClass}`}
                                    onClick={() => handleRowClick(item)}
                                >
                                    <div className="flex min-w-0 flex-1 items-center gap-4 pl-4">
                                        <span className="h-7 w-px bg-gray-300" />
                                        <div className={`w-24 truncate text-center ${textStyle}`}>
                                            {item.quarter}
                                        </div>
                                        <span className="h-7 w-px bg-gray-300" />
                                        <div className={`w-24 truncate text-center ${textStyle}`}>
                                            {item.month}
                                        </div>
                                        <span className="h-7 w-px bg-gray-300" />
                                        <div className={`flex-1 truncate text-center ${textStyle}`}>
                                            {item.account}
                                        </div>
                                        <span className="h-7 w-px bg-gray-300" />
                                        <div className={`w-48 truncate text-center ${textStyle}`}>
                                            {item.completedDate}
                                        </div>
                                        <span className="h-7 w-px bg-gray-300" />
                                        <div className={`w-48 truncate text-center ${textStyle}`}>
                                            {item.lastEdited}
                                        </div>
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>
            </section>

            <div className="flex-shrink-0">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
}
export default ReportTable;
