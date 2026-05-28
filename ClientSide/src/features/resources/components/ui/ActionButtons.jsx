import React from 'react';
import { Minus, Plus } from 'lucide-react';

export const MinusButton = ({ onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="h-7 my-auto aspect-square rounded-full flex justify-center items-center text-white bg-[#FF4E4E] cursor-pointer"
    >
        <Minus size={15} strokeWidth={3} />
    </button>
);

export const PlusButton = ({ onClick, className, label, disabled }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`h-8 my-auto rounded-xl flex justify-center items-center text-gray-900 gap-3 border border-gray-300 px-3 truncate ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-gray-200 cursor-pointer'} ${className} `}
    >
        <span className={`size-6 aspect-square text-white flex justify-center items-center rounded-full ${disabled ? 'bg-gray-300' : 'bg-gray-400'}`}>
            <Plus size={16} strokeWidth={2} />
        </span>
        <span className="">
            <p>{label}</p>
        </span>
    </button>
);
