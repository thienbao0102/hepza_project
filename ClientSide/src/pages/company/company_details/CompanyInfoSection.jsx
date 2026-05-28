import React, { useState, useEffect, useMemo } from 'react';
import BusinessCenterRoundedIcon from '@mui/icons-material/BusinessCenterRounded';
import { Globe, Factory, MapPin, Users, Briefcase, Edit, X, List, Hash } from 'lucide-react';
import { useUpdateCompany } from "@features/enterprises/hooks/useCompanyMutations";
import { handlerGetAllIndustries, handlerGetAllIndustryGroups } from "@services/industryService";
import { handlerLookupTaxCode } from "@services/taxLookupService";
import { Select, ConfigProvider } from 'antd';
import toast from '@/utils/toast';
import { buildIdNameMaps, mapSelectionToNames, normalizeSelectionToIds } from '@/utils/industryValueUtils';
import { HardDriveDownload, Hash as HashIcon } from 'lucide-react';

// Re-importing lucide icons correctly since 'lucide-center' was a typo in previous thought/context
import { Hash as HashLucide, Globe as GlobeLucide, Factory as FactoryLucide, MapPin as MapPinLucide, Users as UsersLucide, Briefcase as BriefcaseLucide, Edit as EditLucide, X as XLucide, List as ListLucide } from 'lucide-react';

