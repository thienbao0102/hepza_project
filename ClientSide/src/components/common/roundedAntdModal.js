import React from 'react';
import { CloseOutlined } from '@ant-design/icons';

const baseModalStyles = {
    content: {
        padding: 0,
        overflow: 'hidden',
        borderRadius: 24,
        boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
    },
    header: {
        padding: '28px 28px 0',
        marginBottom: 0,
        background: 'transparent',
        borderBottom: 'none',
    },
    body: {
        padding: '12px 28px 28px',
    },
    footer: {
        marginTop: 0,
        padding: '18px 28px 24px',
        background: 'rgba(248, 250, 252, 0.72)',
        borderTop: '1px solid #E2E8F0',
    },
};

export const getRoundedAntdModalProps = (overrides = {}) => {
    const mergedStyles = {
        content: { ...baseModalStyles.content, ...(overrides.styles?.content || {}) },
        header: { ...baseModalStyles.header, ...(overrides.styles?.header || {}) },
        body: { ...baseModalStyles.body, ...(overrides.styles?.body || {}) },
        footer: { ...baseModalStyles.footer, ...(overrides.styles?.footer || {}) },
    };

    return {
        centered: true,
        destroyOnClose: true,
        maskClosable: false,
        closeIcon: React.createElement(CloseOutlined, {
            style: { fontSize: 16, color: '#94A3B8' },
        }),
        styles: mergedStyles,
        ...overrides,
    };
};
