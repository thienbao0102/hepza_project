import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";

const FloatingInput = ({
    label = "",
    value = "",
    onChange = () => { },
    onlyNumber = false,
    max = 1000000,
    className = ""
}) => {
    const [focused, setFocused] = useState(false);
    const isActive = focused || (value ?? "").toString().length > 0;

    // Validation logic for quantity
    const isInvalid = onlyNumber && (Number(value) < 0 || Number(value) > max);
    const borderClass = isInvalid ? "border-red-500 focus:border-red-600" : "border-gray-300 focus:border-[#4E5BA6]";
    const labelClass = isInvalid ? "text-red-500" : "text-gray-700";

    const handleInputChange = (e) => {
        let val = e.target.value;
        if (onlyNumber) {
            // Remove any non-numeric and non-decimal characters
            val = val.replace(/[^0-9.]/g, '');
            // Ensure only one decimal point
            const parts = val.split('.');
            if (parts.length > 2) {
                val = parts[0] + '.' + parts.slice(1).join('');
            }
        }
        onChange(val);
    };

    return (
        <div className={`relative h-10 flex justify-start items-center ${className} ${isInvalid ? 'mb-4' : ''}`}>
            <input
                type="text" // Use text to allow controlled regex filtering without browser number quirks
                value={value ?? ""}
                onChange={handleInputChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className={`w-full h-full outline-none focus:ring-0 py-2 bg-white rounded-xl flex items-center px-4 border ${borderClass} ${onlyNumber ? "text-center" : "text-left"
                    }`}
            />
            {isInvalid && (
                <span className="absolute -bottom-4 left-4 text-[10px] text-red-500 italic font-medium whitespace-nowrap">
                    * Giá trị không hợp lệ (0 - {max.toLocaleString('vi-VN')})
                </span>
            )}
            <AnimatePresence>
                <motion.label
                    animate={
                        isActive
                            ? { y: -33, scale: 0.95, opacity: 1 }
                            : { y: 0, scale: 1, opacity: 0.8 }
                    }
                    transition={{ duration: 0.2 }}
                    className={`absolute left-4 bg-white px-1 pointer-events-none text-sm origin-left ${labelClass}`}
                >
                    {label}
                </motion.label>
            </AnimatePresence>
        </div>
    );
};

export default FloatingInput;