const CompanyInfoSection = ({ role, company, zone }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [isTaxLookupLoading, setIsTaxLookupLoading] = useState(false);

    // Industry Data State
    const [industryGroups, setIndustryGroups] = useState([]);
    const [allIndustries, setAllIndustries] = useState([]);

    const updateCompanyMutation = useUpdateCompany();

    // Fetch Industries Data
    useEffect(() => {
        const abortController = new AbortController();

        const fetchIndustryData = async () => {
            try {
                const [industryGroupsResponse, industriesResponse] = await Promise.all([
                    handlerGetAllIndustryGroups({ page: 1, limit: 1000 }, undefined, undefined, abortController.signal),
                    handlerGetAllIndustries({ page: 1, limit: 1000 }, undefined, undefined, undefined, abortController.signal),
                ]);

                if (Array.isArray(industryGroupsResponse.groups)) setIndustryGroups(industryGroupsResponse.groups);
                if (industriesResponse.industries) setAllIndustries(industriesResponse.industries);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error("Failed to fetch industry data:", error);
                }
            }
        };

        fetchIndustryData();
        return () => abortController.abort();
    }, []);

    useEffect(() => {
        if (company) {
            setFormData({
                company_name: company.company_name || '',
                company_registration_number: (company.company_registration_number && !company.company_registration_number.startsWith('REG-')) ? company.company_registration_number : '',
                website: company.website || '',
                address: company.address || '',
                total_workers: company.total_workers || '',
                industry_group: normalizeSelectionToIds(company.industry_group, buildIdNameMaps(industryGroups, 'group_id', 'group_name')),
                industry: normalizeSelectionToIds(company.industry, buildIdNameMaps(allIndustries, 'industry_id', 'industry_name')),
            });
        }
    }, [allIndustries, company, industryGroups]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (!company?.company_id) return;

        updateCompanyMutation.mutate(
            {
                company_id: company.company_id,
                companyData: {
                    ...company,
                    company_name: formData.company_name,
                    company_registration_number: formData.company_registration_number,
                    website: formData.website,
                    address: formData.address,
                    total_workers: formData.total_workers ? Number(formData.total_workers) : null,
                    industry_group: formData.industry_group,
                    industry: formData.industry,
                }
            },
            {
                onSuccess: () => {
                    toast.success("Thành công", "Cập nhật thông tin thành công!");
                    setIsEditing(false);
                },
                onError: (error) => {
                    if (error.status === 409 || (error.message && error.message.includes("thay đổi bởi người khác"))) {
                        toast.error(
                            "Xung đột dữ liệu",
                            <div>
                                <p className="mb-2">Dữ liệu đã bị thay đổi bởi người khác.</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-3 py-1 bg-red-600 text-white rounded shadow-sm text-xs font-semibold hover:bg-red-700 transition"
                                >
                                    Tải lại trang
                                </button>
                            </div>
                        );
                    } else {
                        toast.error("Lỗi", error.message || "Không thể cập nhật thông tin.");
                    }
                }
            }
        );
    };

    const handleCancel = () => {
        if (company) {
            setFormData({
                company_name: company.company_name || '',
                company_registration_number: (company.company_registration_number && !company.company_registration_number.startsWith('REG-')) ? company.company_registration_number : '',
                website: company.website || '',
                address: company.address || '',
                total_workers: company.total_workers || '',
                industry_group: normalizeSelectionToIds(company.industry_group, buildIdNameMaps(industryGroups, 'group_id', 'group_name')),
                industry: normalizeSelectionToIds(company.industry, buildIdNameMaps(allIndustries, 'industry_id', 'industry_name')),
            });
        }
        setIsEditing(false);
    };

    const handleTaxLookup = async () => {
        const taxCode = formData.company_registration_number?.trim();
        if (!taxCode) return toast.error('Thiếu MST', 'Vui lòng nhập MST trước khi tra cứu.');
        setIsTaxLookupLoading(true);
        try {
            const result = await handlerLookupTaxCode(taxCode);
            setFormData(prev => ({
                ...prev,
                company_name: result.company_name || prev.company_name,
                address: result.address || prev.address
            }));
            toast.success('Tra cứu thành công', 'Đã lưu tạm thông tin doanh nghiệp từ dữ liệu MST.');
        } catch (e) {
            toast.error('Lỗi tra cứu', e.message || "Không thể tra cứu MST.");
        } finally {
            setIsTaxLookupLoading(false);
        }
    };

    // --- Industry Logic Helpers ---
    const groupMaps = useMemo(
        () => buildIdNameMaps(industryGroups, 'group_id', 'group_name'),
        [industryGroups]
    );

    const industryMaps = useMemo(
        () => ({
            ...buildIdNameMaps(allIndustries, 'industry_id', 'industry_name'),
            codeById: allIndustries.reduce((acc, ind) => {
                acc[ind.industry_id] = ind.industry_code;
                return acc;
            }, {})
        }),
        [allIndustries]
    );

    const selectedGroupIds = useMemo(
        () => normalizeSelectionToIds(formData.industry_group, groupMaps),
        [formData.industry_group, groupMaps]
    );

    const groupedIndustries = useMemo(() => {
        return allIndustries.reduce((acc, industry) => {
            const groupId = industry.group_id;
            const groupName = groupMaps.nameById[groupId] || groupId;
            if (!acc[groupId]) acc[groupId] = { groupName, industries: [] };
            acc[groupId].industries.push(industry);
            return acc;
        }, {});
    }, [allIndustries, groupMaps.nameById]);

    const industriesByGroupId = useMemo(() => {
        if (selectedGroupIds.length === 0) return groupedIndustries;
        return selectedGroupIds.reduce((acc, groupId) => {
            if (groupedIndustries[groupId]) acc[groupId] = groupedIndustries[groupId];
            return acc;
        }, {});
    }, [groupedIndustries, selectedGroupIds]);

    const hasSelectedGroup = selectedGroupIds.length > 0;
    const displayIndustryGroups = company?.industry_group_names || mapSelectionToNames(company?.industry_group, groupMaps.nameById);

    // Map industry IDs to "Code - Name" format for display
    const displayIndustries = useMemo(() => {
        const ids = normalizeSelectionToIds(company?.industry, industryMaps);
        return ids.map(id => {
            const code = industryMaps.codeById[id];
            const name = industryMaps.nameById[id];
            if (code && name) return `${code} - ${name}`;
            return name || id;
        });
    }, [company?.industry, industryMaps]);

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: '#4E5BA6',
                    borderRadius: 8,
                    colorBorder: '#E5E7EB',
                    controlHeight: 36,
                    fontSize: 14,
                    fontFamily: "'Inter', sans-serif"
                }
            }}
        >
            <div className="col-start-1 col-end-4 row-start-1 row-end-4 flex flex-col gap-2">
                <span className="flex justify-between pr-2 items-center">
                    <p className="text-gray-900 font-bold text-lg xl:text-xl 2xl:text-xl uppercase tracking-wide">
                        Thông tin doanh nghiệp
                    </p>
                    <div className="flex items-center gap-2">
                        {isEditing && (
                            <button
                                onClick={handleCancel}
                                className="px-4 py-1.5 xl:px-5 xl:py-2 rounded-lg text-sm xl:text-base font-semibold transition-all flex items-center gap-2 cursor-pointer bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200"
                            >
                                <XLucide size={14} /><span>Hủy</span>
                            </button>
                        )}
                        <button
                            onClick={isEditing ? handleSave : () => setIsEditing(true)}
                            disabled={updateCompanyMutation.isPending}
                            className={`px-4 py-1.5 xl:px-5 xl:py-2 rounded-lg text-sm xl:text-base font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-w-[125px]
                                ${isEditing
                                    ? 'bg-white text-[#4E5BA6] hover:bg-indigo-50 border border-[#4E5BA6]'
                                    : 'bg-[#4E5BA6] text-white hover:bg-[#3d4885] shadow-md hover:shadow-lg'
                                }`}
                        >
                            {isEditing ? (
                                updateCompanyMutation.isPending ? (
                                    <div className="w-5 h-5 border-2 border-[#4E5BA6]/30 border-t-[#4E5BA6] rounded-full animate-spin" />
                                ) : (
                                    <span>Hoàn tất</span>
                                )
                            ) : (
                                <><EditLucide size={14} /><span>Chỉnh sửa</span></>
                            )}
                        </button>
                    </div>
                </span>

                {/* Single white card */}
                <div className="bg-white border border-black/10 rounded-2xl flex flex-col h-full overflow-hidden shadow-sm">

                    {/* ── Hero: Company Name ── */}
                    <div className="relative px-5 py-5 xl:px-6 xl:py-6 2xl:px-8 2xl:py-7 border-b border-gray-100 bg-gradient-to-r from-[#4E5BA6]/[0.04] to-transparent">
                        <div className="absolute left-0 top-3 bottom-3 w-[4px] rounded-r-full bg-gradient-to-b from-[#4E5BA6] to-[#7C8ADB]" />

                        <div className="flex items-center gap-4 xl:gap-5">
                            <div className="h-14 w-14 xl:h-16 xl:w-16 2xl:h-20 2xl:w-20 bg-[#4E5BA6]/10 rounded-2xl flex items-center justify-center shrink-0">
                                <BusinessCenterRoundedIcon className="!text-[#4E5BA6]" sx={{ fontSize: { xs: 28, xl: 34, '2xl': 40 } }} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[12px] xl:text-xs 2xl:text-sm text-gray-400 font-bold uppercase tracking-[0.15em] mb-0.5">
                                    Tên doanh nghiệp
                                </p>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        className="w-full text-[16px] xl:text-[20px] 2xl:text-[24px] font-extrabold text-gray-900 bg-white border border-[#4E5BA6]/30 focus:border-[#4E5BA6] rounded-md px-2 py-1 outline-none transition-colors"
                                        value={formData.company_name}
                                        onChange={(e) => handleChange('company_name', e.target.value)}
                                    />
                                ) : (
                                    <p
                                        title={company?.company_name}
                                        className="text-[16px] xl:text-[20px] 2xl:text-[24px] font-extrabold text-gray-900 truncate leading-tight"
                                    >
                                        {company?.company_name || 'N/A'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Info Grid (2×4) ── */}
                    <div className="grid grid-cols-2 flex-1 relative">
                        {isEditing && (
                            <div className="absolute inset-0 border-2 border-[#4E5BA6]/20 rounded-b-2xl pointer-events-none z-10" />
                        )}
                        <InfoRow
                            icon={<HashLucide className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6" />}
                            iconBg="bg-[#10B981]"
                            label="Mã số thuế (MST)"
                            value={formData.company_registration_number || (company?.company_registration_number && !company.company_registration_number.startsWith('REG-') ? company.company_registration_number : null)}
                            border="border-b border-r"
                            isMonospace
                            isEditing={isEditing}
                            editValue={formData.company_registration_number}
                            onEditChange={(val) => { const cv = val.replace(/[^\d-]/g, '').slice(0, 14); handleChange('company_registration_number', cv); }}
                            actionButton={<button type="button" onClick={handleTaxLookup} disabled={isTaxLookupLoading || !formData.company_registration_number} className={`ml-1 flex items-center justify-center h-[34px] px-3 xl:px-4 rounded text-xs xl:text-sm font-bold text-white shadow-sm transition-all whitespace-nowrap ${isTaxLookupLoading || !formData.company_registration_number ? 'bg-gray-300 cursor-not-allowed border-none' : 'bg-[#10B981] hover:bg-[#0f9d6e]'}`}>{isTaxLookupLoading ? "Đang tìm..." : "Tra cứu"}</button>}
                        />
                        <InfoRow
                            icon={<GlobeLucide className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6" />}
                            iconBg="bg-[#00A6FF]"
                            label="Website"
                            value={company?.website}
                            isLink
                            border="border-b"
                            isEditing={isEditing}
                            editValue={formData.website}
                            onEditChange={(val) => handleChange('website', val)}
                        />
                        <InfoRow
                            icon={<FactoryLucide className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6" />}
                            iconBg="bg-[#866701]"
                            label="KCX / KCN"
                            value={zone?.zone_name}
                            border="border-b"
                        />
                        <InfoRow
                            icon={<MapPinLucide className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6" />}
                            iconBg="bg-[#948600]"
                            label="Địa chỉ"
                            value={company?.address}
                            border="border-b border-r"
                            isEditing={isEditing}
                            editValue={formData.address}
                            onEditChange={(val) => handleChange('address', val)}
                        />
                        <InfoRow
                            icon={<UsersLucide className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6" />}
                            iconBg="bg-[#D08000]"
                            label="Số công nhân"
                            value={company?.total_workers}
                            suffix="người"
                            isNumber
                            border="border-b"
                            isEditing={isEditing}
                            editValue={formData.total_workers}
                            onEditChange={(val) => handleChange('total_workers', val)}
                            type="number"
                        />

                        {/* Nhóm Ngành Sinh Thái */}
                        <div className={`flex flex-col gap-1 px-4 py-3 xl:px-5 xl:py-4 2xl:px-6 2xl:py-5 border-b border-gray-100 transition-colors duration-200 col-span-2 ${isEditing ? 'bg-[#4E5BA6]/[0.02]' : 'hover:bg-gray-50/60'}`}>
                            <div className="flex items-center gap-3 xl:gap-4 2xl:gap-5">
                                <div className={`h-8 w-8 xl:h-10 xl:w-10 2xl:h-12 2xl:w-12 bg-[#6B21A8] rounded-lg xl:rounded-xl flex items-center justify-center shrink-0`}>
                                    <BriefcaseLucide className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] xl:text-xs 2xl:text-sm text-gray-400 font-bold uppercase tracking-[0.12em] leading-none mb-1">
                                        Nhóm ngành
                                    </p>
                                    {isEditing ? (
                                        <div className="pt-1">
                                            <Select
                                                mode="multiple"
                                                className="w-full font-semibold max-w-lg"
                                                placeholder="-- Chọn nhóm ngành --"
                                                value={formData.industry_group}
                                                onChange={(value) => handleChange('industry_group', value)}
                                                maxTagCount="responsive"
                                            >
                                                {industryGroups.map((group) => (
                                                    <Select.Option key={group.group_id} value={group.group_id}>
                                                        {group.group_name}
                                                    </Select.Option>
                                                ))}
                                            </Select>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1 mt-1">
                                            {Array.isArray(displayIndustryGroups) && displayIndustryGroups.length > 0 ? (
                                                displayIndustryGroups.map((grp, idx) => (
                                                    <p key={idx} className="text-[14px] xl:text-[15px] 2xl:text-base font-bold text-gray-800 leading-snug">
                                                        • {grp}
                                                    </p>
                                                ))
                                            ) : (
                                                <p className="text-[15px] xl:text-base 2xl:text-lg font-bold text-gray-800 leading-tight">
                                                    {company?.industry_group || <span className="text-gray-300 italic font-normal text-sm">Chưa cập nhật</span>}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Chi Tiết Ngành Nghề */}
                        <div className={`flex flex-col gap-1 px-4 py-3 xl:px-5 xl:py-4 2xl:px-6 2xl:py-5 transition-colors duration-200 col-span-2 ${isEditing ? 'bg-[#4E5BA6]/[0.02]' : 'hover:bg-gray-50/60'}`}>
                            <div className="flex items-start gap-3 xl:gap-4 2xl:gap-5">
                                <div className={`h-8 w-8 xl:h-10 xl:w-10 2xl:h-12 2xl:w-12 bg-[#3B82F6] rounded-lg xl:rounded-xl flex items-center justify-center shrink-0`}>
                                    <ListLucide className="w-4 h-4 xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] xl:text-xs 2xl:text-sm text-gray-400 font-bold uppercase tracking-[0.12em] leading-none mb-2">
                                        Chi tiết ngành nghề
                                    </p>
                                    {isEditing ? (
                                        <div className="pt-1">
                                            <Select
                                                mode="multiple"
                                                className="w-full font-semibold max-w-lg"
                                                placeholder={hasSelectedGroup ? "-- Chọn mã ngành cụ thể --" : "-- Vui lòng chọn nhóm ngành trước --"}
                                                disabled={!hasSelectedGroup}
                                                value={formData.industry}
                                                onChange={(value) => handleChange('industry', value)}
                                                showSearch
                                                optionFilterProp="label"
                                                filterOption={(input, option) =>
                                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                                }
                                            >
                                                {Object.entries(industriesByGroupId).map(([groupId, { groupName, industries }]) => (
                                                    <Select.OptGroup key={groupId} label={groupName}>
                                                        {industries.map((inst) => (
                                                            <Select.Option
                                                                key={inst.industry_id || inst.industry_name}
                                                                value={inst.industry_id}
                                                                label={`${inst.industry_code} - ${inst.industry_name}`}
                                                            >
                                                                <span className="flex items-center gap-2">
                                                                    <span className="text-blue-600 font-mono text-[13px]">{inst.industry_code}</span>
                                                                    <span className="text-gray-700">-</span>
                                                                    <span>{inst.industry_name}</span>
                                                                </span>
                                                            </Select.Option>
                                                        ))}
                                                    </Select.OptGroup>
                                                ))}
                                            </Select>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1.5 pt-1">
                                            {Array.isArray(displayIndustries) && displayIndustries.length > 0 ? (
                                                displayIndustries.map((ind, idx) => (
                                                    <span key={idx} className="bg-[#F8FAFC] text-gray-700 px-3 py-1.5 rounded text-[13px] xl:text-[14px] 2xl:text-[15px] border border-gray-100 font-medium w-fit">
                                                        {ind}
                                                    </span>
                                                ))
                                            ) : (
                                                <p className="text-[15px] xl:text-base 2xl:text-lg font-bold text-gray-800 leading-tight">
                                                    {company?.industry || <span className="text-gray-300 italic font-normal text-sm">Chưa cập nhật</span>}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </ConfigProvider>
    );
};

const InfoRow = ({ icon, iconBg, label, value, isLink, isNumber, isMonospace, suffix, border = '', colSpan, isEditing, editValue, onEditChange, type = "text", actionButton }) => {
    const displayValue = isNumber && value != null
        ? Number(value).toLocaleString()
        : value;

    return (
        <div className={`flex items-center gap-3 xl:gap-4 2xl:gap-5 px-4 py-3 xl:px-5 xl:py-4 2xl:px-6 2xl:py-5 ${border} border-gray-100 transition-colors duration-200 ${colSpan ? 'col-span-2' : ''} ${isEditing ? 'bg-[#4E5BA6]/[0.02]' : 'hover:bg-gray-50/60'}`}>
            {/* Icon */}
            <div className={`h-8 w-8 xl:h-10 xl:w-10 2xl:h-12 2xl:w-12 ${iconBg} rounded-lg xl:rounded-xl flex items-center justify-center shrink-0`}>
                <span className="text-white">{icon}</span>
            </div>

            {/* Label + Value */}
            <div className="min-w-0 flex-1">
                <p className="text-[10px] xl:text-xs 2xl:text-sm text-gray-400 font-bold uppercase tracking-[0.12em] leading-none mb-1">
                    {label}
                </p>
                {isEditing && onEditChange ? (
                    <div className="flex items-center gap-2">
                        <input
                            type={type}
                            className={`w-full text-[15px] xl:text-base 2xl:text-lg font-bold text-gray-800 bg-white border border-[#4E5BA6]/30 focus:border-[#4E5BA6] rounded px-2 py-1 outline-none transition-colors ${type === 'number' ? 'max-w-[150px]' : ''}`}
                            value={editValue}
                            onChange={(e) => onEditChange(e.target.value)}
                        />
                        {suffix && <span className="text-[11px] xl:text-xs 2xl:text-sm text-gray-400 font-semibold shrink-0">{suffix}</span>}
                        {actionButton && actionButton}
                    </div>
                ) : isLink && value ? (
                    <a
                        href={value.startsWith('http') ? value : `https://${value}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={value}
                        className="text-[15px] xl:text-base 2xl:text-lg font-bold text-[#4E5BA6] hover:underline cursor-pointer truncate block leading-tight"
                    >
                        {value}
                    </a>
                ) : (
                    <p className={`text-[15px] xl:text-base 2xl:text-lg font-bold text-gray-800 truncate leading-tight ${isMonospace ? 'font-mono tracking-wider' : ''}`} title={String(value ?? '')}>
                        {displayValue || <span className="text-gray-300 italic font-normal text-sm">Chưa cập nhật</span>}
                        {suffix && displayValue && (
                            <span className="text-[11px] xl:text-xs 2xl:text-sm text-gray-400 font-semibold ml-1">{suffix}</span>
                        )}
                    </p>
                )}
            </div>
        </div>
    );
};

export default CompanyInfoSection;
