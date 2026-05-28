import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@app/providers/auth/AuthProvider';
import { useRegulation } from '@features/regulation/hooks/useRegulation';
import { Modal, Form, Input, DatePicker, Select } from 'antd';
import dayjs from 'dayjs';
import Notification from '@components/common/Notifications';
import { mapErrorToNotification } from '@/utils/Error/mapErrorToNotification';
import DecreeCard from '@features/regulation/components/DecreeCard';
import ButtonFilter from '@components/ui/ButtonFilter';
import SearchBox from '@components/ui/SearchBox';
import { AddButton } from '@components/ui/Button';
import LoadingSpinner from '@components/ui/LoadingSpinner';
import { createPortal } from 'react-dom';

const RegulationManager = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const navigate = useNavigate();
    const [searchText, setSearchText] = useState('');
    const [filters, setFilters] = useState({ group: [], tags: [], date_range: null });
    const [notification, setNotification] = useState({ open: false, type: 'success', title: '', description: '' });
    const [portalTarget, setPortalTarget] = useState(null);

    useEffect(() => {
        setPortalTarget(document.getElementById('regulation-toolbar-portal'));
    }, []);

    const {
        regulations,
        loading,
        error,
        fetchRegulations,
        removeRegulation
    } = useRegulation();

    useEffect(() => {
        fetchRegulations();
    }, [fetchRegulations]);

    const showSuccess = (msg) => {
        setNotification({ open: true, type: 'success', title: 'Thành công', description: msg });
    };

    // Updated to use navigation
    const handleAdd = () => {
        navigate('/admin/regulations/create');
    };

    const handleEdit = (regulation) => {
        navigate(`/admin/regulations/${regulation.id}/edit`);
    };

    const handleDelete = async (id) => {
        const result = await removeRegulation(id);
        if (result.success) {
            showSuccess("Đã xóa nghị định");
        }
    };

    const handleSearch = (query) => {
        setSearchText(query.toLowerCase());
    };

    const handleFilter = (selectedFilters) => {
        setFilters(selectedFilters);
    };

    const uniqueTags = useMemo(() => {
        const tags = new Set();
        regulations.forEach(reg => {
            if (Array.isArray(reg.tags)) {
                reg.tags.forEach(tag => tags.add(tag));
            } else if (reg.mockTags && Array.isArray(reg.mockTags)) {
                reg.mockTags.forEach(tag => tags.add(tag));
            }
        });
        return Array.from(tags).sort();
    }, [regulations]);

    const filterOptions = useMemo(() => {
        return {
            group: ["Nghị Định", "Thông Tư", "Quyết Định Và Chỉ Thị", "Khác"],
            tags: uniqueTags,
            date_range: {},
        };
    }, [uniqueTags]);

    const fieldLabels = {
        group: 'Loại văn bản',
        tags: 'Tags (Thẻ)',
        date_range: 'Khoảng thời gian',
    };

    const filteredDecrees = useMemo(() => {
        return regulations.filter(decree => {
            const normalizedSearch = searchText.trim().toLowerCase();
            const matchesSearch = !normalizedSearch ||
                (decree.title || '').toLowerCase().includes(normalizedSearch) ||
                (decree.summary || '').toLowerCase().includes(normalizedSearch);

            const decreeGroup = decree.group_regulation || decree.group || 'Khác';
            const matchesGroup = !filters.group?.length || filters.group.includes(decreeGroup);

            const matchesTags = !filters.tags?.length ||
                (decree.tags || []).some(tag => filters.tags.includes(tag)) ||
                (decree.mockTags || []).some(tag => filters.tags.includes(tag));

            // Date range filter on effectiveDate
            let matchesDate = true;
            if (filters.date_range?.from && filters.date_range?.to && decree.effectiveDate) {
                const effectiveDate = dayjs(decree.effectiveDate);
                const from = dayjs(filters.date_range.from).startOf('day');
                const to = dayjs(filters.date_range.to).endOf('day');
                matchesDate = effectiveDate.isValid() &&
                    (effectiveDate.isAfter(from) || effectiveDate.isSame(from, 'day')) &&
                    (effectiveDate.isBefore(to) || effectiveDate.isSame(to, 'day'));
            }

            return matchesSearch && matchesGroup && matchesTags && matchesDate;
        });
    }, [searchText, regulations, filters]);

    return (
        <div className="space-y-[18px]">
            <Notification
                open={notification.open}
                type={notification.type}
                title={notification.title}
                description={notification.description}
                onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
            />
            {/* Toolbar */}
            {portalTarget ? createPortal(
                <>
                    <ButtonFilter
                        onFilter={handleFilter}
                        filterOptions={filterOptions}
                        fieldLabels={fieldLabels}
                        selectedFilters={filters}
                        setSelectedFilters={setFilters}
                    />
                    <div className="w-full h-full max-w-xs">
                        <SearchBox
                            placeholder="Tìm kiếm nghị định..."
                            onSearch={handleSearch}
                        />
                    </div>
                    {isAdmin && (
                        <AddButton
                            text="Thêm nghị định"
                            onClick={handleAdd}
                        />
                    )}
                </>,
                portalTarget
            ) : (
                <div className="flex flex-1 h-9 gap-2 justify-end items-center min-w-0">
                    <ButtonFilter
                        onFilter={handleFilter}
                        filterOptions={filterOptions}
                        fieldLabels={fieldLabels}
                        selectedFilters={filters}
                        setSelectedFilters={setFilters}
                    />
                    <div className="w-full h-full max-w-xs">
                        <SearchBox
                            placeholder="Tìm kiếm nghị định..."
                            onSearch={handleSearch}
                        />
                    </div>
                    {isAdmin && (
                        <AddButton
                            text="Thêm nghị định"
                            onClick={handleAdd}
                        />
                    )}
                </div>
            )}

            {/* List */}
            {loading ? (
                <LoadingSpinner />
            ) : filteredDecrees.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-1">
                    {filteredDecrees.map(decree => (
                        <DecreeCard
                            key={decree.id}
                            decree={decree}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            canEdit={isAdmin}
                        />
                    ))}
                </div>
            ) : (
                <div className="py-20 text-sm text-slate-500 w-full flex items-center justify-center">
                    Không có nghị định nào phù hợp.
                </div>
            )}
        </div>
    );
};

export default RegulationManager;
