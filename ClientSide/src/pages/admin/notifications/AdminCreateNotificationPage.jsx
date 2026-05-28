import { CalendarCog, Check, Save, Undo2, Search, Loader2, X, AlertCircle } from "lucide-react";
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CreateNotificationField from "@/components/common/CreateNotificationField";
import { useEffect, useReducer, useState, useMemo } from "react";
import { useZones } from "@/features/industrialzone/hooks/useZoneQueries";
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { useSendImmediateNotification } from "@/features/notifications/hooks/useNotificationSender";
import { useCreateTemplate, useUpdateTemplate, useTemplateById } from "@/features/notifications/hooks/useNotificationTemplate";
import SaveTemplateModal from "@/features/notifications/components/SaveTemplateModal";
import ScheduleSendModal from "@/features/notifications/components/ScheduleSendModal";
import TemplateChooser from "@/features/notifications/components/TemplateChooser";
import toast from '@/utils/toast';
import { mapErrorToNotification } from '@/utils/Error/mapErrorToNotification';
import { useHeader } from "@/components/common/Header/HeaderContext";
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { useAuth } from '@/app/providers/auth/AuthProvider';
import { useCompanies } from "@/features/company/hooks/useCompanyQueries";
import { useAuthenticatedUser } from "@/features/auth/hooks/useAuthQueries";
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import dayjs from "dayjs";
import clsx from 'clsx';
import { handlerEstimateRecipients } from "@/services/notificationService";

