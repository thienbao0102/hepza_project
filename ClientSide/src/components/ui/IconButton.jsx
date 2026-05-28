import React from 'react';

const IconButton = ({ icon, label, variant = 'default', className = '', ...props }) => {
    const baseClasses = 'inline-flex items-center justify-center text-gray-500 transition-colors';
    const variantClasses =
        variant === 'ghost'
            ? 'h-8 px-0.5 text-gray-400 hover:text-indigo-600 rounded-none'
            : 'h-8 w-8 rounded-full border border-gray-200 bg-white hover:border-gray-300 hover:text-indigo-600';

    return (
        <button
            type="button"
            className={`${baseClasses} ${variantClasses} ${className}`.trim()}
            aria-label={label}
            title={label}
            {...props}
        >
            {icon}
        </button>
    );
};

export default IconButton;
