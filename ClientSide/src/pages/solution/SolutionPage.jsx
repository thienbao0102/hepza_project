import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Collapse } from 'antd';
import { ChevronLeft, ChevronRight, HelpCircle, ChevronDown } from 'lucide-react';
import { useSolutions, useSolutionsPaginated } from '@features/solutions/hooks/useSolutionQueries';
import toast from '@/utils/toast';
import SolutionCard from '@features/solutions/components/SolutionCard';
import ButtonFilter from '@components/ui/ButtonFilter';
import SearchBox from '@components/ui/SearchBox';
import { AddButton } from '@components/ui/Button';
import LoadingSpinner from '@components/ui/LoadingSpinner';
import { GROUP_SOLUTIONS, formatTags } from '@utils/solutionUtils';
import { useHeader } from '@/components/common/Header/HeaderContext';
import { useAuth } from '@app/providers/auth/AuthProvider';
import RegulationManager from '@pages/regulation/RegulationManager';
import dayjs from 'dayjs';

const SCROLL_STEP = 520;
const FALLBACK_GROUP = 'Khác';

const GROUP_META = {
    [GROUP_SOLUTIONS[0]]: {
        description: 'Các giải pháp tối ưu hóa chuỗi cung ứng và quản lý nguyên liệu đầu vào.',
    },
    [GROUP_SOLUTIONS[1]]: {
        description: 'Đảm bảo an toàn hóa chất, tuân thủ quy chuẩn và nâng cao nhận thức nội bộ.',
    },
    [GROUP_SOLUTIONS[2]]: {
        description: 'Theo dõi, tối ưu mức tiêu thụ năng lượng và thúc đẩy quá trình chuyển đổi xanh.',
    },
    [GROUP_SOLUTIONS[3]]: {
        description: 'Quản lý nguồn nước, tái sử dụng và giám sát chất lượng theo thời gian thực.',
    },
};

const faqs = [
    {
        key: 'faq-1',
        label: 'Làm thế nào để lựa chọn giải pháp phù hợp?',
        children: (
            <p className="text-sm leading-relaxed text-slate-600">
                Trước hết, doanh nghiệp cần xác định lĩnh vực ưu tiên mà mình quan tâm (nguyên vật liệu, hóa chất, năng lượng hoặc nước). Sau đó, tiến hành so sánh các giải pháp trong nhóm tương ứng và đánh giá dựa trên chi phí, thời gian triển khai cũng như hiệu quả dài hạn.
            </p>
        ),
    },
    {
        key: 'faq-2',
        label: 'Các giải pháp có hỗ trợ tùy chỉnh theo doanh nghiệp không?',
        children: (
            <p className="text-sm leading-relaxed text-slate-600">
                Phần lớn các giải pháp đều đi kèm với đội ngũ tư vấn hỗ trợ. Doanh nghiệp có thể đặt lịch tư vấn trực tiếp ngay tại từng trang giải pháp để nhận được lộ trình triển khai phù hợp với tình hình thực tế.
            </p>
        ),
    },
    {
        key: 'faq-3',
        label: 'Thời gian triển khai trung bình mất bao lâu?',
        children: (
            <p className="text-sm leading-relaxed text-slate-600">
                Thời gian triển khai phụ thuộc vào quy mô và mức độ phức tạp của dự án. Khảo sát thực tế cho thấy, các giải pháp thường cần từ 2 đến 6 tháng để triển khai và bắt đầu tạo ra những kết quả ban đầu.
            </p>
        ),
    },
    {
        key: 'faq-4',
        label: 'Có chương trình hỗ trợ tài chính hoặc ưu đãi nào không?',
        children: (
            <p className="text-sm leading-relaxed text-slate-600">
                Các giải pháp thuộc nhóm tài chính xanh hoặc năng lượng tái tạo thường đi kèm với các gói vay ưu đãi. Doanh nghiệp vui lòng tham khảo phần liên hệ hoặc tài liệu đính kèm trong từng giải pháp để biết thêm thông tin chi tiết.
            </p>
        ),
    },
];

