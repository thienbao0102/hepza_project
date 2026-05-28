import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    UserPlus,
    Trash2,
    Mail,
    Phone,
    Shield,
    UserCircle,
    BadgeCheck,
    X,
    Info,
    Repeat,
} from 'lucide-react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    TextField,
    Typography,
} from '@mui/material';
import { useAuth } from '@app/providers/auth/AuthProvider';
import { useUsersByRole, useDeletedUsersByRole, useHardDeleteUser, useCreateUser, usePreviewHardDeleteUsers } from '@features/admin/hooks/useUserQueries';
import { useSetCompanyRepresentative } from '@features/enterprises/hooks/useCompanyMutations';
import { useCompany } from '@features/company/hooks/useCompanyQueries';
import ConfirmDeleteDialog from '@/components/common/ConfirmDeleteDialog';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import toast from '@/utils/toast';
import {
    normalizeEmailInput,
    normalizePhoneInput,
    validateEmail,
    validateFullName,
    validatePasswordMinLength,
    validatePhoneNumber,
} from '@/utils/userInputValidation';

const copy = {
    successTitle: 'Thành công',
    successCreate: 'Đã thêm nhân sự mới và gửi thông tin đăng nhập qua email.',
    successRemove: 'Nhân sự đã được gỡ khỏi doanh nghiệp.',
    successTransfer: 'Đã cập nhật tài khoản đại diện mới cho doanh nghiệp.',
    errorTitle: 'Lỗi',
    errorCreate: 'Không thể thêm nhân sự mới.',
    errorRemove: 'Không thể gỡ nhân sự. Vui lòng thử lại.',
    errorTransfer: 'Không thể chuyển quyền đại diện. Vui lòng thử lại.',
    roleOwner: 'Người đại diện chính',
    roleStaff: 'Nhân sự nội bộ',
    pageTitle: 'Quản lý nhân sự',
    pageDesc: 'Doanh nghiệp đang sử dụng {count} trên tổng số 3 nhân sự được cấp quyền.',
    addAction: 'Thêm nhân sự',
    usageLabel: 'Số lượng nhân sự đã tạo',
    loading: 'Đang tải danh sách nhân sự...',
    emptyTitle: 'Chưa có nhân sự nội bộ',
    emptyDesc: 'Thêm nhân sự để phối hợp quản lý, cập nhật và vận hành dữ liệu doanh nghiệp thuận tiện hơn.',
    granted: 'Nhân sự được cấp quyền',
    phoneMissing: 'Chưa cập nhật',
    removeAction: 'Gỡ nhân sự',
    transferAction: 'Nhượng quyền',
    dialogTitle: 'Thêm nhân sự',
    dialogSubtitle: 'Cấp quyền cho nhân sự cùng phối hợp quản lý dữ liệu doanh nghiệp',
    fullName: 'Họ và tên',
    fullNamePlaceholder: 'Nhập họ tên đầy đủ',
    workEmail: 'Email công việc',
    phone: 'Số điện thoại',
    accountHintTitle: 'Hệ thống sẽ tự tạo tài khoản đăng nhập',
    accountHintBody: 'Mật khẩu an toàn sẽ được tạo tự động và gửi trực tiếp tới email của nhân sự sau khi thêm thành công.',
    cancel: 'Hủy',
    submit: 'Kích hoạt nhân sự',
    confirmTitle: 'Gỡ nhân sự khỏi doanh nghiệp',
    confirmText: 'Gỡ nhân sự',
    confirmLoading: 'Đang gỡ...',
    confirmDesc: (name) => `Bạn có chắc muốn gỡ ${name || 'nhân sự này'} khỏi danh sách không?`,
    transferTitle: 'Chuyển quyền đại diện',
    transferConfirm: 'Xác nhận chuyển quyền',
    transferLoading: 'Đang chuyển quyền...',
    transferDesc: (name) => `Sau khi xác nhận, ${name || 'nhân sự này'} sẽ trở thành tài khoản đại diện mới của doanh nghiệp.`,
    transferNote: 'Tài khoản đại diện hiện tại sẽ bàn giao quyền quản lý cho nhân sự này ngay sau khi xác nhận.',
    transferPasswordLabel: 'Mật khẩu hiện tại',
    transferPasswordPlaceholder: 'Nhập mật khẩu của tài khoản đại diện hiện tại',
    transferPasswordRequired: 'Vui lòng nhập mật khẩu hiện tại để xác nhận nhượng quyền.',
};

const inputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: '16px',
        backgroundColor: '#F8FAFC',
    },
};

const dialogFontFamily = '"Be Vietnam Pro", "Inter", "Segoe UI", sans-serif';

const CompanySubAccounts = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, userId: null, userName: '' });
    const [transferConfirm, setTransferConfirm] = useState({ open: false, userId: null, userName: '' });
    const [deletePassword, setDeletePassword] = useState('');
    const [transferPassword, setTransferPassword] = useState('');
    const [createPassword, setCreatePassword] = useState('');
    const [createErrors, setCreateErrors] = useState({});
    const [createTouched, setCreateTouched] = useState({});
    const [replacementUserId, setReplacementUserId] = useState('');
    const [localRepresentativeUserId, setLocalRepresentativeUserId] = useState('');
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone_number: '',
    });

    const {
        data: activeEmployeesData,
        isLoading: isActiveEmployeesLoading,
        refetch: refetchActiveEmployees,
    } = useUsersByRole({
        role: 'company',
        filters: { company: user?.company_id },
        enabled: !!user?.company_id,
    });
    const {
        data: disabledEmployeesData,
        isLoading: isDisabledEmployeesLoading,
        refetch: refetchDisabledEmployees,
    } = useDeletedUsersByRole({
        role: 'company',
        filters: { company: user?.company_id },
        enabled: !!user?.company_id,
    });
    const {
        data: companyFetchData,
        refetch: refetchCompany,
    } = useCompany(user?.company_id, { enabled: !!user?.company_id });

    const createUserMutation = useCreateUser();
    const hardDeleteMutation = useHardDeleteUser();
    const previewHardDeleteMutation = usePreviewHardDeleteUsers();
    const setRepresentativeMutation = useSetCompanyRepresentative();

    const activeEmployees = activeEmployeesData?.users || [];
    const disabledEmployees = disabledEmployeesData?.users || [];
    const employees = [...activeEmployees, ...disabledEmployees].reduce((acc, employee) => {
        if (!employee?.user_id) return acc;
        if (!acc.some((currentEmployee) => currentEmployee.user_id === employee.user_id)) {
            acc.push(employee);
        }
        return acc;
    }, []);
    const representativeUserId =
        localRepresentativeUserId ||
        companyFetchData?.company?.representative_user_id ||
        employees.find((employee) => employee?.representative_user_id)?.representative_user_id ||
        '';
    const sortedEmployees = [...employees].sort((a, b) => {
        const aIsRepresentative = String(a.user_id || '') === String(representativeUserId || '');
        const bIsRepresentative = String(b.user_id || '') === String(representativeUserId || '');
        if (aIsRepresentative && !bIsRepresentative) return -1;
        if (!aIsRepresentative && bIsRepresentative) return 1;
        if (!!a.deleted_at !== !!b.deleted_at) {
            return a.deleted_at ? 1 : -1;
        }
        return 0;
    });
    const representativeEmployee = sortedEmployees.find(
        (employee) => String(employee.user_id || '') === String(representativeUserId || '')
    ) || null;
    const staffEmployees = sortedEmployees.filter(
        (employee) => String(employee.user_id || '') !== String(representativeUserId || '')
    );
    const activeStaffEmployees = staffEmployees.filter((employee) => !employee.deleted_at);
    const disabledStaffEmployees = staffEmployees.filter((employee) => !!employee.deleted_at);
    const maxStaffSlots = 2;
    const totalEmployeeCount = employees.length;
    const remainingStaffSlots = Math.max(0, maxStaffSlots - staffEmployees.length);
    const visibleStaffSlots = [
        ...activeStaffEmployees,
        ...Array.from({ length: remainingStaffSlots }, () => null),
    ];
    const activeEmployeeCount = activeEmployees.length;
    const reachedLimit = totalEmployeeCount >= 3;
    const isCurrentUserRepresentative = String(user?.user_id || '') === String(representativeUserId || '');
    const currentRole = user?.role || user?.user?.role;
    const requiresCurrentPassword = currentRole === 'company';
    const isLoading = isActiveEmployeesLoading || isDisabledEmployeesLoading;

    useEffect(() => {
        if (companyFetchData?.company?.representative_user_id) {
            setLocalRepresentativeUserId(String(companyFetchData.company.representative_user_id));
        }
    }, [companyFetchData?.company?.representative_user_id]);

    const resetCreateForm = () => {
        setIsCreateModalOpen(false);
        setFormData({ full_name: '', email: '', phone_number: '' });
        setCreatePassword('');
        setCreateErrors({});
        setCreateTouched({});
    };

    const buildCreateErrors = (data = formData, password = createPassword) => {
        const nextErrors = {};
        const fullNameError = validateFullName(data.full_name);
        const emailError = validateEmail(data.email);
        const phoneError = validatePhoneNumber(data.phone_number);

        if (fullNameError) nextErrors.full_name = fullNameError;
        if (emailError) nextErrors.email = emailError;
        if (phoneError) nextErrors.phone_number = phoneError;

        if (requiresCurrentPassword) {
            const passwordError = validatePasswordMinLength(password, 'Mật khẩu hiện tại');
            if (passwordError) nextErrors.currentPassword = passwordError;
        }

        return nextErrors;
    };

    const setCreateFieldValue = (field, value) => {
        const nextFormData = { ...formData, [field]: value };
        setFormData(nextFormData);
        setCreateTouched((prev) => ({ ...prev, [field]: true }));
        setCreateErrors(buildCreateErrors(nextFormData, createPassword));
    };

    const setCreatePasswordValue = (value) => {
        setCreatePassword(value);
        setCreateTouched((prev) => ({ ...prev, currentPassword: true }));
        setCreateErrors(buildCreateErrors(formData, value));
    };

    const validateCreateForm = () => {
        const nextErrors = buildCreateErrors();
        setCreateTouched({
            full_name: true,
            email: true,
            phone_number: true,
            currentPassword: requiresCurrentPassword,
        });
        setCreateErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const currentCreateErrors = buildCreateErrors();
    const isCreateFormValid = Object.keys(currentCreateErrors).length === 0;
    const getCreateFieldError = (field) => (
        createTouched[field] ? currentCreateErrors[field] : createErrors[field]
    ) || '';

    const handleCreate = async (e) => {
        e?.preventDefault?.();

        if (!validateCreateForm()) {
            toast.warning('Thiếu hoặc sai thông tin', 'Vui lòng kiểm tra lại thông tin nhân sự trước khi thêm.');
            return;
        }

        try {
            await createUserMutation.mutateAsync({
                full_name: formData.full_name.trim().replace(/\s+/g, ' '),
                email: normalizeEmailInput(formData.email),
                phone_number: normalizePhoneInput(formData.phone_number),
                role: 'company',
                company_id: user.company_id,
                zone_id: user.zone_id,
                currentPassword: requiresCurrentPassword ? createPassword.trim() : undefined,
            });

            resetCreateForm();
            toast.success(copy.successTitle, copy.successCreate);
        } catch (error) {
            console.error('Failed to create employee:', error);
            toast.error(copy.errorTitle, error.response?.data?.message || error.message || copy.errorCreate);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm.userId) return;

        try {
            await hardDeleteMutation.mutateAsync({
                userId: deleteConfirm.userId,
                newRepresentativeUserId: replacementUserId || undefined,
                currentPassword: requiresCurrentPassword ? deletePassword.trim() : undefined,
            });
            toast.success(copy.successTitle, copy.successRemove);
            setDeleteConfirm({ open: false, userId: null, userName: '' });
            setReplacementUserId('');
            setDeletePassword('');
        } catch (error) {
            console.error('Failed to delete employee:', error);
            toast.error(
                copy.errorTitle,
                error.response?.data?.error || error.response?.data?.message || error.message || copy.errorRemove
            );
        }
    };

    const handleTransferRepresentative = async () => {
        if (!transferConfirm.userId || !user?.company_id) return;
        if (requiresCurrentPassword && !transferPassword.trim()) return;

        try {
            const result = await setRepresentativeMutation.mutateAsync({
                company_id: user.company_id,
                representative_user_id: transferConfirm.userId,
                current_password: requiresCurrentPassword ? transferPassword.trim() : undefined,
            });
            const resolvedRepresentativeId = String(
                result?.company?.representative_user_id || ''
            );
            const targetRepresentativeId = String(transferConfirm.userId);

            if (resolvedRepresentativeId !== targetRepresentativeId) {
                throw new Error('Nhượng quyền chưa được cập nhật trên hệ thống.');
            }

            setLocalRepresentativeUserId(targetRepresentativeId);
            await Promise.all([refetchCompany(), refetchActiveEmployees(), refetchDisabledEmployees()]);
            toast.success(copy.successTitle, copy.successTransfer);

            if (String(user?.user_id || '') !== targetRepresentativeId) {
                navigate('/my-information/business', { replace: true });
            }
        } catch (error) {
            console.error('Failed to transfer representative:', error);
            toast.error(copy.errorTitle, error.response?.data?.error || error.response?.data?.message || error.message || copy.errorTransfer);
            throw error;
        }
    };

    const getRoleBadge = (employee) => {
        if (String(employee.user_id) === String(representativeUserId)) {
            return (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#4E5BA6]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#4E5BA6]">
                    <Shield className="h-3 w-3" />
                    {copy.roleOwner}
                </span>
            );
        }

        if (employee.deleted_at) {
            return (
                <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    <Info className="h-3 w-3" />
                    Đã vô hiệu hóa
                </span>
            );
        }

        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                <BadgeCheck className="h-3 w-3" />
                {copy.roleStaff}
            </span>
        );
    };

    return (
        <div className="pb-4">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center space-y-4 py-24">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#4E5BA6] border-t-transparent" />
                    <p className="text-sm font-bold uppercase tracking-widest text-gray-500/70">{copy.loading}</p>
                </div>
            ) : (
                <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
                    <div className="space-y-4">
                        <div className="rounded-[22px] border border-gray-100 bg-white px-4 py-4 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4E5BA6] to-[#6B7BC4] text-white shadow-sm shadow-[#4E5BA6]/15">
                                    <Users className="size-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-base font-bold tracking-tight text-gray-900">{copy.pageTitle}</h3>
                                        <span className="inline-flex items-center rounded-full border border-[#DCE3FF] bg-[#F8FAFF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#4E5BA6]">
                                            {activeEmployeeCount}/3 hoạt động
                                        </span>
                                    </div>
                                    <p className="mt-1 text-[13px] leading-5 text-gray-500">
                                        Doanh nghiệp đang quản lý {activeEmployeeCount} tài khoản hoạt động trên tổng số 3 tài khoản.
                                    </p>
                                    <div className="mt-4">
                                        <div className="mb-1.5 flex items-center justify-between gap-3">
                                            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">{copy.usageLabel}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#4E5BA6]">{totalEmployeeCount}/3</span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full border border-gray-100 bg-gray-50 p-0.5">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-[#4E5BA6] to-[#8E99D6] shadow-sm transition-all duration-700 ease-out"
                                                style={{ width: `${Math.min((totalEmployeeCount / 3) * 100, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {representativeEmployee ? (
                            <motion.div
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden rounded-[24px] border border-[#C7D2FE] bg-gradient-to-br from-[#F8FAFF] via-white to-[#EEF2FF] shadow-lg shadow-[#4E5BA6]/10"
                            >
                                <div className="p-5">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="space-y-2">
                                            <div className="inline-flex items-center gap-2 rounded-full bg-[#4E5BA6] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                                                <Shield className="h-4 w-4" />
                                                Người đại diện hiện tại
                                            </div>
                                            {String(representativeEmployee.user_id || '') === String(user?.user_id || '') ? (
                                                <div className="inline-flex items-center gap-2 rounded-full border border-[#C7D2FE] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#4E5BA6]">
                                                    <BadgeCheck className="h-3.5 w-3.5" />
                                                    Đây là tài khoản của bạn
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="flex flex-wrap items-center justify-end gap-2">
                                            {representativeEmployee.deleted_at ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">
                                                    <Info className="h-3 w-3" />
                                                    Đã vô hiệu hóa
                                                </span>
                                            ) : null}
                                            {getRoleBadge(representativeEmployee)}
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(230px,0.92fr)]">
                                        <div className="flex items-start gap-4 rounded-[20px] border border-white/80 bg-white/70 p-4">
                                            <div className="flex size-12 shrink-0 items-center justify-center rounded-[18px] bg-[#4E5BA6] text-white shadow-md shadow-[#4E5BA6]/20">
                                                <UserCircle className="size-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className={`text-xl font-extrabold tracking-tight ${representativeEmployee.deleted_at ? 'text-gray-500 line-through' : 'text-slate-900'}`}>
                                                    {representativeEmployee.full_name}
                                                </h4>
                                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                                    Tài khoản này đang giữ quyền đại diện và phụ trách các thay đổi nhân sự của doanh nghiệp.
                                                </p>
                                                <div className="mt-3 inline-flex items-center rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 shadow-sm">
                                                    ID: {representativeEmployee.user_id}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2.5 rounded-[20px] border border-white/80 bg-white/90 p-4 shadow-sm">
                                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                                <BadgeCheck className="h-4 w-4 text-[#4E5BA6]" />
                                                Thông tin liên hệ
                                            </div>
                                            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                                                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                                    <Mail className="size-3.5" />
                                                    Email
                                                </div>
                                                <p className="mt-1 truncate text-sm font-semibold text-slate-700">{representativeEmployee.email}</p>
                                            </div>
                                            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                                                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                                    <Phone className="size-3.5" />
                                                    Số điện thoại
                                                </div>
                                                <p className="mt-1 text-sm font-semibold text-slate-700">
                                                    {representativeEmployee.phone_number || copy.phoneMissing}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {representativeEmployee.user_id !== user.user_id ? (
                                        <div className="mt-4 flex items-center justify-end border-t border-white/70 pt-3">
                                            <button
                                                onClick={() => setDeleteConfirm({ open: true, userId: representativeEmployee.user_id, userName: representativeEmployee.full_name })}
                                                className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 transition-all hover:bg-red-50 hover:text-red-500"
                                            >
                                                <Trash2 className="size-4" />
                                                <span>{copy.removeAction}</span>
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="rounded-[24px] border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
                                Chưa có tài khoản đại diện được gán cho doanh nghiệp.
                            </div>
                        )}
                    </div>

                    <div className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="border-b border-gray-100 pb-4">
                            <div className="flex flex-wrap items-start justify-between gap-0">
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900">Nhân sự phối hợp</h4>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Các tài khoản này hỗ trợ nhập liệu, theo dõi và phối hợp vận hành cùng người đại diện.
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                                        {activeStaffEmployees.length}/{maxStaffSlots} nhân sự
                                    </span>
                                    {disabledStaffEmployees.length > 0 ? (
                                        <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500">
                                            {disabledStaffEmployees.length} vô hiệu hóa
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 space-y-3">
                            {visibleStaffSlots.map((employee, idx) => (
                                employee ? (
                                    <motion.div
                                        key={employee.user_id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05, duration: 0.24 }}
                                        className="group rounded-[20px] border border-gray-100 bg-white p-4 transition-all duration-300 hover:border-[#4E5BA6]/25 hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-start gap-3">
                                                <div className="rounded-2xl bg-gray-50 p-2.5 text-[#4E5BA6] shadow-sm">
                                                    <UserCircle className="size-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="truncate text-base font-bold text-gray-900 transition-colors group-hover:text-[#4E5BA6]">
                                                        {employee.full_name}
                                                    </h4>
                                                    <p className="mt-0.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                                        {copy.granted}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-tighter text-gray-300">ID: {employee.user_id}</span>
                                        </div>

                                        <div className="mt-3 grid gap-2">
                                            <div className="flex items-center gap-3 rounded-xl bg-gray-50/80 px-3 py-2.5">
                                                <Mail className="size-3.5 shrink-0 text-gray-400" />
                                                <span className="truncate text-sm font-medium text-gray-600">{employee.email}</span>
                                            </div>
                                            <div className="flex items-center gap-3 rounded-xl bg-gray-50/80 px-3 py-2.5">
                                                <Phone className="size-3.5 shrink-0 text-gray-400" />
                                                <span className="text-sm font-medium text-gray-600">{employee.phone_number || copy.phoneMissing}</span>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-50 pt-2">
                                            {isCurrentUserRepresentative && String(employee.user_id) !== String(user.user_id) ? (
                                                <button
                                                    onClick={() => setTransferConfirm({ open: true, userId: employee.user_id, userName: employee.full_name })}
                                                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#4E5BA6] transition-all hover:bg-[#4E5BA6]/10"
                                                >
                                                    <Repeat className="size-4" />
                                                    <span>{copy.transferAction}</span>
                                                </button>
                                            ) : null}

                                            {employee.user_id !== user.user_id ? (
                                                <button
                                                    onClick={() => setDeleteConfirm({ open: true, userId: employee.user_id, userName: employee.full_name })}
                                                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 transition-all hover:bg-red-50 hover:text-red-500"
                                                >
                                                    <Trash2 className="size-4" />
                                                    <span>{copy.removeAction}</span>
                                                </button>
                                            ) : null}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <button
                                        key={`staff-slot-${idx}`}
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(true)}
                                        disabled={reachedLimit}
                                        className="group flex min-h-[190px] w-full flex-col items-center justify-center rounded-[20px] border border-dashed border-[#C7D2FE] bg-[#F8FAFF] px-5 py-6 text-center transition-all hover:border-[#4E5BA6] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <div className="flex size-12 items-center justify-center rounded-2xl bg-white text-[#4E5BA6] shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5">
                                            <UserPlus className="size-5" />
                                        </div>
                                        <p className="mt-4 text-sm font-bold text-slate-900">Thêm nhân sự phối hợp</p>
                                        <p className="mt-1 max-w-[220px] text-sm leading-6 text-slate-500">
                                            Chưa có tài khoản. <br />Nhấn vào đây để thêm.
                                        </p>
                                    </button>
                                )
                            ))}
                        </div>

                        {disabledStaffEmployees.length > 0 ? (
                            <div className="mt-4 border-t border-gray-100 pt-4">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-400">Nhân sự đã vô hiệu hóa</p>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">{disabledStaffEmployees.length} tài khoản</span>
                                </div>
                                <div className="space-y-2">
                                    {disabledStaffEmployees.map((employee) => (
                                        <div
                                            key={employee.user_id}
                                            className="rounded-[18px] border border-stone-200 bg-stone-50/80 px-4 py-3"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h5 className="truncate text-sm font-bold text-gray-500 line-through">{employee.full_name}</h5>
                                                        {getRoleBadge(employee)}
                                                    </div>
                                                    <p className="mt-1 truncate text-xs text-stone-500">{employee.email}</p>
                                                </div>
                                                {employee.user_id !== user.user_id ? (
                                                    <button
                                                        onClick={() => setDeleteConfirm({ open: true, userId: employee.user_id, userName: employee.full_name })}
                                                        className="flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-stone-500 transition-all hover:bg-red-50 hover:text-red-500"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                        <span>{copy.removeAction}</span>
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
            <Dialog
                open={isCreateModalOpen}
                onClose={createUserMutation.isPending ? undefined : resetCreateForm}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '24px',
                        padding: 1,
                        fontFamily: dialogFontFamily,
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                    },
                }}
            >
                <div className="relative">
                    <IconButton
                        onClick={resetCreateForm}
                        disabled={createUserMutation.isPending}
                        sx={{ position: 'absolute', right: 16, top: 16, color: 'text.secondary' }}
                    >
                        <X size={20} />
                    </IconButton>

                    <DialogTitle sx={{ pb: 1 }}>
                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 2.25 }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    borderRadius: '18px',
                                    p: 1.5,
                                    bgcolor: '#EEF2FF',
                                    color: '#4E5BA6',
                                    boxShadow: 'inset 0 0 0 1px rgba(78, 91, 166, 0.08)',
                                }}
                            >
                                <UserPlus size={24} />
                            </Box>
                            <Box>
                                <Typography
                                    sx={{
                                        lineHeight: 1.2,
                                        fontSize: 22,
                                        fontWeight: 800,
                                        color: '#0F172A',
                                        fontFamily: dialogFontFamily,
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    {copy.dialogTitle}
                                </Typography>
                                <Typography
                                    sx={{
                                        mt: 0.5,
                                        color: '#64748B',
                                        fontSize: 13,
                                        fontWeight: 500,
                                        fontFamily: dialogFontFamily,
                                    }}
                                >
                                    {copy.dialogSubtitle}
                                </Typography>
                            </Box>
                        </Box>
                    </DialogTitle>

                    <DialogContent>
                        <Box component="form" className="space-y-5 pt-4">
                            <div className="space-y-1.5">
                                <label className="ml-1 text-[11px] font-bold uppercase tracking-widest text-gray-500">{copy.fullName}</label>
                                <TextField
                                    fullWidth
                                    placeholder={copy.fullNamePlaceholder}
                                    value={formData.full_name}
                                    onChange={(e) => setCreateFieldValue('full_name', e.target.value)}
                                    onBlur={(e) => setCreateFieldValue('full_name', e.target.value.trim().replace(/\s+/g, ' '))}
                                    error={!!getCreateFieldError('full_name')}
                                    helperText={getCreateFieldError('full_name') || ' '}
                                    required
                                    variant="outlined"
                                    sx={inputSx}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="ml-1 text-[11px] font-bold uppercase tracking-widest text-gray-500">{copy.workEmail}</label>
                                <TextField
                                    fullWidth
                                    type="email"
                                    placeholder="email@doanhnghiep.com"
                                    value={formData.email}
                                    onChange={(e) => setCreateFieldValue('email', e.target.value)}
                                    onBlur={(e) => setCreateFieldValue('email', normalizeEmailInput(e.target.value))}
                                    error={!!getCreateFieldError('email')}
                                    helperText={getCreateFieldError('email') || ' '}
                                    required
                                    variant="outlined"
                                    sx={inputSx}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="ml-1 text-[11px] font-bold uppercase tracking-widest text-gray-500">{copy.phone}</label>
                                <TextField
                                    fullWidth
                                    placeholder="09xxxxxxxx"
                                    value={formData.phone_number}
                                    onChange={(e) => setCreateFieldValue('phone_number', normalizePhoneInput(e.target.value))}
                                    error={!!getCreateFieldError('phone_number')}
                                    helperText={getCreateFieldError('phone_number') || ' '}
                                    required
                                    variant="outlined"
                                    inputProps={{ maxLength: 11, inputMode: 'numeric' }}
                                    sx={inputSx}
                                />
                            </div>

                            <Box
                                sx={{
                                    mt: 2,
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 1.5,
                                    borderRadius: '18px',
                                    border: '1px solid #C7D2FE',
                                    bgcolor: '#EEF2FF',
                                    px: 2,
                                    py: 1.75,
                                }}
                            >
                                <Box
                                    sx={{
                                        mt: '2px',
                                        display: 'flex',
                                        borderRadius: '999px',
                                        bgcolor: '#C7D2FE',
                                        color: '#3730A3',
                                        p: 0.75,
                                    }}
                                >
                                    <Info size={16} />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#312E81' }}>
                                        {copy.accountHintTitle}
                                    </Typography>
                                    <Typography sx={{ mt: 0.35, fontSize: 13, lineHeight: 1.6, color: '#4338CA' }}>
                                        {copy.accountHintBody}
                                    </Typography>
                                </Box>
                            </Box>

                            {requiresCurrentPassword ? (
                                <div className="space-y-1.5 pt-2 border-t border-gray-100">
                                    <label className="ml-1 text-[11px] font-bold uppercase tracking-widest text-gray-500">
                                        Mật khẩu hiện tại <span className="text-red-500">*</span>
                                    </label>
                                    <TextField
                                        fullWidth
                                        type="password"
                                        placeholder="Nhập mật khẩu để xác nhận thêm mới"
                                        value={createPassword}
                                        onChange={(e) => setCreatePasswordValue(e.target.value)}
                                        error={!!getCreateFieldError('currentPassword')}
                                        helperText={getCreateFieldError('currentPassword') || 'Yêu cầu xác minh danh tính người đại diện.'}
                                        required
                                        variant="outlined"
                                        sx={inputSx}
                                    />
                                </div>
                            ) : null}
                        </Box>
                    </DialogContent>

                    <DialogActions sx={{ p: 3, pt: 1 }}>
                        <Button
                            onClick={resetCreateForm}
                            disabled={createUserMutation.isPending}
                            sx={{
                                borderRadius: '12px',
                                px: 3,
                                color: 'text.secondary',
                                fontWeight: 700,
                                textTransform: 'none',
                            }}
                        >
                            {copy.cancel}
                        </Button>
                        <Button
                            variant="contained"
                            disabled={createUserMutation.isPending || !isCreateFormValid}
                            onClick={handleCreate}
                            sx={{
                                borderRadius: '14px',
                                px: 4,
                                py: 1.2,
                                fontWeight: 700,
                                textTransform: 'none',
                                bgcolor: '#4E5BA6',
                                boxShadow: '0 8px 16px -4px rgba(78, 91, 166, 0.3)',
                                '&:hover': { bgcolor: '#3d4885' },
                            }}
                        >
                            {createUserMutation.isPending ? <CircularProgress size={20} color="inherit" /> : copy.submit}
                        </Button>
                    </DialogActions>
                </div>
            </Dialog>

            <ConfirmDeleteDialog
                open={deleteConfirm.open}
                onClose={() => {
                    setDeleteConfirm({ open: false, userId: null, userName: '' });
                    setReplacementUserId('');
                    setDeletePassword('');
                }}
                onConfirm={handleDelete}
                title={copy.confirmTitle}
                actionType="hard-delete"
                description={() => copy.confirmDesc(deleteConfirm.userName)}
                confirmText={copy.confirmText}
                loadingText={copy.confirmLoading}
                selectedIds={[deleteConfirm.userId]}
                previewMutation={previewHardDeleteMutation}
                deleteMutation={hardDeleteMutation}
                replacementValue={replacementUserId}
                onReplacementChange={setReplacementUserId}
                confirmDisabled={requiresCurrentPassword && !deletePassword.trim()}
                showImpactTable={false}
                extraContent={requiresCurrentPassword ? (
                    <div className="rounded-[20px] border border-[#C7D2FE] bg-[#EEF2FF] p-4">
                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#3730A3' }}>
                            Xác minh bằng mật khẩu hiện tại
                        </Typography>
                        <Typography sx={{ mt: 0.75, fontSize: 13, lineHeight: 1.6, color: '#4338CA' }}>
                            Để gỡ nhân sự khỏi doanh nghiệp, vui lòng nhập mật khẩu của tài khoản đại diện hiện tại.
                        </Typography>
                        <TextField
                            fullWidth
                            type="password"
                            value={deletePassword}
                            placeholder="Nhập mật khẩu hiện tại"
                            onChange={(event) => setDeletePassword(event.target.value)}
                            variant="outlined"
                            sx={{ ...inputSx, mt: 2 }}
                            helperText={!deletePassword.trim() ? 'Vui lòng nhập mật khẩu hiện tại để tiếp tục.' : ' '}
                        />
                    </div>
                ) : null}
            />

            <ConfirmationModal
                open={transferConfirm.open}
                onClose={() => {
                    setTransferConfirm({ open: false, userId: null, userName: '' });
                    setTransferPassword('');
                }}
                onConfirm={handleTransferRepresentative}
                onAfterConfirm={() => {
                    setTransferConfirm({ open: false, userId: null, userName: '' });
                    setTransferPassword('');
                }}
                title={copy.transferTitle}
                content={(
                    <div className="space-y-3 text-left">
                        <p>{copy.transferDesc(transferConfirm.userName)}</p>
                        <div className="rounded-2xl border border-[#C7D2FE] bg-[#EEF2FF] px-4 py-3 text-sm font-medium text-[#3730A3]">
                            {copy.transferNote}
                        </div>
                        {requiresCurrentPassword ? (
                            <div className="space-y-1.5">
                                <label className="ml-1 text-[11px] font-bold uppercase tracking-widest text-gray-500">
                                    {copy.transferPasswordLabel}
                                </label>
                                <TextField
                                    fullWidth
                                    type="password"
                                    value={transferPassword}
                                    placeholder={copy.transferPasswordPlaceholder}
                                    onChange={(event) => setTransferPassword(event.target.value)}
                                    variant="outlined"
                                    sx={inputSx}
                                    helperText={!transferPassword.trim() ? copy.transferPasswordRequired : ' '}
                                />
                            </div>
                        ) : null}
                    </div>
                )}
                confirmText={copy.transferConfirm}
                loadingText={copy.transferLoading}
                confirmType="info"
                isLoading={setRepresentativeMutation.isPending}
                disableClose={setRepresentativeMutation.isPending}
                confirmDisabled={requiresCurrentPassword && !transferPassword.trim()}
            />
        </div>
    );
};

export default CompanySubAccounts;
