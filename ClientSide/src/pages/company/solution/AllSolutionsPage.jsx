import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GROUP_SOLUTIONS, groupSolutionsByCategory, filterSolutionsByKeyword } from "@utils/solutionUtils";
import SolutionCard from "@features/solutions/components/SolutionCard";
import SearchBox from "@components/ui/SearchBox";
import LoadingSpinner from "@components/ui/LoadingSpinner";
import { ArrowLeft } from "lucide-react";
import { useSolutions } from "@features/solutions/hooks/useSolutionQueries";
import { useHeader } from '@/components/common/Header/HeaderContext';

const allLabel = "Tất cả";
const groupOptions = [allLabel, ...GROUP_SOLUTIONS];

const groupDescriptions = {
    [GROUP_SOLUTIONS[0]]: "Quản lý nguồn nguyên liệu ổn định, minh bạch và tiết kiệm.",
    [GROUP_SOLUTIONS[1]]: "Đảm bảo an toàn hóa chất và tuân thủ quy định.",
    [GROUP_SOLUTIONS[2]]: "Tối ưu hiệu suất năng lượng và thúc đẩy mục tiêu ESG.",
    [GROUP_SOLUTIONS[3]]: "Giám sát và tái sử dụng nguồn nước hiệu quả.",
};

const AllSolutionsPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const basePath = location.pathname.startsWith("/admin/solutions") ? "/admin/solutions" : "/solutions";
    const { setHeaderConfig, setBreadcrumbItems } = useHeader();

    const [activeGroup, setActiveGroup] = useState(() => {
        const params = new URLSearchParams(location.search);
        const initialGroup = params.get("group");
        if (initialGroup && GROUP_SOLUTIONS.includes(initialGroup)) {
            return initialGroup;
        }
        return allLabel;
    });
    const [searchQuery, setSearchQuery] = useState("");

    const { data: solutions = [], isLoading, isError } = useSolutions();
    const solutionsByGroup = useMemo(() => groupSolutionsByCategory(solutions), [solutions]);
    const allSolutions = useMemo(() => solutions, [solutions]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const groupParam = params.get("group");
        const nextGroup = groupParam && GROUP_SOLUTIONS.includes(groupParam) ? groupParam : allLabel;
        setActiveGroup((prev) => (prev === nextGroup ? prev : nextGroup));
    }, [location.search]);
    

    const handleGroupSelect = (label) => {
        if (label !== activeGroup) {
            setActiveGroup(label);
        }
        const params = new URLSearchParams(location.search);
        if (label === allLabel) {
            params.delete("group");
        } else {
            params.set("group", label);
        }
        const searchString = params.toString();
        navigate(`${location.pathname}${searchString ? `?${searchString}` : ""}`);
    };

    const filteredSolutions = useMemo(() => {
        const baseList = activeGroup === allLabel ? allSolutions : solutionsByGroup[activeGroup] || [];
        return filterSolutionsByKeyword(baseList, searchQuery);
    }, [activeGroup, allSolutions, searchQuery, solutionsByGroup]);

    const activeCount = filteredSolutions.length;

    return (
        <div className="h-full overflow-y-auto bg-white">
            <div className="p-8 bg-white border-b border-slate-100">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <Link
                            to={basePath}
                            className="inline-flex items-center gap-2 mb-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                            <ArrowLeft size={16} /> Quay lại trang giải pháp
                        </Link>
                        <h1 className="text-3xl font-bold text-gray-900">Tất cả giải pháp</h1>
                        <p className="max-w-2xl mt-2 text-sm text-gray-500">
                            Duyệt toàn bộ thư viện giải pháp theo từng nhóm quản lý. Sử dụng bộ lọc nhanh bên dưới để tìm đúng nội dung bạn cần.
                        </p>
                    </div>
                    <div className="w-full max-w-md">
                        <SearchBox
                            placeholder="Tìm theo tên giải pháp, mô tả hoặc hashtag..."
                            onSearch={(value) => setSearchQuery(value)}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 mt-6">
                    {groupOptions.map((label) => {
                        const isActive = activeGroup === label;
                        const description = groupDescriptions[label];
                        return (
                            <button
                                key={label}
                                type="button"
                                onClick={() => handleGroupSelect(label)}
                                className={`group flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${isActive
                                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                                    }`}
                            >
                                <span>{label}</span>
                                {label !== allLabel && (
                                    <span className={`text-xs font-semibold ${isActive ? "text-white/90" : "text-slate-400 group-hover:text-indigo-500"}`}>
                                        {(solutionsByGroup[label] || []).length}
                                    </span>
                                )}
                                {!isActive && description && (
                                    <span className="hidden pl-3 text-xs text-slate-400 group-hover:inline">
                                        {description}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="p-2">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800">
                            {activeGroup === allLabel ? "Danh sách tất cả giải pháp" : `Nhóm ${activeGroup.toLowerCase()}`}
                        </h2>
                        {activeGroup !== allLabel && groupDescriptions[activeGroup] && (
                            <p className="text-sm text-slate-500">{groupDescriptions[activeGroup]}</p>
                        )}
                    </div>
                    <span className="text-sm text-slate-500">{activeCount} giải pháp</span>
                </div>

                {isError ? (
                    <div className="p-12 mt-6 text-center border rounded-3xl border-slate-200 bg-rose-50 text-rose-600">
                        Không thể tải dữ liệu giải pháp. Vui lòng thử lại sau.
                    </div>
                ) : isLoading ? (
                    <div className="p-12 mt-6 text-center border rounded-3xl border-slate-100 bg-slate-50">
                        <LoadingSpinner tip="Đang tải dữ liệu giải pháp..." />
                    </div>
                ) : activeCount === 0 ? (
                    <div className="p-12 mt-6 text-center border border-dashed rounded-3xl border-slate-200 text-slate-500">
                        Không tìm thấy giải pháp phù hợp. Hãy chỉnh lại bộ lọc hoặc thử từ khóa khác.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 mt-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                        {filteredSolutions.map((solution) => (
                            <SolutionCard key={solution.solution_id || solution.id} solution={solution} layout="grid" />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AllSolutionsPage;

