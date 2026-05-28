import React, { useState, useMemo } from 'react';
import { Dropdown, Button, Input } from 'antd';
import { Building2, ChevronDown, Check, Search } from 'lucide-react';

const ExportScopeSelector = ({ value, onChange, user, zones = [], companies = [] }) => {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const options = useMemo(() => {
        if (user?.role === 'manager') {
            return [{ value: 'specific', label: 'Doanh nghiệp cụ thể' }];
        }
        return [
            { value: 'all', label: 'Tất cả doanh nghiệp' },
            { value: 'zone', label: 'Theo khu công nghiệp' },
            { value: 'specific', label: 'Doanh nghiệp cụ thể' }
        ];
    }, [user?.role]);

    const currentOption = options.find(opt => opt.value === value?.scope) || options[0];

    const handleScopeChange = (scope) => {
        onChange({
            scope,
            zone_ids: scope === 'zone' ? (value?.zone_ids || []) : [],
            company_ids: scope === 'specific' ? (value?.company_ids || []) : []
        });
        if (scope === 'all') {
            setOpen(false);
        }
        setSearchTerm('');
    };

    const handleZoneToggle = (zoneId) => {
        const currentZoneIds = value?.zone_ids || [];
        const newZoneIds = currentZoneIds.includes(zoneId)
            ? currentZoneIds.filter(id => id !== zoneId)
            : [...currentZoneIds, zoneId];

        onChange({
            ...value,
            scope: 'zone',
            zone_ids: newZoneIds
        });
    };

    const handleCompanyToggle = (companyId) => {
        const currentIds = value?.company_ids || [];
        const newIds = currentIds.includes(companyId)
            ? currentIds.filter(id => id !== companyId)
            : [...currentIds, companyId];
        onChange({
            ...value,
            scope: 'specific',
            company_ids: newIds
        });
    };

    const filteredCompanies = useMemo(() => {
        if (!searchTerm) return companies;
        return companies.filter(c =>
            (c.company_name || c.name || c.name_en || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.tax_code || '').includes(searchTerm)
        );
    }, [companies, searchTerm]);

    const filteredZones = useMemo(() => {
        if (!searchTerm) return zones;
        return zones.filter(z =>
            (z.zone_name || z.name || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [zones, searchTerm]);

    const menu = (
        <div
            className="bg-white rounded-xl border border-gray-200 shadow-xl w-96 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700">Phạm vi xuất dữ liệu</h3>
                {(value?.scope === 'zone' && value?.zone_ids?.length > 0) || (value?.scope === 'specific' && value?.company_ids?.length > 0) ? (
                    <span className="text-xs text-[#4E5BA6] font-medium bg-[#4E5BA6]/10 px-2 py-0.5 rounded-full">
                        Đã chọn {value.scope === 'zone' ? value.zone_ids.length : value.company_ids.length}
                    </span>
                ) : null}
            </div>

            {/* Options */}
            <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                {options.map((option) => (
                    <div key={option.value} className="mb-1">
                        <div
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${value?.scope === option.value
                                ? 'bg-[#4E5BA6]/10 text-[#4E5BA6]'
                                : 'hover:bg-gray-50 text-gray-700'
                                }`}
                            onClick={() => handleScopeChange(option.value)}
                        >
                            <span className="text-sm font-medium">{option.label}</span>
                            {value?.scope === option.value && (
                                <Check size={16} className="text-[#4E5BA6]" />
                            )}
                        </div>

                        {/* Zone selector (shown when zone option is selected) */}
                        {option.value === 'zone' && value?.scope === 'zone' && (
                            <div className="mt-2 ml-4 mr-1">
                                <Input
                                    placeholder="Tìm kiếm khu công nghiệp..."
                                    prefix={<Search size={14} className="text-gray-400" />}
                                    className="mb-2 text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    allowClear
                                />
                                <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                    {filteredZones.map((zone) => {
                                        const zId = zone.zone_id || zone._id;
                                        const zName = zone.zone_name || zone.name;
                                        const isSelected = (value?.zone_ids || []).includes(zId);
                                        return (
                                            <div
                                                key={zId}
                                                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer text-sm transition-colors ${isSelected
                                                    ? 'bg-[#4E5BA6] text-white'
                                                    : 'hover:bg-gray-100 text-gray-700'
                                                    }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleZoneToggle(zId);
                                                }}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center bg-white ${isSelected ? 'border-transparent' : 'border-gray-300'}`}>
                                                    {isSelected && <Check size={10} className="text-[#4E5BA6]" />}
                                                </div>
                                                <span className="flex-1 truncate">{zName}</span>
                                            </div>
                                        );
                                    })}
                                    {filteredZones.length === 0 && (
                                        <p className="text-xs text-gray-400 text-center py-2">Không tìm thấy kết quả</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Company selector (shown when specific option is selected) */}
                        {option.value === 'specific' && value?.scope === 'specific' && (
                            <div className="mt-2 ml-4 mr-1">
                                <Input
                                    placeholder="Tìm kiếm doanh nghiệp..."
                                    prefix={<Search size={14} className="text-gray-400" />}
                                    className="mb-2 text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    allowClear
                                />
                                <div className="space-y-1 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                    {filteredCompanies.map((company) => {
                                        const companyKey = company.company_id || company._id;
                                        const isSelected = (value?.company_ids || []).includes(companyKey);

                                        return (
                                            <div
                                                key={companyKey}
                                                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer text-sm transition-colors ${isSelected
                                                    ? 'bg-[#4E5BA6] text-white'
                                                    : 'hover:bg-gray-100 text-gray-700'
                                                    }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCompanyToggle(companyKey);
                                                }}
                                            >
                                                <div className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center bg-white ${isSelected ? 'border-transparent' : 'border-gray-300'}`}>
                                                    {isSelected && <Check size={10} className="text-[#4E5BA6]" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="truncate font-medium">{company.company_name || company.name}</p>
                                                    <p className={`text-xs truncate ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}>{company.name_en || company.tax_code}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {filteredCompanies.length === 0 && (
                                        <p className="text-xs text-gray-400 text-center py-2">Không tìm thấy kết quả</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {/* Footer Actions */}
            <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-end">
                <Button
                    type="primary"
                    size="small"
                    className="bg-[#4E5BA6]"
                    onClick={() => setOpen(false)}
                >
                    Xong
                </Button>
            </div>
        </div>
    );

    // Only show for admin and manager
    if (user?.role !== 'admin' && user?.role !== 'manager') {
        return null;
    }

    return (
        <Dropdown
            dropdownRender={() => menu}
            trigger={['click']}
            open={open}
            onOpenChange={setOpen}
            placement="bottomRight"
        >
            <Button
                type="default"
                className="inline-flex items-center gap-2 !h-9 !px-3 !rounded-2xl border !border-gray-300 !text-gray-700 !bg-white hover:!border-[#4E5BA6] focus-within:!border-[#4E5BA6]"
            >
                <span className="text-sm">{currentOption.label}</span>
                {(value?.scope === 'zone' && value?.zone_ids?.length > 0) && (
                    <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {value.zone_ids.length}
                    </span>
                )}
                {(value?.scope === 'specific' && value?.company_ids?.length > 0) && (
                    <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {value.company_ids.length}
                    </span>
                )}
                <ChevronDown size={14} className="text-gray-500" />
            </Button>
        </Dropdown>
    );
};

export default ExportScopeSelector;
