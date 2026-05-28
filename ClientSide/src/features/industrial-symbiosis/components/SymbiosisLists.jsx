import React from 'react';
import SymbiosisCard from './SymbiosisCard';
import AddSymbiosisCard from './AddSymbiosisCard';

const SymbiosisLists = ({ buyList, sellList, onAddBuy, onAddSell, onDelete, onEdit, selectedFilters = {}, searchQuery = "" }) => {
    const isSearching = searchQuery.length > 0;
    const isFiltering = Object.keys(selectedFilters).some(key => {
        if (key === 'type') return false; // Handled separately
        if (key === 'date_range') return selectedFilters[key]?.from;
        if (key === 'price_range') return selectedFilters[key]?.length === 2;
        return selectedFilters[key]?.length > 0;
    });

    const hasActiveSearchOrFilter = isSearching || isFiltering;

    const showBuy = (!selectedFilters.type?.length || selectedFilters.type.includes('buy')) &&
        (!hasActiveSearchOrFilter || buyList.length > 0);
    const showSell = (!selectedFilters.type?.length || selectedFilters.type.includes('sell')) &&
        (!hasActiveSearchOrFilter || sellList.length > 0);

    return (
        <div className="space-y-8 pb-10">
            {/* Buying Section */}
            {showBuy && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <h4 className="text-lg font-bold text-gray-800">Cần mua vào</h4>
                        <span className="text-sm font-medium text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded-full">
                            {buyList.length}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-6 min-h-[140px]">
                        {buyList.map((item) => (
                            <div key={item._id} className="w-full sm:w-[calc(50%-12px)] md:w-[calc(33.33%-16px)] lg:w-[calc(25%-18px)] xl:w-[calc(20%-19.2px)]">
                                <SymbiosisCard
                                    title={item.wasteName}
                                    date={item.expiryDate}
                                    description={item.notes}
                                    quantity={item.quantity}
                                    price={item.price}
                                    unit={item.unit}
                                    currency={item.currency}
                                    attachments={item.attachments}
                                    type="buy"
                                    isOwner={true}
                                    onDelete={() => onDelete(item._id, 'buy')}
                                    onEdit={() => onEdit(item, 'buy')}
                                />
                            </div>
                        ))}
                        <AddSymbiosisCard onClick={onAddBuy} label="Đăng tin mua mới" />
                    </div>
                </section>
            )}

            {/* Selling Section */}
            {showSell && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <h4 className="text-lg font-bold text-gray-800">Cần bán ra</h4>
                        <span className="text-sm font-medium text-gray-500 ml-2 bg-gray-100 px-2 py-0.5 rounded-full">
                            {sellList.length}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-6 min-h-[140px]">
                        {sellList.map((item) => (
                            <div key={item._id} className="w-full sm:w-[calc(50%-12px)] md:w-[calc(33.33%-16px)] lg:w-[calc(25%-18px)] xl:w-[calc(20%-19.2px)]">
                                <SymbiosisCard
                                    title={item.wasteName}
                                    date={item.expiryDate}
                                    description={item.notes}
                                    quantity={item.quantity}
                                    price={item.price}
                                    currency={item.currency}
                                    unit={item.unit}
                                    attachments={item.attachments}
                                    type="sell"
                                    isOwner={true}
                                    onDelete={() => onDelete(item._id, 'sell')}
                                    onEdit={() => onEdit(item, 'sell')}
                                />
                            </div>
                        ))}
                        <AddSymbiosisCard onClick={onAddSell} label="Đăng tin bán mới" />
                    </div>
                </section>
            )}
        </div>
    );
};

export default SymbiosisLists;
