import React from 'react';
import {
    DeleteSelectedButton,
    AddButton,
} from '@features/solutions/ui/Button';
import SearchBox from '@features/solutions/ui/SearchBox';
import ButtonFilter from '@features/solutions/ui/ButtonFilter';

const SolutionActionBar = ({
    selectedCount,
    onDeleteSelected,
    onFilter,
    filterOptions,
    fieldLabels,
    onSearch,
    onAdd,
}) => {

    return (
        <div className="flex flex-wrap gap-2 justify-between items-center my-4 w-full">
            <div className="flex items-center">
                {selectedCount > 0 ? (
                    <DeleteSelectedButton
                        selectedCount={selectedCount}
                        onClick={onDeleteSelected}
                    />
                ) : null}
            </div>
            <div className="flex flex-1 gap-2 justify-end items-center min-w-0">
                {/* <ButtonFilter onFilter={onFilter} filterOptions={filterOptions} fieldLabels={fieldLabels} /> */}
                <div className="w-full max-w-xs">
                    <SearchBox placeholder="Tìm kiếm..." onSearch={onSearch} />
                </div>
                <AddButton onClick={onAdd} text="Thêm giải pháp mới" />
            </div>
        </div>
    );
};

export default SolutionActionBar;
