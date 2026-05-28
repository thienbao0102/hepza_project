import React, { useEffect, useState } from 'react';
import { useHeader } from '@/components/common/Header/HeaderContext';
import { matchesDiacriticsInsensitive } from '@/utils/removeDiacritics';
import toast from '@/utils/toast';
import { mapErrorToNotification } from '@/utils/Error/mapErrorToNotification';
import SearchBox from '@/components/ui/SearchBox';
import ButtonFilter from '@/components/ui/ButtonFilter';
import SymbiosisCard from '@features/industrial-symbiosis/components/SymbiosisCard';
import CompanyContactModal from '@features/industrial-symbiosis/components/CompanyContactModal';
import { getSellRecommendations } from '@/services/businessSysmbiosisService';
import { Search, ArrowUpRight } from 'lucide-react';
import { RefreshButton } from '@/components/ui/Button';

const RecommendationSection = ({ title, items, emptyMessage, emptyDescription, loading, onOpenCompany }) => (
    <section>
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">{title}</h2>
            <span className="text-xs font-semibold text-gray-400">{items.length} kết quả</span>
        </div>

        {items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.map(item => (
                    <SymbiosisCard
                        key={item._id}
                        title={item.wasteName}
                        date={item.expiryDate}
                        description={item.notes}
                        quantity={item.quantity}
                        price={item.price}
                        unit={item.unit}
                        currency={item.currency}
                        type="buy"
                        companyName={item.company?.company_name}
                        isOwner={false}
                        onEdit={null}
                        onDelete={null}
                        onClick={() => onOpenCompany(item)}
                    />
                ))}
            </div>
        ) : (!loading && emptyMessage) && (
            <div className="flex flex-col items-center justify-center py-16 bg-white/50 rounded-2xl border-2 border-dashed border-gray-100 text-gray-400">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <Search size={32} className="opacity-20" />
                </div>
                <p className="font-medium">{emptyMessage}</p>
                {emptyDescription && <p className="text-xs text-gray-400 mt-1">{emptyDescription}</p>}
            </div>
        )}
    </section>
);

