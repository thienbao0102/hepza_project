import React from "react";
import { Building2, ShieldCheck } from "lucide-react";

const ManagerScopeBanner = ({
    zoneName,
    zoneId,
    title,
    description,
    className = "",
}) => {
    const resolvedZoneLabel = zoneName || zoneId;
    if (!resolvedZoneLabel) return null;

    return (
        <div className={`rounded-2xl border border-[#4E5BA6]/15 bg-gradient-to-r from-[#EEF2FF] via-white to-[#F8FAFC] px-4 py-3 shadow-sm ${className}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#4E5BA6] text-white shadow-lg shadow-[#4E5BA6]/15">
                        <Building2 size={20} />
                    </div>
                    <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#4E5BA6]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#4E5BA6]">
                                Phạm vi quản lý
                            </span>
                            <span className="text-sm font-semibold text-slate-900">
                                {title || `Bạn đang quản lý KCN ${resolvedZoneLabel}`}
                            </span>
                        </div>
                        <p className="text-sm leading-relaxed text-slate-600">
                            {description || `Mọi thao tác trên màn hình này chỉ áp dụng cho dữ liệu thuộc KCN ${resolvedZoneLabel}.`}
                        </p>
                    </div>
                </div>

                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                    <ShieldCheck size={14} className="text-[#4E5BA6]" />
                    <span className="truncate">{resolvedZoneLabel}</span>
                </div>
            </div>
        </div>
    );
};

export default ManagerScopeBanner;
