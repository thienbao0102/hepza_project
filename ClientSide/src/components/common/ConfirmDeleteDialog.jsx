import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Button,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';
import ConfirmDialogFrame from '@components/common/ConfirmDialogFrame';

const dialogConfig = {
    'soft-delete': {
        title: 'Xác nhận vô hiệu hóa',
        tone: 'warning',
        icon: <AlertTriangle size={24} />,
        confirmText: 'Vô hiệu hóa',
        loadingText: 'Đang vô hiệu hóa...',
        description: (count) => `Bạn có chắc muốn vô hiệu hóa ${count} mục đã chọn không? Dữ liệu vẫn có thể khôi phục nếu cần.`,
        buttonSx: {
            backgroundColor: '#D97706',
            boxShadow: '0 10px 24px rgba(217, 119, 6, 0.24)',
            '&:hover': { backgroundColor: '#B45309' },
        },
    },
    'hard-delete': {
        title: 'Xác nhận xóa vĩnh viễn',
        tone: 'danger',
        icon: <Trash2 size={24} />,
        confirmText: 'Xóa vĩnh viễn',
        loadingText: 'Đang xóa...',
        description: (count) => `Bạn có chắc muốn xóa vĩnh viễn ${count} mục đã chọn không? Thao tác này không thể hoàn tác.`,
        buttonSx: {
            backgroundColor: '#DC2626',
            boxShadow: '0 10px 24px rgba(220, 38, 38, 0.22)',
            '&:hover': { backgroundColor: '#B91C1C' },
        },
    },
    restore: {
        title: 'Xác nhận khôi phục',
        tone: 'success',
        icon: <RotateCcw size={24} />,
        confirmText: 'Khôi phục',
        loadingText: 'Đang khôi phục...',
        description: (count) => `Bạn có chắc muốn khôi phục ${count} mục đã chọn không?`,
        buttonSx: {
            backgroundColor: '#059669',
            boxShadow: '0 10px 24px rgba(5, 150, 105, 0.22)',
            '&:hover': { backgroundColor: '#047857' },
        },
    },
};

const getPreviewRows = (previewData) =>
    previewData?.zones || previewData?.users || previewData?.companies || previewData?.data || [];

const getPreviewCount = (previewData) =>
    previewData?.totalZones ||
    previewData?.totalUsers ||
    previewData?.totalCompanies ||
    getPreviewRows(previewData).length ||
    0;