const SolutionGroupSection = ({ groupKey, meta, detailBasePath, allPath = '/solutions/all', search = '', externalFilters = {} }) => {
    const [page, setPage] = useState(1);
    const [allSolutions, setAllSolutions] = useState([]);
    const limit = 5;

    const dateRangeKey = externalFilters?.date_range?.from && externalFilters?.date_range?.to
        ? `${dayjs(externalFilters.date_range.from).format('YYYY-MM-DD')}_${dayjs(externalFilters.date_range.to).format('YYYY-MM-DD')}`
        : '';

    useEffect(() => {
        setPage(1);
        setAllSolutions([]);
    }, [search, JSON.stringify(externalFilters?.tags), dateRangeKey]);

    const { data, isLoading, isFetching } = useSolutionsPaginated(
        {
            group_solution: groupKey,
            page,
            limit,
            search: search || undefined,
            tags: externalFilters?.tags?.length > 0 ? externalFilters.tags : undefined,
            date_from: externalFilters?.date_range?.from ? dayjs(externalFilters.date_range.from).startOf('day').toISOString() : undefined,
            date_to: externalFilters?.date_range?.to ? dayjs(externalFilters.date_range.to).endOf('day').toISOString() : undefined,
        },
        {
            keepPreviousData: true,
        }
    );

    useEffect(() => {
        if (data?.solutionData) {
            setAllSolutions(prev => {
                const existingIds = new Set(prev.map(s => s.solution_id));
                const uniqueNew = data.solutionData.filter(s => !existingIds.has(s.solution_id));
                if (uniqueNew.length === 0) return prev;
                return [...prev, ...uniqueNew];
            });
        }
    }, [data?.solutionData]);

    const listRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const pagination = data?.pagination || {};
    const hasMore = pagination.hasMore;

    const updateControls = useCallback(() => {
        const node = listRef.current;
        if (!node) return;
        const { scrollLeft, clientWidth, scrollWidth } = node;
        setCanScrollLeft(scrollLeft > 8);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 8 || hasMore);
    }, [hasMore]);

    useEffect(() => {
        updateControls();
        const node = listRef.current;
        if (!node) return;

        node.addEventListener('scroll', updateControls);
        window.addEventListener('resize', updateControls);
        return () => {
            node.removeEventListener('scroll', updateControls);
            window.removeEventListener('resize', updateControls);
        };
    }, [allSolutions, updateControls]);

    const handleScroll = (direction) => {
        const node = listRef.current;
        if (!node) return;

        if (direction === 1) {
            const { scrollLeft, clientWidth, scrollWidth } = node;
            const isNearEnd = scrollLeft + clientWidth >= scrollWidth - 50;

            if (isNearEnd && hasMore && !isFetching) {
                setPage(prev => prev + 1);
            }
        }

        node.scrollBy({ left: direction * SCROLL_STEP, behavior: 'smooth' });
    };

    if (!allSolutions.length && !isLoading) return null;

    return (
        <section className="rounded-3xl">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                        {groupKey}
                    </h3>
                    {meta?.description && <p className="mt-2 text-sm text-slate-500">{meta.description}</p>}
                </div>
                <Link
                    to={`${allPath}?group=${encodeURIComponent(groupKey)}`}
                    className="text-sm font-medium text-[#4E5BA6] hover:text-indigo-500"
                >
                    Xem tất cả ({pagination.total || allSolutions.length})
                </Link>
            </div>
            <div className="relative mt-4">
                <div
                    ref={listRef}
                    className="flex gap-4 overflow-hidden pb-4 -mb-4 pt-2 -mt-2 px-1 -mx-1"
                >
                    {allSolutions.map((solution) => {
                        const detailId = solution.solution_id || solution.id;
                        const detailPath = detailBasePath && detailId
                            ? `${detailBasePath}/${encodeURIComponent(detailId)}`
                            : undefined;

                        return (
                            <div
                                key={detailId}
                                className="flex-none w-[500px]"
                            >
                                <SolutionCard
                                    solution={solution}
                                    detailPath={detailPath}
                                />
                            </div>
                        );
                    })}
                    {isFetching && (
                        <div className="flex-none w-[100px] flex items-center justify-center">
                            <LoadingSpinner size="small" />
                        </div>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => handleScroll(-1)}
                    className={`absolute left-0 top-1/2 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 transition-all z-10 ${canScrollLeft ? 'opacity-100 shadow-md' : 'opacity-0 pointer-events-none'}`}
                >
                    <ChevronLeft size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => handleScroll(1)}
                    className={`absolute right-0 top-1/2 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200 transition-all z-10 ${canScrollRight || hasMore ? 'opacity-100 shadow-md' : 'opacity-0 pointer-events-none'}`}
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </section>
    );
};

