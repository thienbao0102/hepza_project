import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useResourceHistory } from '@/features/resources/hooks/useResourceHistory';
import { useAuth } from '@app/providers/auth/AuthProvider';
import { apiClient as axiosInstance } from '@lib/api-client';
import toast from '@/utils/toast';
import { UPDATE_RESOURCE_WASTE_DATA_ROUTE } from '@constants/constants';
import { mapErrorToNotification } from '@/utils/Error/mapErrorToNotification';

export const useResourceReportLogic = (reportId, locationState) => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const role = user?.role ?? user?.user?.role;
    const isCompany = role === 'company';

    const [report, setReport] = useState(null);
    const [initialReport, setInitialReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [newRows, setNewRows] = useState({});

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [notif, setNotif] = useState({ open: false, type: 'info', title: '', description: '' });

    const passedCompanyId = locationState?.companyId || user?.company_id;
    // Fallback zoneId might need checking user structure or specific field
    const passedZoneId = locationState?.zoneId || user?.zone_id || user?.zoneId;
    const passedPeriodKey = locationState?.periodKey;

    // --- UTILS ---
    const formatQuarter = (pk) => {
        const month = Number(String(pk ?? '').slice(-2));
        if (!Number.isFinite(month) || month < 1 || month > 12) return 'Không xác định';
        return `Quý ${Math.ceil(month / 3)}/${String(pk).slice(0, 4)}`;
    };

    const normalizeText = (value) =>
        (value ?? '')
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();

    const isGasWasteGroup = (groupValue) => {
        const normalized = normalizeText(groupValue);
        return normalized === 'gasw' || normalized.includes('khi thai');
    };

    const isHazardWasteGroup = (groupValue) => {
        const normalized = normalizeText(groupValue);
        return normalized === 'ha' || normalized.includes('nguy hai');
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr || dateStr === 'Không có dữ liệu') return dateStr;
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            const pad = (num) => String(num).padStart(2, '0');
            return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
        } catch (e) {
            return dateStr;
        }
    };

    const createTempRowId = () => {
        const randomId = globalThis.crypto?.randomUUID?.();
        if (randomId) return `new-${randomId}`;
        return `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    };

    const GROUP_ALIASES = {
        material: ['material', 'nguyên vật liệu'],
        chemical: ['chemical', 'hóa chất'],
        electricity: ['el', 'điện', 'electricity'],
        water: ['wa', 'nước', 'water'],
        fuel: ['co', 'nhiên liệu', 'combustion', 'chất đốt', 'chất đốt & nhiên liệu'],
        waste: ['waste', 'chất thải'],
    };

    const SUBGROUP_ALIASES = {
        material: [
            'met', 'kim loại & hợp kim',
            'nmet', 'phi kim',
            'pol', 'nhựa & polyme',
            'wood', 'gỗ & liên quan gỗ',
            'tex', 'vải & sợi vải',
            'agri', 'thực phẩm & nông sản',
            'pac', 'giấy & bìa carton',
            'moth', 'vật liệu khác',
        ],
        chemical: [
            'haz', 'hóa chất nguy hiểm',
            'acd', 'axit',
            'bas', 'bazơ', 'kiềm',
            'slt', 'muối',
            'sol', 'dung môi',
            'gas', 'khí & hóa chất bay hơi',
            'add', 'phụ gia', 'chất trợ',
            'redox', 'chất khử', 'chất oxy hóa',
            'chot', 'hóa chất khác',
        ],
        electricity: [
            'grid', 'điện lưới',
            'renewable', 'điện tái tạo',
        ],
        water: [
            'tap', 'nước cấp',
            'rain', 'nước mưa',
            'well', 'nước giếng',
            'recycle', 'nước tái chế',
        ],
        fuel: [
            'col', 'than',
            'bio', 'biomass', 'sinh khối',
            'pet', 'nhiên liệu dầu mỏ',
            'gasf', 'chất đốt dạng khí',
            'coth', 'chất đốt khác',
        ],
        waste: [
            'do', 'chất thải sinh hoạt',
            'ind', 'chất thải công nghiệp',
            'ha', 'chất thải nguy hại',
            'wwa', 'nước thải',
            'khí thải công nghiệp',
            'gasw', 'khí thải',
        ],
    };

    const calculateElectricGroup = (group) => {
        if (!group) return '(Không rõ nhóm)';
        const g = normalizeText(group);
        if (g === normalizeText('Grid') || g === normalizeText('điện lưới')) return 'Điện lưới';
        if (g === normalizeText('Renewable') || g === normalizeText('điện tái tạo')) return 'Điện tái tạo';
        return group; // Fallback
    };

    // --- CONFIG ---
    // Normalize unit string to match config options
    const normalizeDisplayUnit = (unit) => {
        if (!unit) return '';
        const lower = unit.toString().toLowerCase().trim();
        const unitMap = {
            'tấn': 'tấn', 'tan': 'tấn',
            'kg': 'kg',
            'lít': 'lít', 'lit': 'lít',
            'm³': 'm³', 'm3': 'm³',
            'kwh': 'kWh',
            'mwh': 'MWh',
            'mg/l': 'mg/l',
        };
        return unitMap[lower] || unit;
    };

    const RESOURCE_CONFIG = {
        materials: {
            groups: ["Kim loại & Hợp kim", "Phi kim", "Nhựa & Polyme", "Gỗ", "Vải & Sợi vải", "Thực phẩm & Nông sản", "Giấy & Bìa carton", "Vật liệu khác"],
            unitOptions: ["kg", "tấn", "lít", "m³"]
        },
        chemicals: {
            groups: ["Hóa chất nguy hiểm", "Axit", "Bazơ/Kiềm", "Muối", "Dung môi", "Khí & Hóa chất bay hơi", "Phụ gia", "Chất khử", "Hóa chất khác"],
            unitOptions: ["kg", "tấn", "lít", "m³"]
        },
        fuel: {
            groups: ["Than", "Biomass", "Nhiên liệu dầu mỏ", "Chất đốt dạng khí", "Chất đốt khác"],
            unitOptions: ["kg", "tấn", "lít", "m³"]
        },
        waste: {
            groups: ["Chất thải sinh hoạt", "Chất thải công nghiệp", "Chất thải nguy hại", "Nước thải", "Khí thải công nghiệp"],
            unitOptions: ["kg", "tấn", "lít", "m³"]
        },
        electricity: {
            groups: ["Điện lưới", "Điện tái tạo"],
            // Không dùng dropdown cho tên — cho phép nhập tự do
            unitOptions: ["kWh", "MWh"],
            maxQuantity: 999999
        },
        water: {
            groups: ["Nước cấp", "Nước giếng", "Nước mưa", "Nước tái chế"],
            hideName: true,
            hideUnit: true,
            unitOptions: ["m³"]
        }
    };

    const getResourceOptions = (sectionKey, currentGroup, currentName) => {
        const config = RESOURCE_CONFIG[sectionKey] || {};
        let groupOptions = config.groups || [];
        let nameOptions = config.getNames ? config.getNames(currentGroup) : [];

        // Filter out already used groups for Water section
        if (sectionKey === 'water') {
            const usedInExisting = (report?.water || []).map(i => i.group);
            const usedInNew = (newRows?.water || []).map(i => i.group);
            const allUsed = [...usedInExisting, ...usedInNew];

            groupOptions = groupOptions.filter(g =>
                !allUsed.includes(g) || g === currentGroup
            );
        }

        // Filter for Electricity (Group + Name combinations)
        if (sectionKey === 'electricity') {
            const existingRows = [
                ...(report?.electricity || []),
                ...(newRows?.electricity || [])
            ];

            // 1. Filter nameOptions for current group
            nameOptions = nameOptions.filter(name => {
                const isUsedInOtherRow = existingRows.some(row =>
                    row.group === currentGroup &&
                    row.name === name &&
                    row.id !== currentName // Use currentName as the unique identifier check if passed, but usually we compare IDs
                );
                // Since rows have IDs, it's better if we know which row we are filtering for.
                // But for simplicity, we check if ANY other row has this combo.
                // We'll pass the row's ID as currentName for this check if possible, or just skip if it matches current values.
                return true; // We will refine this in a bit
            });

            // Let's do a cleaner filtering
            const otherRows = existingRows.filter(r => r.id !== currentName); // Assuming currentName param is used for ID

            // Filter names
            nameOptions = (config.getNames ? config.getNames(currentGroup) : []).filter(name =>
                !otherRows.some(r => r.group === currentGroup && r.name === name)
            );

            // Filter groups: Only hide a group if ALL its names are taken by other rows
            groupOptions = (config.groups || []).filter(group => {
                if (group === currentGroup) return true;
                const allowedNames = config.getNames ? config.getNames(group) : [];
                const takenNames = otherRows
                    .filter(r => r.group === group)
                    .map(r => r.name);
                return !allowedNames.every(name => takenNames.includes(name));
            });
        }

        if (sectionKey === 'waste' && isGasWasteGroup(currentGroup)) {
            return {
                groupOptions,
                nameOptions,
                unitOptions: ['mg/l'],
                hideName: config.hideName || false,
                hideUnit: config.hideUnit || false,
                maxQuantity: config.maxQuantity || 1000000
            };
        }

        return {
            groupOptions,
            nameOptions,
            unitOptions: config.unitOptions || ["kg", "tấn", "lít", "m³"],
            hideName: config.hideName || false,
            hideUnit: config.hideUnit || false,
            maxQuantity: config.maxQuantity || 1000000
        };
    };

    const matchesGroup = (value, aliases) => {
        const normalized = normalizeText(value);
        return aliases.some(alias => normalized === normalizeText(alias));
    };

    const filterByGroup = (items, groupKey) => {
        if (!Array.isArray(items)) return [];
        const aliases = GROUP_ALIASES[groupKey] || [];
        const subAliases = SUBGROUP_ALIASES[groupKey] || [];

        return items.filter(item => {
            const mainVal = item?.main_group || item?.group;
            if (matchesGroup(mainVal, aliases)) return true;
            if (matchesGroup(mainVal, subAliases)) return true;

            const subVal = normalizeText(item?.sub_group || '');
            if (!subVal) return false;
            return subAliases.some(alias => subVal === normalizeText(alias));
        });
    };

    const mapResources = (items) => {
        if (!Array.isArray(items)) return [];

        return items.flatMap((item, idx) => {
            const isElectric =
                matchesGroup(item?.main_group || item?.group, GROUP_ALIASES.electricity) ||
                matchesGroup(item?.sub_group, SUBGROUP_ALIASES.electricity);
            const isGasWaste = isGasWasteGroup(item?.main_group || item?.group || item?.sub_group);
            const isHazardWaste = isHazardWasteGroup(item?.main_group || item?.group || item?.sub_group);

            let groupLabel = item.sub_group || item.main_group || item.group || '(Không rõ nhóm)';

            // Hàm helper để title case
            const toTitle = (str = '') =>
                (str || '')
                    .split(' ')
                    .filter(Boolean)
                    .map(w => {
                        const s = (w ?? '').toString();
                        return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
                    })
                    .join(' ');

            if (isElectric) {
                const sub = normalizeText(item?.sub_group);
                if (sub === normalizeText('Grid') || sub === normalizeText('điện lưới')) {
                    groupLabel = 'Điện lưới';
                } else if (sub === normalizeText('Renewable') || sub === normalizeText('điện tái tạo')) {
                    groupLabel = 'Điện tái tạo';
                }

                // Kiểm tra xem record có bị gộp không (check detail object)
                const detail = item.detail || {};
                const splitRows = [];
                const commonProps = {
                    group: groupLabel, // Giữ nguyên group name đã chuẩn hóa
                    note: item.note || '',
                    originalId: item._id || item.id || idx, // Để track ID gốc nếu cần
                    detailId: detail._id, // Lưu ID của detail object
                    billImage: item.billImage || null
                };

                if (detail.production > 0) {
                    const rawQty = detail.production;
                    splitRows.push({
                        ...commonProps,
                        id: `${item._id}_prod`,
                        name: 'Sản xuất',
                        quantity: rawQty >= 1000 ? rawQty / 1000 : rawQty,
                        unit: rawQty >= 1000 ? 'MWh' : 'kWh'
                    });
                }
                if (detail.domestic > 0) {
                    const rawQty = detail.domestic;
                    splitRows.push({
                        ...commonProps,
                        id: `${item._id}_dom`,
                        name: 'Sinh hoạt',
                        quantity: rawQty >= 1000 ? rawQty / 1000 : rawQty,
                        unit: rawQty >= 1000 ? 'MWh' : 'kWh'
                    });
                }
                // Chỉ Điện lưới mới có Khác
                if (detail.other > 0 && groupLabel === 'Điện lưới') {
                    const rawQty = detail.other;
                    splitRows.push({
                        ...commonProps,
                        id: `${item._id}_oth`,
                        name: 'Khác',
                        quantity: rawQty >= 1000 ? rawQty / 1000 : rawQty,
                        unit: rawQty >= 1000 ? 'MWh' : 'kWh'
                    });
                }

                // fallback if detail object exists but has 0 values (should ideally not happen if total > 0)
                // or if detail object is missing
                if (splitRows.length === 0) {
                    // Fallback cho trường hợp cũ hoặc ko có detail
                    let nameLabel = item.name || item.fuelName || '(Chưa phân loại)';
                    const rawUsage = normalizeText(item?.usage || item?.usageKey || item?.usageType || item?.label);
                    if (rawUsage === 'production' || rawUsage === normalizeText('Sản xuất')) nameLabel = 'Sản xuất';
                    else if (rawUsage === 'domestic' || rawUsage === normalizeText('Sinh hoạt')) nameLabel = 'Sinh hoạt';

                    const rawQty = item.value ?? item.quantity ?? 0;
                    splitRows.push({
                        ...commonProps,
                        id: item._id || idx,
                        name: nameLabel,
                        quantity: rawQty >= 1000 ? rawQty / 1000 : rawQty,
                        unit: rawQty >= 1000 ? 'MWh' : 'kWh'
                    });
                }
                return splitRows;
            }

            const isWater =
                matchesGroup(item?.main_group || item?.group, GROUP_ALIASES.water) ||
                matchesGroup(item?.sub_group, SUBGROUP_ALIASES.water);
            const sub = normalizeText(item?.sub_group);

            if (isGasWaste) {
                groupLabel = 'Khí thải công nghiệp';
            }

            if (isHazardWaste) {
                groupLabel = 'Chất thải nguy hại';
            }

            // Fix duplicate Water groups: Map recycle codes to 'Nước tái sử dụng'
            if (isWater) {
                switch (sub) {
                    case 'tap':
                    case 'nước cấp (thủy cục)':
                    case 'nước máy':
                    case 'supply':
                    case 'nước cấp':
                        groupLabel = 'Nước cấp';
                        break;
                    case 'well':
                    case 'nước giếng':
                    case 'nước ngầm':
                        groupLabel = 'Nước giếng';
                        break;
                    case 'rain':
                    case 'nước mưa':
                        groupLabel = 'Nước mưa';
                        break;
                    case 'recycle':
                    case 'nước tái chế':
                    case 'nước tái sử dụng':
                        groupLabel = 'Nước tái chế';
                        break;
                    default:
                        break;
                }

                // Revert split logic => Flat structure for Water
                // Vì UI ẩn cột Name, ta có thể set name = groupLabel hoặc giữ nguyên.
                // Để transformData hoạt động ổn định (dùng name làm key), ta nên giữ name nếu có, hoặc default theo group.
                let nameLabel = item.name || item.wasteName || groupLabel;

                return [{
                    id: item._id || item.id || idx,
                    group: toTitle(groupLabel),
                    name: toTitle(nameLabel),
                    quantity: item.value ?? item.quantity ?? 0,
                    unit: item.unit || 'm³',
                    note: item.note || '',
                    originalId: item._id || item.id || idx,
                    detailId: item.detail?._id,
                    billImage: item.billImage || null
                }];
            }

            // Hàm helper để viết hoa chữ cái đầu
            const capitalizeFirst = (str) => {
                if (!str) return '';
                return str.charAt(0).toUpperCase() + str.slice(1);
            };

            let nameLabel = item.name || item.fuelName || item.wasteName || '(Không rõ tên)';
            nameLabel = capitalizeFirst(nameLabel);

            return {
                id: item._id || item.id || idx,
                group: toTitle(groupLabel),
                name: nameLabel,
                quantity: item.value ?? item.quantity ?? 0,
                unit: isGasWaste ? 'mg/l' : normalizeDisplayUnit(item.unit || ''),
                note: item.note || '',
                originalId: item._id || item.id || idx, // Thêm originalId để đồng bộ logic với Điện/Nước
                // Waste-specific fields (chỉ có giá trị khi là chất thải)
                codeWaste: item.codeWaste || '',
                wasteCodeName: item.wasteCodeName || '',
                status: item.status || '',
                treatmentMethods: item.treatmentMethods || '',
                attachments: item.attachments || [],
            };
        });
    };

    // --- DATA FETCHING ---
    const parsedPeriodKey = useMemo(() => {
        if (passedPeriodKey) return passedPeriodKey;
        const match = reportId?.match(/period-(\d{6})/);
        return match ? Number(match[1]) : null;
    }, [reportId, passedPeriodKey]);

    const shouldFetch = Boolean(passedCompanyId && passedZoneId && parsedPeriodKey);
    const { data: historyData, isLoading: historyLoading, isFetching: historyFetching, error: historyError, refetch: historyRefetch } =
        useResourceHistory(
            {
                companyId: passedCompanyId,
                zoneId: passedZoneId,
                periodKey: parsedPeriodKey,
                role,
            },
            { enabled: shouldFetch }
        );

    const fallbackTime = 'Không có dữ liệu';
    const deletedAccountLabel = 'Tài khoản đã xóa';

    const normalizeReport = (data) => {
        if (!data) return null;
        const resolveActorLabel = (actor) => {
            if (typeof actor === 'string' && actor.trim()) return actor.trim();
            if (actor?.email && String(actor.email).trim()) return String(actor.email).trim();
            if (actor?.name && String(actor.name).trim()) return String(actor.name).trim();
            return deletedAccountLabel;
        };

        const periodKey = data.periodKey;
        const quarterLabel = formatQuarter(periodKey);
        const createdRaw = data.created_at || fallbackTime;
        const created = formatDateTime(createdRaw);

        const resourceChange = Array.isArray(data.resource_change) ? data.resource_change : [];
        const lastChange = resourceChange[0]; // Backend sorts newest first

        const headerAccount = resolveActorLabel(resourceChange[0]?.modifiedBy);
        const lastUpdatedRaw = lastChange?.modifiedAt || createdRaw || fallbackTime;
        const lastUpdated = formatDateTime(lastUpdatedRaw);

        const inputs = Array.isArray(data.input) ? data.input : [];
        const materialsInput = filterByGroup(inputs, 'material');
        const chemicalsInput = filterByGroup(inputs, 'chemical');

        return {
            companyName: data.company_name || '(Không rõ doanh nghiệp)',
            summaryVersion: data.summaryVersion ?? null,
            quarter: quarterLabel,
            completedDate: created,
            account: headerAccount,
            lastUpdated,
            materials: mapResources(materialsInput),
            electricity: mapResources(filterByGroup(data.fuel, 'electricity')),
            water: mapResources(filterByGroup(data.fuel, 'water')),
            fuel: mapResources(filterByGroup(data.fuel, 'fuel')),
            chemicals: mapResources(chemicalsInput),
            waste: mapResources(filterByGroup(data.waste, 'waste')),
            other: [],
            history: resourceChange.map((item, idx) => ({
                id: item.trans_id || idx,
                time: item.timeLabel || fallbackTime,
                user: resolveActorLabel(item.modifiedBy),
                actions: item.changes?.map?.(chg => chg.commitMessage).filter(Boolean) || [item.commitMessage || ''],
            })),
        };
    };

    useEffect(() => {
        // Only set global loading to true if we don't have report data yet
        if (historyLoading && !report) {
            setLoading(true);
        } else if (!historyLoading && !historyFetching) {
            setLoading(false);
        }

        if (historyError) {
            setError('Không thể tải dữ liệu báo cáo.');
            setLoading(false);
        } else if (historyData) {
            const normalized = normalizeReport(historyData);
            setReport(normalized);
            setInitialReport(JSON.parse(JSON.stringify(normalized))); // Deep clone for baseline
            setError(null);
        }
    }, [historyLoading, historyFetching, historyData, historyError]);

    // --- HANDLERS ---
    useEffect(() => {
        if (isEditing && report) {
            setNewRows({});
        }
    }, [isEditing]);

    const handleDataChange = (sectionKey, index, field, value) => {
        setReport(prev => {
            const newSectionData = [...(prev[sectionKey] || [])];
            newSectionData[index] = { ...newSectionData[index], [field]: value };
            if (sectionKey === 'waste' && field === 'group') {
                const unitOptions = getResourceOptions(sectionKey, value).unitOptions || [];
                newSectionData[index].unit = unitOptions[0] || newSectionData[index].unit;
                newSectionData[index].codeWaste = '';
                newSectionData[index].wasteCodeName = '';
                newSectionData[index].status = '';
                newSectionData[index].statusOptions = [];
                newSectionData[index].treatmentMethods = '';
                newSectionData[index].treatmentMethodsOptions = [];
            }
            return { ...prev, [sectionKey]: newSectionData };
        });
    };

    const handleNewDataChange = (sectionKey, index, field, value) => {
        setNewRows(prev => {
            const key = sectionKey;
            const newSectionData = [...(prev[key] || [])];
            newSectionData[index] = { ...newSectionData[index], [field]: value };
            if (sectionKey === 'waste' && field === 'group') {
                const unitOptions = getResourceOptions(sectionKey, value).unitOptions || [];
                newSectionData[index].unit = unitOptions[0] || newSectionData[index].unit;
                newSectionData[index].codeWaste = '';
                newSectionData[index].wasteCodeName = '';
                newSectionData[index].status = '';
                newSectionData[index].statusOptions = [];
                newSectionData[index].treatmentMethods = '';
                newSectionData[index].treatmentMethodsOptions = [];
            }
            return { ...prev, [key]: newSectionData };
        });
    };

    const handleRemoveRow = (sectionKey, index) => {
        setReport(prev => {
            const newSectionData = [...(prev[sectionKey] || [])];
            newSectionData[index] = { 
                ...newSectionData[index], 
                quantity: 0,
                value: 0
            };
            return { ...prev, [sectionKey]: newSectionData };
        });
    };

    const handleRemoveNewRow = (sectionKey, index) => {
        setNewRows(prev => {
            const key = sectionKey;
            const newSectionData = [...(prev[key] || [])];
            newSectionData.splice(index, 1);
            return { ...prev, [key]: newSectionData };
        });
    };

    const checkHasChanges = () => {
        // 1. Check new rows
        const hasNewRows = Object.values(newRows).some(rows => rows && rows.length > 0);
        if (hasNewRows) return true;

        // 2. Check changes in existing rows
        if (!initialReport || !report) return false;

        const sections = ['materials', 'chemicals', 'electricity', 'water', 'fuel', 'waste'];
        for (const section of sections) {
            const current = report[section] || [];
            const original = initialReport[section] || [];

            if (current.length !== original.length) return true;

            for (let i = 0; i < current.length; i++) {
                const c = current[i];
                const o = original[i];
                // Compare relevant fields
                if (
                    c.group !== o.group ||
                    c.name !== o.name ||
                    Number(c.quantity) !== Number(o.quantity) ||
                    c.unit !== o.unit ||
                    c.note !== o.note ||
                    c.codeWaste !== o.codeWaste ||
                    c.wasteCodeName !== o.wasteCodeName ||
                    c.status !== o.status ||
                    c.treatmentMethods !== o.treatmentMethods
                ) {
                    return true;
                }
            }
        }

        return false;
    };

    const handleAddRow = (sectionKey) => {
        const { groupOptions: specificGroups, unitOptions: specificUnits } = getResourceOptions(sectionKey);
        let defaultGroup = specificGroups[0];
        let defaultName = "";
        let defaultUnit = specificUnits[0];

        // Auto-select available group for Water
        if (sectionKey === 'water') {
            const allowedGroups = RESOURCE_CONFIG.water.groups;
            const existingGroups = [
                ...(report?.water || []).map(i => i.group),
                ...(newRows?.water || []).map(i => i.group)
            ];
            const availableGroup = allowedGroups.find(g => !existingGroups.includes(g));
            if (availableGroup) {
                defaultGroup = availableGroup;
            }
            defaultName = defaultGroup; // Auto-fill name since input is hidden
        }

        // Auto-select valid combination for Electricity
        if (sectionKey === 'electricity') {
            const existingRows = [
                ...(report?.electricity || []),
                ...(newRows?.electricity || [])
            ];
            const allowedGroups = RESOURCE_CONFIG.electricity.groups;

            let foundCombo = null;
            for (const g of allowedGroups) {
                const allowedNames = RESOURCE_CONFIG.electricity.getNames(g);
                const unusedName = allowedNames.find(n =>
                    !existingRows.some(r => r.group === g && r.name === n)
                );
                if (unusedName) {
                    foundCombo = { group: g, name: unusedName };
                    break;
                }
            }

            if (!foundCombo) return; // Should be handled by button disable in UI
            defaultGroup = foundCombo.group;
            defaultName = foundCombo.name;
        }

        defaultUnit = getResourceOptions(sectionKey, defaultGroup).unitOptions[0] || defaultUnit;

        setNewRows(prev => {
            const key = sectionKey;
            const currentNewRows = prev[key] || [];
            return {
                ...prev,
                [key]: [
                    ...currentNewRows,
                    { id: createTempRowId(), group: defaultGroup, name: defaultName, quantity: 0, unit: defaultUnit, note: "" }
                ]
            };
        });
    };

    // --- TRANSFORM & SAVE ---
    const transformData = (currentReport) => {
        const payload = {
            "Nguyên vật liệu": {},
            "Hóa chất": {},
            "Điện": {},
            "Nước": {},
            "Chất đốt & Nhiên liệu": {},
            "Chất thải": {}
        };

        const mapCommonItem = (item) => {
            // Capitalize first letter, keep rest as-is (giữ viết tắt MDF, H2SO4...)
            const capFirst = (s) => {
                if (!s) return '';
                const str = s.toString().trim();
                return str.charAt(0).toUpperCase() + str.slice(1);
            };
            const safeLower = (s) => (s ? s.toString().toLowerCase() : '');

            // --- Unit conversion: normalize to standard backend units ---
            let finalValue = Number(item.quantity) || 0;
            let finalUnit = item.unit || '';
            const unitLower = finalUnit.toLowerCase().trim();
            const gasWaste = isGasWasteGroup(item.group);

            if (gasWaste) {
                finalUnit = 'mg/l';
            } else if (unitLower === 'kg') {
                finalValue = finalValue / 1000; // kg → tấn
                finalUnit = 'tấn';
            } else if (unitLower === 'lít' || unitLower === 'lit') {
                finalValue = finalValue / 1000; // lít → m³
                finalUnit = 'm³';
            }

            const result = {
                name: capFirst(item.name),
                label: capFirst(item.name),
                value: finalValue,
                unit: finalUnit,
                note: item.note || '',
                sub_group: safeLower(item.group)
            };

            // Logic ID chuẩn hóa: Ưu tiên originalId, sau đó đến id (nếu không phải new-)
            const idToSend = item.originalId || (item.id && !item.id.toString().startsWith('new-') ? item.id : null);

            if (idToSend) {
                result._id = idToSend;
            }
            // Nếu có detailId (dành cho các case mở rộng sau này)
            if (item.detailId) {
                result.detailId = item.detailId;
            }

            return result;
        };

        // 1. Nguyên vật liệu (Group by SubGroup)
        (currentReport.materials || []).forEach(item => {
            const group = item.group;
            if (!payload["Nguyên vật liệu"][group]) payload["Nguyên vật liệu"][group] = [];
            payload["Nguyên vật liệu"][group].push(mapCommonItem(item));
        });

        // 2. Hóa chất
        (currentReport.chemicals || []).forEach(item => {
            const group = item.group;
            if (!payload["Hóa chất"][group]) payload["Hóa chất"][group] = [];
            payload["Hóa chất"][group].push(mapCommonItem(item));
        });

        // 3. Điện — Key = group (Điện lưới/Điện tái tạo → sub_group), Label = name (tên tự do)
        (currentReport.electricity || []).forEach(item => {
            const capFirst = (s) => {
                if (!s) return '';
                const str = s.toString().trim();
                return str.charAt(0).toUpperCase() + str.slice(1);
            };

            // Key = group (Điện lưới / Điện tái tạo) → BE dùng làm sub_group
            const group = item.group;
            if (!payload["Điện"][group]) payload["Điện"][group] = [];

            // Convert MWh → kWh for backend
            const rawQty = Number(item.quantity) || 0;
            const isInMWh = (item.unit || '').toLowerCase() === 'mwh';
            const electricityItem = {
                label: capFirst(item.name || item.group), // Tên tự do → fuelName
                value: isInMWh ? rawQty * 1000 : rawQty,
                unit: 'kWh', // Always send kWh to backend
                note: item.note || ''
            };

            // Ưu tiên originalId (ID gốc)
            if (item.originalId) {
                electricityItem._id = item.originalId;
            } else if (item.id && !item.id.toString().startsWith('new-')) {
                electricityItem._id = item.id.split('_')[0];
            }

            if (item.detailId) {
                electricityItem.detailId = item.detailId;
            }

            payload["Điện"][group].push(electricityItem);
        });

        // 4. Nước
        (currentReport.water || []).forEach(item => {
            const capFirst = (s) => {
                if (!s) return '';
                const str = s.toString().trim();
                return str.charAt(0).toUpperCase() + str.slice(1);
            };
            const safeLower = (s) => (s ? s.toString().toLowerCase() : '');

            // Key for payload
            const usage = capFirst(item.name);

            // Ensure the array exists
            if (!payload["Nước"][usage]) payload["Nước"][usage] = [];

            const waterItem = {
                label: capFirst(item.group),
                sub_group: safeLower(item.group),
                name: capFirst(item.name),
                value: Number(item.quantity) || 0,
                unit: item.unit,
                note: item.note || ''
            };

            if (item.originalId) {
                waterItem._id = item.originalId;
            } else if (item.id && !item.id.toString().startsWith('new-')) {
                waterItem._id = item.id.split('_')[0];
            }

            if (item.detailId) {
                waterItem.detailId = item.detailId;
            }

            payload["Nước"][usage].push(waterItem);
        });

        // 5. Chất đốt (Fuel)
        (currentReport.fuel || []).forEach(item => {
            const group = item.group;
            if (!payload["Chất đốt & Nhiên liệu"][group]) payload["Chất đốt & Nhiên liệu"][group] = [];
            payload["Chất đốt & Nhiên liệu"][group].push(mapCommonItem(item));
        });

        // 6. Chất thải — bao gồm codeWaste, treatmentMethods, attachments
        (currentReport.waste || []).forEach(item => {
            const group = item.group;
            if (!payload["Chất thải"][group]) payload["Chất thải"][group] = [];

            const mapped = mapCommonItem(item);
            if (item.id && item.id.toString().startsWith('new-')) {
                mapped.clientRowId = item.id;
            }
            // Thêm waste-specific fields mà mapCommonItem không có
            if (item.codeWaste) mapped.codeWaste = item.codeWaste;
            if (item.wasteCodeName) mapped.wasteCodeName = item.wasteCodeName;
            if (item.status) mapped.status = item.status;
            if (item.treatmentMethods) mapped.treatmentMethods = item.treatmentMethods;
            if (item.attachments && item.attachments.length > 0) mapped.attachments = item.attachments;
            // wasteName — backend dùng trường này thay vì name/label
            mapped.wasteName = mapped.label || mapped.name;

            payload["Chất thải"][group].push(mapped);
        });

        if (parsedPeriodKey) {
            payload.periodKey = parsedPeriodKey;
        }

        payload.summaryVersion = currentReport.summaryVersion;

        return payload;
    };

    const handleSave = async (options = {}) => {
        setIsSaving(true);
        try {
            const mergedReport = JSON.parse(JSON.stringify(report));

            Object.keys(newRows).forEach(key => {
                if (newRows[key] && newRows[key].length > 0) {
                    mergedReport[key] = [...(mergedReport[key] || []), ...newRows[key]];
                }
            });

            const allItems = [
                ...(mergedReport.materials || []),
                ...(mergedReport.chemicals || []),
                ...(mergedReport.electricity || []),
                ...(mergedReport.water || []),
                ...(mergedReport.fuel || []),
                ...(mergedReport.waste || [])
            ];

            // Validate all sections for empty names or empty quantities
            const allItemsForValidation = [
                ...(mergedReport.materials || []),
                ...(mergedReport.chemicals || []),
                ...(mergedReport.electricity || []),
                ...(mergedReport.water || []),
                ...(mergedReport.fuel || []),
                ...(mergedReport.waste || [])
            ];

            const emptyItem = allItemsForValidation.find(item => {
                const text = item.name || item.label || item.wasteName || item.fuelName || '';
                return !item.group || !text || String(text).trim() === '';
            });

            if (emptyItem) {
                toast.error('Lỗi nhập liệu', 'Vui lòng điền đầy đủ Tên/Mục đích cho tất cả các dòng dữ liệu.');
                setIsSaving(false);
                return;
            }

            const emptyQtyItem = allItemsForValidation.find(item => item.quantity === undefined || item.quantity === null || String(item.quantity).trim() === '');
            if (emptyQtyItem) {
                const nameLabel = emptyQtyItem.name || emptyQtyItem.label || emptyQtyItem.group || 'Hạng mục';
                toast.error('Lỗi nhập liệu', `Vui lòng nhập số lượng cho "${nameLabel}".`);
                setIsSaving(false);
                return;
            }

            const wasteStatusMissing = (mergedReport.waste || []).find(item => item.codeWaste && !item.status);
            if (wasteStatusMissing) {
                toast.error('Lỗi nhập liệu', `Vui lòng chọn trạng thái cho "${wasteStatusMissing.wasteName || wasteStatusMissing.name || 'Chất thải nguy hại'}".`);
                setIsSaving(false);
                return;
            }

            // Validate electricity with max 999999
            const electricityInvalid = [...(mergedReport.electricity || [])].find(item => {
                const q = Number(item.quantity);
                return q < 0 || q > 999999;
            });
            if (electricityInvalid) {
                toast.error('Lỗi nhập liệu', `Số lượng "${electricityInvalid.name || '(Không tên)'}" không hợp lệ (0 - 999,999).`);
                setIsSaving(false);
                return;
            }

            // Validate other sections with max 1000000
            const otherItems = [
                ...(mergedReport.materials || []),
                ...(mergedReport.chemicals || []),
                ...(mergedReport.water || []),
                ...(mergedReport.fuel || []),
                ...(mergedReport.waste || [])
            ];
            const invalidItem = otherItems.find(item => {
                const q = Number(item.quantity);
                return q < 0 || q > 1000000;
            });
            if (invalidItem) {
                toast.error('Lỗi nhập liệu', `Số lượng "${invalidItem.name || '(Không tên)'}" không hợp lệ (0 - 1,000,000).`);
                setIsSaving(false);
                return;
            }

            const payload = transformData(mergedReport);
            const response = await axiosInstance.post(UPDATE_RESOURCE_WASTE_DATA_ROUTE, payload);

            if (response.data.isSuccess) {
                setIsSaving(false);
                if (!options.silent) {
                    toast.success('Thành công', 'Dữ liệu đã được cập nhật thành công.');
                }
                setNewRows({});
                setIsEditing(false);

                // Invalidate React Query cache so list pages show fresh data
                queryClient.invalidateQueries({ queryKey: ['resource-history'] });
                queryClient.invalidateQueries({ queryKey: ['summary-records'] });
                queryClient.invalidateQueries({ queryKey: ['fuelResources'] });
                queryClient.invalidateQueries({ queryKey: ['inputResources'] });
                queryClient.invalidateQueries({ queryKey: ['wasteResources'] });

                if (shouldFetch) {
                    historyRefetch();
                }
                return response.data; // Return for chaining (e.g., bill image upload)
            } else {
                throw new Error(response.data.message || 'Lỗi khi lưu dữ liệu');
            }

        } catch (error) {
            console.error("Save failed:", error);
            const { title, description } = mapErrorToNotification(error, 'UPDATE_RESOURCE');
            toast.error(title || 'Lỗi lưu dữ liệu', description || error.message || 'Đã xảy ra lỗi khi lưu dữ liệu.');
            setNotif({
                open: true,
                type: 'error',
                title: title,
                description: description || error.message || 'Đã xảy ra lỗi khi lưu dữ liệu.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const triggerSave = ({ forceSave = false } = {}) => {
        if (!forceSave && !checkHasChanges()) {
            toast.info('Thông báo', 'Chưa có thay đổi gì để lưu.');
            setNotif({
                open: true,
                type: 'info',
                title: 'Thông báo',
                description: 'Chưa có thay đổi gì để lưu.'
            });
            return;
        }
        setShowConfirmModal(true);
    };

    const handleCancel = () => {
        if (historyData) {
            const normalized = normalizeReport(historyData);
            setReport(normalized);
            setInitialReport(JSON.parse(JSON.stringify(normalized)));
        }
        setNewRows({});
        setIsEditing(false);
    };

    return {
        report,
        loading,
        error,
        isEditing,
        setIsEditing,
        newRows,
        showConfirmModal,
        setShowConfirmModal,
        notif,
        setNotif,
        isSaving,
        getResourceOptions,
        handlers: {
            handleDataChange,
            handleNewDataChange,
            handleRemoveRow,
            handleRemoveNewRow,
            handleAddRow,
            handleSave,
            handleCancel,
            triggerSave
        },
        user,
        role,
        isCompany
    };
};
