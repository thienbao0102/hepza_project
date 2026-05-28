import { useEffect, useState, useMemo } from "react";
import { useQueryClient } from '@tanstack/react-query';
import { Container, HousePlug, Atom, Trash, FlameKindling, ChevronDown, Minus, Plus, Droplet, FileCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

import { addReourceWasteData, handlerGetSummaryDetail, handlerGetAllDataWithHistory, uploadBillImage, uploadWasteAttachments } from '@services/resoureceAndWasteService';
import toast from '@/utils/toast';
import { mapErrorToNotification } from '@/utils/Error/mapErrorToNotification';
import { resourceGroups } from '@features/resources/components/resourceGroups'; // Import file config mới
import { abbreviations } from '@features/resources/components/seekAbbreviation'
import { useAuth } from '@app/providers/auth/AuthProvider'; // Import Auth
import { useHeader } from '@/components/common/Header/HeaderContext';
import ConfirmationModal from '@/components/common/ConfirmationModal'; // Import ConfirmationModal
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { DataActions } from '@/components/ui/Button';
import BillImageUpload from '@/components/common/BillImageUpload';
import MultipleFileUpload from '@/components/common/MultipleFileUpload';
import { lookupWasteCode, searchWasteCodes } from '@services/wasteCodeService';

export const ICONS_MAP = {
    Container: Container,
    HousePlug: HousePlug,
    Droplet: Droplet,
    Atom: Atom,
    FlameKindling: FlameKindling,
    Trash: Trash,
    FileCheck: FileCheck,
};

export default function ResourceReportForm() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { setHeaderConfig, setBreadcrumbItems, date, setDate } = useHeader();
    const { user } = useAuth(); // Get user
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false); // State for modal
    const [pendingBillFiles, setPendingBillFiles] = useState({});
    const [pendingWasteFiles, setPendingWasteFiles] = useState({}); // { [subGroupKey_itemIndex]: [{file, previewUrl}, ...] }

    const STORAGE_KEY = 'resourceFormDraft_v2';

    // const [headerConfig, setHeaderConfigContext] = useOutletContext();
    // Khởi tạo từ sessionStorage nếu có
    const [activeTab, setActiveTab] = useState(() => {
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY);
            if (saved) return JSON.parse(saved).activeTab ?? 0;
        } catch { }
        return 0;
    });

    const [data, setData] = useState(() => {
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.data) return parsed.data;
            }
        } catch { }
        return JSON.parse(JSON.stringify(resourceGroups));
    });

    const [inputCounts, setInputCounts] = useState({});
    const [existingReportId, setExistingReportId] = useState(null);
    const [isLoadingCheck, setIsLoadingCheck] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentGroup = data[activeTab];

    // Chia cột hiển thị
    const half = Math.ceil(currentGroup.fields.length / 2);
    const col1 = currentGroup.fields.slice(0, half);
    const col2 = currentGroup.fields.slice(half);

    // Khôi phục date từ sessionStorage khi mount
    useEffect(() => {
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.date && parsed.date !== date) {
                    setDate(parsed.date);
                }
            }
        } catch { }
    }, []);

    // Lưu data, activeTab, date vào sessionStorage khi thay đổi
    useEffect(() => {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ data, activeTab, date }));
        } catch { }
    }, [data, activeTab, date]);

    useEffect(() => {
        setHeaderConfig({
            title: "Khai báo tài nguyên và Chất thải",
            description: "Nhập liệu báo cáo định kỳ hàng tháng cho doanh nghiệp",
            showWeather: false,
            showDatePicker: true,
            hideAllYear: true,
            rightContent: (
                <DataActions
                    onImport={() => navigate('/resources/import-resources')}
                    onExport={() => navigate('/reports')}
                />
            ),
        })
        setBreadcrumbItems([
            {
                key: '/resources',
                title: "Quản lý tài nguyên và Chất thải"
            },
            {
                key: '/resources/resources-form',
                title: "Khai báo Tài nguyên và Chất thải"
            },
        ])
    }, []);

    const [debugInfo, setDebugInfo] = useState(null);

    const [existingReportData, setExistingReportData] = useState(null);

    // --- CHECK EXISTING REPORT ---
    useEffect(() => {
        const controller = new AbortController();

        const checkExistingReport = async () => {
            if (!date || !user?.company_id) return;

            // Chặn chế độ "Cả năm" — chỉ chấp nhận "MM/YYYY"
            if (date.startsWith('00/')) {
                setExistingReportId(null);
                setExistingReportData(null);
                return;
            }

            // Parse date "MM/YYYY" -> periodKey "YYYYMM"
            const parsedDate = dayjs(date, "MM/YYYY", true);
            if (!parsedDate.isValid()) return;

            const periodKey = parseInt(parsedDate.format("YYYYMM"));

            try {
                setIsLoadingCheck(true);

                // Dùng handlerGetAllDataWithHistory — check cả resource data LẪN history/version
                // Đây là cách đáng tin nhất vì BE block dựa trên SummaryRecord (được tạo khi khai báo)
                const response = await handlerGetAllDataWithHistory({
                    company_id: user.company_id,
                    zone_id: user.zone_id,
                    periodKey: periodKey
                }, controller.signal);

                const dataResources = response?.dataResources || [];
                const monthData = Array.isArray(dataResources) ? dataResources[0] : dataResources;

                // Check: có history (resource_change) HOẶC có resource data thực tế
                const hasHistory = monthData?.resource_change?.length > 0;
                const hasInput = monthData?.input?.length > 0;
                const hasFuel = monthData?.fuel?.length > 0;
                const hasWaste = monthData?.waste?.length > 0;
                const hasData = hasHistory || hasInput || hasFuel || hasWaste;

                if (hasData) {
                    setExistingReportId(`period-${periodKey}`);
                    setExistingReportData({
                        companyId: user.company_id,
                        zoneId: user.zone_id,
                        periodKey: periodKey
                    });
                } else {
                    setExistingReportId(null);
                    setExistingReportData(null);
                }
            } catch (error) {
                if (error.name === 'CanceledError') return;
                console.error("Failed to check existing report:", error);
                // Lỗi check → cho phép khai báo (BE sẽ validate lại)
                setExistingReportId(null);
                setExistingReportData(null);
            } finally {
                setIsLoadingCheck(false);
            }
        };

        checkExistingReport();
        return () => controller.abort();
    }, [date, user]); // Add user dependency

    // --- LOGIC ĐẾM SỐ LƯỢNG ĐỂ HIỂN THỊ BADGE ---
    useEffect(() => {
        const counts = {};
        data.forEach((group, index) => {
            let count = 0;
            group.fields.forEach(field => {
                if (field.listType === 'dynamic') {
                    count += field.list.length;
                } else if (field.listType === 'fixed') {
                    // Đếm những dòng có nhập giá trị > 0
                    count += field.list.reduce((acc, item) => acc + (Number(item.value) > 0 ? 1 : 0), 0);
                }
            });
            counts[group.name] = count;
        });
        setInputCounts(counts);
    }, [data]);

    useEffect(() => {
        let isCancelled = false;

        const hydrateWasteCodeMeta = async () => {
            const codesToHydrate = [];

            data.forEach((group) => {
                if (group.name !== 'Chất thải') return;
                (group.fields || []).forEach((field) => {
                    if (field.label !== 'Chất thải nguy hại') return;
                    (field.list || []).forEach((item) => {
                        const codeWaste = String(item.codeWaste || '').trim();
                        if (!/^\d{2}\s\d{2}\s\d{2}$/.test(codeWaste)) return;

                        const hasStatusOptions = Array.isArray(item.statusOptions);
                        const hasTreatmentOptions = Array.isArray(item.treatmentMethodsOptions);

                        if (!hasStatusOptions || !hasTreatmentOptions) {
                            codesToHydrate.push(codeWaste);
                        }
                    });
                });
            });

            const uniqueCodes = [...new Set(codesToHydrate)];
            if (uniqueCodes.length === 0) return;

            const entries = await Promise.all(
                uniqueCodes.map(async (code) => {
                    const record = await lookupWasteCode(code);
                    return [code, record];
                })
            );

            if (isCancelled) return;

            const recordMap = Object.fromEntries(entries.filter(([, record]) => Boolean(record)));
            if (Object.keys(recordMap).length === 0) return;

            setData(prev => {
                let changed = false;
                const nextData = prev.map(group => {
                    if (group.name !== 'Chất thải') return group;

                    const nextFields = (group.fields || []).map(field => {
                        if (field.label !== 'Chất thải nguy hại') return field;

                        const nextList = (field.list || []).map(item => {
                            const record = recordMap[String(item.codeWaste || '').trim()];
                            if (!record) return item;

                            const nextItem = { ...item };
                            if (!nextItem.wasteName && record.name) {
                                nextItem.wasteName = record.name;
                                changed = true;
                            }
                            const nextStatusOptions = Array.isArray(record.status) ? record.status : [];
                            const nextTreatmentOptions = Array.isArray(record.treatmentMethods) ? record.treatmentMethods : [];
                            const statusChanged = !Array.isArray(nextItem.statusOptions)
                                || nextItem.statusOptions.length !== nextStatusOptions.length
                                || nextItem.statusOptions.some((value, idx) => value !== nextStatusOptions[idx]);
                            const treatmentChanged = !Array.isArray(nextItem.treatmentMethodsOptions)
                                || nextItem.treatmentMethodsOptions.length !== nextTreatmentOptions.length
                                || nextItem.treatmentMethodsOptions.some((value, idx) => value !== nextTreatmentOptions[idx]);

                            if (statusChanged || treatmentChanged) {
                                changed = true;
                            }
                            nextItem.statusOptions = nextStatusOptions;
                            nextItem.treatmentMethodsOptions = nextTreatmentOptions;
                            return nextItem;
                        });

                        return { ...field, list: nextList };
                    });

                    return { ...group, fields: nextFields };
                });

                return changed ? nextData : prev;
            });
        };

        hydrateWasteCodeMeta();
        return () => {
            isCancelled = true;
        };
    }, [data]);

    // Render "Already Submitted" UI
    if (isLoadingCheck) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-50">
                <LoadingSpinner centered size="md" />
            </div>
        );
    }

    if (existingReportId) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-4 bg-gray-50">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                    <div className="w-16 h-16 bg-blue-50 text-[#4E5BA6] rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileCheck size={32} strokeWidth={1.5} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Dữ liệu đã được nhập</h2>
                    <p className="text-gray-500 mb-6">
                        Bạn đã nhập báo cáo cho tháng <span className="font-semibold text-gray-700">{date}</span> rồi.
                        Vui lòng vào trang cập nhật để chỉnh sửa nếu cần.
                    </p>
                    <button
                        onClick={() => navigate(`/resources/resources-list/${existingReportId}`, {
                            state: existingReportData
                        })}
                        className="px-6 py-2.5 bg-[#4E5BA6] hover:bg-[#3b457e] text-white rounded-xl font-medium transition shadow-sm w-full"
                    >
                        Đến trang cập nhật
                    </button>
                    <button
                        onClick={() => navigate('/resources/resources-list')}
                        className="mt-3 px-6 py-2.5 text-gray-500 hover:bg-gray-50 rounded-xl font-medium transition w-full"
                    >
                        Quay lại danh sách
                    </button>
                </div>
            </div>
        );
    }

    // --- HANDLERS CHO INPUT ---

    // Max limits per group
    const getMaxValue = (groupName) => {
        if (groupName === 'Điện') return 500000000;
        if (groupName === 'Nước') return 10000000;
        return 999999;
    };

    // 1. Thay đổi giá trị (Dùng chung cho cả Fixed và Dynamic)
    const handleInputChange = (fieldIndex, itemIndex, key, value) => {
        setData(prev => {
            const newData = [...prev];
            let finalValue = value;

            // Validate number fields (value, quantity)
            if (key === 'value') {
                const num = Number(finalValue);
                if (isNaN(num) || num < 0) {
                    finalValue = 0;
                    toast.warning('Giá trị không hợp lệ', 'Số lượng không được âm.');
                }
                const max = getMaxValue(newData[activeTab].name);
                if (num > max) {
                    finalValue = max;
                    toast.warning('Vượt giới hạn', `Giá trị tối đa cho ${newData[activeTab].name} là ${max.toLocaleString()}.`);
                }
            }

            const row = newData[activeTab].fields[fieldIndex].list[itemIndex];
            row[key] = finalValue;

            if (key === 'codeWaste') {
                row.wasteName = '';
                row.wasteCodeName = '';
                row.status = '';
                row.statusOptions = [];
                row.treatmentMethods = '';
                row.treatmentMethodsOptions = [];
            }

            return newData;
        });
    };

    // 2. Thêm dòng (Chỉ cho Dynamic)
    const handleAddItem = (fieldIndex) => {
        setData(prev => {
            const newData = [...prev];
            const field = newData[activeTab].fields[fieldIndex];

            // Lấy schema để tạo object rỗng
            const schema = field.inputSchema || newData[activeTab].inputSchemaTemplate || [];
            const newItem = {};
            schema.forEach(input => {
                // Giá trị mặc định
                if (input.name === 'unit' && input.options?.length === 1) newItem[input.name] = input.options[0];
                else newItem[input.name] = "";
            });

            // Gán sub_group mặc định để BE nhận diện
            newItem.sub_group = field.subGroupKey;

            field.list.push(newItem);
            return newData;
        });
    };

    // 3. Xóa dòng (Chỉ cho Dynamic)
    const handleRemoveItem = (fieldIndex, itemIndex) => {
        setData(prev => {
            const newData = [...prev];
            newData[activeTab].fields[fieldIndex].list.splice(itemIndex, 1);
            return newData;
        });
    };

    // --- VALIDATION ---

    const validateGroup = (index) => {
        const group = data[index];

        // Check Required Group Value (như Điện/Nước)
        if (group.requiredGroupValue) {
            let hasValue = false;
            group.fields.forEach(field => {
                field.list.forEach(item => {
                    if (Number(item.value) > 0) hasValue = true;
                });
            });
            if (!hasValue) return { valid: false, error: `"${group.name}" là bắt buộc. Vui lòng nhập ít nhất một giá trị.` };
        }

        // Check required fields trong từng dòng
        for (const field of group.fields) {
            const schema = field.inputSchema || group.inputSchemaTemplate || [];
            for (const item of field.list) {
                const isRowEmpty = Object.values(item).every(v => v === "" || v === 0);
                if (field.listType === 'dynamic' && isRowEmpty) continue;
                if (field.listType === 'fixed' && !Number(item.value)) continue;

                for (const inputConfig of schema) {
                    if (inputConfig.required && !item[inputConfig.name]) {
                        return { valid: false, error: `"${field.label}" → thiếu "${inputConfig.label}"` };
                    }
                }

                if (group.name === 'Chất thải' && item.codeWaste && !item.status) {
                    return { valid: false, error: `"${field.label}" → thiếu "Trạng thái"` };
                }
            }
        }
        return { valid: true };
    };

    const handleTabClick = (index) => {
        setActiveTab(index);
    };

    const handleNext = () => {
        setActiveTab((i) => Math.min(i + 1, data.length - 1));
    };


    const handlePrev = () => {
        setActiveTab((i) => Math.max(i - 1, 0))
    };

    // --- SUBMIT WRAPPER ---
    const handleConfirmSubmit = () => {
        if (isSubmitting) return;

        // Validate date — phải chọn tháng cụ thể, không phải "Cả năm"
        if (!date || date.startsWith('00/')) {
            toast.warning('Chưa chọn tháng', 'Vui lòng chọn tháng cụ thể trên lịch trước khi gửi.');
            return;
        }
        const parsedDate = dayjs(date, 'MM/YYYY', true);
        if (!parsedDate.isValid()) {
            toast.warning('Tháng không hợp lệ', 'Vui lòng chọn lại tháng trên lịch.');
            return;
        }

        for (let i = 0; i < data.length; i++) {
            const result = validateGroup(i);
            if (!result.valid) {
                setActiveTab(i);
                toast.warning(`Tab "${data[i].name}"`, result.error);
                return;
            }
        }
        setIsConfirmModalOpen(true);
    }

    // --- ACTUAL SUBMIT LOGIC ---
    const handleSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        const finalPayload = {};

        // --- Unit conversion helper ---
        const convertUnitForBackend = (value, unit, isElectricity = false) => {
            const numValue = Number(value) || 0;
            const unitLower = (unit || '').toLowerCase().trim();

            if (isElectricity) {
                // MWh → kWh
                if (unitLower === 'mwh') {
                    return { value: numValue * 1000, unit: 'kWh' };
                }
                return { value: numValue, unit: unit || 'kWh' };
            }

            // kg → tấn
            if (unitLower === 'kg') {
                return { value: numValue / 1000, unit: 'tấn' };
            }
            // lít → m³
            if (unitLower === 'lít' || unitLower === 'lit') {
                return { value: numValue / 1000, unit: 'm³' };
            }
            return { value: numValue, unit };
        };

        // 1. TẠO TỪ ĐIỂN ÁNH XẠ (MAPPING DICTIONARY)
        // Biến đổi mảng abbreviations thành object dạng: { "WOOD": "gỗ & Liên quan gỗ", "Grid": "điện lưới", ... }
        // Giúp tra cứu nhanh từ Code -> Tên Tiếng Việt
        const codeToNameMap = abbreviations.reduce((acc, item) => {
            acc[item._id] = item.name_group;
            return acc;
        }, {});

        data.forEach(group => {
            const groupPayload = {};
            const isElectricity = group.name === "Điện";

            group.fields.forEach(field => {
                // Lấy tên tiếng Việt chuẩn từ từ điển dựa trên subGroupKey của field (VD: 'WOOD', 'Grid', 'tap')
                // Nếu không tìm thấy trong từ điển, dùng tạm field.label
                const vietnameseName = codeToNameMap[field.subGroupKey] || field.label;

                // 2. LỌC VÀ CHUẨN HÓA ITEM
                const validItems = field.list.filter(item =>
                    item.value && Number(item.value) > 0
                ).map(item => {
                    // Logic Label gửi đi:
                    // - Với Điện/Nước: BE cần label là tên tiếng Việt (VD: "điện lưới") để map ID.
                    // - Với Chất đốt: BE cần fuelName để tính CO2.
                    // - Với Chất thải: BE cần wasteName.
                    // -> Gán vietnameseName vào tất cả các trường định danh để an toàn nhất.

                    // Tuy nhiên, nếu người dùng tự nhập tên (VD: "Xăng A95" trong nhóm PET), ta ưu tiên giữ tên cụ thể đó
                    // chỉ gán tên nhóm nếu item chưa có tên cụ thể.
                    const finalName = item.name || item.fuelName || item.wasteName || vietnameseName;

                    // --- Convert unit before sending ---
                    const isGasWaste = group.name === 'Chất thải' && field.subGroupKey === 'GASW';
                    const converted = isGasWaste
                        ? { value: Number(item.value) || 0, unit: 'mg/l' }
                        : convertUnitForBackend(item.value, item.unit, isElectricity);

                    return {
                        ...item,
                        // Quan trọng: Gán label bằng tên tiếng Việt chuẩn để BE tìm ra ID nhóm con
                        label: finalName,

                        // Các trường backup tên
                        name: finalName,
                        fuelName: finalName,
                        wasteName: finalName,

                        sub_group: field.subGroupKey,

                        // Override with converted values
                        value: converted.value,
                        unit: converted.unit
                    };
                });

                if (validItems.length === 0) return;

                // 3. GOM NHÓM DỮ LIỆU (GROUPING)
                // Tất cả nhóm (bao gồm Điện) đều gom theo tên tiếng Việt
                // Sử dụng vietnameseName làm Key (VD: "điện lưới", "gỗ & Liên quan gỗ")
                if (!groupPayload[vietnameseName]) groupPayload[vietnameseName] = [];
                groupPayload[vietnameseName].push(...validItems);
            });

            if (Object.keys(groupPayload).length > 0) {
                finalPayload[group.name] = groupPayload;
            }
        });

        // Gắn periodKey từ date đã chọn trên calendar
        const parsedDate = dayjs(date, "MM/YYYY");
        if (parsedDate.isValid()) {
            finalPayload.periodKey = parseInt(parsedDate.format("YYYYMM"));
        }

        try {
            const response = await addReourceWasteData(finalPayload);
            const isSuccess = response?.isSuccess || response?.data?.isSuccess;

            if (isSuccess) {
                // Upload pending bill images using createdFuelIds from response
                const createdFuelIds = response?.createdFuelIds || response?.data?.createdFuelIds || [];
                const pendingEntries = Object.entries(pendingBillFiles);

                if (pendingEntries.length > 0 && createdFuelIds.length > 0) {
                    let uploadErrors = 0;
                    for (const [key, { file, subGroupKey }] of pendingEntries) {
                        const match = createdFuelIds.find(f => f.sub_group === subGroupKey);
                        if (match) {
                            try {
                                await uploadBillImage(match._id, file);
                            } catch (err) {
                                uploadErrors++;
                                console.error(`Bill upload failed for ${match._id}:`, err);
                            }
                        }
                    }
                    if (uploadErrors > 0) {
                        toast.warning('Cảnh báo', `Dữ liệu đã lưu nhưng ${uploadErrors} ảnh hóa đơn upload thất bại.`);
                    }
                }

                // Upload pending waste attachments using createdWasteIds from response
                const createdWasteIds = response?.createdWasteIds || response?.data?.createdWasteIds || [];
                const wasteEntries = Object.entries(pendingWasteFiles);

                if (wasteEntries.length > 0 && createdWasteIds.length > 0) {
                    let wasteUploadErrors = 0;
                    for (const [key, filesArray] of wasteEntries) {
                        const [subGroupKey, itemIndexStr] = key.split('_');
                        const itemIndex = parseInt(itemIndexStr);

                        let wasteName = '';
                        const groupNum = data.findIndex(g => g.name === 'Chất thải');
                        if (groupNum !== -1) {
                            const field = data[groupNum].fields.find(f => f.subGroupKey === subGroupKey);
                            if (field && field.list[itemIndex]) {
                                wasteName = field.list[itemIndex].wasteName || '(Không tên)';
                            }
                        }

                        const matchingIds = createdWasteIds.filter(f => f.waste_main_group === subGroupKey && f.source_name === wasteName);
                        const match = matchingIds[0];

                        if (match && filesArray.length > 0) {
                            try {
                                const rawFiles = filesArray.map(f => f.file).filter(Boolean);
                                if (rawFiles.length > 0) {
                                    await uploadWasteAttachments(match._id, rawFiles);
                                }
                            } catch (_err) {
                                wasteUploadErrors++;
                            }
                        }
                    }
                    if (wasteUploadErrors > 0) {
                        toast.warning('Cảnh báo', `Dữ liệu đã lưu nhưng có lỗi khi upload ${wasteUploadErrors} mục đính kèm chất thải.`);
                    }
                }

                // Invalidate summary cache for dashboard auto-refresh
                queryClient.invalidateQueries({ queryKey: ['summary-records'] });
                queryClient.invalidateQueries({ queryKey: ['resource-history'] });

                setPendingBillFiles({});
                setPendingWasteFiles({});
                sessionStorage.removeItem(STORAGE_KEY);
                setTimeout(() => navigate('/resources', { state: { shouldRefresh: true } }), 500);
                toast.success('Thành công', 'Gửi dữ liệu thành công.');
            } else {
                const { title, description } = mapErrorToNotification(response, 'CREATE_RESOURCE');
                toast.error(title ?? 'Có lỗi xảy ra', description ?? (response?.message || 'Có lỗi xảy ra.'));
            }
        } catch (error) {
            console.error("API Error:", error);
            const errorMsg = error?.response?.data?.message || error?.message || 'Gửi dữ liệu thất bại';
            const { title, description } = mapErrorToNotification(error, 'CREATE_RESOURCE');
            toast.error(title ?? 'Lỗi gửi dữ liệu', description ?? errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto flex flex-col p-1 bg-gray-50">
            {/* Header */}
            {/* <div className="flex-shrink-0">
                <h1 className="text-2xl font-semibold text-gray-800">Khai báo tài nguyên & Chất thải</h1>
                <p className="text-gray-500">Nhập liệu báo cáo định kỳ hàng tháng</p>
            </div> */}

            {/* Tabs */}
            <div className="flex-shrink-0 mt-4 flex gap-3 items-center">
                {data.map((group, index) => (
                    <TabCard
                        key={index}
                        group={group}
                        isActive={activeTab === index}
                        total={inputCounts[group.name]}
                        onClick={() => handleTabClick(index)}
                    />
                ))}
                <button
                    className={`ml-auto px-6 py-3 font-medium text-white rounded-xl transition ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#4E5BA6] cursor-pointer hover:bg-[#3b457e]'}`}
                    onClick={() => handleConfirmSubmit()}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Đang gửi...' : 'Lưu tất cả'}
                </button>
            </div>

            {/* Form Content + Footer */}
            <div className="flex-1 flex flex-col mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">

                {/* Nội dung cuộn */}
                <div className="flex-1 overflow-y-auto p-4">
                    <p className="text-xs text-[#4E5BA6] bg-[#4E5BA6]/10 border border-[#4E5BA6]/20 rounded-lg px-3 py-2 mb-4">Lưu ý: Tất cả số lượng (tấn, kg, lít, m³, mg/l) đều tính trên <span className="font-semibold">1 tháng</span>.</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                        {/* Column 1 */}
                        <div className="flex flex-col gap-8">
                            {col1.map((field, idx) => (
                                <FieldGroup
                                    key={field.subGroupKey || field.label || idx}
                                    field={field}
                                    fieldIndex={data[activeTab].fields.indexOf(field)}
                                    groupConfig={currentGroup}
                                    onInputChange={handleInputChange}
                                    onAdd={handleAddItem}
                                    onRemove={handleRemoveItem}
                                    pendingBillFiles={pendingBillFiles}
                                    onBillFileSelect={(key, fileData) => setPendingBillFiles(prev => {
                                        const next = { ...prev };
                                        if (fileData) {
                                            // Cleanup old preview URL
                                            if (next[key]?.previewUrl) URL.revokeObjectURL(next[key].previewUrl);
                                            next[key] = { ...fileData, previewUrl: URL.createObjectURL(fileData.file) };
                                        } else {
                                            if (next[key]?.previewUrl) URL.revokeObjectURL(next[key].previewUrl);
                                            delete next[key];
                                        }
                                        return next;
                                    })}
                                    pendingWasteFiles={pendingWasteFiles}
                                    onWasteFileSelect={(key, filesData) => setPendingWasteFiles(prev => {
                                        const next = { ...prev };
                                        next[key] = filesData;
                                        return next;
                                    })}
                                />
                            ))}
                        </div>

                        {/* Column 2 */}
                        <div className="flex flex-col gap-8">
                            {col2.map((field, idx) => (
                                <FieldGroup
                                    key={field.subGroupKey || field.label || idx}
                                    field={field}
                                    fieldIndex={data[activeTab].fields.indexOf(field)}
                                    groupConfig={currentGroup}
                                    onInputChange={handleInputChange}
                                    onAdd={handleAddItem}
                                    onRemove={handleRemoveItem}
                                    pendingBillFiles={pendingBillFiles}
                                    onBillFileSelect={(key, fileData) => setPendingBillFiles(prev => {
                                        const next = { ...prev };
                                        if (fileData) {
                                            if (next[key]?.previewUrl) URL.revokeObjectURL(next[key].previewUrl);
                                            next[key] = { ...fileData, previewUrl: URL.createObjectURL(fileData.file) };
                                        } else {
                                            if (next[key]?.previewUrl) URL.revokeObjectURL(next[key].previewUrl);
                                            delete next[key];
                                        }
                                        return next;
                                    })}
                                    pendingWasteFiles={pendingWasteFiles}
                                    onWasteFileSelect={(key, filesData) => setPendingWasteFiles(prev => {
                                        const next = { ...prev };
                                        next[key] = filesData;
                                        return next;
                                    })}
                                />
                            ))}
                        </div>
                    </div>


                </div>

                {/* Footer Navigation luôn cố định bên dưới */}
                <div className="flex-shrink-0 flex justify-between px-4 py-3 border-t border-gray-100 bg-white">
                    <button
                        onClick={handlePrev}
                        disabled={activeTab === 0}
                        className={`px-5 py-2.5 rounded-xl font-medium transition ${activeTab === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            }`}
                    >
                        ← Quay lại
                    </button>

                    {activeTab < data.length - 1 ? (
                        <button
                            onClick={handleNext}
                            className="px-5 py-2.5 bg-[#4E5BA6] hover:bg-[#4E5BA690] text-white rounded-xl font-medium shadow-sm transition"
                        >
                            Tiếp theo →
                        </button>
                    ) : (
                        <button
                            onClick={handleConfirmSubmit}
                            disabled={isSubmitting}
                            className={`px-5 py-2.5 rounded-xl font-medium shadow-sm transition ${isSubmitting ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                        >
                            {isSubmitting ? 'Đang gửi...' : 'Gửi dữ liệu'}
                        </button>
                    )}
                </div>
            </div>


            <ConfirmationModal
                open={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleSubmit}
                title="Xác nhận gửi dữ liệu"
                content="Bạn có chắc chắn muốn gửi báo cáo này? Dữ liệu sau khi gửi sẽ được lưu vào hệ thống."
                confirmText="Gửi dữ liệu"
                cancelText="Xem lại"
                confirmType="primary"
                isLoading={isSubmitting}
                loadingText="Đang lưu dữ liệu..."
            />
            <ConfirmationModal
                open={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleSubmit}
                title="Xác nhận gửi dữ liệu"
                content="Bạn có chắc chắn muốn gửi báo cáo này? Dữ liệu sau khi gửi sẽ được lưu vào hệ thống."
                confirmText="Gửi dữ liệu"
                cancelText="Xem lại"
                confirmType="primary"
                isLoading={isSubmitting}
                loadingText="Đang lưu dữ liệu..."
            />
        </div >

    );
}

// --- SUB-COMPONENTS ---

// 1. Component hiển thị nhóm trường (Nguyên liệu, Điện...)
const FieldGroup = ({ field, fieldIndex, groupConfig, onInputChange, onAdd, onRemove, pendingBillFiles = {}, onBillFileSelect, pendingWasteFiles = {}, onWasteFileSelect }) => {
    // Always use current imported config for schema to avoid stale sessionStorage data
    const currentGroupConfig = resourceGroups.find(g => g.name === groupConfig.name);
    const schema = field.inputSchema || currentGroupConfig?.inputSchemaTemplate || groupConfig.inputSchemaTemplate || [];
    const primaryInputs = schema.filter(input => (input.row || 1) === 1);
    const secondaryInputs = schema.filter(input => (input.row || 1) !== 1);

    return (
        <div className="flex flex-col h-full">
            <div className="mb-3">
                <h3 className="font-semibold text-gray-800 text-lg">{field.label}</h3>
                <p className="text-sm text-gray-500">{field.description}</p>
            </div>

            <div className="flex flex-col gap-3">
                {/* Render danh sách các dòng input */}
                {field.list.map((item, itemIndex) => (
                    <motion.div
                        key={itemIndex}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex flex-col gap-3 p-3 my-2 rounded-xl border border-gray-100 bg-gray-50 hover:border-blue-100 transition-colors relative ${item.required ? "mt-4" : ""}`}
                    >
                        {/* Nếu là Fixed list (Điện), hiển thị Label mục đích (Sản xuất/Sinh hoạt) */}
                        {field.listType === 'fixed' && item.label && (
                            <div className="w-24 pb-2.5">
                                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                            </div>
                        )}

                        {item.required && (
                            <span className="absolute -top-1 left-0 -translate-y-full">
                                <p className="text-red-700 italic">* Bắt buộc</p>
                            </span>
                        )}

                        <div className="flex flex-wrap items-end gap-2">
                            {/* Render các ô input chính dựa trên schema */}
                            {primaryInputs.map((inputConfig, idx) => {
                                return (
                                    <div key={idx} className={getInputWidthClass(inputConfig.name, primaryInputs.length)}>
                                        <GenericInput
                                            config={inputConfig}
                                            item={item}
                                            value={item[inputConfig.name]}
                                            onChange={(val) => onInputChange(fieldIndex, itemIndex, inputConfig.name, val)}
                                            onSelectOpt={(opt) => {
                                                if (inputConfig.name === 'codeWaste') {
                                                    onInputChange(fieldIndex, itemIndex, 'wasteName', opt.name);
                                                    onInputChange(fieldIndex, itemIndex, 'statusOptions', Array.isArray(opt.status) ? opt.status : []);
                                                    onInputChange(fieldIndex, itemIndex, 'treatmentMethodsOptions', Array.isArray(opt.treatmentMethods) ? opt.treatmentMethods : []);
                                                }
                                            }}
                                            // Disable unit nếu là fixed list và config yêu cầu (như nước m3)
                                            disabled={field.listType === 'fixed' && inputConfig.name === 'unit' && groupConfig.name === 'Nước'}
                                        />
                                    </div>
                                );
                            })}

                            {/* Nút xóa (chỉ cho Dynamic) */}
                            {field.listType === 'dynamic' && (
                                <div className="my-auto">
                                    <MinusButton onClick={() => onRemove(fieldIndex, itemIndex)} />
                                </div>
                            )}
                        </div>

                        {secondaryInputs.length > 0 && (
                            <div className="rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-3 shadow-sm">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                                            Thông tin theo mã CTNH
                                        </p>
                                        <p className="text-xs text-blue-700/75">
                                            Gợi ý tự động theo mã chất thải, có thể để trống nếu chưa xác định.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-end gap-2">
                                    {secondaryInputs.map((inputConfig, idx) => (
                                        <div key={idx} className={getInputWidthClass(inputConfig.name, secondaryInputs.length)}>
                                            <GenericInput
                                                config={inputConfig}
                                                item={item}
                                                value={item[inputConfig.name]}
                                                onChange={(val) => onInputChange(fieldIndex, itemIndex, inputConfig.name, val)}
                                                onSelectOpt={(opt) => {
                                                    if (inputConfig.name === 'codeWaste') {
                                                        onInputChange(fieldIndex, itemIndex, 'wasteName', opt.name);
                                                        onInputChange(fieldIndex, itemIndex, 'statusOptions', Array.isArray(opt.status) ? opt.status : []);
                                                        onInputChange(fieldIndex, itemIndex, 'treatmentMethodsOptions', Array.isArray(opt.treatmentMethods) ? opt.treatmentMethods : []);
                                                    }
                                                }}
                                                disabled={field.listType === 'fixed' && inputConfig.name === 'unit' && groupConfig.name === 'Nước'}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Multiple File Upload for Waste Items */}
                        {groupConfig.name === 'Chất thải' && onWasteFileSelect && (
                            <div className="w-full mt-2 border-t border-gray-100 pt-2">
                                <MultipleFileUpload
                                    currentFiles={pendingWasteFiles?.[`${field.subGroupKey}_${itemIndex}`] || []}
                                    onUpload={(files) => {
                                        const key = `${field.subGroupKey}_${itemIndex}`;
                                        onWasteFileSelect(key, files);
                                    }}
                                    label="Tài liệu đính kèm (Chứng từ xử lý chất thải...)"
                                />
                            </div>
                        )}

                    </motion.div>
                ))}

                {/* Bill image upload for Điện lưới / Nước cấp — one per field, outside item loop */}
                {(field.subGroupKey === 'Grid' || field.subGroupKey === 'tap') && onBillFileSelect && (
                    <div className="mt-2">
                        <BillImageUpload
                            key={field.subGroupKey}
                            currentImage={pendingBillFiles?.[field.subGroupKey]?.previewUrl || null}
                            onUpload={(file) => {
                                const key = `${field.subGroupKey}`;
                                onBillFileSelect(key, file ? { file, subGroupKey: field.subGroupKey } : null);
                            }}
                            label={groupConfig.name === 'Điện' ? 'Hóa đơn điện' : 'Hóa đơn nước'}
                        />
                    </div>
                )}

                {/* Nút thêm dòng (chỉ cho Dynamic) */}
                {field.listType === 'dynamic' && (
                    <PlusButton
                        label="Thêm dòng"
                        onClick={() => onAdd(fieldIndex)}
                    />
                )}
            </div>
        </div>
    );
};

// 2. Component Input Đa năng (Text, Number, Select)
const GenericInput = ({ config, item, value, onChange, onSelectOpt, disabled }) => {
    const resolvedOptions = Array.isArray(config.options)
        ? config.options
        : (config.optionsKey && Array.isArray(item?.[config.optionsKey]) ? item[config.optionsKey] : []);

    if (config.type === 'select') {
        return (
            <FloatingSelect
                label={config.label}
                value={value}
                placeholder={config.placeholder}
                options={resolvedOptions}
                onChange={onChange}
                disabled={disabled || (config.disableWhenNoOptions && resolvedOptions.length === 0)}
            />
        );
    }

    if (config.type === 'suggest') {
        return (
            <FloatingSuggest
                label={config.label}
                value={value}
                options={resolvedOptions}
                onChange={onChange}
                disabled={disabled}
                placeholder={config.placeholder}
            />
        );
    }

    if (config.name === 'codeWaste') {
        return (
            <FloatingAutocomplete
                label={config.label}
                value={value}
                onChange={onChange}
                onSelectOpt={onSelectOpt}
                disabled={disabled}
                placeholder={config.placeholder}
            />
        );
    }

    return (
        <FloatingInput
            label={config.label}
            type={config.type} // text hoặc number
            value={value}
            onChange={onChange}
            placeholder={config.placeholder}
            disabled={disabled}
        />
    );
};

// 3. UI Components (Floating Labels)
const FloatingInput = ({ label, value, onChange, type = "text", disabled = false }) => {
    const [focused, setFocused] = useState(false);
    const hasValue = value !== undefined && value !== null && value !== "";
    const isActive = focused || hasValue;

    // Block non-numeric keys for number inputs
    const handleKeyDown = (e) => {
        if (type === 'number' && ['e', 'E', '+', '-'].includes(e.key)) {
            e.preventDefault();
        }
    };

    return (
        <div className="relative w-full h-10">
            <input
                type={type}
                value={value || ""}
                onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                disabled={disabled}
                min={type === 'number' ? 0 : undefined}
                className={`peer w-full h-full rounded-xl border px-3 pt-2 text-sm outline-none transition-all
                    ${disabled ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white text-gray-800 border-gray-300 focus:border-[#4E5BA6] focus:ring-1 focus:ring-[#4E5BA6]'}
                `}
            />
            <span
                title={label}
                className={`pointer-events-none absolute left-3 transition-all duration-200 truncate max-w-[calc(100%-1.5rem)]
                ${isActive ? 'top-[-8px] bg-white px-1 text-[11px] font-medium text-[#4E5BA6]' : 'top-2.5 text-sm text-gray-400'}
            `}>
                {label}
            </span>
        </div>
    );
};

const FloatingSelect = ({ label, value, onChange, options = [], disabled = false, placeholder }) => {
    const [open, setOpen] = useState(false);

    return (
        <div className="relative w-full h-10">
            <button
                onClick={() => !disabled && setOpen(!open)}
                className={`flex w-full h-full items-center justify-between rounded-xl border px-3 py-2 text-sm outline-none transition-all
                    ${disabled ? 'bg-gray-100 cursor-default border-gray-200' : 'bg-white hover:bg-gray-50 border-gray-300'}
                `}
                title={value || placeholder || label}
            >
                <span className={`truncate mr-2 ${value ? "text-gray-800" : "text-gray-400"}`}>
                    {value || placeholder || label}
                </span>
                {!disabled && <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
            </button>

            {/* Label floating khi có giá trị */}
            {value && (
                <span
                    title={label}
                    className="absolute left-3 top-[-8px] bg-white px-1 text-[11px] font-medium text-[#4E5BA6] truncate max-w-[calc(100%-1.5rem)]">
                    {label}
                </span>
            )}

            {open && !disabled && (
                <div className="absolute top-11 left-0 z-50 w-full rounded-xl border border-gray-200 bg-white shadow-lg p-1 animate-in fade-in zoom-in-95 duration-100">
                    {options.map((opt, idx) => (
                        <div
                            key={idx}
                            onClick={() => { onChange(opt); setOpen(false); }}
                            className="cursor-pointer rounded-lg px-3 py-2 text-sm hover:bg-blue-50 text-gray-700 truncate"
                            title={opt}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
            {/* Backdrop click outside */}
            {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
        </div>
    );
};

const FloatingSuggest = ({ label, value, onChange, options = [], disabled = false, placeholder }) => {
    const [focused, setFocused] = useState(false);
    const [open, setOpen] = useState(false);
    const hasValue = value !== undefined && value !== null && value !== "";
    const isActive = focused || hasValue;

    // Filter options based on input value. If exact match or empty, show all (or filtered).
    const filteredOptions = value && focused
        ? options.filter(opt => opt.toLowerCase().includes(value.toLowerCase()) && opt !== value)
        : options;

    return (
        <div className="relative w-full h-10">
            <input
                type="text"
                value={value || ""}
                onChange={(e) => {
                    onChange(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => {
                    setFocused(true);
                    setOpen(true);
                }}
                onBlur={() => setTimeout(() => { setFocused(false); setOpen(false); }, 200)}
                disabled={disabled}
                placeholder={focused ? placeholder : ''}
                className={`peer w-full h-full rounded-xl border px-3 pt-2 text-sm outline-none transition-all
                    ${disabled ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white text-gray-800 border-gray-300 focus:border-[#4E5BA6] focus:ring-1 focus:ring-[#4E5BA6]'}
                `}
            />
            <span
                title={label}
                className={`pointer-events-none absolute left-3 transition-all duration-200 truncate max-w-[calc(100%-1.5rem)]
                ${isActive ? 'top-[-8px] bg-white px-1 text-[11px] font-medium text-[#4E5BA6]' : 'top-2.5 text-sm text-gray-400'}
            `}>
                {label}
            </span>

            {open && !disabled && filteredOptions.length > 0 && (
                <div className="absolute top-11 left-0 z-50 w-full max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg p-1 animate-in fade-in zoom-in-95 duration-100">
                    {filteredOptions.map((opt, idx) => (
                        <div
                            key={idx}
                            onClick={() => { onChange(opt); setOpen(false); }}
                            className="cursor-pointer rounded-lg px-3 py-2 text-sm hover:bg-blue-50 text-gray-700 truncate"
                            title={opt}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const FloatingAutocomplete = ({ label, value, onChange, disabled, placeholder, onSelectOpt }) => {
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
            } catch (error) {
                if (!isCancelled) setOptions([]);
            } finally {
                if (!isCancelled) setLoading(false);
            }
        };

        // If newly focused and no value, fetch immediately without debounce
        if (focused && !value && options.length === 0) {
            fetchOptions();
        } else {
            const timeoutId = setTimeout(fetchOptions, 300);
            return () => {
                isCancelled = true;
                clearTimeout(timeoutId);
            };
        }

        return () => { isCancelled = true; };
    }, [value, focused]);

    const handleSelect = (opt) => {
        onChange(opt.code); // Gửi mã
        if (onSelectOpt) onSelectOpt(opt);
        setOpen(false);
    };

    return (
        <div className="relative w-full h-10">
            <input
                type="text"
                value={value || ""}
                onChange={(e) => {
                    onChange(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => {
                    setFocused(true);
                    setOpen(true);
                }}
                onBlur={() => setTimeout(() => { setFocused(false); setOpen(false); }, 200)} // Delay for click
                disabled={disabled}
                placeholder={focused ? placeholder : ''}
                className={`peer w-full h-full rounded-xl border px-3 pt-2 text-sm outline-none transition-all
                    ${disabled ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-white text-gray-800 border-gray-300 focus:border-[#4E5BA6] focus:ring-1 focus:ring-[#4E5BA6]'}
                `}
            />
            <span
                title={label}
                className={`pointer-events-none absolute left-3 transition-all duration-200 truncate max-w-[calc(100%-1.5rem)]
                ${isActive ? 'top-[-8px] bg-white px-1 text-[11px] font-medium text-[#4E5BA6]' : 'top-2.5 text-sm text-gray-400'}
            `}>
                {label}
            </span>

            {open && !disabled && (
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

// 4. Helper Components
const TabCard = ({ group, onClick, isActive, total }) => (
    <div
        onClick={onClick}
        className={`relative flex items-center gap-3 px-2 pr-3 py-2 rounded-2xl border transition-all cursor-pointer select-none
            ${isActive ? 'bg-white border-transparent shadow-md ring-2 ring-[#4E5BA6]' : 'bg-white border-gray-200 hover:border-gray-300'}
        `}
    >
        <div className="p-2 rounded-full" style={{ backgroundColor: `${group.color}15`, color: group.color }}>
            {(() => {
                const Icon = ICONS_MAP[group.icon];
                return <Icon className="h-full aspect-square w-full" strokeWidth={1.5} />;
            })()}
        </div>
        <span className="font-medium text-gray-700">
            {group.name}
            {group.requiredGroupValue && <span className="text-red-500 ml-0.5">*</span>}
        </span>
        {total > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[24px] h-6 flex items-center justify-center rounded-full text-xs font-bold text-white shadow-sm px-1.5"
                style={{ backgroundColor: group.color }}
            >
                {total}
            </span>
        )}
    </div>
);

const PlusButton = ({ onClick, label }) => (
    <button onClick={onClick} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-[#4E5BA6] bg-blue-50 hover:bg-blue-100 transition-colors w-fit">
        <Plus size={16} /> {label}
    </button>
);

const MinusButton = ({ onClick }) => (
    <button onClick={onClick} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-100 rounded-lg transition-colors">
        <Minus size={18} />
    </button>
);

// Helper để chỉnh độ rộng input cho đẹp
const getInputWidthClass = (name, totalInputs) => {
    // Tên và Ghi chú thường dài hơn
    if (name === 'name' || name === 'fuelName' || name === 'wasteName' || name === 'note') return 'flex-[2] min-w-[220px]';
    if (name === 'treatmentMethods') return 'flex-[2] min-w-[260px]';
    if (name === 'status') return 'flex-[1] min-w-[140px]';
    if (name === 'codeWaste') return 'flex-[1] min-w-[130px]';
    // Đơn vị và Số lượng ngắn hơn
    if (name === 'unit' || name === 'value') return 'flex-1 min-w-[90px]';
    return 'flex-1 min-w-[100px]';
}
