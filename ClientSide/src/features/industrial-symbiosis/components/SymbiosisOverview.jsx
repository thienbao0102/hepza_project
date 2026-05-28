import React from 'react';
import { ShoppingCart, Factory, ArrowRight, TrendingUp, Search, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const OverviewCard = ({
    title,
    subtitle,
    description,
    stats,
    theme = 'blue',
    icon: Icon,
    imagePattern,
    onClick
}) => {
    const isBlue = theme === 'blue';

    // Theme configurations
    const themes = {
        blue: {
            bg: 'bg-gradient-to-br from-[#4E5BA6] to-[#2E3B86]',
            accent: 'bg-white/10',
            border: 'border-[#4E5BA6]/30',
            text: 'text-white',
            subText: 'text-blue-100',
            button: 'bg-white text-[#4E5BA6] hover:bg-blue-50',
            shadow: 'shadow-blue-900/20'
        },
        green: {
            bg: 'bg-gradient-to-br from-[#568D65] to-[#366D45]',
            accent: 'bg-white/10',
            border: 'border-[#568D65]/30',
            text: 'text-white',
            subText: 'text-green-100',
            button: 'bg-white text-[#568D65] hover:bg-green-50',
            shadow: 'shadow-green-900/20'
        }
    };

    const t = themes[theme];

    return (
        <div
            onClick={onClick}
            className={`
                group relative h-[240px] w-full rounded-2xl overflow-hidden cursor-pointer
                transition-all duration-500 hover:shadow-xl ${t.shadow} hover:-translate-y-1
                ${t.bg}
            `}
        >
            {/* Background Pattern Effects */}
            <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative h-full p-8 flex flex-col justify-between z-10">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <div className={`
                            inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                            ${t.accent} backdrop-blur-md ${t.subText}
                        `}>
                            {subtitle}
                        </div>
                        <h3 className={`text-2xl font-bold ${t.text} leading-tight`}>
                            {title}
                        </h3>
                        <p className={`text-sm ${t.subText} max-w-[280px] leading-relaxed`}>
                            {description}
                        </p>
                    </div>

                    {/* Icon Container */}
                    <div className={`
                        p-4 rounded-xl ${t.accent} backdrop-blur-sm border border-white/10
                        group-hover:scale-110 transition-transform duration-500
                    `}>
                        <Icon size={32} className="text-white" strokeWidth={1.5} />
                    </div>
                </div>

                {/* Footer / Stats */}
                <div className="flex items-end justify-between mt-4">
                    <div className="flex items-center gap-6">
                        {stats.map((stat, idx) => (
                            <div key={idx} className="flex flex-col">
                                <span className={`text-xl font-bold ${t.text}`}>{stat.value}</span>
                                <span className={`text-[10px] uppercase font-medium ${t.subText}`}>{stat.label}</span>
                            </div>
                        ))}
                    </div>

                    <button className={`
                        px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg
                        flex items-center gap-2 transition-all duration-300
                        ${t.button} translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100
                    `}>
                        Truy cập ngay <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const SymbiosisOverview = () => {
    const navigate = useNavigate();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
            <OverviewCard
                theme="blue"
                subtitle="Nguồn Mua Vào"
                title="Tài nguyên và chất thải cần mua"
                description="Đăng tin bán phế liệu, phụ phẩm sản xuất. Kết nối trực tiếp với người mua tiềm năng."
                imagePattern="grid"
                icon={ArrowUpRight}
                stats={[
                    { value: '', label: '' },
                    { value: '', label: '' }
                ]}
                onClick={() => navigate('/business/symbiosis/market-sell')}
            />
            <OverviewCard
                theme="green"
                subtitle="Nguồn Bán Ra"
                title="Tài nguyên và chất thải cần bán"
                description="Khám phá hàng ngàn doanh nghiệp đang tìm kiếm đối tác cung cấp tài nguyên."
                imagePattern="circles"
                icon={ArrowDownLeft}
                stats={[
                    { value: '', label: '' },
                    { value: '', label: '' }
                ]}
                onClick={() => navigate('/business/symbiosis/market-buy')}
            />
        </div>
    );
};

export default SymbiosisOverview;