// ─── Shared Solution Page ────────────────────────────────────────────
const SolutionPage = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const role = user?.role || 'company';

    // Determine base paths based on role
    const basePath = useMemo(() => {
        if (role === 'admin') return '/admin/solutions';
        if (role === 'manager') return '/manager/solutions';
        return '/solutions';
    }, [role]);

    const { setHeaderConfig } = useHeader();
    const navigate = useNavigate();
    const location = useLocation();

    const [activeTab, setActiveTab] = useState('decrees');
    const [searchText, setSearchText] = useState('');
    const [filters, setFilters] = useState({ group_solution: [], tags: [], date_range: null });

    const { data: solutionsData = [], isLoading: isSolutionsLoading, isError: isSolutionsError } = useSolutions();

    // Handle incoming notifications (e.g. after creating/editing a solution)
    useEffect(() => {
        const incomingNotification = location.state?.notification;
        if (incomingNotification) {
            toast({
                type: incomingNotification.type || 'success',
                title: incomingNotification.title || 'Thông báo',
                description: incomingNotification.description || '',
            });
            navigate(location.pathname, { replace: true, state: null });
        }
    }, [location.pathname, location.state, navigate]);

    const existingSolutions = useMemo(() => {
        return (solutionsData || []).map((item) => {
            const normalizedTags = formatTags(item?.tags || []);
            return {
                ...item,
                solution_id: item?.solution_id || item?.id || '',
                tags: normalizedTags,
            };
        });
    }, [solutionsData]);

    useEffect(() => {
        const isSolution = activeTab === 'solutions';
        setHeaderConfig({
            title: isSolution
                ? (isAdmin ? "Quản lý giải pháp" : "Giải pháp dành cho doanh nghiệp")
                : (isAdmin ? "Quản lý nghị định & Quy chuẩn" : "Nghị định & Quy chuẩn môi trường"),
            description: isSolution
                ? (isAdmin
                    ? "Tất cả giải pháp đang có trong hệ thống"
                    : "Tìm hiểu các giải pháp hàng đầu được đề xuất cho ngành của bạn.")
                : "Hệ thống văn bản pháp quy và nghị định môi trường",
            showWeather: true,
            showDatePicker: !isAdmin && isSolution,
            showTotalItem: isAdmin && isSolution,
            totalItem: isAdmin && isSolution
                ? (existingSolutions.length ? existingSolutions.length.toLocaleString() : '0')
                : undefined,
            breadcrumbItems: [
                {
                    key: '/solutions',
                    title: isSolution ? "Giải pháp" : "Nghị định"
                },
            ],
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingSolutions.length, activeTab, isAdmin]);

    const handleSearch = (query) => {
        setSearchText(query.toLowerCase());
    };

    const handleFilter = (selectedFilters) => {
        setFilters(selectedFilters);
    };

    const handleAddNew = () => navigate(`${basePath}/create`);

    const uniqueTags = useMemo(() => {
        const tags = new Set();
        existingSolutions.forEach(solution => {
            if (Array.isArray(solution.tags)) {
                solution.tags.forEach(tag => tags.add(tag));
            }
        });
        return Array.from(tags).sort();
    }, [existingSolutions]);

    const filterOptions = useMemo(() => {
        return {
            group_solution: GROUP_SOLUTIONS,
            tags: uniqueTags,
            date_range: {},
        };
    }, [uniqueTags]);

    const fieldLabels = {
        group_solution: 'Nhóm giải pháp',
        tags: 'Tags (Thẻ)',
        date_range: 'Khoảng thời gian',
    };

    const filteredData = useMemo(() => {
        return existingSolutions.filter((item) => {
            const normalizedSearch = searchText.trim().toLowerCase();
            const matchesSearch = !normalizedSearch
                || (item.solution_name || '').toLowerCase().includes(normalizedSearch)
                || (item.des_short || '').toLowerCase().includes(normalizedSearch)
                || (item.group_solution || '').toLowerCase().includes(normalizedSearch)
                || (item.tags || []).some((tag) => String(tag).toLowerCase().includes(normalizedSearch));

            const matchesGroup = !filters.group_solution?.length
                || filters.group_solution.includes(item.group_solution);

            const matchesDate = (() => {
                if (!filters.date_range?.from && !filters.date_range?.to) return true;
                const rawDate = item.created_at || item.createdAt;
                const itemDate = rawDate ? dayjs(rawDate) : null;
                if (!itemDate) return false;
                const from = filters.date_range.from ? dayjs(filters.date_range.from).startOf('day') : null;
                const to = filters.date_range.to ? dayjs(filters.date_range.to).endOf('day') : null;
                if (from && to) return (itemDate.isSame(from) || itemDate.isAfter(from)) && (itemDate.isSame(to) || itemDate.isBefore(to));
                if (from) return itemDate.isSame(from) || itemDate.isAfter(from);
                if (to) return itemDate.isSame(to) || itemDate.isBefore(to);
                return true;
            })();

            const matchesTags = !filters.tags?.length
                || (item.tags || []).some(tag => filters.tags.includes(tag));

            return matchesSearch && matchesGroup && matchesDate && matchesTags;
        });
    }, [existingSolutions, searchText, filters]);

    const groupedSolutions = useMemo(() => {
        const map = new Map();
        filteredData.forEach((solution) => {
            const key = GROUP_SOLUTIONS.includes(solution.group_solution) ? solution.group_solution : FALLBACK_GROUP;
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key).push(solution);
        });
        return map;
    }, [filteredData]);

    const hasSolutions = Array.from(groupedSolutions.values()).some((list) => list.length > 0);

    return (
        <div className="h-full overflow-y-auto bg-gray-50 space-y-[18px]">

            <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-md pb-2 pt-1 -mt-1 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-1">
                {/* Tab switcher */}
                <div className="flex p-1.5 bg-slate-200/60 backdrop-blur-md rounded-2xl w-fit">
                    <button
                        onClick={() => setActiveTab('decrees')}
                        className={`
                            flex items-center gap-2.5 px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300
                            ${activeTab === 'decrees'
                                ? 'bg-white text-[#4E5BA6] shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'}
                        `}
                    >
                        Nghị định
                    </button>
                    <button
                        onClick={() => setActiveTab('solutions')}
                        className={`
                            flex items-center gap-2.5 px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300
                            ${activeTab === 'solutions'
                                ? 'bg-white text-[#4E5BA6] shadow-sm'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'}
                        `}
                    >
                        Giải pháp
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex flex-1 h-9 gap-2 justify-end items-center min-w-0">
                    {activeTab === 'solutions' && (
                        <>
                            <ButtonFilter
                                onFilter={handleFilter}
                                filterOptions={filterOptions}
                                fieldLabels={fieldLabels}
                                selectedFilters={filters}
                                setSelectedFilters={setFilters}
                            />
                            <div className="w-full h-full max-w-xs">
                                <SearchBox
                                    placeholder='Tìm kiếm giải pháp...'
                                    onSearch={handleSearch}
                                />
                            </div>

                            {/* Only admin can add solutions */}
                            {isAdmin && (
                                <AddButton
                                    text='Thêm giải pháp'
                                    onClick={handleAddNew}
                                />
                            )}
                        </>
                    )}
                    <div id="regulation-toolbar-portal" className="contents"></div>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {activeTab === 'solutions' ? (
                    isSolutionsError ? (
                        <div className="px-4 py-3 text-sm border rounded-2xl border-slate-200 bg-rose-50 text-rose-600">
                            Không thể tải dữ liệu giải pháp. Vui lòng thử lại sau.
                        </div>
                    ) : isSolutionsLoading ? (
                        <LoadingSpinner wrapperClassName="h-full" />
                    ) : (
                        GROUP_SOLUTIONS
                            .filter(groupKey => !filters.group_solution?.length || filters.group_solution.includes(groupKey))
                            .map((groupKey) => {
                                const meta = GROUP_META[groupKey] || { description: '' };
                                return (
                                    <SolutionGroupSection
                                        key={groupKey}
                                        groupKey={groupKey}
                                        meta={meta}
                                        detailBasePath={basePath}
                                        allPath={`${basePath}/all`}
                                        search={searchText}
                                        externalFilters={filters}
                                    />
                                );
                            })
                    )
                ) : (
                    <RegulationManager />
                )}
            </div>

            <div className="px-0 mt-12">
                <div className="relative overflow-hidden border border-indigo-100 rounded-3xl bg-gradient-to-br from-slate-50 via-white to-indigo-50">
                    <div className="absolute w-48 h-48 bg-indigo-100 rounded-full -top-12 -right-16 blur-3xl" />
                    <div className="absolute w-40 h-40 rounded-full -bottom-12 -left-12 bg-sky-100 blur-3xl" />
                    <div className="relative grid gap-6 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:p-8">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#4E5BA6]">
                                <HelpCircle size={14} />
                                {isAdmin ? 'Hỗ trợ quản trị viên' : 'Hỗ trợ doanh nghiệp'}
                            </div>
                            <h3 className="mt-3 text-[22px] font-semibold text-slate-900">Câu hỏi thường gặp</h3>
                            <p className="mt-2 text-sm text-slate-500">
                                {isAdmin
                                    ? 'Tổng hợp thắc mắc phổ biến trong quá trình quản lý và cập nhật giải pháp cho doanh nghiệp.'
                                    : 'Tổng hợp thắc mắc phổ biến về lựa chọn và triển khai giải pháp chuyển đổi số, môi trường và năng lượng.'}
                            </p>
                        </div>
                        <Collapse
                            bordered={false}
                            expandIcon={({ isActive }) => (
                                <ChevronDown
                                    size={18}
                                    className={`transition-transform ${isActive ? 'rotate-180 text-indigo-600' : 'text-slate-400'}`}
                                />
                            )}
                            items={faqs.map((faq) => ({
                                key: faq.key,
                                label: <span className="text-base font-medium text-slate-800">{faq.label}</span>,
                                children: faq.children,
                                className: 'bg-white/90 backdrop-blur-sm rounded-2xl mb-3 px-5 py-4 border border-slate-100',
                            }))}
                            className="faq-collapse [&_.ant-collapse-item]:border-0 [&_.ant-collapse-content]:bg-transparent"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SolutionPage;
