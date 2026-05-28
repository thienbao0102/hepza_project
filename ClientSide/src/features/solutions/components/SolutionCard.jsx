import React, { useMemo } from "react";
import { Button } from "antd";
import { Link } from "react-router-dom";
import { Calendar, Link as LinkIcon } from "lucide-react";

const TAG_COLOR_MAP = {
    congnghesohoa: "bg-indigo-50 text-indigo-600",
    tudonghoa: "bg-sky-50 text-sky-600",
    quanlynguyenvatlieu: "bg-emerald-50 text-emerald-600",
    toiuuhoachuoicungung: "bg-amber-50 text-amber-600",
    taisudung: "bg-rose-50 text-rose-600",
    taiche: "bg-purple-50 text-purple-600",
    hoachatnguyhai: "bg-red-50 text-red-600",
    quanlyhoachat: "bg-cyan-50 text-cyan-600",
    thaythehoachat: "bg-lime-50 text-lime-600",
    daotaonangcaonhanthuc: "bg-orange-50 text-orange-600",
    nangluongtaitao: "bg-yellow-50 text-yellow-600",
    quanlynangluong: "bg-teal-50 text-teal-600",
    toiuuhoahieusuat: "bg-pink-50 text-pink-600",
    taichinhxanh: "bg-green-50 text-green-600",
    ungdungcongnghe: "bg-blue-50 text-blue-600",
    quanlynuoc: "bg-slate-100 text-slate-700",
    sohoa: "bg-violet-50 text-violet-600",
    taisudungnuoc: "bg-fuchsia-50 text-fuchsia-600",
    kiemtoannuoc: "bg-neutral-100 text-neutral-600",
};

const FALLBACK_TAG_CLASSES = [
    "bg-indigo-50 text-indigo-600",
    "bg-sky-50 text-sky-600",
    "bg-emerald-50 text-emerald-600",
    "bg-amber-50 text-amber-600",
    "bg-pink-50 text-pink-600",
    "bg-purple-50 text-purple-600",
];

const normalizeTags = (tags) => {
    if (!Array.isArray(tags)) return [];
    return tags
        .map((tag) => {
            if (!tag) return null;
            if (typeof tag === "string") return tag.trim();
            const value = tag.name || tag.label || tag.title || tag.hashtag_name || tag.tag_name || null;
            return value ? String(value).trim() : null;
        })
        .filter(Boolean);
};

const ensureHashPrefix = (tag) => {
    if (!tag) return "";
    return tag.startsWith('#') ? tag : `#${tag}`;
};

const getTagClasses = (tagLabel, index) => {
    const key = tagLabel.replace(/^#/, "").toLowerCase();
    return TAG_COLOR_MAP[key] || FALLBACK_TAG_CLASSES[index % FALLBACK_TAG_CLASSES.length];
};

const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "";
    }
    const day = `${date.getDate()}`.padStart(2, "0");
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const SolutionCard = ({
    solution = {},
    size = "default",
    layout = "fixed",
    detailPath: detailPathProp,
    onViewDetails,
    viewButtonLabel = "Xem chi tiết",
}) => {
    const {
        solution_name,
        des_short,
        tags = [],
        link = "",
        title,
        description,
        createdAt,
        created_at,
    } = solution || {};

    const displayName = solution_name || title || "Giải pháp chưa có tên";
    const displayDescription = des_short || description || "Mô tả đang được cập nhật.";
    const normalizedTags = useMemo(() => normalizeTags(tags).map(ensureHashPrefix), [tags]);
    const linkCount = link ? 1 : 0;
    const displayDate = formatDate(createdAt || created_at);
    const detailId = solution.solution_id || solution.id || "";
    const defaultDetailPath = detailId ? `/solutions/${encodeURIComponent(detailId)}` : '#';
    const detailPath = detailPathProp ?? defaultDetailPath;
    const isDetailPathDisabled = detailPath === '#';
    const isSmall = size === "small";

    const isGridLayout = layout === 'grid';
    const cardHeightClass = isSmall ? 'h-64' : 'h-50';
    const containerClass = isGridLayout
        ? `w-full min-w-0 bg-white border border-slate-200 rounded-3xl hover hover:border-slate-300 transition-all duration-300 ${isSmall ? 'p-4' : 'p-4'} flex flex-col justify-between overflow-hidden ${cardHeightClass}`
        : `w-[500px] min-w-[500px] max-w-[500px] bg-white border border-slate-200 rounded-3xl hover hover:border-slate-300 transition-all duration-300 ${isSmall ? 'p-4' : 'p-4'} flex flex-col justify-between overflow-hidden ${cardHeightClass}`;

    return (
        <div className={containerClass}>
            <div className="flex-1 overflow-hidden flex flex-col gap-3">
                <h3 className={`font-semibold text-slate-900 leading-snug ${isSmall ? "text-lg" : "text-xl"} line-clamp-2 truncate`}>
                    {displayName}
                </h3>

                <div className="flex-1 overflow-hidden flex flex-col gap-3">
                    {displayDescription && (
                        <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                            {displayDescription}
                        </p>
                    )}

                    {normalizedTags.length > 0 && (
                        <div className="flex flex-nowrap gap-2">
                            {normalizedTags.map((tagLabel, index) => (
                                <span
                                    key={`${tagLabel}-${index}`}
                                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium !bg-[#4E5BA6]/13 !text-[#4E5BA6] ${getTagClasses(tagLabel, index)}`}
                                >
                                    {tagLabel}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-3 text-slate-500 text-xs">
                    {displayDate && (
                        <>
                            <span className="flex items-center gap-1.5">
                                <Calendar size={16} className="text-slate-400" />
                                {displayDate}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <LinkIcon size={16} className="text-slate-400" />
                                {linkCount}
                            </span>
                        </>
                    )}
                </div>
                <div className="flex text-slate-500 text-xs gap-2">
                    {onViewDetails ? (
                        <Button
                            type="primary"
                            size="middle"
                            className="!font !bg-[#4E5BA6] !border-[#4E5BA6] hover:!bg-[#3b457f] hover:!border-[#3b457f] rounded-xl"
                            onClick={() => onViewDetails(solution)}
                        >
                            {viewButtonLabel}
                        </Button>
                    ) : (
                        <Link to={detailPath} className={isDetailPathDisabled ? 'pointer-events-none opacity-60' : ''}>
                            <Button
                                type="primary"
                                size="middle"
                                className="!font !bg-[#4E5BA6] !border-[#4E5BA6] hover:!bg-[#3b457f] hover:!border-[#3b457f] rounded-xl"
                                onClick={(event) => {
                                    if (isDetailPathDisabled) {
                                        event.preventDefault();
                                    }
                                }}
                            >
                                {viewButtonLabel}
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SolutionCard;