const formatCronToText = (cron) => {
    if (!cron) return 'Lặp lại định kỳ';
    const parts = cron.split(' ');
    if (parts.length !== 5) return 'Lặp lại định kỳ';
    const [minute, hour, dom, mon, dow] = parts;
    const pad = (n) => n.toString().padStart(2, '0');
    const timeStr = `${pad(hour)}:${pad(minute)}`;

    if (dom.startsWith('*/') && mon === '*' && dow === '*') {
        const interval = parseInt(dom.replace('*/', '')) || 1;
        return interval === 1 ? `Hàng ngày lúc ${timeStr}` : `${interval} ngày/lần lúc ${timeStr}`;
    } else if (dom === '*' && mon === '*' && dow !== '*') {
        const dayMap = { 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7', 0: 'CN' };
        const daysStr = dow.split(',').map(d => dayMap[d] || d).join(', ');
        return `Hàng tuần (${daysStr}) lúc ${timeStr}`;
    } else if (dom !== '*' && mon.startsWith('*/') && dow === '*') {
        const interval = parseInt(mon.replace('*/', '')) || 1;
        return interval === 1 ? `Hàng tháng (ngày ${dom}) lúc ${timeStr}` : `${interval} tháng/lần (ngày ${dom}) lúc ${timeStr}`;
    }
    return `Lặp lại định kỳ lúc ${timeStr}`;
};

const initialFormData = {
    title: "",
    datetime: "",
    type: "Info",
    body: "",
};

// B. formDataReducer
function formDataReducer(state, action) {
    switch (action.type) {
        case 'UPDATE_FIELD':
            // Cập nhật trường động: action.field là tên biến, action.payload là giá trị
            return { ...state, [action.field]: action.payload };
        case 'RESET_FORM':
            return initialFormData;
        // Có thể thêm các action khác như 'SUBMIT_SUCCESS'
        default:
            return state;
    }
}

const validateForm = (data, selectedPeople, selectedZones, selectedCompanies, activeTab) => {
    const errors = {};
    const requiredFields = ['title', 'datetime', 'body'];

    requiredFields.forEach(field => {
        if (!data[field] || String(data[field]).trim() === '') {
            const fieldNameMapping = {
                title: 'Tiêu đề',
                datetime: 'Thời gian',
                type: 'Loại',
                body: 'Nội dung',
            };
            errors[field] = `${fieldNameMapping[field]} không được để trống.`;
        }
    });

    if (activeTab === 0) {
        if (selectedPeople.length === 0) {
            errors.target_role = 'Vui lòng chọn ít nhất một vai trò nhận thông báo.';
        }
        if (selectedPeople.includes('company') && selectedZones.length === 0) {
            errors.target_zone = 'Nếu chọn "Doanh nghiệp", cần chọn ít nhất một Khu CN/KCX.';
        }
    } else if (activeTab === 1) {
        if (selectedCompanies.length === 0) {
            errors.target_company = 'Vui lòng chọn ít nhất một doanh nghiệp cụ thể.';
        }
    }
    // activeTab === 2 (DYNAMIC) không cần validate target — BE tự xử lý

    return errors;
};



const AdminCreateNotificationPage = () => {
    const { setHeaderConfig } = useHeader();
    const location = useLocation();
    const { id: templateIdParams } = useParams();
    const [formData, dispatch] = useReducer(formDataReducer, initialFormData);
    const [formErrors, setFormErrors] = useState({});

    // Authorization
    const { data: authData } = useAuthenticatedUser();
    const userRole = authData?.user?.role;
    const isManager = userRole === 'manager';
    const userZoneId = authData?.user?.zone_id;

    // Tabs state - MUST be before useEffect dependencies
    const [activeTab, setActiveTab] = useState(isManager ? 1 : 0);

    // View/Edit state
    const isDetailRoute = location.pathname.includes('/detail/');
    const isEditRoute = location.pathname.includes('/edit/');
    const [isViewMode, setIsViewMode] = useState(isDetailRoute);
    const [loadedTemplate, setLoadedTemplate] = useState(location.state?.template || null);
    const [hasChanges, setHasChanges] = useState(false);

    // Inline Name Editing


    const navigate = useNavigate();

    const people = [
        {
            name: "Ban Quản lý Hạ tầng",
            role: "manager"
        },
        {
            name: "Doanh nghiệp",
            role: "company"
        }
    ];

    const [selectedPeople, setSelectedPeople] = useState([]);
    const [selectedZones, setSelectedZones] = useState([]);
    const [selectedCompanies, setSelectedCompanies] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [estimatedRecipientCount, setEstimatedRecipientCount] = useState(0);
    const [isEstimating, setIsEstimating] = useState(false);
    const [lastSyncedTemplateId, setLastSyncedTemplateId] = useState(null);

    const { data: zonesData } = useZones();
    const zones = useMemo(() => {
        const allZones = zonesData?.zones || [];
        if (isManager && userZoneId) {
            return allZones.filter(z => z.zone_id === userZoneId);
        }
        return allZones;
    }, [zonesData?.zones, isManager, userZoneId]);

    // Fetch all companies to map names and allow proper "Select All"
    const { data: allCompaniesData } = useCompanies({ 
        page: 1, limit: 1000, 
        filters: isManager && userZoneId ? { zone_id: userZoneId } : {} 
    });
    const allCompanies = allCompaniesData?.companies || [];

    const getLiveTargetSummary = () => {
        if (activeTab === 2) {
            return 'Doanh nghiệp chưa báo cáo tháng này (tự động)';
        }

        if (activeTab === 1) {
            if (selectedCompanies.length > 0) {
                const names = selectedCompanies.map(c => c.company_name).filter(Boolean);
                if (names.length === 0) return `${selectedCompanies.length} Doanh nghiệp cụ thể`;
                if (names.length <= 3) return names.join(', ');
                return `${names.slice(0, 3).join(', ')} và ${names.length - 3} doanh nghiệp khác`;
            }
            return 'Chưa chọn doanh nghiệp nào';
        }

        const rolesArr = selectedPeople.map(r => {
            if (r === 'admin') return 'Admin';
            if (r === 'manager') return 'BQL';
            if (r === 'company') return 'Doanh nghiệp';
            return r;
        });

        if (selectedZones.length > 0) {
            const roleStr = rolesArr.length > 0 ? rolesArr.join(', ') : 'Đối tượng';
            return `${roleStr} (${selectedZones.length} Khu công nghiệp)`;
        }

        if (rolesArr.length > 0) return rolesArr.join(', ');
        return 'Tất cả đối tượng';
    };

    const buildTargetObject = () => {
        if (activeTab === 2) {
            return {
                target: {
                    mode: "DYNAMIC",
                    dynamicRule: "MISSING_REPORT",
                    roles: ["company"],
                    zone_ids: [],
                    company_ids: [],
                }
            };
        }

        if (activeTab === 0) {
            return {
                target: {
                    mode: "STATIC",
                    roles: selectedPeople,
                    zone_ids: selectedZones.length === zones.length ? null : (selectedZones.length > 0 ? selectedZones : null),
                }
            };
        } else {
            return {
                target: {
                    mode: "STATIC",
                    roles: ["company"],
                    company_ids: selectedCompanies.map(c => c.company_id)
                }
            };
        }
    };

    useEffect(() => {
        const title = isViewMode ? "Chi tiết mẫu thông báo" : loadedTemplate ? "Chỉnh sửa mẫu thông báo" : "Tạo thông báo mới";
        const description = isViewMode ? "Xem thông tin chi tiết nội dung và đối tượng nhận" : "Vui lòng điền đầy đủ thông tin để cập nhật hoặc tạo mới";

        setHeaderConfig({
            title,
            description,
            showWeather: true,
            showDatePicker: false,
            showTotalItem: false
        })
    }, [setHeaderConfig, isViewMode, loadedTemplate]);

    // Recipient estimation logic
    useEffect(() => {
        // DYNAMIC mode: không estimate được trước (phụ thuộc dữ liệu thực tế lúc gửi)
        if (activeTab === 2) {
            setEstimatedRecipientCount(0);
            return;
        }

        let roles = selectedPeople;
        // Mirror the exact logic from buildTargetObject: if all zones are selected, zone_ids becomes null (meaning no filter, fetch all)
        let zone_ids = selectedZones.length === zones.length ? null : (selectedZones.length > 0 ? selectedZones : null);
        let company_ids = [];

        if (activeTab === 1) {
            if (selectedCompanies.length === 0) {
                setEstimatedRecipientCount(0);
                return;
            }
            roles = ['company'];
            company_ids = selectedCompanies.map(c => c.company_id);
            zone_ids = null;
        } else {
            // Nếu không có role hoặc (có role DN nhưng chưa chọn Zone) -> 0
            if (roles.length === 0 || (roles.includes('company') && (!selectedZones || selectedZones.length === 0))) {
                setEstimatedRecipientCount(0);
                return;
            }
        }

        const fetchEstimation = async () => {
            setIsEstimating(true);
            try {
                const count = await handlerEstimateRecipients({ roles, zone_ids, company_ids });
                setEstimatedRecipientCount(count);
            } catch (err) {
                console.error("Lỗi ước lượng người nhận:", err);
            } finally {
                setIsEstimating(false);
            }
        };

        const timer = setTimeout(fetchEstimation, 500); // Debounce
        return () => clearTimeout(timer);
    }, [activeTab, selectedPeople, selectedZones, selectedCompanies]);

    // Format names correctly if they are empty
    useEffect(() => {
        if (allCompanies.length > 0 && selectedCompanies.length > 0) {
            let changed = false;
            const updated = selectedCompanies.map(sc => {
                if (!sc.company_name || sc.company_name === sc.company_id) {
                    const found = allCompanies.find(c => c.company_id === sc.company_id);
                    if (found) {
                        changed = true;
                        return { ...sc, company_name: found.company_name };
                    }
                }
                return sc;
            });
            if (changed) setSelectedCompanies(updated);
        }
    }, [allCompanies, selectedCompanies]);

    // Restore "All Zones" edge case when a template targeting all zones (zone_ids: null) is loaded
    useEffect(() => {
        if (loadedTemplate?.notification_T_id && zones.length > 0 && lastSyncedTemplateId !== loadedTemplate.notification_T_id) {
            if (loadedTemplate.target?.roles?.includes('company') && (!loadedTemplate.target?.zone_ids || loadedTemplate.target.zone_ids.length === 0)) {
                setSelectedZones(zones.map(z => z.zone_id));
            }
            setLastSyncedTemplateId(loadedTemplate.notification_T_id);
        }
    }, [loadedTemplate, zones, lastSyncedTemplateId]);

    // Handle selecting a template from the chooser
    const handleSelectTemplate = (template) => {
        if (template.title !== undefined) {
            dispatch({ type: 'UPDATE_FIELD', field: 'title', payload: template.title });
        }
        if (template.body !== undefined) {
            dispatch({ type: 'UPDATE_FIELD', field: 'body', payload: template.body });
        }
        if (template.type !== undefined) {
            dispatch({ type: 'UPDATE_FIELD', field: 'type', payload: template.type });
        }
        setAttachments((template.attachments || []).map((item, index) => ({
            id: `att-${Date.now()}-${index}`, // Guarantee unique ID to prevent Duplicate Key Warning
            url: item.url,
            originalName: item.originalName,
            mimeType: item.mimeType,
            size: item.size,
        })));
        // Restore target selections
        const isDynamic = template.target?.mode === 'DYNAMIC' || template.target?.dynamicRule === 'MISSING_REPORT';
        const hasSpecifics = template.target?.company_ids?.length > 0;

        if (template.target?.roles) {
            setSelectedPeople(template.target.roles);
        }
        if (template.target?.zone_ids) {
            setSelectedZones(template.target.zone_ids);
        }
        if (template.target?.company_ids) {
            const details = template.target.company_details || [];
            setSelectedCompanies(
                template.target.company_ids.map(id => {
                    const detail = details.find(d => d.company_id === id);
                    return {
                        company_id: id,
                        company_name: detail?.company_name || detail?.full_name || id
                    };
                })
            );
        }

        // Auto-select tab: DYNAMIC → 2, specific companies → 1, else → 0
        if (isDynamic) {
            setActiveTab(2);
        } else {
            setActiveTab(hasSpecifics ? 1 : 0);
        }
        setFormErrors({});
        toast.success('Đã tải mẫu', `Đã áp dụng mẫu "${template.name}" vào form.`);
    };

    // Auto-fill from navigation state (from TemplatesTab)
    useEffect(() => {
        if (location.state?.template) {
            const t = location.state.template;
            handleSelectTemplate(t);
            setLoadedTemplate(t);
            // If explicitly requested VIEW mode
            if (location.state.mode === 'VIEW') {
                setIsViewMode(true);
            }
            // Clear state to prevent re-filling on navigation back/forth (safely)
            window.history.replaceState({}, '');
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Fetch template if navigated directly via URL ID
    const { data: fetchedTemplate, isLoading: isFetchingTemplate } = useTemplateById(templateIdParams, {
        enabled: !loadedTemplate && !!templateIdParams,
    });

    useEffect(() => {
        if (fetchedTemplate && !loadedTemplate) {
            handleSelectTemplate(fetchedTemplate);
            setLoadedTemplate(fetchedTemplate);
            setIsViewMode(isDetailRoute);

            // Adjust header
            setHeaderConfig({
                title: isDetailRoute ? "Chi tiết mẫu thông báo" : "Chỉnh sửa mẫu thông báo",
                description: isDetailRoute ? "Xem thông tin chi tiết nội dung và đối tượng nhận" : "Chỉnh sửa nội dung và đối tượng nhận thông báo",
                showWeather: true,
                showDatePicker: false,
                showTotalItem: false
            });
        }
    }, [fetchedTemplate, loadedTemplate, isDetailRoute, isEditRoute]);

    // Change Detection logic
    useEffect(() => {
        if (!loadedTemplate) {
            // New template: has changes if form is not default (simplified)
            const isDefault = formData.title === "" && formData.body === "" && selectedPeople.length === 0 && activeTab !== 2;
            setHasChanges(!isDefault);
            return;
        }

        // Compare current with loaded
        const titleChanged = formData.title !== loadedTemplate.title;
        const bodyChanged = formData.body !== loadedTemplate.body;
        const typeChanged = (formData.type || 'Info') !== (loadedTemplate.type || 'Info');

        const loadedIsDynamic = loadedTemplate.target?.mode === 'DYNAMIC';
        const currentIsDynamic = activeTab === 2;
        const modeChanged = loadedIsDynamic !== currentIsDynamic;

        const peopleChanged = JSON.stringify([...selectedPeople].sort()) !== JSON.stringify([...(loadedTemplate.target?.roles || [])].sort());
        const zonesChanged = JSON.stringify([...selectedZones].sort()) !== JSON.stringify([...(loadedTemplate.target?.zone_ids || [])].sort());
        const companiesChanged = JSON.stringify(selectedCompanies.map(c => c.company_id).sort()) !== JSON.stringify([...(loadedTemplate.target?.company_ids || [])].sort());

        const currentAttachmentKeys = attachments.map((item) => item.url || item.file?.name).sort();
        const loadedAttachmentKeys = (loadedTemplate.attachments || []).map((item) => item.url || item.originalName).sort();
        const attachmentsChanged = JSON.stringify(currentAttachmentKeys) !== JSON.stringify(loadedAttachmentKeys);

        setHasChanges(titleChanged || bodyChanged || typeChanged || modeChanged || peopleChanged || zonesChanged || companiesChanged || attachmentsChanged);
    }, [formData, selectedPeople, selectedZones, selectedCompanies, loadedTemplate, activeTab, attachments]);

    const handlePeopleToggleSelection = (person) => {
        if (isViewMode) return;
        setSelectedPeople(prevSelected => {
            if (prevSelected.includes(person)) {
                return prevSelected.filter(p => p !== person);
            } else {
                return [...prevSelected, person];
            }
        });
    };

    const handleZoneToggleSelection = (zone) => {
        if (isViewMode) return;
        setSelectedZones(prevSelected => {
            if (prevSelected.includes(zone)) {
                return prevSelected.filter(p => p !== zone);
            } else {
                return [...prevSelected, zone];
            }
        });
    };

    const handleCompanyToggleSelection = (company) => {
        if (isViewMode) return;
        setSelectedCompanies(prevSelected => {
            const exists = prevSelected.find(p => p.company_id === company.company_id);
            if (exists) {
                return prevSelected.filter(p => p.company_id !== company.company_id);
            } else {
                return [...prevSelected, company];
            }
        });
    };

    const {
        mutate: sendImmediate,
        isPending: isSendingImmediate,
        isError: isImmediateError,
        error: immediateError
    } = useSendImmediateNotification()

    // Template hook for Save Template and Schedule Send
    const {
        mutate: createTemplate,
        isPending: isCreatingTemplate,
    } = useCreateTemplate();

    const {
        mutate: updateTemplate,
        isPending: isUpdatingTemplate,
    } = useUpdateTemplate();

    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [confirmSendImmediate, setConfirmSendImmediate] = useState(false);
    const [confirmScheduleSubmit, setConfirmScheduleSubmit] = useState(false);
    const [pendingScheduleData, setPendingScheduleData] = useState(null);

    const handleSubmitClick = () => {
        const validationErrors = validateForm(formData, selectedPeople, selectedZones, selectedCompanies, activeTab);
        setFormErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            toast.error('Thiếu dữ liệu', Object.values(validationErrors).join(', '));
            return;
        }
        setConfirmSendImmediate(true);
    };

    const executeSendImmediate = () => {
        setConfirmSendImmediate(false);
        try {
            const targetObject = buildTargetObject();

            // 3. Kết hợp dữ liệu form và target
            const finalData = {
                title: formData.title,
                body: formData.body,
                type: formData.type,
                attachments,
                // datetime có thể cần được xử lý/chuyển đổi định dạng cho BE
                datetime: formData.datetime,
                ...targetObject
            };

            // 4. Gọi API gửi thông báo ngay lập tức
            sendImmediate(finalData, {
                onSuccess: () => {
                    toast.success('Thành công', 'Thông báo đã được gửi thành công.');
                    // alert("Gửi thông báo thành công!");
                    // Có thể reset form tại đây
                    // dispatch({ type: 'RESET_FORM' });
                    // setSelectedPeople([]);
                    // setSelectedZones([]);
                },
                onError: (error) => {
                    const { title, description } = mapErrorToNotification(error, 'SEND_NOTIFICATION');
                    toast.error(title ?? 'Gửi thông báo không thành công', description ?? `Gửi thông báo thất bại. ${error.message}`);
                    console.error("Lỗi gửi API:", error);
                }
            });


        } catch (e) {
            console.error("Lỗi tạo target:", e);
            toast.error('Lỗi cấu hình', e.message);
        }
    }

    // Save Template handler
    const handleSaveTemplate = (templateName) => {
        const validationErrors = validateForm(formData, selectedPeople, selectedZones, selectedCompanies, activeTab);
        setFormErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            toast.error('Thiếu dữ liệu', Object.values(validationErrors).join(', '));
            return;
        }

        const targetObject = buildTargetObject(selectedPeople, selectedZones, selectedCompanies, activeTab);

        const templateData = {
            name: templateName,
            title: formData.title,
            body: formData.body,
            type: formData.type || 'Info',
            attachments,
            ...targetObject,
            schedule: loadedTemplate?.schedule || { type: 'MANUAL' },
        };

        if (loadedTemplate) {
            // Cập nhật mẫu hiện có
            updateTemplate({ id: loadedTemplate.notification_T_id, data: templateData }, {
                onSuccess: () => {
                    toast.success('Cập nhật thành công', 'Mẫu thông báo đã được lưu lại.');
                    setIsSaveModalOpen(false);
                    setIsViewMode(true);
                    setLoadedTemplate({ ...loadedTemplate, ...templateData });
                },
                onError: (error) => toast.error('Lỗi cập nhật', error.message),
            });
        } else {
            // Tạo mẫu mới hoàn toàn
            createTemplate(templateData, {
                onSuccess: () => {
                    toast.success('Thành công', 'Mẫu thông báo mới đã được lưu.');
                    setIsSaveModalOpen(false);
                },
                onError: (error) => toast.error('Lỗi lưu mẫu', error.message),
            });
        }
    };

    // Schedule Send handler step 1
    const handleScheduleSend = (templateName, scheduleData) => {
        const validationErrors = validateForm(formData, selectedPeople, selectedZones, selectedCompanies, activeTab);
        setFormErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            toast.error('Thiếu dữ liệu', Object.values(validationErrors).join(', '));
            return;
        }

        // Hide the modal immediately to show the confirmation dialog
        setIsScheduleModalOpen(false);

        // Check if anything actually changed
        if (loadedTemplate) {
            const isNameSame = templateName === loadedTemplate.name;

            let isScheduleSame = false;
            if (!scheduleData && !loadedTemplate.schedule) isScheduleSame = true;
            else if (scheduleData && loadedTemplate.schedule && scheduleData.type === loadedTemplate.schedule.type) {
                if (scheduleData.type === 'ONE_TIME') {
                    isScheduleSame = new Date(scheduleData.sendAt).getTime() === new Date(loadedTemplate.schedule.sendAt).getTime();
                } else if (scheduleData.type === 'RECURRING') {
                    isScheduleSame = scheduleData.cronString === loadedTemplate.schedule.cronString;
                } else if (scheduleData.type === 'MANUAL') {
                    isScheduleSame = true;
                }
            }

            if (isNameSame && isScheduleSame && !hasChanges) {
                toast.info('Không có thay đổi', 'Bạn chưa thay đổi thông tin nào của mẫu này.');
                return;
            }
        }

        setPendingScheduleData({ templateName, scheduleData });
        setConfirmScheduleSubmit(true);
    };

    // Schedule Send execution step 2
    const executeScheduleSend = () => {
        setConfirmScheduleSubmit(false);
        if (!pendingScheduleData) return;
        const { templateName, scheduleData } = pendingScheduleData;

        const targetObject = buildTargetObject(selectedPeople, selectedZones, selectedCompanies, activeTab);

        const templateData = {
            name: templateName,
            title: formData.title,
            body: formData.body,
            type: formData.type || 'Info',
            attachments,
            ...targetObject,
            schedule: scheduleData,
        };

        if (loadedTemplate) {
            updateTemplate({ id: loadedTemplate.notification_T_id, data: templateData }, {
                onSuccess: () => {
                    toast.success('Cập nhật thành công', 'Lịch gửi thông báo đã được cập nhật.');
                    setIsScheduleModalOpen(false);
                    setLoadedTemplate({ ...loadedTemplate, ...templateData });
                },
                onError: (error) => {
                    toast.error('Cập nhật lịch gửi thất bại', error.message);
                },
            });
        } else {
            createTemplate(templateData, {
                onSuccess: () => {
                    toast.success('Thành công', 'Lịch gửi thông báo đã được tạo thành công.');
                    setIsScheduleModalOpen(false);
                },
                onError: (error) => {
                    const { title, description } = mapErrorToNotification(error, 'CREATE_TEMPLATE');
                    toast.error(title ?? 'Tạo lịch gửi thất bại', description ?? error.message);
                },
            });
        }
    };

    useEffect(() => {
        if (isManager) {
            setActiveTab(1);
        }
    }, [isManager]);

    const Tab0 = () => {
        return (
            <div className="flex min-h-0 flex-col gap-4">
                <div className="flex-1">
                    <GroupOfPeople
                        title="Vai trò"
                        descriprtion="Những đối tượng được chọn sẽ nhận được thông báo"
                        selected={selectedPeople}
                        onToggle={handlePeopleToggleSelection}
                        data={people}
                    />
                </div>
                <div className="flex-3">
                    <GroupOfZone
                        title="Thuộc Khu chế xuất / Công nghiệp"
                        descriprtion="Chọn những KCX / KCN nhận thông báo, không ảnh hưởng nếu là HEPZA"
                        selected={selectedZones}
                        onToggle={handleZoneToggleSelection}
                        onSelectAll={() => {
                            if (isViewMode) return;
                            setSelectedZones(selectedZones.length === zones.length ? [] : zones.map(z => z.zone_id));
                        }}
                        isAllSelected={selectedZones.length === zones.length && zones.length > 0}
                        data={zones}
                        readOnly={isViewMode}
                    />
                </div>
            </div>
        )
    }


    const Tab1 = () => {
        return (
            <div className="flex min-h-0 w-full">
                <div className="flex-1">
                    <GroupOfCompany
                        title="Từng doanh nghiệp cụ thể"
                        descriprtion="Tìm kiếm và chọn đích danh doanh nghiệp bạn muốn gửi thông báo."
                        selected={selectedCompanies}
                        onToggle={handleCompanyToggleSelection}
                        setSelectedCompanies={setSelectedCompanies}
                        zoneId={isManager ? userZoneId : null} // Filter by zone for managers
                        onSelectAll={async () => {
                            if (isViewMode) return;

                            if (selectedCompanies.length > 0 && selectedCompanies.length >= allCompanies.length) {
                                setSelectedCompanies([]);
                                return;
                            }

                            setSelectedCompanies(allCompanies);
                            toast.info('Đã chọn doanh nghiệp', `Đã chọn ${allCompanies.length} doanh nghiệp vào danh sách.`);
                        }}
                    />
                </div>
            </div>
        )
    };

    const Tab2 = () => {
        return (
            <div className="flex min-h-0 flex-col gap-3">
                {/* Main info block — same style as GroupOfPeople/GroupOfZone */}
                <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                    <span className="flex flex-col gap-1">
                        <p className="font-semibold leading-none">DN chưa báo cáo tháng này</p>
                        <p className="text-sm text-gray-500">
                            Hệ thống tự động xác định và gửi đến các doanh nghiệp chưa khai báo Tài nguyên &amp; Chất thải trong tháng hiện tại.
                        </p>
                    </span>

                    {/* Steps */}
                    <div className="flex flex-col gap-1.5 pt-1">
                        {[
                            'Lấy toàn bộ doanh nghiệp đang hoạt động',
                            'Trừ đi các DN đã có bản ghi khai báo trong tháng',
                            'Gửi thông báo đến phần còn lại',
                        ].map((step, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4E5BA6]/10 text-[10px] font-black text-[#4E5BA6]">{i + 1}</span>
                                <p className="text-sm text-gray-600">{step}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Warning note — same rounded-2xl border style */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 flex items-start gap-2.5">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-semibold text-slate-700">Số người nhận xác định lúc gửi</p>
                        <p className="text-sm text-gray-500">
                            Không thể ước tính trước. Danh sách được tính tại thời điểm lịch chạy.
                        </p>
                    </div>
                </div>

                {/* Next step hint */}
                {!isViewMode && (
                    <div className="rounded-2xl border border-[#4E5BA6]/20 bg-[#4E5BA6]/5 p-3 flex items-start gap-2.5">
                        <CalendarCog className="mt-0.5 h-4 w-4 shrink-0 text-[#4E5BA6]" />
                        <p className="text-sm text-[#4E5BA6]">
                            Sau khi chọn chế độ này, nhấn <strong>Tạo lịch gửi</strong> để thiết lập thời gian tự động (ví dụ: ngày 15 hàng tháng).
                        </p>
                    </div>
                )}
            </div>
        );
    };

    const renderContent = () => {
        switch (activeTab) {
            case 0:
                return <Tab0 />;
            case 1:
                return <Tab1 />;
            case 2:
                return <Tab2 />;
            default:
                return <Tab0 />;
        }
    };

    return (
        <div className="relative h-full min-h-0 w-full overflow-hidden text-[#22262B] flex flex-col gap-2">
            {isFetchingTemplate && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
            )}
            <div className="flex-1 min-h-0 flex flex-col w-full justify-between">
                <div className="grid min-h-0 grid-cols-1 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.95fr)] gap-5 flex-1 mb-4">
                    <div className="flex min-h-0 flex-col flex-1 gap-2">
                        <div className="flex shrink-0 items-center justify-between mb-1">
                            <div className="flex items-center gap-3 w-full">
                                <p className="font-semibold text-2xl">
                                    {loadedTemplate?.name || "Mẫu thông báo chưa đặt tên"}
                                </p>
                                {loadedTemplate?.schedule && loadedTemplate.schedule.type !== 'MANUAL' && (
                                    <span className={clsx(
                                        "text-xs font-bold px-2.5 py-1 rounded-md border flex items-center gap-1.5",
                                        loadedTemplate.schedule.type === 'ONE_TIME' ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"
                                    )}>
                                        <CalendarCog size={15} />
                                        {loadedTemplate.schedule.type === 'ONE_TIME'
                                            ? `Gửi 1 lần lúc: ${dayjs(loadedTemplate.schedule.sendAt).format('HH:mm DD/MM/YYYY')}`
                                            : formatCronToText(loadedTemplate.schedule.cronString)}
                                    </span>
                                )}
                            </div>
                            {!isViewMode && <TemplateChooser onSelect={handleSelectTemplate} />}
                        </div>
                        <div className="flex-1 min-h-0">
                            <CreateNotificationField
                                formData={formData}
                                dispatch={dispatch}
                                formErrors={formErrors}
                                setFormErrors={setFormErrors}
                                attachments={attachments}
                                onAttachmentsChange={setAttachments}
                                readOnly={isViewMode}
                            />
                        </div>
                    </div>
                    <div className="flex min-h-0 flex-col gap-4 w-full border border-slate-200 bg-white rounded-[22px] p-5 shadow-sm">
                        <span className="flex shrink-0 flex-col gap-1">
                            <p className="text-[16px] font-semibold">
                                Đối tượng nhận thông báo
                            </p>
                            <p className="text-[14px] italic">
                                (Thông báo sẽ được gửi đến: <span className="text-[#4E5BA6] font-bold not-italic">{getLiveTargetSummary()}</span>)
                            </p>
                        </span>
                        <div className="grid shrink-0 grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-2 text-xs">
                            <div className="rounded-xl bg-white p-2.5 shadow-sm">
                                <p className="font-semibold text-slate-400">Kiểu gửi</p>
                                <p className="mt-1 font-black text-slate-800">
                                    {activeTab === 2 ? 'Tự động' : activeTab === 1 ? 'Cụ thể' : 'Theo nhóm'}
                                </p>
                            </div>
                            <div className="rounded-xl bg-white p-2.5 shadow-sm">
                                <p className="font-semibold text-slate-400">Người nhận</p>
                                <p className="mt-1 font-black text-slate-800">
                                    {activeTab === 2 ? (
                                        <span className="Người nhậnmt-1 font-black text-slate-800">Tự động</span>
                                    ) : isEstimating ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                    ) : (
                                        estimatedRecipientCount
                                    )}
                                </p>
                            </div>
                            <div className="rounded-xl bg-white p-2.5 shadow-sm">
                                <p className="font-semibold text-slate-400">Tệp đính kèm</p>
                                <p className="mt-1 font-black text-slate-800">{attachments.length}</p>
                            </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                            {!isManager && (
                                <div
                                    className={`w-fit py-1 px-3 rounded-xl transition-all ${activeTab === 0
                                            ? "text-[#4E5BA6] font-bold bg-[#4E5BA6]/10 ring-1 ring-[#4E5BA6]/20"
                                            : isViewMode
                                                ? "text-slate-300 cursor-not-allowed opacity-50 bg-slate-50"
                                                : "text-slate-500 hover:bg-slate-100 cursor-pointer"
                                        }`}
                                    onClick={() => !isViewMode && setActiveTab(0)}
                                >
                                    <p>Nhóm đối tượng</p>
                                </div>
                            )}
                            <div
                                className={`w-fit py-1 px-3 rounded-xl transition-all ${activeTab === 1
                                        ? "text-[#4E5BA6] font-bold bg-[#4E5BA6]/10 ring-1 ring-[#4E5BA6]/20"
                                        : isViewMode
                                            ? "text-slate-300 cursor-not-allowed opacity-50 bg-slate-50"
                                            : "text-slate-500 hover:bg-slate-100 cursor-pointer"
                                    }`}
                                onClick={() => !isViewMode && setActiveTab(1)}
                            >
                                <p>Đối tượng cụ thể</p>
                            </div>
                            {!isManager && (
                                <div
                                    className={`w-fit py-1 px-3 rounded-xl transition-all flex items-center gap-1.5 ${activeTab === 2
                                            ? "text-[#4E5BA6] font-bold bg-[#4E5BA6]/10 ring-1 ring-[#4E5BA6]/20"
                                            : isViewMode
                                                ? "text-slate-300 cursor-not-allowed opacity-50 bg-slate-50"
                                                : "text-slate-500 hover:bg-slate-100 cursor-pointer"
                                        }`}
                                    onClick={() => !isViewMode && setActiveTab(2)}
                                >
                                    <p>DN chưa báo cáo</p>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                            {renderContent()}
                        </div>
                    </div>
                </div>

                {isViewMode ? (
                    <div className="flex shrink-0 justify-end pt-3 border-t border-slate-100">
                        <button
                            onClick={() => {
                                setIsViewMode(false);
                                // Chuyển URL sang route /edit
                                const baseRoute = isManager ? '/manager/notifications' : '/admin/notifications';
                                navigate(`${baseRoute}/edit/${templateIdParams}`, { state: { template: loadedTemplate } });
                            }}
                            className="flex items-center gap-2 px-8 py-3.5 bg-[#4E5BA6] text-white rounded-2xl shadow-xl shadow-indigo-100/50 hover:bg-[#3D4A8F] transition-all active:scale-[0.98] font-black tracking-tight"
                        >
                            <EditRoundedIcon className="size-5" />
                            CHỈNH SỬA MẪU NÀY
                        </button>
                    </div>
                ) : (
                    <div className="flex shrink-0 justify-between items-center pt-3 border-t border-slate-100">
                        <div
                            className={`p-3.5 rounded-2xl border-2 flex items-center gap-2 transition-all font-black tracking-tight ${hasChanges
                                    ? 'border-[#4E5BA6] text-[#4E5BA6] bg-[#4E5BA6]/5 hover:bg-[#4E5BA6]/10 cursor-pointer shadow-sm'
                                    : 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed opacity-60'
                                }`}
                            onClick={() => hasChanges && setIsSaveModalOpen(true)}
                        >
                            {isUpdatingTemplate ? <Loader2 className="animate-spin size-5" /> : <Save className="size-5" />}
                            <span>{loadedTemplate ? 'LƯU THAY ĐỔI' : 'LƯU MẪU MỚI'}</span>
                        </div>

                        <div className="flex gap-3">
                            <div
                                className="p-3.5 rounded-2xl border-2 border-slate-200 text-slate-500 flex items-center gap-2 cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all font-bold"
                                onClick={() => setIsScheduleModalOpen(true)}
                            >
                                <CalendarCog className="size-5" />
                                <span>{loadedTemplate ? 'CẬP NHẬT LỊCH GỬI' : 'TẠO LỊCH GỬI'}</span>
                            </div>

                            <div
                                className="p-3.5 rounded-2xl bg-[#4E5BA6] text-white flex items-center gap-2 cursor-pointer hover:bg-[#3D4A8F] transition-all active:scale-[0.98] shadow-lg shadow-indigo-100 font-black tracking-tight px-8"
                                onClick={handleSubmitClick}
                            >
                                {isSendingImmediate ? <Loader2 className="animate-spin size-5" /> : <SendRoundedIcon />}
                                <span>GỬI NGAY</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modals */}
                <SaveTemplateModal
                    open={isSaveModalOpen}
                    onClose={() => setIsSaveModalOpen(false)}
                    onSave={(name) => {
                        handleSaveTemplate(name);
                    }}
                    name={loadedTemplate?.name || ""}
                    loading={isCreatingTemplate || isUpdatingTemplate}
                />
                <ScheduleSendModal
                    open={isScheduleModalOpen}
                    onClose={() => setIsScheduleModalOpen(false)}
                    onSchedule={handleScheduleSend}
                    loading={isCreatingTemplate}
                    initialData={loadedTemplate ? { templateName: loadedTemplate.name, scheduleData: loadedTemplate.schedule } : null}
                />
                <ConfirmationModal
                    open={confirmSendImmediate}
                    onClose={() => setConfirmSendImmediate(false)}
                    onConfirm={executeSendImmediate}
                    title="Xác nhận gửi thông báo"
                    content="Bạn có chắc chắn muốn gửi thông báo này ngay lập tức không? Hệ thống sẽ phát thông báo đến tất cả các đối tượng đã chọn và không thể hoàn tác."
                    confirmText="Gửi ngay"
                    confirmType="primary"
                />
                <ConfirmationModal
                    open={confirmScheduleSubmit}
                    onClose={() => setConfirmScheduleSubmit(false)}
                    onConfirm={executeScheduleSend}
                    title="Xác nhận tạo/cập nhật lịch gửi"
                    content="Bạn có chắc chắn muốn thiết lập lịch gửi cho thông báo này với các tùy chọn đã chọn không?"
                    confirmText="Xác nhận"
                    confirmType="primary"
                />
            </div>
        </div>
    )
}

const Selector = ({ label, isSelected, onClick }) => {
    return (
        <div
            className={`flex items-center w-fit py-1.5 px-3 rounded-full gap-1.5 cursor-pointer transition-all ${isSelected ? "text-[#4E5BA6] bg-[#4E5BA6]/10 font-medium ring-1 ring-[#4E5BA6]/30 shadow-sm" : "text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100"}`}
            onClick={onClick}
        >
            {isSelected && (
                <Check className="size-4" />
            )}
            <p className="select-none text-sm leading-tight">{label || "???"}</p>
        </div>
    )
}

const GroupOfPeople = ({ title = '', descriprtion = '', data = [], onToggle, selected = [] }) => {
    return (
        <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
            <span className="flex flex-col gap-1">
                <p className="font-semibold leading-none">{title} <strong className="text-red-500">*</strong> </p>
                <p className="text-sm text-gray-500">{descriprtion}</p>
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
                {/* Lặp qua danh sách data để render Selector */}
                {data.map((item, index) => {
                    // Kiểm tra xem đối tượng hiện tại đã được chọn chưa
                    const isSelected = selected.includes(item.role);

                    return (
                        <Selector
                            key={item.role}
                            label={item.name}
                            isSelected={isSelected}
                            // Gọi hàm onToggle của component cha khi click
                            onClick={() => onToggle(item.role)}
                        />
                    )
                })}
            </div>
        </div>
    )
}

const GroupOfZone = ({ title = '', descriprtion = '', data = [], onToggle, onSelectAll, isAllSelected, readOnly, selected = [] }) => {
    return (
        <div className="min-h-0 space-y-2 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
            <div className="flex items-start justify-between">
                <span className="flex flex-col gap-1">
                    <p className="font-semibold leading-none text-[#22262B]">{title} <strong className="text-red-500">*</strong> </p>
                    <p className="text-sm text-gray-500">{descriprtion}</p>
                </span>
                <button
                    onClick={onSelectAll}
                    disabled={readOnly}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-md border-2 border-[#4E5BA6] ${isAllSelected
                        ? "bg-[#4E5BA6] text-white hover:bg-[#3D4A8F]"
                        : "bg-white text-[#4E5BA6] hover:bg-[#4E5BA6]/5"
                        } ${readOnly ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                >
                    {isAllSelected ? "BỎ CHỌN TẤT CẢ" : "CHỌN TẤT CẢ"}
                </button>
            </div>
            <div className="custom-scrollbar flex max-h-[220px] flex-wrap gap-2 overflow-y-auto pr-1 pt-1">
                {/* Lặp qua danh sách data để render Selector */}
                {data.map((item, index) => {
                    // Kiểm tra xem đối tượng hiện tại đã được chọn chưa
                    const isSelected = selected.includes(item.zone_id);

                    return (
                        <Selector
                            key={item.zone_id}
                            label={item.zone_name}
                            isSelected={isSelected}
                            // Gọi hàm onToggle của component cha khi click
                            onClick={() => onToggle(item.zone_id)}
                        />
                    )
                })}
            </div>
        </div>
    )
}

const GroupOfCompany = ({ title = '', descriprtion = '', selected = [], onToggle, setSelectedCompanies, zoneId, onSelectAll }) => {
    const [searchTerm, setSearchTerm] = useState("");
    // Truyền filter zone_id xuống hook nếu có
    const queryParams = { page: 1, limit: 15, search: searchTerm };
    if (zoneId) queryParams.filters = { zone_id: zoneId };
    const { data, isLoading } = useCompanies(queryParams);
    const companies = data?.companies || [];
    const totalElements = data?.totalItems || 0;

    // Đảm bảo những item "Đã chọn" luôn hiển thị trên cùng (kể cả khi search không ra) để có thể bỏ tag
    const displayMap = new Map();
    selected.forEach(c => displayMap.set(c.company_id, c));
    companies.forEach(c => {
        if (!displayMap.has(c.company_id)) {
            displayMap.set(c.company_id, c);
        }
    });

    const displayCompanies = Array.from(displayMap.values());

    // Auto-sync names if missing and we have them in the fetched list
    useEffect(() => {
        if (!isLoading && companies.length > 0 && setSelectedCompanies) {
            const needsSync = selected.some(s => !s.company_name || s.company_name === s.company_id);
            if (needsSync) {
                setSelectedCompanies(prev => prev.map(s => {
                    if (!s.company_name || s.company_name === s.company_id) {
                        const found = companies.find(c => c.company_id === s.company_id);
                        if (found) return { ...found }; // Use the fresh company object from the list
                    }
                    return s;
                }));
            }
        }
    }, [isLoading, companies, selected, setSelectedCompanies]);

    const MAX_DISPLAY = 20;
    const itemsToShow = displayCompanies.slice(0, MAX_DISPLAY);

    // Tính toán số lượng dư (không hiển thị)
    let remaining = 0;
    if (totalElements > MAX_DISPLAY) {
        remaining = totalElements - itemsToShow.length;
    }

    return (
        <div className="min-h-0 space-y-3 w-full">
            <div className="flex flex-col justify-between gap-3">
                <span className="flex flex-col gap-1 flex-1">
                    <p className="font-semibold leading-none text-[#22262B]">{title} <strong className="text-red-500">*</strong> </p>
                    <p className="text-sm text-gray-500">{descriprtion}</p>
                    {onSelectAll && companies.length > 0 && (
                        <button
                            onClick={() => onSelectAll(companies)}
                            className={`mt-2 text-xs font-bold w-fit px-3 py-1.5 rounded-xl transition-all shadow-md border-2 border-[#4E5BA6] ${selected.length >= companies.length
                                    ? "bg-[#4E5BA6] text-white hover:bg-[#3D4A8F]"
                                    : "bg-white text-[#4E5BA6] hover:bg-[#4E5BA6]/5"
                                }`}
                        >
                            {selected.length >= companies.length ? "BỎ CHỌN TẤT CẢ" : "CHỌN TẤT CẢ DOANH NGHIỆP"}
                        </button>
                    )}
                </span>
                <div className="relative w-full shrink-0">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                        <Search className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-4 focus:ring-[#4E5BA6]/10 focus:border-[#4E5BA6] block w-full pl-10 p-2.5 outline-none transition-all shadow-sm"
                        placeholder="Tìm kiếm theo tên công ty hoặc mã số thuế..."
                    />
                </div>
            </div>

            <div className="custom-scrollbar flex max-h-[320px] flex-wrap gap-2 overflow-y-auto pr-1 pt-1 scroll-smooth">
                {isLoading && itemsToShow.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#4E5BA6]" />
                        Đang tải...
                    </div>
                ) : itemsToShow.length > 0 ? (
                    <>
                        {itemsToShow.map(comp => {
                            const isSelected = selected.some(s => s.company_id === comp.company_id);
                            return (
                                <Selector
                                    key={comp.company_id}
                                    label={comp.company_name}
                                    isSelected={isSelected}
                                    onClick={() => onToggle(comp)}
                                />
                            )
                        })}
                        {remaining > 0 && (
                            <div className="flex items-center bg-gray-50 border border-gray-200 text-gray-500 w-fit py-1 px-3 rounded-full gap-1 text-sm font-medium select-none shadow-sm tooltip" title="Tiếp tục gõ tìm kiếm để hiển thị thêm">
                                +{remaining} doanh nghiệp khác...
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-sm text-gray-500 py-2">
                        Không tìm thấy doanh nghiệp nào.
                    </div>
                )}
            </div>
        </div>
    )
}

export default AdminCreateNotificationPage;
