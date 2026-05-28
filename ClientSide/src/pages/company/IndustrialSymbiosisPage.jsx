import React, { useEffect, useState, useMemo } from 'react';
import dayjs from 'dayjs';
import { useHeader } from '@/components/common/Header/HeaderContext';
import toast from '@/utils/toast';
import SearchBox from '@/components/ui/SearchBox';
import ButtonFilter from '@/components/ui/ButtonFilter';
import SymbiosisOverview from '@features/industrial-symbiosis/components/SymbiosisOverview';
import SymbiosisLists from '@features/industrial-symbiosis/components/SymbiosisLists';
import SymbiosisModal from '@features/industrial-symbiosis/components/SymbiosisModal';
import { addBuyDemand, addSellSupply, getBuyDemands, getSellSupplies, deleteBuyDemand, deleteSellSupply, updateBuyDemand, updateSellSupply } from '@/services/businessSysmbiosisService';
import { matchesDiacriticsInsensitive } from '@/utils/removeDiacritics';

const IndustrialSymbiosisPage = () => {
    const { setHeaderConfig, setBreadcrumbItems } = useHeader();
    const [selectedFilters, setSelectedFilters] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState('buy'); // 'buy' or 'sell'
    const [editingItem, setEditingItem] = useState(null);
    const [buyList, setBuyList] = useState([]);
    const [sellList, setSellList] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    // Advanced filter options
    const filterOptions = {
        date_range: [], // Handled specifically by DateRangeSelect
        type: ['buy', 'sell'],
        price_range: [], // Handled specifically by PriceRangeSlider
        min_quantity: ['0', '100', '500', '1000']
    };

    const fieldLabels = {
        date_range: 'Thời gian hết hạn',
        type: 'Loại tin đăng',
        price_range: 'Khoảng giá',
        min_quantity: 'Số lượng tối thiểu'
    };

    const optionLabels = {
        type: { buy: 'Tin cần mua', sell: 'Tin cần bán' },
        min_quantity: {
            '0': 'Tất cả',
            '100': 'Từ 100 trở lên',
            '500': 'Từ 500 trở lên',
            '1000': 'Từ 1000 trở lên'
        }
    };

    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setHeaderConfig({
            title: "Cộng sinh doanh nghiệp",
            description: "Quản lý hoạt động cộng sinh doanh nghiệp",
            showWeather: false,
            showDatePicker: false,
        });
        setBreadcrumbItems([
            {
                key: 'cong-sinh-doanh-nghiep',
                title: 'Cộng sinh doanh nghiệp'
            }
        ]);
        //getBuyDemands
        const init = async () => {
            try {
                const [buyRes, sellRes] = await Promise.all([
                    getBuyDemands(),
                    getSellSupplies()
                ]);
                setBuyList(buyRes);
                setSellList(sellRes);
            } catch (error) {
                console.error("Failed to fetch lists", error);
                toast.error('Lỗi tải dữ liệu', 'Không thể tải danh sách tài nguyên.');
            }
        };
        init();
    }, [setHeaderConfig, setBreadcrumbItems]);

    const handleSearch = (query) => {
        setSearchQuery(query);
    };

    const handleFilter = (filters) => {
        // Handled by selectedFilters state being passed to ButtonFilter
        // but we can log for transparency
        console.log("Applying filters:", filters);
    };

    // --- FILTERING LOGIC ---
    const applyFilters = (list, isBuy) => {
        return list.filter(item => {
            // Search Match (Name, Other Names, Notes) - diacritics-insensitive
            if (searchQuery) {
                const matchesSearch =
                    matchesDiacriticsInsensitive(item.wasteName, searchQuery) ||
                    matchesDiacriticsInsensitive(item.otherWasteName, searchQuery) ||
                    matchesDiacriticsInsensitive(item.notes, searchQuery);
                if (!matchesSearch) return false;
            }

            // Type Match (Is the list visible at all?)
            if (selectedFilters.type?.length > 0) {
                const requestedTypes = selectedFilters.type;
                const isBuyVisible = requestedTypes.includes('buy');
                const isSellVisible = requestedTypes.includes('sell');
                if (isBuy && !isBuyVisible) return false;
                if (!isBuy && !isSellVisible) return false;
            }

            // Date Range Match
            if (selectedFilters.date_range?.from && selectedFilters.date_range?.to) {
                if (!item.expiryDate) return false;
                const itemDate = dayjs(item.expiryDate);
                const fromDate = dayjs(selectedFilters.date_range.from).startOf('day');
                const toDate = dayjs(selectedFilters.date_range.to).endOf('day');
                if (itemDate.isBefore(fromDate) || itemDate.isAfter(toDate)) return false;
            }

            // Price Range Match (Numeric Slider)
            if (selectedFilters.price_range?.length === 2) {
                const price = parseFloat(item.price) || 0;
                const [minPrice, maxPrice] = selectedFilters.price_range;
                if (price < minPrice || price > maxPrice) return false;
            }

            // Quantity Match
            if (selectedFilters.min_quantity?.length > 0) {
                const qty = parseFloat(item.quantity) || 0;
                const minReq = Math.min(...selectedFilters.min_quantity.map(v => parseFloat(v)));
                if (qty < minReq) return false;
            }

            return true;
        });
    };

    const filteredBuyList = useMemo(() => applyFilters(buyList, true), [buyList, selectedFilters, searchQuery]);
    const filteredSellList = useMemo(() => applyFilters(sellList, false), [sellList, selectedFilters, searchQuery]);

    const handleAddBuy = () => {
        setModalType('buy');
        setIsModalOpen(true);
    };

    const handleAddSell = () => {
        setModalType('sell');
        setIsModalOpen(true);
    };

    const handleSubmitSymbiosis = async (data, files) => {
        setSubmitting(true);
        try {
            if (editingItem) {
                if (data.type === 'buy') {
                    const updatedData = await updateBuyDemand(editingItem._id, data, files);
                    setBuyList((prev) => prev.map(item => item._id === editingItem._id ? updatedData : item));
                    toast.success('Đã cập nhật', 'Cập nhật nhu cầu mua thành công.');
                } else {
                    const updatedData = await updateSellSupply(editingItem._id, data, files);
                    setSellList((prev) => prev.map(item => item._id === editingItem._id ? updatedData : item));
                    toast.success('Đã cập nhật', 'Cập nhật nguồn cung bán thành công.');
                }
            } else {
                if (data.type === 'buy') {
                    const newData = await addBuyDemand(data, files);
                    setBuyList((prev) => [newData.data || newData, ...prev]);
                    toast.success('Thành công', 'Đã thêm nhu cầu mua mới.');
                } else {
                    const newData = await addSellSupply(data, files);
                    setSellList((prev) => [newData.data || newData, ...prev]);
                    toast.success('Thành công', 'Đã thêm nguồn cung bán mới.');
                }
            }
            setIsModalOpen(false);
            setEditingItem(null);
        } catch (error) {
            console.error('Submit failed:', error);
            const normalizedMessage = String(error?.message || '').toLowerCase();
            const isVersionConflict =
                error?.status === 409 ||
                error?.code === 'VERSION_CONFLICT' ||
                error?.code === 'STATE_CONFLICT' ||
                normalizedMessage.includes('phiên bản dữ liệu') ||
                normalizedMessage.includes('dữ liệu đã bị thay đổi') ||
                normalizedMessage.includes('thay đổi trạng thái');

            if (isVersionConflict) {
                toast.error('Dữ liệu đã thay đổi', 'Bản ghi này vừa được người khác cập nhật. Vui lòng tải lại dữ liệu rồi thử lại.');
            } else {
                toast.error('Thất bại', error?.message || 'Có lỗi xảy ra khi lưu dữ liệu.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id, type) => {
        try {
            if (type === 'buy') {
                await deleteBuyDemand(id);
                setBuyList((prev) => prev.filter(item => item._id !== id));
            } else {
                await deleteSellSupply(id);
                setSellList((prev) => prev.filter(item => item._id !== id));
            }
            toast.success('Đã xóa', 'Xóa mục thành công.');
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('Lỗi xóa', 'Không thể xóa mục này.');
        }
    };

    const handleEdit = (data, type) => {
        setEditingItem(data);
        setModalType(type);
        setIsModalOpen(true);
    };

    return (
        <div className="h-full flex flex-col">
            {/* --- HEADER TOOLBAR --- */}
            <div className="flex items-center justify-end px-6">
                <div className="flex items-center gap-3">
                    <ButtonFilter
                        onFilter={handleFilter}
                        filterOptions={filterOptions}
                        fieldLabels={fieldLabels}
                        optionLabels={optionLabels}
                        selectedFilters={selectedFilters}
                        setSelectedFilters={setSelectedFilters}
                    />
                    <SearchBox
                        placeholder="Tìm kiếm..."
                        onSearch={handleSearch}
                        rootClassName="!w-[400px]"
                    />
                </div>
            </div>

            {/* --- CONTENT --- */}
            <div className="flex-1 overflow-auto bg-gray-50/50">
                <div className="mb-3">
                    <h3 className="text-xl font-semibold text-gray-900">
                        Quản lý tài nguyên và chất thải tại doanh nghiệp của bạn
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                        Kết nối các doanh nghiệp để trao đổi tài nguyên, chất thải và phụ phẩm, hướng tới mô hình kinh tế tuần hoàn.
                    </p>
                </div>

                <SymbiosisLists
                    buyList={filteredBuyList}
                    sellList={filteredSellList}
                    onAddBuy={handleAddBuy}
                    onAddSell={handleAddSell}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    selectedFilters={selectedFilters}
                    searchQuery={searchQuery}
                />

                <SymbiosisOverview />

                <SymbiosisModal
                    open={isModalOpen}
                    onClose={() => {
                        if (!submitting) {
                            setIsModalOpen(false);
                            setEditingItem(null);
                        }
                    }}
                    type={modalType}
                    initialData={editingItem}
                    onSubmit={handleSubmitSymbiosis}
                    loading={submitting}
                />
            </div>
        </div>
    );
};

export default IndustrialSymbiosisPage;
