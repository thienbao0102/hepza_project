import React from 'react';
import { Spin } from 'antd';
import clsx from 'clsx';

const LoadingSpinner = ({
    spinning = true,
    tip = 'Đang tải dữ liệu...',
    size = 'large',
    fullscreen = false,
    inline = false,
    indicator,
    className,
    wrapperClassName,
    style,
    children,
}) => {
    if (!spinning && !children) return null;

    if (children) {
        return (
            <Spin
                spinning={spinning}
                tip={tip}
                size={size}
                indicator={indicator}
                className={className}
            >
                {children}
            </Spin>
        );
    }

    const containerClass = clsx(
        inline ? 'inline-flex items-center justify-center gap-2' : 'flex items-center justify-center',
        fullscreen ? 'fixed inset-0 z-[1200] bg-white/70 backdrop-blur-sm' : 'w-full h-full',
        wrapperClassName,
    );

    return (
        <div className={containerClass} style={style}>
            <Spin
                spinning={spinning}
                tip={tip}
                size={size}
                indicator={indicator}
                className={className}
            >
                <div className="min-h-[24px] min-w-[300px]" />
            </Spin>
        </div>
    );
};

export default LoadingSpinner;
