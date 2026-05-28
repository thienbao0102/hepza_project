import React from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

const WidgetComponent = ({ title, description, children, className, year, actionText }) => {
    return (
        <motion.div
            className={clsx(
                "w-full h-full bg-white rounded-xl shadow-sm p-4 flex flex-col",
                className
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            {(title || year || actionText) && (
                <div className="flex justify-between items-center mb-4 px-2">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
                        {description && <p className="text-gray-500 text-sm">{description}</p>}
                    </div>
                    {(year || actionText) && (
                        <div className="flex items-center gap-2">
                            {year && <button className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-md">{year}</button>}
                            {actionText && <button className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-md">{actionText}</button>}
                        </div>
                    )}
                </div>
            )}
            <div className="flex-grow h-full w-full">
                {children}
            </div>
        </motion.div>
    );
};

const Widget = React.memo(WidgetComponent);

export default Widget;
