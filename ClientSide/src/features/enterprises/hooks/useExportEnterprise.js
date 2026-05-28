import React, { useState, useEffect } from 'react';
import { Modal } from 'antd';
import { useHeader } from '@/components/common/Header/HeaderContext';
import dayjs from 'dayjs';
import { handlerGetAllCompany } from '@/services/companyService';
import { handlerGetAllZones } from '@/services/zoneService';
import { getExportHistory, deleteExportHistory, initExport, startCompletedExportDownload, updateExportHistoryStatus } from '@/services/exportFileService';
import { exportToExcel } from '../components/ExportHelper/ExportExcel';
import { useAuth } from '@app/providers/auth/AuthProvider';
import { useExportContext } from '@/app/providers/export/ExportProvider';
import toast from '@/utils/toast';
import ExportChoiceModal from '../components/ExportHelper/ExportChoiceModal';
import { isExportExpired, isExportFailed, isExportProcessing } from '../utils/exportStatus';

export const useExportEnterprise = () => {
    const { setHeaderConfig } = useHeader();
    const { user } = useAuth();
    const exportCtx = useExportContext();
    const [selectedTabs, setSelectedTabs] = useState(['all']);

    const [rawData, setRawData] = useState([]);
    const [zones, setZones] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(false);

    // History State
    const [exportHistory, setExportHistory] = useState([]);

    const [selectedFilters, setSelectedFilters] = useState({
        date_range: {
            from: dayjs().startOf('year'),
            to: dayjs()
        },
        exportScope: {
            scope: 'all',
            zone_ids: [],
            company_ids: []
        }
    });

    const showNotification = (type, title, description = '') => {
        toast({ type, title, description });
    };



    // Constant Data
    let tabs = [
        { id: 'all', label: 'Tất cả' },
        { id: 'info', label: 'Thông tin doanh nghiệp' },
        { id: 'resources', label: 'Dữ liệu Tài nguyên' },
        { id: 'waste', label: 'Dữ liệu Chất thải' },
    ];

    if (user?.role === 'company') {
        tabs = tabs.filter(t => t.id !== 'info');
    }

    // --- Side Effects ---

    useEffect(() => {
        setHeaderConfig({
            title: "Xuất dữ liệu",
            description: "Chọn loại dữ liệu cần xuất và tải xuống tệp Excel/CSV theo đúng phạm vi mà bạn lựa chọn",
            showWeather: false,
        });
    }, [setHeaderConfig]);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await handlerGetAllCompany({ page: 1, limit: 10000 });
                if (res && res.companies) {
                    let companiesData = res.companies;

                    // Filter for Manager: only show companies in their zone
                    if (user?.role === 'manager' && user?.zone_id) {
                        companiesData = companiesData.filter(c => c.zone_id === user.zone_id);
                    }

                    const formattedData = companiesData.map((company, i) => ({
                        key: i,
                        company_id: company.company_id || '',
                        name: company.company_name || '',
                        kcn: company.zone_name || '',
                        year: company.founded_year || '',
                        address: company.address || '',
                        group: Array.isArray(company.industry_group_names)
                            ? company.industry_group_names.join(', ')
                            : (Array.isArray(company.industry_group) ? company.industry_group.join(', ') : (company.industry_group || '')),
                        industry: Array.isArray(company.industry_names)
                            ? company.industry_names.join(', ')
                            : (Array.isArray(company.industry) ? company.industry.join(', ') : (company.industry || '')),
                        type: company.company_type || '',
                        employees: company.total_workers || '',
                        website: company.website || '',
                        revenue: company.revenue ? new Intl.NumberFormat('vi-VN').format(company.revenue) : '',
                        market: company.market || '',
                        company_registration_number: company.company_registration_number || '',
                        email: company.email || '',
                        phone: company.phone_number || '',
                        representative: company.representative || '',
                    }));
                    setRawData(formattedData);
                }
            } catch (error) {
                console.error("Failed to fetch companies", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
        fetchHistory(); // Fetch history on mount
    }, [user]);

    // Fetch zones and companies list for Selector
    useEffect(() => {
        const fetchZonesAndCompanies = async () => {
            if (user?.role === 'admin' || user?.role === 'manager') {
                try {
                    const promises = [handlerGetAllCompany({ page: 1, limit: 10000 })];
                    if (user?.role === 'admin') {
                        promises.push(handlerGetAllZones({ limit: 100 }));
                    }

                    const [companiesRes, zonesRes] = await Promise.all(promises);

                    if (user?.role === 'admin' && zonesRes && zonesRes.zones) {
                        setZones(zonesRes.zones);
                    }

                    if (companiesRes && companiesRes.companies) {
                        let companiesList = companiesRes.companies;
                        if (user?.role === 'manager' && user?.zone_id) {
                            companiesList = companiesList.filter(c => c.zone_id === user.zone_id);
                        }
                        setCompanies(companiesList);
                    }
                } catch (error) {
                    console.error("Error fetching data:", error);
                }
            }
        };
        fetchZonesAndCompanies();
    }, [user]);

    const fetchHistory = async () => {
        try {
            const history = await getExportHistory();
            let filteredHistory = history;
            if (user?.role === 'company' && user?.company_id) {
                filteredHistory = history.filter(item =>
                    item.company_ids && item.company_ids.includes(user.company_id)
                );
            }
            setExportHistory(filteredHistory);
        } catch (error) {
            console.error("Failed to fetch export history", error);
        }
    };

    useEffect(() => {
        if (user) fetchHistory();
    }, [user]);


    // --- Handlers ---

    const handleTabClick = (id) => {
        if (id === 'all') {
            setSelectedTabs(['all']);
        } else if (id === 'info') {
            if (selectedTabs.includes('info') && selectedTabs.length === 1) {
                setSelectedTabs(['all']);
            } else {
                setSelectedTabs(['info']);
            }
        } else {
            let newTabs = [...selectedTabs];
            if (newTabs.includes('all') || newTabs.includes('info')) {
                newTabs = [];
            }
            if (newTabs.includes(id)) {
                newTabs = newTabs.filter(t => t !== id);
            } else {
                newTabs.push(id);
            }
            if (newTabs.length === 0) newTabs = ['all'];
            setSelectedTabs(newTabs);
        }
    };

    const processExportInfo = async () => {
        const periodKeyStart = Number(selectedFilters.date_range.from.format('YYYYMM'));
        const periodKeyEnd = Number(selectedFilters.date_range.to.format('YYYYMM'));

        // Filter rawData by export scope
        let dataToExport = [...rawData];
        let option = 3;
        let zoneIdToExport = undefined;
        let companyIdsToExport = [];

        const scope = selectedFilters.exportScope?.scope || 'all';

        if (scope === 'zone') {
            const selectedZoneIds = selectedFilters.exportScope?.zone_ids || [];
            if (selectedZoneIds.length > 0) {
                const companyIdsInZones = companies
                    .filter(c => selectedZoneIds.includes(c.zone_id))
                    .map(c => c.company_id || c._id);
                dataToExport = rawData.filter(item => companyIdsInZones.includes(item.company_id));

                if (selectedZoneIds.length === 1) {
                    option = 2;
                    zoneIdToExport = selectedZoneIds[0];
                } else {
                    option = 1;
                    companyIdsToExport = companyIdsInZones;
                }
            }
        } else if (scope === 'specific') {
            const selectedCompanyIds = selectedFilters.exportScope?.company_ids || [];
            if (selectedCompanyIds.length > 0) {
                dataToExport = rawData.filter(item => selectedCompanyIds.includes(item.company_id));
                option = 1;
                companyIdsToExport = selectedCompanyIds;
            }
        }

        if (dataToExport.length === 0) {
            showNotification('warning', 'Không có dữ liệu', 'Không tìm thấy doanh nghiệp nào trong phạm vi đã chọn.');
            setLoading(false);
            return;
        }

        // Delegate to background export context
        setLoading(false);
        exportCtx.startExportInfo({
            periodKeyStart, periodKeyEnd,
            dataToExport, option, zoneIdToExport, companyIdsToExport,
            onHistoryUpdate: fetchHistory
        });
    };

    const processExportData = async (overrideTabs = null) => {
        let includeCodes = [];
        const tabsToCheck = overrideTabs || selectedTabs;

        if (tabsToCheck.includes('all')) {
            includeCodes = [2, 3];
        } else {
            if (tabsToCheck.includes('resources')) includeCodes.push(2);
            if (tabsToCheck.includes('waste')) includeCodes.push(3);
        }
        includeCodes = [...new Set(includeCodes)];

        if (includeCodes.length === 0) {
            setLoading(false);
            return;
        }

        let option = 1;
        let zoneIdToExport = undefined;
        let companyIdsToExport = [];

        if (selectedFilters.exportScope?.scope === 'all') {
            option = 3;
        } else if (selectedFilters.exportScope?.scope === 'zone') {
            const selectedZoneIds = selectedFilters.exportScope?.zone_ids || [];
            if (selectedZoneIds.length === 1) {
                option = 2;
                zoneIdToExport = selectedZoneIds[0];
            } else if (selectedZoneIds.length > 1) {
                const companiesInZones = companies.filter(c => selectedZoneIds.includes(c.zone_id));
                companyIdsToExport = companiesInZones.map(c => c.company_id || c._id);
                option = 1;
            }
        } else if (selectedFilters.exportScope?.scope === 'specific') {
            option = 1;
            companyIdsToExport = selectedFilters.exportScope?.company_ids || [];
        } else {
            option = 3;
        }

        if (option === 1 && (!companyIdsToExport || companyIdsToExport.length === 0)) {
            showNotification('warning', 'Chưa có dữ liệu', 'Không tìm thấy doanh nghiệp nào trong phạm vi đã chọn.');
            setLoading(false);
            return;
        }

        // Delegate to background export context
        setLoading(false);
        exportCtx.startExportData({
            periodKeyStart: Number(selectedFilters.date_range.from.format('YYYYMM')),
            periodKeyEnd: Number(selectedFilters.date_range.to.format('YYYYMM')),
            includeCodes, option, zoneIdToExport, companyIdsToExport,
            isZoneScope: selectedFilters.exportScope?.scope === 'zone',
            onHistoryUpdate: fetchHistory
        });
    };

    const handleExport = async () => {
        if (!rawData || rawData.length === 0) return;

        if (selectedTabs.includes('all')) {
            if (user?.role === 'company') {
                setLoading(true);
                processExportData(['all']);
                return;
            }

            const modal = Modal.confirm({
                title: null,
                icon: null,
                content: React.createElement(ExportChoiceModal, {
                    onSelectData: () => {
                        setLoading(true);
                        processExportData(['all']);
                        modal.destroy();
                    },
                    onSelectInfo: () => {
                        setLoading(true);
                        processExportInfo();
                        modal.destroy();
                    },
                    onCancel: () => modal.destroy()
                }),
                footer: null,
                closable: true,
                centered: true,
                width: 480,
                className: 'premium-export-modal'
            });
            return;
        }

        setLoading(true);
        if (selectedTabs.includes('info')) {
            processExportInfo();
        } else {
            processExportData();
        }
    };

    const handleDownloadHistory = async (historyItem) => {
        if (!historyItem?.export_id) return;

        if (isExportProcessing(historyItem.status)) {
            showNotification('warning', 'File đang được xử lý', 'Vui lòng chờ export hoàn tất rồi tải lại.');
            return;
        }

        if (isExportFailed(historyItem.status)) {
            showNotification('error', 'Xuất dữ liệu thất bại', historyItem.error_message || 'Vui lòng xuất lại dữ liệu.');
            return;
        }

        if (isExportExpired(historyItem.status)) {
            showNotification('warning', 'File đã hết hạn', 'File đã được dọn dẹp, vui lòng xuất lại dữ liệu.');
            return;
        }

        setLoading(true);
        try {
            const { resource_types, export_id, option } = historyItem;

            if (resource_types.includes(0)) {
                const { blob, fileName } = await exportToExcel(rawData);
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                await updateExportHistoryStatus(export_id, 'thành công', rawData.length);
                showNotification('success', 'Tải xuống thành công', 'Đã tải thông tin doanh nghiệp.');
                await fetchHistory();
                return;
            }

            startCompletedExportDownload(export_id, historyItem.name || `Export_${export_id}.xlsx`);
            showNotification('success', 'Đã bắt đầu tải xuống', 'File đang được tải bởi trình duyệt.');
            await fetchHistory();
        } catch (error) {
            const statusCode = error?.response?.status || error?.status || error?.statusCode;
            if (statusCode === 410) {
                showNotification('warning', 'File đã hết hạn', 'File đã được dọn dẹp, vui lòng xuất lại dữ liệu.');
                await fetchHistory();
                return;
            }
            if (statusCode === 202) {
                showNotification('warning', 'File đang được xử lý', 'Vui lòng chờ export hoàn tất rồi tải lại.');
                await fetchHistory();
                return;
            }

            console.error("Download history failed", error);
            showNotification('error', 'Tải xuống thất bại', error.message || 'Không thể tải file.');
            await fetchHistory();
        } finally {
            setLoading(false);
        }
    };

    const handleReExport = async (historyItem) => {
        if (!historyItem?.resource_types || historyItem.resource_types.length === 0) {
            toast.warning('Dữ liệu không hợp lệ', 'Thông tin loại dữ liệu không hợp lệ để xuất lại.');
            return;
        }

        const resourceTypes = historyItem.resource_types.map(Number);
        const includeCodes = resourceTypes.filter(code => code === 2 || code === 3);
        const hasInfoExport = resourceTypes.includes(0) || resourceTypes.includes(1);
        if (includeCodes.length === 0 || hasInfoExport) {
            toast.warning('Chưa hỗ trợ xuất lại', 'Vui lòng tạo export mới cho thông tin doanh nghiệp.');
            return;
        }

        exportCtx.startExportData({
            periodKeyStart: historyItem.periodKeyStart,
            periodKeyEnd: historyItem.periodKeyEnd,
            includeCodes,
            option: historyItem.option || 1,
            zoneIdToExport: historyItem.zone_id,
            companyIdsToExport: historyItem.company_ids || [],
            isZoneScope: Number(historyItem.option) === 2,
            onHistoryUpdate: fetchHistory
        });
    };

    const handleDeleteHistory = async (id) => {
        try {
            await deleteExportHistory(id);
            setExportHistory(prev => prev.filter(item => item.export_id !== id && item.id !== id));
            showNotification('success', 'Xóa thành công', 'Đã xóa lịch sử xuất file.');
        } catch (error) {
            console.error("Delete history failed", error);
            showNotification('error', 'Xóa thất bại', error.message || "Lỗi không xác định");
        }
    };

    const handleBulkDeleteHistory = async (ids) => {
        if (!ids || ids.length === 0) return;
        try {
            await Promise.all(ids.map(id => deleteExportHistory(id)));
            setExportHistory(prev => prev.filter(item => !ids.includes(item.export_id) && !ids.includes(item.id)));
            showNotification('success', 'Xóa thành công', `Đã xóa ${ids.length} mục lịch sử xuất file.`);
        } catch (error) {
            console.error("Bulk delete history failed", error);
            showNotification('error', 'Xóa thất bại', error.message || "Lỗi không xác định");
        }
    };

    return {
        selectedTabs,
        loading,
        selectedFilters,
        setSelectedFilters,
        exportHistory,
        tabs,
        handleTabClick,
        handleExport,
        handleDeleteHistory,
        handleBulkDeleteHistory,
        handleDownloadHistory,
        handleReExport,

        user,
        zones,
        companies
    };
};