const ConfirmDeleteDialog = ({
    open,
    onClose,
    onConfirm,
    onSuccess,
    title,
    isHardDelete = false,
    selectedIds = [],
    previewMutation,
    deleteMutation,
    columns = [],
    renderRow = () => null,
    actionType = 'soft-delete',
    description,
    confirmText,
    loadingText,
    replacementValue = '',
    onReplacementChange,
    replacementLabel = 'Người đại diện mới',
    confirmDisabled = false,
    extraContent = null,
    showImpactTable = true,
}) => {
    const [previewData, setPreviewData] = useState(null);
    const lastPreviewKeyRef = useRef(null);

    const effectiveAction = isHardDelete ? 'hard-delete' : actionType;
    const currentConfig = dialogConfig[effectiveAction] || dialogConfig['soft-delete'];

    const {
        mutate: fetchPreview,
        isPending: isPreviewPending,
        isLoading: isPreviewLoadingLegacy,
        error: previewError,
    } = previewMutation || {};

    const {
        mutate: confirmDelete,
        isPending: isDeletePending,
        isLoading: isDeletingLegacy,
    } = deleteMutation || {};

    const isPreviewLoading = isPreviewPending || isPreviewLoadingLegacy;
    const isDeleting = isDeletePending || isDeletingLegacy;
    const selectedIdsKey = useMemo(() => JSON.stringify(selectedIds), [selectedIds]);
    const previewRows = getPreviewRows(previewData);
    const previewCount = getPreviewCount(previewData);
    const requiresRepresentativeReplacement = !!previewData?.requiresRepresentativeReplacement;
    const replacementOptions = previewData?.replacementOptions || [];
    const representativeContext = previewData?.representativeContext || null;
    const shouldRenderReplacementSelect =
        requiresRepresentativeReplacement && typeof onReplacementChange === 'function';
    const isReplacementMissing = shouldRenderReplacementSelect && !replacementValue;
    const resolvedDescription = typeof description === 'function'
        ? description(selectedIds.length)
        : (description || currentConfig.description(selectedIds.length));
    const resolvedConfirmText = confirmText || currentConfig.confirmText;
    const resolvedLoadingText = loadingText || currentConfig.loadingText;

    useEffect(() => {
        if (!open) {
            lastPreviewKeyRef.current = null;
            setPreviewData(null);
            previewMutation?.reset?.();
            return;
        }

        if (!fetchPreview || selectedIds.length === 0) {
            return;
        }

        const nextPreviewKey = `${effectiveAction}:${selectedIdsKey}`;
        if (lastPreviewKeyRef.current === nextPreviewKey) {
            return;
        }

        lastPreviewKeyRef.current = nextPreviewKey;
        fetchPreview(selectedIds, {
            onSuccess: (data) => setPreviewData(data),
        });
    }, [open, selectedIds.length, selectedIdsKey, effectiveAction]);

    const handleConfirm = () => {
        if (onConfirm) {
            onConfirm();
            return;
        }

        if (confirmDelete) {
            confirmDelete(selectedIds, {
                onSuccess: () => {
                    onSuccess?.();
                    onClose?.();
                },
            });
        }
    };

    return (
        <ConfirmDialogFrame
            open={open}
            onClose={onClose}
            closeDisabled={isDeleting}
            width={previewMutation ? 760 : 500}
            tone={currentConfig.tone}
            icon={currentConfig.icon}
            title={title || currentConfig.title}
            description={resolvedDescription}
            actions={(
                <div className="flex items-center justify-center gap-3">
                    <Button
                        onClick={onClose}
                        disabled={isDeleting}
                        variant="outlined"
                        sx={{
                            borderRadius: '14px',
                            minWidth: 132,
                            py: 1.2,
                            borderColor: '#CBD5E1',
                            color: '#475569',
                            fontWeight: 700,
                            textTransform: 'none',
                            backgroundColor: '#FFFFFF',
                        }}
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isPreviewLoading || isDeleting || !!previewError || isReplacementMissing || confirmDisabled}
                        variant="contained"
                        startIcon={isDeleting ? <CircularProgress size={18} color="inherit" /> : null}
                        sx={{
                            borderRadius: '14px',
                            minWidth: 156,
                            py: 1.2,
                            fontWeight: 700,
                            textTransform: 'none',
                            ...currentConfig.buttonSx,
                        }}
                    >
                        {isDeleting ? resolvedLoadingText : resolvedConfirmText}
                    </Button>
                </div>
            )}
        >
            {isPreviewLoading ? (
                <div className="flex justify-center py-8">
                    <CircularProgress />
                </div>
            ) : previewError ? (
                <Alert severity="error" sx={{ borderRadius: '16px' }}>
                    Lỗi tải dữ liệu xem trước: {previewError.message}
                </Alert>
            ) : previewData ? (
                <div className="space-y-4">
                    {shouldRenderReplacementSelect ? (
                        <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-4">
                            <Typography sx={{ fontSize: 14, fontWeight: 'bold', color: '#9A3412' }}>
                                Cần chọn người đại diện mới trước khi xóa
                            </Typography>
                            <Typography sx={{ mt: 0.75, fontSize: 13, lineHeight: 1.6, color: '#7C2D12' }}>
                                {representativeContext?.current_representative_name || 'Tài khoản này'} đang
                                là người đại diện của{' '}
                                <strong>{representativeContext?.company_name || 'doanh nghiệp'}</strong>.
                                Chọn nhân sự thay thế để tiếp tục.
                            </Typography>
                            <FormControl fullWidth sx={{ mt: 2 }}>
                                <InputLabel id="replacement-user-label">{replacementLabel}</InputLabel>
                                <Select
                                    labelId="replacement-user-label"
                                    value={replacementValue}
                                    label={replacementLabel}
                                    onChange={(event) => onReplacementChange?.(event.target.value)}
                                    sx={{ borderRadius: '14px', backgroundColor: '#FFFFFF' }}
                                >
                                    {replacementOptions.map((option) => (
                                        <MenuItem key={option.user_id} value={option.user_id}>
                                            {option.full_name} {option.email ? `(${option.email})` : ''}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            {isReplacementMissing ? (
                                <Typography sx={{ mt: 1, fontSize: 12, fontWeight: 700, color: '#DC2626' }}>
                                    Vui lòng chọn người đại diện mới để tiếp tục.
                                </Typography>
                            ) : null}
                        </div>
                    ) : null}

                    {extraContent ? extraContent : null}

                    {showImpactTable ? (
                    <div className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                        <div className="mb-3">
                            <p className="text-sm font-bold text-slate-800">
                                Danh sách đối tượng bị ảnh hưởng
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                Hệ thống ghi nhận {previewCount} mục liên quan đến thao tác này.
                            </p>
                        </div>

                        <TableContainer
                            sx={{
                                maxHeight: 360,
                                borderRadius: '16px',
                                border: '1px solid #E2E8F0',
                                backgroundColor: '#FFFFFF',
                            }}
                        >
                            <Table stickyHeader size="medium">
                                <TableHead>
                                    <TableRow>
                                        {columns.map((col, idx) => (
                                            <TableCell
                                                key={idx}
                                                sx={{
                                                    fontWeight: 700,
                                                    color: '#334155',
                                                    backgroundColor: '#F8FAFC',
                                                    borderBottom: '1px solid #E2E8F0',
                                                }}
                                            >
                                                {typeof col === 'string' ? col : col.label}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {previewRows.map((row, idx) => (
                                        <TableRow
                                            key={idx}
                                            hover
                                            sx={{
                                                '&:last-child td': { borderBottom: 0 },
                                            }}
                                        >
                                            {renderRow(row)}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </div>
                    ) : null}
                </div>
            ) : null}
        </ConfirmDialogFrame>
    );
};

export default ConfirmDeleteDialog;
