import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

const Dropdown = ({ value, onChange, options, label, className = "", disabled = false }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    return (
        <div className={`relative inline-block text-left h-10 outline-none ${className}`} ref={ref}>
            {label && (
                <span className="absolute -top-3 left-2 text-xs text-gray-600 bg-white px-1 pointer-events-none">
                    {label}
                </span>
            )}
            <button
                type="button"
                disabled={disabled}
                onClick={() => {
                    if (disabled) return;
                    setOpen(!open);
                }}
                className={`flex items-center outline-none justify-between gap-2 w-full h-[40px] rounded-xl border border-gray-300 bg-white px-3 py-1 text-sm transition ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-50 cursor-pointer'}`}
            >
                <span>{value}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {open && (
                <div className="absolute z-10 mt-1 w-full rounded-lg overflow-hidden border border-gray-200 bg-white shadow-lg max-h-60 overflow-y-auto">
                    {options.map((opt) => (
                        <button
                            type="button"
                            key={opt}
                            onClick={() => {
                                onChange(opt);
                                setOpen(false);
                            }}
                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 border-b border-gray-100 last:border-b-0 ${value === opt ? "bg-gray-100 font-medium" : ""
                                }`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dropdown;
