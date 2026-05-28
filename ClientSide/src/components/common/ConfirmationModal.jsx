import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { AlertTriangle, Info } from 'lucide-react';
import ConfirmDialogFrame from '@components/common/ConfirmDialogFrame';

const ConfirmationModal = ({
    open,
    onClose,
    onConfirm,
    title,
    content,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy bỏ',
    confirmType = 'danger',
    isLoading = false,
    loadingText = 'Đang xử lý...',
    disableClose = false,
    confirmDisabled = false,
    onAfterConfirm,
}) => {
    const isDanger = confirmType === 'danger';

    return (
        <ConfirmDialogFrame
            open={open}
            onClose={disableClose ? undefined : onClose}
            closeDisabled={disableClose || isLoading}
            title={title}
            description={content}
            tone={isDanger ? 'danger' : 'info'}
            icon={isDanger ? <AlertTriangle size={24} /> : <Info size={24} />}
            actions={(
                <div className="flex items-center justify-center gap-3">
                    <Button
                        onClick={onClose}
                        disabled={disableClose || isLoading}
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
                        {cancelText}
                    </Button>
                    <Button
                        onClick={async () => {
                            try {
                                await onConfirm?.();
                                onAfterConfirm?.();
                            } catch (_) {
                                // The caller already handles user-facing errors and may keep the modal open.
                            }
                        }}
                        disabled={isLoading || confirmDisabled}
                        variant="contained"
                        startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : null}
                        sx={{
                            borderRadius: '14px',
                            minWidth: 132,
                            py: 1.2,
                            fontWeight: 700,
                            textTransform: 'none',
                            boxShadow: isDanger
                                ? '0 10px 24px rgba(220, 38, 38, 0.22)'
                                : '0 10px 24px rgba(78, 91, 166, 0.24)',
                            backgroundColor: isDanger ? '#DC2626' : '#4E5BA6',
                            '&:hover': {
                                backgroundColor: isDanger ? '#B91C1C' : '#3D4A8F',
                            },
                        }}
                    >
                        {isLoading ? loadingText : confirmText}
                    </Button>
                </div>
            )}
        />
    );
};

export default ConfirmationModal;
