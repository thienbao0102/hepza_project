import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import FloatingInput from './ui/FloatingInput';
import Dropdown from './ui/Dropdown';
import { MinusButton } from './ui/ActionButtons';
import BillImageUpload from '@/components/common/BillImageUpload';
import MultipleFileUpload from '@/components/common/MultipleFileUpload';
import { lookupWasteCode, searchWasteCodes } from '@services/wasteCodeService';

// ── Sub-component: Autocomplete mã chất thải nguy hại ──
const WasteCodeAutocomplete = ({ value, onChange, onSelectOpt }) => {
    const [focused, setFocused] = useState(false);
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const hasValue = value !== undefined && value !== null && value !== "";
    const isActive = focused || hasValue;

    useEffect(() => {
        let isCancelled = false;

        const fetchOptions = async () => {
            if (!focused) return;
            setLoading(true);
            try {
                const results = await searchWasteCodes(value || '');
                if (!isCancelled) {
                    setOptions(results.filter((opt) => /^\d{2}\s\d{2}\s\d{2}$/.test(opt.code || '')));
                    setOpen(true);
                }
            } catch {
                if (!isCancelled) setOptions([]);
            } finally {
                if (!isCancelled) setLoading(false);
            }
        };

        if (focused && !value && options.length === 0) {
            fetchOptions();
        } else {
            const timeoutId = setTimeout(fetchOptions, 300);
            return () => { isCancelled = true; clearTimeout(timeoutId); };
        }

        return () => { isCancelled = true; };
    }, [value, focused]);

    const handleSelect = (opt) => {
        onChange(opt.code);
        if (onSelectOpt) onSelectOpt(opt);
        setOpen(false);
    };

    return (
        <div className="relative w-full h-10">
            <input
                type="text"
                value={value || ""}
                onChange={(e) => { onChange(e.target.value); setOpen(true); }}
                onFocus={() => { setFocused(true); setOpen(true); }}
                onBlur={() => setTimeout(() => { setFocused(false); setOpen(false); }, 200)}
                placeholder={focused ? 'VD: 13 02 01' : ''}
                className={`peer w-full h-full rounded-xl border px-3 pt-2 text-sm outline-none transition-all
                    bg-white text-gray-800 border-gray-300 focus:border-[#4E5BA6] focus:ring-1 focus:ring-[#4E5BA6]`}
            />
            <span
                title="Mã CTNH"
                className={`pointer-events-none absolute left-3 transition-all duration-200 truncate max-w-[calc(100%-1.5rem)]
                    ${isActive ? 'top-[-8px] bg-white px-1 text-[11px] font-medium text-[#4E5BA6]' : 'top-2.5 text-sm text-gray-400'}`}
            >
                Mã CTNH
            </span>

            {open && (
                <div className="absolute top-11 left-0 z-50 w-[300px] max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg p-1 animate-in fade-in zoom-in-95 duration-100">
                    {loading && options.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">Đang tải...</div>
                    ) : options.length > 0 ? (
                        options.map((opt) => (
                            <div
                                key={opt.code}
                                onClick={() => handleSelect(opt)}
                                className="cursor-pointer rounded-lg px-3 py-2 text-sm hover:bg-blue-50 text-gray-700 flex flex-col items-start"
                            >
                                <span className="font-semibold">{opt.code}</span>
                                <span className="text-xs text-gray-500 truncate w-full">{opt.name}</span>
                            </div>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">Không tìm thấy mã nào</div>
                    )}
                </div>
            )}
        </div>
    );
};

const WasteSuggestInput = ({ label, value, onChange, options = [], placeholder = '' }) => {
    const [focused, setFocused] = useState(false);
    const [open, setOpen] = useState(false);

    const hasValue = value !== undefined && value !== null && value !== '';
    const isActive = focused || hasValue;
    const normalizedOptions = Array.isArray(options) ? options.filter(Boolean) : [];
    const filteredOptions = focused && value
        ? normalizedOptions.filter((opt) => opt.toLowerCase().includes(String(value).toLowerCase()) && opt !== value)
        : normalizedOptions;

    return (
        <div className="relative w-full h-10">
            <input
                type="text"
                value={value || ''}
                onChange={(e) => {
                    onChange(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => {
                    setFocused(true);
                    setOpen(true);
                }}
                onBlur={() => setTimeout(() => {
                    setFocused(false);
                    setOpen(false);
                }, 200)}
                placeholder={focused ? placeholder : ''}
                className="peer w-full h-full rounded-xl border px-3 pt-2 text-sm outline-none transition-all bg-white text-gray-800 border-gray-300 focus:border-[#4E5BA6] focus:ring-1 focus:ring-[#4E5BA6]"
            />
            <span
                className={`pointer-events-none absolute left-3 transition-all duration-200 truncate max-w-[calc(100%-1.5rem)] ${isActive ? 'top-[-8px] bg-white px-1 text-[11px] font-medium text-[#4E5BA6]' : 'top-2.5 text-sm text-gray-400'}`}
            >
                {label}
            </span>

            {open && filteredOptions.length > 0 && (
                <div className="absolute top-11 left-0 z-50 w-[260px] max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg p-1 animate-in fade-in zoom-in-95 duration-100">
                    {filteredOptions.map((opt) => (
                        <div
                            key={opt}
                            onClick={() => {
                                onChange(opt);
                                setOpen(false);
                            }}
                            className="cursor-pointer rounded-lg px-3 py-2 text-sm hover:bg-blue-50 text-gray-700 flex flex-col items-start"
                        >
                            <span className="font-medium">{opt}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Main Component: Một dòng nhập liệu trong detail page (edit mode) ──
const InputGroup = ({
    row, index, onChange, onRemove, label,
    groupOptions, unitOptions, nameOptions = [],
    hideName = false, hideUnit = false, maxQuantity = 1000000,
    nameLabel,
    showBillUpload = false, onBillUpload, isBillUploading = false,
    showWasteCode = false,
    showWasteFileUpload = false,
    onWasteFileSelect,
    wasteFiles,
}) => {
    const [wasteMeta, setWasteMeta] = useState({ status: [], treatmentMethods: [] });
    const effectiveNameLabel = nameLabel || `Tên ${label.toLowerCase()}`;

    useEffect(() => {
        let isCancelled = false;

        const hydrateWasteMeta = async () => {
            if (!showWasteCode) {
                setWasteMeta({ status: [], treatmentMethods: [] });
                return;
            }

            const codeWaste = String(row.codeWaste || '').trim();
            if (!/^\d{2}\s\d{2}\s\d{2}$/.test(codeWaste)) {
                setWasteMeta({ status: [], treatmentMethods: [] });
                return;
            }

            try {
                const record = await lookupWasteCode(codeWaste);
                if (isCancelled) return;
                setWasteMeta({
                    status: Array.isArray(record?.status) ? record.status : [],
                    treatmentMethods: Array.isArray(record?.treatmentMethods) ? record.treatmentMethods : [],
                });
            } catch {
                if (!isCancelled) {
                    setWasteMeta({ status: [], treatmentMethods: [] });
                }
            }
        };

        hydrateWasteMeta();
        return () => {
            isCancelled = true;
        };
    }, [row.codeWaste, showWasteCode]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full flex flex-col gap-6 pt-4 border-b border-gray-100 pb-4"
        >
            <p className="text-sm">{`${label} ${index + 1}`}:</p>

            <div className="flex flex-wrap gap-2">
                <div className={`${hideName ? 'flex-[2]' : ''}`}>
                    <Dropdown
                        label="Nhóm"
                        value={row.group}
                        options={groupOptions}
                        className="w-full"
                        onChange={(val) => onChange("group", val)}
                    />
                </div>

                {/* Mã CTNH autocomplete — chỉ hiện khi nhóm = Chất Thải Nguy Hại */}
                {showWasteCode && (
                    <div className="w-36">
                        <WasteCodeAutocomplete
                            value={row.codeWaste || ''}
                            onChange={(val) => onChange("codeWaste", val)}
                            onSelectOpt={(opt) => {
                                onChange("name", opt.name);
                                onChange("status", "");
                                onChange("treatmentMethods", "");
                                setWasteMeta({
                                    status: Array.isArray(opt.status) ? opt.status : [],
                                    treatmentMethods: Array.isArray(opt.treatmentMethods) ? opt.treatmentMethods : [],
                                });
                            }}
                        />
                    </div>
                )}

                {showWasteCode && (
                    <div className="w-40">
                        <Dropdown
                            label="Trạng thái"
                            value={row.status || ''}
                            options={wasteMeta.status}
                            className="w-full"
                            onChange={(val) => onChange("status", val)}
                            disabled={wasteMeta.status.length === 0}
                        />
                    </div>
                )}

                {showWasteCode && (
                    <div className="w-56">
                        <WasteSuggestInput
                            label="Phương pháp xử lý"
                            value={row.treatmentMethods || ''}
                            onChange={(val) => onChange("treatmentMethods", val)}
                            options={wasteMeta.treatmentMethods}
                            placeholder="Gợi ý phương pháp xử lý"
                        />
                    </div>
                )}

                {!hideName && (
                    nameOptions && nameOptions.length > 0 ? (
                        <div className="flex-[2]">
                            <Dropdown
                                label={effectiveNameLabel}
                                value={row.name}
                                options={nameOptions}
                                className="w-full"
                                onChange={(val) => onChange("name", val)}
                            />
                        </div>
                    ) : (
                        <FloatingInput
                            label={effectiveNameLabel}
                            className="flex-[2]"
                            value={row.name || ""}
                            onChange={(val) => onChange("name", val)}
                        />
                    )
                )}

                <FloatingInput
                    label="Số lượng"
                    onlyNumber={true}
                    max={maxQuantity}
                    className="w-28 text-center"
                    value={row.quantity || ""}
                    onChange={(val) => onChange("quantity", val)}
                />
                {hideUnit ? (
                    <div className="flex items-center justify-center w-16 h-10 text-sm text-gray-600 bg-gray-50 border border-gray-300 rounded-xl px-2">
                        {row.unit || "m³"}
                    </div>
                ) : (
                    <Dropdown
                        label="Đơn vị"
                        value={row.unit}
                        options={unitOptions}
                        onChange={(val) => onChange("unit", val)}
                    />
                )}
                {(Number(row.quantity) > 0 || String(row.quantity) === "") && (
                    <MinusButton onClick={onRemove} />
                )}
            </div>

            <div className="flex items-start gap-4">
                <FloatingInput
                    label="Ghi chú"
                    value={row.note || ""}
                    onChange={(val) => onChange("note", val)}
                />
            </div>

            {showWasteFileUpload && (
                <div className="border-t border-gray-100 pt-2">
                    <MultipleFileUpload
                        currentFiles={wasteFiles || row.wasteFiles || []}
                        onUpload={(files) => {
                            if (onWasteFileSelect) {
                                onWasteFileSelect(row.id || row.originalId, files);
                            } else {
                                onChange("wasteFiles", files);
                            }
                        }}
                        label="Tài liệu đính kèm (Chứng từ xử lý chất thải...)"
                    />
                </div>
            )}
        </motion.div>
    );
};

export default InputGroup;
