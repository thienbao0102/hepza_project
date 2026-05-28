import React from 'react';
import { Dialog, DialogContent, IconButton } from '@mui/material';
import { X } from 'lucide-react';

const toneStyles = {
    danger: {
        iconBg: 'bg-red-50',
        iconColor: 'text-red-600',
    },
    warning: {
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-600',
    },
    success: {
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
    },
    info: {
        iconBg: 'bg-indigo-50',
        iconColor: 'text-[#4E5BA6]',
    },
};

const ConfirmDialogFrame = ({
    open,
    onClose,
    title,
    description,
    icon,
    tone = 'info',
    width = 460,
    closeDisabled = false,
    actions = null,
    children = null,
}) => {
    const currentTone = toneStyles[tone] || toneStyles.info;
    const isPlainDescription =
        typeof description === 'string' || typeof description === 'number';

    return (
        <Dialog
            open={open}
            onClose={closeDisabled ? undefined : onClose}
            fullWidth
            maxWidth={false}
            PaperProps={{
                sx: {
                    width,
                    maxWidth: 'calc(100vw - 32px)',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
                    backgroundImage: 'none',
                },
            }}
        >
            <DialogContent sx={{ p: 0 }}>
                <div className="relative bg-white">
                    <IconButton
                        onClick={onClose}
                        disabled={closeDisabled}
                        sx={{
                            position: 'absolute',
                            top: 14,
                            right: 14,
                            color: '#94A3B8',
                            zIndex: 1,
                        }}
                    >
                        <X size={18} />
                    </IconButton>

                    <div className="px-6 pt-8 pb-6 sm:px-7">
                        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${currentTone.iconBg}`}>
                            <div className={currentTone.iconColor}>{icon}</div>
                        </div>

                        <div className="mx-auto max-w-[560px] text-center">
                            <h3 className="text-xl font-bold tracking-tight text-slate-900">{title}</h3>
                            {description ? (
                                isPlainDescription ? (
                                    <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                                ) : (
                                    <div className="mt-2 text-sm leading-6 text-slate-500">{description}</div>
                                )
                            ) : null}
                        </div>

                        {children ? <div className="mt-6">{children}</div> : null}
                    </div>

                    {actions ? (
                        <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:px-7">
                            {actions}
                        </div>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ConfirmDialogFrame;
