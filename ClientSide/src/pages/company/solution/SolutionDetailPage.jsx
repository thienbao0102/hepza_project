import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { findSolutionById } from '@utils/solutionUtils';
import { useSolutions } from '@features/solutions/hooks/useSolutionQueries';
import { useAuth } from '@app/providers/auth/AuthProvider';
import SolutionCard from '@features/solutions/components/SolutionCard';
import { useNotification } from '@app/providers/notification/NotificationProvider';
import LoadingSpinner from '@components/ui/LoadingSpinner';
import 'react-quill/dist/quill.snow.css'; // Added to support Quill editor styles on display
import {
    ArrowLeft,
    FileText,
    ChevronLeft,
    ChevronRight,
    Edit3,
    Trash2,
} from 'lucide-react';
import { Button, Popconfirm } from 'antd';
import toast from '@/utils/toast';
import { mapErrorToNotification } from '@/utils/Error/mapErrorToNotification';
import { handlerDeleteSolution } from '@services/solutionService';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@lib/queryClient';
import { useHeader } from '@/components/common/Header/HeaderContext';

const HorizontalSolutionCarousel = ({ title, solutions, detailBasePath = '/solutions' }) => {
    const listRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    useEffect(() => {
        const handleResize = () => updateControls();
        updateControls();
        const node = listRef.current;
        if (!node) return;

        node.addEventListener('scroll', updateControls);
        window.addEventListener('resize', handleResize);
        return () => {
            node.removeEventListener('scroll', updateControls);
            window.removeEventListener('resize', handleResize);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [solutions]);

    const updateControls = () => {
        const node = listRef.current;
        if (!node) return;
        const { scrollLeft, clientWidth, scrollWidth } = node;
        setCanScrollLeft(scrollLeft > 8);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 8);
    };

    const handleScroll = (direction) => {
        const node = listRef.current;
        if (!node) return;
        node.scrollBy({ left: direction * 520, behavior: 'smooth' });
    };

    return (
        <div className="p-8 bg-white shadow-sm rounded-3xl">
            {title && (
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
                    <Link to={detailBasePath} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                        Xem tất cả
                    </Link>
                </div>
            )}
            <div className="relative">
                <div ref={listRef} className="flex gap-3 overflow-hidden">
                    {solutions.map((item) => {
                        const detailId = item.solution_id || item.id;
                        const detailPath = detailId ? `${detailBasePath}/${encodeURIComponent(detailId)}` : undefined;

                        return (
                            <div key={detailId} className="flex-none">
                                <SolutionCard
                                    solution={item}
                                    detailPath={detailPath}
                                />
                            </div>
                        );
                    })}
                </div>
                <button
                    type="button"
                    onClick={() => handleScroll(-1)}
                    className={`absolute left-0 top-1/2 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg border border-slate-200 transition-all ${canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                    <ChevronLeft size={18} />
                </button>
                <button
                    type="button"
                    onClick={() => handleScroll(1)}
                    className={`absolute right-0 top-1/2 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg border border-slate-200 transition-all ${canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};

const SolutionDetailPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { solutionId } = useParams();
    const decodedId = solutionId ? decodeURIComponent(solutionId) : '';

    const { data: solutions = [], isLoading, isError } = useSolutions();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        // Scroll to top when solution changes
        window.scrollTo(0, 0);
    }, [solutionId]);

    const solution = useMemo(() => findSolutionById(solutions, decodedId), [solutions, decodedId]);
    const postId = solution?.post_id ?? solution?.solution_id;
    const isAdminRoute = location.pathname.startsWith('/admin/solutions');
    const listPath = isAdminRoute ? '/admin/solutions' : '/solutions';
    const canManageSolution = isAdminRoute && user?.role === 'admin';
    const { setHeaderConfig, setBreadcrumbItems } = useHeader();
    useEffect(() => {
        setHeaderConfig({
            title: "Chi tiết giải pháp dành cho doanh nghiệp",
            description: "Tìm hiểu các giải pháp hàng đầu được đề xuất cho ngành của bạn.",
            showWeather: true,
            showDatePicker: true
        })

        setBreadcrumbItems([
            {
                key: '/solutions',
                title: "Giải pháp"
            },
            {
                key: '/solutions/' + (postId || decodedId),
                title: postId ? solution?.solution_name || 'Chi tiết giải pháp' : 'Chi tiết giải pháp'
            },
        ])
    }, [postId, decodedId, solution?.solution_name]);

    const encodedId = useMemo(() => (decodedId ? encodeURIComponent(decodedId) : ''), [decodedId]);

    const handleEdit = useCallback(() => {
        if (!canManageSolution || !encodedId) return;
        navigate(`/admin/solutions/${encodedId}/edit`);
    }, [canManageSolution, encodedId, navigate]);

    const handleDelete = useCallback(async () => {
        if (!canManageSolution || !decodedId || isDeleting) return;
        try {
            setIsDeleting(true);
            await handlerDeleteSolution(decodedId);
            await queryClient.invalidateQueries({ queryKey: queryKeys.solutions.all });
            navigate('/admin/solutions', {
                replace: true,
                state: {
                    notification: {
                        type: 'success',
                        title: 'Đã xóa giải pháp',
                        description: 'Giải pháp đã được gỡ khỏi thư viện.',
                    },
                },
            });
        } catch (error) {
            const errorMessage = error?.response?.data?.message
                || error?.response?.data?.error
                || error?.message
                || 'Không thể xóa giải pháp. Vui lòng thử lại sau.';
            const { title, description } = mapErrorToNotification(error, 'DELETE_SOLUTION');
            toast.error(title ?? 'Không thể xóa giải pháp', description ?? errorMessage);
        } finally {
            setIsDeleting(false);
        }
    }, [canManageSolution, decodedId, isDeleting, navigate, queryClient]);
    const referenceLinks = useMemo(() => {
        const rawLink = solution?.link;
        if (!rawLink) return [];

        const ensureProtocol = (value) => {
            if (!value) return '';
            return /^https?:\/\//i.test(value) ? value : `https://${value}`;
        };

        const asArray = Array.isArray(rawLink) ? rawLink : [rawLink];
        return asArray
            .map((linkValue, index) => {
                const normalized = ensureProtocol(String(linkValue).trim());
                if (!normalized) return null;
                let host = '';
                try {
                    host = new URL(normalized).hostname;
                } catch (error) {
                    host = '';
                }
                return {
                    id: `solution-link-${index}`,
                    label: host || `Tài liệu tham khảo ${index + 1}`,
                    url: normalized,
                    meta: host,
                };
            })
            .filter(Boolean);
    }, [solution?.link]);

    const headerRef = useRef(null);

    useEffect(() => {
        if (headerRef.current) {
            headerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [decodedId]);

    const relatedSolutions = useMemo(() => {
        if (!solution) return [];
        return solutions
            .filter((item) => item.group_solution === solution.group_solution && (item.solution_id || item.id) !== (solution.solution_id || solution.id))
            .slice(0, 8);
    }, [solutions, solution]);

    const normalizedTags = useMemo(() => {
        if (!Array.isArray(solution?.tags)) return [];
        return solution.tags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
    }, [solution?.tags]);

    const longDescriptionItems = useMemo(() => {
        if (typeof solution?.des_long !== 'string') return [];
        return solution.des_long
            .split(/\n+/)
            .map((item) => item.trim())
            .filter(Boolean);
    }, [solution?.des_long]);
    const longDescriptionCount = longDescriptionItems.length;

    if (isError) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="max-w-lg p-10 text-center bg-white shadow-sm rounded-2xl">
                    <h1 className="text-2xl font-semibold text-gray-900">Cannot load solution data</h1>
                    <p className="mt-3 text-gray-600">Please try again later or go back to the solution list.</p>
                    <Link to="/solutions" className="inline-flex mt-6">
                        <Button type="primary" size="large" className="bg-indigo-600 hover:bg-indigo-700">
                            Back to solutions
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen p-8 bg-gray-50">
                <LoadingSpinner tip="Đang tải dữ liệu giải pháp..." />
            </div>
        );
    }

    if (!solution) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="max-w-lg p-10 text-center bg-white shadow-sm rounded-2xl">
                    <h1 className="text-2xl font-semibold text-gray-900">Không tìm thấy giải pháp</h1>
                    <p className="mt-3 text-gray-600">Giải pháp bạn đang tìm kiếm hiện không khả dụng. Vui lòng khám phá danh mục.</p>
                    <Link to={listPath} className="inline-flex mt-6">
                        <Button type="primary" size="large" className="bg-indigo-600 hover:bg-indigo-700">
                            Quay lại danh sách giải pháp
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full overflow-y-auto bg-gray-50">
            <div className="w-full space-y-6">
                <div ref={headerRef} className="p-8 space-y-8 bg-white shadow-sm rounded-3xl">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex flex-col gap-4 flex-1 min-w-0">
                            <h1 className="text-3xl font-bold text-slate-900 break-words">{solution.solution_name}</h1>
                            {normalizedTags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {normalizedTags.map((tag, idx) => (
                                        <span
                                            key={`${tag}-${idx}`}
                                            className="inline-flex items-center px-3 py-1 text-xs font-semibold text-indigo-600 rounded-full bg-indigo-50"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {(solution.des_short || solution.des_long) && (
                                <>
                                    <h2 className="text-xl font-semibold text-slate-900">Mô tả giải pháp</h2>
                                    {solution.des_long ? (
                                        <div className="ql-snow">
                                            <div
                                                className="ql-editor w-full px-0 py-2 text-[15px] leading-relaxed text-slate-700"
                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(solution.des_long) }}
                                                style={{
                                                    wordBreak: 'normal',
                                                    overflowWrap: 'anywhere',
                                                    whiteSpace: 'pre-wrap'
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <p className="w-full leading-relaxed text-slate-600">
                                            {solution.des_short}
                                        </p>
                                    )}
                                </>
                            )}
                        </div>

                        {canManageSolution && (
                            <div className="flex flex-wrap gap-3 lg:w-auto">
                                <Button
                                    icon={<Edit3 size={15} />}
                                    className="!flex !items-center !justify-center gap-1 border border-[#D1D5DB] text-[#A4A7AE] bg-white hover:!border-yellow-400 hover:!text-yellow-500 hover:!bg-yellow-50 px-4 py-[6px] rounded-xl transition-all duration-200 !h-[34px] !leading-none align-middle"
                                    onClick={handleEdit}
                                >
                                    Chỉnh sửa
                                </Button>
                                <Popconfirm
                                    title="Xác nhận xóa giải pháp"
                                    description="Bạn có chắc chắn muốn xóa giải pháp này? Hành động không thể hoàn tác."
                                    okText="Xóa"
                                    cancelText="Hủy"
                                    placement="bottomRight"
                                    onConfirm={handleDelete}
                                >
                                    <Button
                                        danger
                                        icon={<Trash2 size={18} />}
                                        size="middle"
                                        loading={isDeleting}
                                        className="!flex !items-center !justify-center gap-1 border border-[#F87171] text-[#F87171] bg-white hover:!bg-[#FEE2E2] hover:!border-[#F87171] hover:!text-[#DC2626] px-4 py-[6px] rounded-xl transition-all duration-200 !h-[34px] !leading-none align-middle"
                                    >
                                        Xóa
                                    </Button>
                                </Popconfirm>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="p-6 space-y-5 bg-white border rounded-2xl border-slate-200">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <FileText size={18} className="text-[#4E5BA6]" />
                                Tài liệu và nguồn tham khảo liên quan
                            </div>
                            {referenceLinks.length > 0 ? (
                                <div className="grid gap-3">
                                    {referenceLinks.map((doc) => (
                                        <a
                                            key={doc.id}
                                            href={doc.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center justify-between px-4 py-3 text-sm border rounded-xl border-slate-100 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50"
                                        >
                                            <span>{doc.label}</span>
                                            {doc.meta && (
                                                <span className="text-xs text-slate-400">
                                                    <a
                                                        href={doc.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-[#4E5BA6] hover:text-[#2563EB] font-medium"
                                                    >
                                                        Đi đến
                                                    </a>{' '}
                                                </span>
                                            )}
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <div className="px-4 py-6 text-sm text-center border border-dashed rounded-xl text-slate-500 bg-slate-50 border-slate-200">
                                    Chưa có tài liệu tham khảo cho giải pháp này.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {relatedSolutions.length > 0 && (
                    <HorizontalSolutionCarousel
                        title="Giải pháp liên quan"
                        solutions={relatedSolutions}
                        detailBasePath={listPath}
                    />
                )}
            </div>
        </div>
    );
};

export default SolutionDetailPage;
