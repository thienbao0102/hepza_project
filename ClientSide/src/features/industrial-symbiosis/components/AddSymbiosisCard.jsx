import React from 'react';
import { Plus } from 'lucide-react';

const AddSymbiosisCard = ({ onClick }) => {
    return (
        <div
            onClick={onClick}
            className="group relative w-[80px] h-[80px] bg-[#F1F1F1] hover:bg-[#E2E8F0] rounded-[16px] flex items-center justify-center cursor-pointer transition-all duration-200 self-center shrink-0"
        >
            <div className="w-6 h-6 rounded-full bg-[#9CA3AF] text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus size={16} strokeWidth={3} />
            </div>
        </div>
    );
};

export default AddSymbiosisCard;