const MarketSellPage = () => {
    const { setHeaderConfig, setBreadcrumbItems } = useHeader();
    const [list, setList] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFilters, setSelectedFilters] = useState({});
    // const [isModalOpen, setIsModalOpen] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState(null);
    const [loading, setLoading] = useState(true);

    const filterOptions = {
        unit: ['Tấn', 'kg', 'm3', 'Cái'],
        industrialGrs: ['Chất thải nguy hại', 'Chất thải công nghiệp', 'Khác']
    };

    const fieldLabels = {
        unit: 'Đơn vị tính',
        industrialGrs: 'Phân loại'
    };

    const filteredList = list.filter(item => {
        const matchesSearch = matchesDiacriticsInsensitive(item.wasteName, searchQuery);

        const matchesUnit = !selectedFilters.unit?.length ||
            selectedFilters.unit.includes(item.unit);

        const matchesType = !selectedFilters.industrialGrs?.length ||
            selectedFilters.industrialGrs.includes(item.industrialGrs);

        return matchesSearch && matchesUnit && matchesType;
    });

    const primaryMatches = filteredList.filter(item => !item.matchTier || item.matchTier <= 2);
    const relatedMatches = filteredList.filter(item => item.matchTier === 3);

    // Initial Setup
    useEffect(() => {
        setHeaderConfig({
            title: "Nguồn Mua Vào",
            description: "Kết nối trực tiếp với các doanh nghiệp đang tìm mua tài nguyên bạn cung cấp",
            showWeather: false,
            showDatePicker: false,
        });

        setBreadcrumbItems([
            { key: 'business/cong-sinh-doanh-nghiep', title: 'Cộng sinh' },
            { key: 'market-sell', title: 'Nguồn Mua Vào' }
        ]);

        fetchData();
    }, [setHeaderConfig, setBreadcrumbItems]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getSellRecommendations();
            setList(res || []);
        } catch (error) {
            console.error(error);
            const { title, description } = mapErrorToNotification(error, 'COMMON');
            toast.error(title ?? 'Không thể tải danh sách gợi ý.', description ?? (error.message || ''));
        } finally {
            setLoading(false);
        }
    };

    // const handleAdd = async (data) => {
    //     try {
    //         const newData = await addSellSupply(data);
    //         setList(prev => [newData.data, ...prev]);
    //         toast.success('Đăng tin thành công', 'Nguồn cung của bạn đã được đăng bán.');
    //         setIsModalOpen(false);
    //     } catch (error) {
    //         const { title, description } = mapErrorToNotification(error, 'CREATE_RESOURCE');
    //         toast.error(title ?? 'Không thể đăng tin.', description ?? (error.message || ''));
    //     }
    // };

    // const handleDelete = async (id) => {
    //     try {
    //         await deleteSellSupply(id);
    //         setList(prev => prev.filter(item => item._id !== id));
    //         toast.success('Đã xóa', 'Xóa tin thành công.');
    //     } catch (error) {
    //         const { title, description } = mapErrorToNotification(error, 'COMMON');
    //         toast.error(title ?? 'Không thể xóa.', description ?? (error.message || ''));
    //     }
    // };

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* HERO SECTION - GREEN THEME */}
            <div className="bg-gradient-to-r from-[#4E5BA6] to-[#2E3B86] text-white p-4 sm:p-5 md:p-6 lg:p-8 shadow-lg mb-4 relative overflow-hidden shrink-0 border border-white/10 rounded-2xl">
                <div className="absolute top-0 right-0 hidden sm:block sm:w-36 sm:h-36 md:w-44 md:h-44 bg-white/10 rounded-full -translate-y-12 translate-x-12 blur-3xl"></div>

                <div className="relative z-10 w-full flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-blue-100 text-xs font-bold uppercase tracking-wider mb-2 backdrop-blur-md">
                            <ArrowUpRight size={14} /> Thị trường mua
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-1">Tài Nguyên Và Chất Thải Cần Mua Vào</h1>
                        <p className="text-blue-100 max-w-xl text-sm md:text-base">
                            Nơi các doanh nghiệp tìm kiếm và mua phế liệu, phụ phẩm và tài nguyên dư thừa.
                        </p>
                    </div>

                    {/* <Button
                        type="primary"
                        size="large"
                        icon={<Plus size={18} />}
                        onClick={() => setIsModalOpen(true)}
                        className="bg-white text-[#4E5BA6] hover:!bg-blue-50 hover:!text-[#2e3b86] !border-none h-12 px-6 rounded-xl font-bold shadow-xl"
                    >
                        Đăng Tin Bán
                    </Button> */}
                </div>
            </div>

            {/* CONTENT CONTAINER */}
            <div className="flex-1 w-full px-6 flex flex-col overflow-hidden">

                {/* TOOLBAR */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 shrink-0">
                    <div className="text-sm text-gray-500 font-medium">
                        Tìm thấy <strong>{filteredList.length}</strong> gợi ý thu mua phù hợp
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <RefreshButton onClick={fetchData} loading={loading} />
                        <ButtonFilter
                            onFilter={(filters) => setSelectedFilters(filters)}
                            filterOptions={filterOptions}
                            fieldLabels={fieldLabels}
                            selectedFilters={selectedFilters}
                            setSelectedFilters={setSelectedFilters}
                        />
                        <SearchBox
                            placeholder="Tìm kiếm nhu cầu mua..."
                            onSearch={(val) => setSearchQuery(val)}
                            className="border-gray-200"
                            rootClassName="md:w-96"
                        />
                    </div>
                </div>

                {/* SCROLLABLE GRID */}
                <div className="flex-1 overflow-y-auto pb-10 pr-2 custom-scrollbar space-y-8">
                    <RecommendationSection
                        title="Kết quả phù hợp"
                        items={primaryMatches}
                        emptyMessage={relatedMatches.length > 0 ? 'Chưa có kết quả phù hợp cao.' : 'Chưa tìm thấy cơ hội thu mua nào.'}
                        emptyDescription={relatedMatches.length > 0 ? 'Bạn có thể tham khảo thêm các gợi ý liên quan bên dưới.' : 'Hãy đăng thêm nguồn cung của bạn để hệ thống kết nối đối tác.'}
                        loading={loading}
                        onOpenCompany={(item) => {
                            setSelectedCompany({
                                company_name: item.company?.company_name,
                                zone_name: item.company?.zone_name,
                                zone_id: item.company?.zone_id,
                                phone_number: item.user?.phone_number,
                                attachments: item.attachments,
                                notes: item.notes,
                            });
                            setIsContactModalOpen(true);
                        }}
                    />

                    {relatedMatches.length > 0 && (
                        <RecommendationSection
                            title="Có thể bạn cần"
                            items={relatedMatches}
                            loading={loading}
                            onOpenCompany={(item) => {
                                setSelectedCompany({
                                    company_name: item.company?.company_name,
                                    zone_name: item.company?.zone_name,
                                    zone_id: item.company?.zone_id,
                                    phone_number: item.user?.phone_number,
                                    attachments: item.attachments,
                                    notes: item.notes,
                                });
                                setIsContactModalOpen(true);
                            }}
                        />
                    )}
                </div>
            </div>

            {/* MODAL */}
            {/* <SymbiosisModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                type="sell"
                onSubmit={handleAdd}
            /> */}

            <CompanyContactModal
                open={isContactModalOpen}
                onClose={() => {
                    setIsContactModalOpen(false);
                    setSelectedCompany(null);
                }}
                company={selectedCompany}
                type="buy" // Theme of the card being clicked
            />
        </div>
    );
};

export default MarketSellPage;
