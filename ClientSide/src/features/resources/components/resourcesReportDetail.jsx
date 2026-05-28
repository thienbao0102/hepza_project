import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
    Edit, ChevronDown, MoreHorizontal, History, Container,
    HousePlug, Droplet, Trash, Atom, FlameKindling, X
} from 'lucide-react';
import { AnimatePresence } from "framer-motion";
import toast from '@/utils/toast';
import { uploadBillImage, uploadWasteAttachments } from '@services/resoureceAndWasteService';

import { useHeader } from '@/components/common/Header/HeaderContext';
import { useResourceReportLogic } from '@/features/resources/hooks/useResourceReportLogic';

import ReportSectionTable from './ReportSectionTable';
import InputGroup from './InputGroup';
import BillImageUpload from '@/components/common/BillImageUpload';
import { PlusButton } from './ui/ActionButtons';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const normalizeText = (value) =>
    (value ?? '')
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const isHazardWasteGroup = (groupValue) => {
    const normalized = normalizeText(groupValue);
    return normalized === 'ha' || normalized.includes('nguy hai');
};

const ResourceReportDetailPage = () => {
    const { reportId } = useParams();
    const location = useLocation();

    // --- USE CUSTOM HOOK ---
    const {
        report,
        loading,
        error,
        isEditing,
        setIsEditing,
        newRows,
        showConfirmModal,
        setShowConfirmModal,
        isSaving,
        getResourceOptions,
        handlers,
        isCompany
    } = useResourceReportLogic(reportId, location.state || {});

    const [pendingBillFiles, setPendingBillFiles] = useState({});
    const [pendingWasteFiles, setPendingWasteFiles] = useState({}); // { [rowId]: [{file, previewUrl},...] }

    // Map display group names to backend sub_group codes for matching
    const groupToSubGroupCode = {
        'Điện lưới': 'Grid',
        // 'nước giếng': 'well',
        // 'Nước Giếng': 'well',
        'Nước cấp': 'tap',
        'Nước Cấp': 'tap',
        'Nước cấp (Thủy cục)': 'tap',
    };

    // Store file locally with metadata — no immediate upload
    const handleBillFileSelect = (rowId, file, rowGroup) => {
        setPendingBillFiles(prev => {
            const next = { ...prev };
            if (file) {
                next[rowId] = { file, group: rowGroup };
            } else {
                delete next[rowId];
            }
            return next;
        });
    };

    // Store waste files locally — upload after data save
    const handleWasteFileSelect = (rowId, filesData) => {
        setPendingWasteFiles(prev => ({
            ...prev,
            [rowId]: filesData
        }));
    };

    // Save data first, then upload pending bill images + waste attachments
    const handleSaveWithBill = async () => {
        setShowConfirmModal(false);

        const pendingBillEntries = Object.entries(pendingBillFiles);
        const pendingWasteEntries = Object.entries(pendingWasteFiles).filter(([, files]) => files?.length > 0);
        const hasPendingUploads = pendingBillEntries.length > 0 || pendingWasteEntries.length > 0;

        // If we have pending uploads, suppress the save toast — we'll show a combined one
        const saveResult = await handlers.handleSave(hasPendingUploads ? { silent: true } : {});
        if (!saveResult?.isSuccess) return;

        if (!hasPendingUploads) return; // No uploads needed, handleSave already showed toast

        const createdFuelIds = saveResult.createdFuelIds || [];
        const createdWasteIds = saveResult.createdWasteIds || [];
        const createdWasteIdByRowId = new Map(
            createdWasteIds
                .filter(entry => entry?.clientRowId)
                .map(entry => [entry.clientRowId, entry._id])
        );

        let uploadErrors = 0;

        // 1. Upload bill images (electricity/water)
        for (const [rowId, entry] of pendingBillEntries) {
            try {
                let resolvedId = rowId;

                // For new rows (temp IDs), resolve to real MongoDB _id from createdFuelIds
                if (rowId.startsWith('new-') && createdFuelIds.length > 0) {
                    const subGroupCode = groupToSubGroupCode[entry.group];
                    const match = createdFuelIds.find(f => f.sub_group === subGroupCode);
                    if (match) {
                        resolvedId = match._id;
                    } else {
                        console.warn(`[BillUpload] No matching createdFuelId for group="${entry.group}" (sub_group="${subGroupCode}")`);
                        uploadErrors++;
                        continue;
                    }
                }

                await uploadBillImage(resolvedId, entry.file);
            } catch (err) {
                uploadErrors++;
                console.error(`Bill upload failed for ${rowId}:`, err);
            }
        }

        // 2. Upload waste attachments
        for (const [rowId, filesData] of pendingWasteEntries) {
            try {
                let resolvedId = rowId;

                // For new rows, resolve via createdWasteIds
                if (rowId.startsWith('new-')) {
                    const matchId = createdWasteIdByRowId.get(rowId);
                    if (matchId) {
                        resolvedId = matchId;
                    } else {
                        console.warn(`[WasteUpload] No matching createdWasteId for rowId="${rowId}"`);
                        uploadErrors++;
                        continue;
                    }
                }

                const rawFiles = filesData.map(f => f.file || f).filter(Boolean);
                if (rawFiles.length > 0) {
                    await uploadWasteAttachments(resolvedId, rawFiles);
                }
            } catch (err) {
                uploadErrors++;
                console.error(`Waste attachment upload failed for ${rowId}:`, err);
            }
        }

        if (uploadErrors > 0) {
            toast.warning('Cảnh báo', `Dữ liệu đã lưu nhưng ${uploadErrors} mục upload thất bại.`);
        } else {
            toast.success('Thành công', 'Dữ liệu và tệp đính kèm đã được lưu thành công.');
        }
        setPendingBillFiles({});
        setPendingWasteFiles({});

        // Tự động tải lại trang sau 1.5s để cập nhật lịch sử và tệp đính kèm
        setTimeout(() => {
            window.location.reload();
        }, 1500);
    };

    // Wrapper: also open confirm modal if there are pending files (even without data changes)
    const triggerSaveWithBill = () => {
        const hasPendingBills = Object.keys(pendingBillFiles).length > 0;
        const hasPendingWaste = Object.entries(pendingWasteFiles).some(([, files]) => files?.length > 0);
        if (hasPendingBills || hasPendingWaste) {
            // Có file chờ upload → force save để chạy luồng upload
            setShowConfirmModal(true);
            return;
        }
        handlers.triggerSave();
    };

    const { setHeaderConfig, setBreadcrumbItems } = useHeader();

    useEffect(() => {
        setHeaderConfig({
            title: "Chi tiết bản khai báo Tài nguyên và Chất thải",
            description: "Xem chi tiết dữ liệu đã khai báo",
            showWeather: true,
            showDatePicker: true,
        });

        setBreadcrumbItems([
            {
                key: `/resources`,
                title: "Quản lý doanh nghiệp"
            },
            {
                key: `/resources/resources-list`,
                title: "Bản khai báo Tài nguyên và Chất thải"
            },
            {
                key: `/resources/resources-list/${reportId}`,
                title: report?.companyName
            },
        ]);
    }, [reportId, report?.companyName]);

    // --- SECTION SORTING LOGIC ---
    const sortedSections = useMemo(() => {
        if (!report) return [];

        const allSections = [
            [<Container key="1" size={25} />, "Nguyên vật liệu", report.materials, 'materials', "Nguyên liệu"],
            [<HousePlug key="2" size={25} />, "Điện", report.electricity, 'electricity', "Điện"],
            [<Droplet key="3" size={25} />, "Nước", report.water, 'water', "Nước"],
            [<Atom key="5" size={25} />, "Hóa chất", report.chemicals, 'chemicals', "Hóa chất"],
            [<FlameKindling key="6" size={25} />, "Chất đốt & Nhiên liệu", report.fuel, 'fuel', "Nhiên liệu"],
            [<Trash key="4" size={25} />, "Chất thải", report.waste, 'waste', "Chất thải"],
        ];

        return allSections.sort((a, b) => {
            const dataA = a[2];
            const dataB = b[2];

            const aIsEmpty = !dataA || dataA.length === 0;
            const bIsEmpty = !dataB || dataB.length === 0;

            if (aIsEmpty && !bIsEmpty) return 1;
            if (!aIsEmpty && bIsEmpty) return -1;
            return 0;
        });

    }, [report]);

    const [openSections, setOpenSections] = useState(new Set());

    useEffect(() => {
        if (sortedSections.length > 0) {
            setOpenSections(new Set(sortedSections.map(s => s[1])));
        }
    }, [sortedSections]);

    const toggleSection = (title) => {
        setOpenSections(prev => {
            const next = new Set(prev);
            if (next.has(title)) {
                next.delete(title);
            } else {
                next.add(title);
            }
            return next;
        });
    };

    return (
        <div className="flex h-full overflow-y-auto flex-col">
            {loading ? (
                <div className="p-6 text-center">Đang tải dữ liệu chi tiết...</div>
            ) : error ? (
                <div className="p-6 text-center text-red-500">{error}</div>
            ) : !report ? (
                <div className="p-6 text-center">Không tìm thấy báo cáo.</div>
            ) : (
                <section id="report-details" className="font-sans flex-1">
                    <div className="flex flex-col lg:flex-row gap-4 h-full">
                        <main className="flex-1 min-w-0 border border-gray-200 rounded-lg p-3 flex flex-col gap-y-5">
                            {/* Report Header */}
                            <div className="flex justify-between items-start pt-1 sticky top-0 z-10 bg-white pb-3 border-b border-slate-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]">
                                <div className="pl-4 flex flex-col gap-y-1">
                                    <h1 className="font-montserrat font-semibold text-base text-black">{report.companyName}</h1>
                                    <p className="font-montserrat text-sm text-black">Kỳ khai báo: {report.quarter}</p>
                                    <p className="font-montserrat text-sm text-black">Ngày hoàn thành: {report.completedDate}</p>
                                    <p className="font-montserrat text-sm text-black">Tài khoản khai báo: {report.account}</p>
                                    <p className="font-inter text-sm font-medium text-gray-400 mt-1">Cập nhật lần cuối lúc: {report.lastUpdated}</p>
                                </div>

                                {isCompany && (
                                    !isEditing ? (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="cursor-pointer bg-white border border-gray-400 flex items-center gap-x-1 px-1.5 py-1 rounded-lg text-xs text-gray-700 font-inter hover:bg-gray-50 transition-colors"
                                        >
                                            <Edit size={16} />
                                            <span>Chỉnh sửa</span>
                                        </button>
                                    ) : (
                                        <div className="flex justify-end items-center gap-2">
                                            <button
                                                onClick={handlers.handleCancel}
                                                className="cursor-pointer flex items-center justify-center gap-2 border !border-[#4E5BA6] text-[#4e5ba6] text-xs font-medium h-[26px] px-2 rounded-lg hover:bg-[#4e5ba620] hover:text-white transition-colors"
                                            >
                                                <X size={14} />
                                                <span>Hủy</span>
                                            </button>
                                            <button
                                                onClick={triggerSaveWithBill}
                                                className="cursor-pointer bg-[#4e5ba6] text-white text-xs font-medium h-[26px] px-2 rounded-lg hover:bg-opacity-90 transition-opacity"
                                            >
                                                Lưu
                                            </button>
                                        </div>
                                    )
                                )}
                            </div>

                            {/* Data Sections */}
                            <div className="flex flex-col gap-y-5">
                                {sortedSections.map(([icon, title, data, sectionKey, label]) => {
                                    const currentNewRows = newRows[sectionKey] || [];
                                    const isEmpty = (!data || data.length === 0) && currentNewRows.length === 0;
                                    const isOpen = openSections.has(title);
                                    const headerBgClass = isEmpty && !isEditing ? '' : 'bg-white';
                                    const titleTextClass = 'font-semibold text-black';
                                    const iconColorClass = 'text-black';
                                    const headerBorderBottomClass = isEmpty && !isEditing ? '' : 'border-b border-gray-100';

                                    // Determine custom header label
                                    let customNameHeader = "Tên nguyên liệu";
                                    if (sectionKey === 'electricity') {
                                        customNameHeader = "Tên";
                                    } else if (sectionKey === 'water') {
                                        customNameHeader = "Mục đích sử dụng";
                                    } else if (sectionKey === 'chemicals') {
                                        customNameHeader = "Tên hóa chất";
                                    } else if (sectionKey === 'fuel') {
                                        customNameHeader = "Tên nhiên liệu";
                                    } else if (sectionKey === 'waste') {
                                        customNameHeader = "Tên chất thải";
                                    }

                                    if (!isEditing && isEmpty) {
                                        return (
                                            <div key={title} className=" rounded-lg overflow-hidden">
                                                <div
                                                    className={`p-3 flex items-center gap-x-2 ${headerBgClass} cursor-pointer ${headerBorderBottomClass}`}
                                                    onClick={() => toggleSection(title)}
                                                >
                                                    {React.cloneElement(icon, { className: iconColorClass })}
                                                    <h2 className={`font-roboto text-xl ${titleTextClass}`}>{title}</h2>
                                                    <ChevronDown
                                                        size={16}
                                                        className={`ml-2 text-gray-400 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                                                    />
                                                </div>
                                                {isOpen && <ReportSectionTable data={data} isEmpty={isEmpty} nameHeader={customNameHeader} hideNameColumn={sectionKey === 'water'} showBillImage={sectionKey === 'electricity' || sectionKey === 'water'} />}
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={title} className="rounded-lg overflow-hidden group">
                                            <div
                                                className={`p-3 flex items-center gap-x-2 bg-white cursor-pointer ${isOpen ? 'rounded-t-lg border-b border-gray-100' : 'rounded-lg'}`}
                                                onClick={() => toggleSection(title)}
                                            >
                                                {React.cloneElement(icon, { className: iconColorClass })}
                                                <h2 className={`font-roboto text-xl ${titleTextClass}`}>{title}</h2>
                                                <ChevronDown
                                                    size={16}
                                                    className={`ml-2 text-gray-400 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                                                />
                                            </div>

                                            {isOpen && (
                                                isEditing ? (
                                                    <div className="bg-white px-4 rounded-b-lg">
                                                        <div className="flex flex-col divide-y divide-gray-100">
                                                            {(() => {
                                                                const activeIndices = data.map((d, i) => i).filter(i => Number(data[i].quantity) > 0 || String(data[i].quantity) === '');
                                                                const archivedIndices = data.map((d, i) => i).filter(i => Number(data[i].quantity) === 0 && String(data[i].quantity) !== '');

                                                                const renderRow = (index, isArchived) => {
                                                                    const row = data[index];
                                                                    const { groupOptions: specificGroupOptions, nameOptions: specificNameOptions, unitOptions: specificUnitOptions, hideName, hideUnit, maxQuantity } =
                                                                        getResourceOptions(sectionKey, row.group, row.id);
                                                                    return (
                                                                        <div key={row.id} className={isArchived ? "opacity-60 grayscale" : ""}>
                                                                            <InputGroup
                                                                                row={row}
                                                                                index={index}
                                                                                label={label}
                                                                                nameLabel={customNameHeader}
                                                                                groupOptions={specificGroupOptions}
                                                                                nameOptions={specificNameOptions}
                                                                                hideName={hideName}
                                                                                hideUnit={hideUnit}
                                                                                maxQuantity={maxQuantity}
                                                                                unitOptions={specificUnitOptions}
                                                                                showBillUpload={row.group === 'Điện lưới' || row.group?.toLowerCase() === 'nước cấp' || row.group?.toLowerCase() === 'nước cấp (thủy cục)'}
                                                                                onBillUpload={handleBillFileSelect}
                                                                                isBillUploading={false}
                                                                                showWasteCode={sectionKey === 'waste' && isHazardWasteGroup(row.group)}
                                                                                showWasteFileUpload={sectionKey === 'waste'}
                                                                                onWasteFileSelect={sectionKey === 'waste' ? handleWasteFileSelect : undefined}
                                                                                wasteFiles={sectionKey === 'waste' ? [
                                                                                    ...(row.attachments || []),
                                                                                    ...(pendingWasteFiles[row.id || row.originalId] || [])
                                                                                ] : undefined}
                                                                                onChange={(field, value) => {
                                                                                    handlers.handleDataChange(sectionKey, index, field, value);
                                                                                    if (hideName && field === 'group') {
                                                                                        handlers.handleDataChange(sectionKey, index, 'name', value);
                                                                                    }
                                                                                }}
                                                                                onRemove={() => handlers.handleRemoveRow(sectionKey, index)}
                                                                            />
                                                                        </div>
                                                                    );
                                                                };

                                                                return (
                                                                    <>
                                                                        {activeIndices.map(idx => renderRow(idx, false))}
                                                                        
                                                                        {archivedIndices.length > 0 && (
                                                                            <div className="bg-gray-50 border-t border-gray-200 mt-2">
                                                                                <div className="px-4 py-2 bg-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                                                                                    <span>Đã lưu trữ (Bằng 0)</span>
                                                                                    <span className="font-normal normal-case">Nhập số lớn hơn 0 để phục hồi</span>
                                                                                </div>
                                                                                <div className="flex flex-col divide-y divide-gray-100">
                                                                                    {archivedIndices.map(idx => renderRow(idx, true))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                );
                                                            })()}
                                                            <AnimatePresence>
                                                                {currentNewRows.map((row, index) => {
                                                                    const { groupOptions: specificGroupOptions, nameOptions: specificNameOptions, unitOptions: specificUnitOptions, hideName, hideUnit, maxQuantity } =
                                                                        getResourceOptions(sectionKey, row.group, row.id);
                                                                    return (
                                                                        <InputGroup
                                                                            key={row.id}
                                                                            row={row}
                                                                            index={data.length + index}
                                                                            label={label}
                                                                            nameLabel={customNameHeader}
                                                                            groupOptions={specificGroupOptions}
                                                                            nameOptions={specificNameOptions}
                                                                            hideName={hideName}
                                                                            hideUnit={hideUnit}
                                                                            maxQuantity={maxQuantity}
                                                                            unitOptions={specificUnitOptions}
                                                                            showBillUpload={row.group === 'Điện lưới' || row.group?.toLowerCase() === 'nước giếng' || row.group?.toLowerCase() === 'nước cấp' || row.group?.toLowerCase() === 'nước cấp (thủy cục)'}
                                                                            onBillUpload={handleBillFileSelect}
                                                                            isBillUploading={false}
                                                                            showWasteCode={sectionKey === 'waste' && isHazardWasteGroup(row.group)}
                                                                            showWasteFileUpload={sectionKey === 'waste'}
                                                                            onWasteFileSelect={sectionKey === 'waste' ? handleWasteFileSelect : undefined}
                                                                            wasteFiles={sectionKey === 'waste' ? (pendingWasteFiles[row.id] || []) : undefined}
                                                                            onChange={(field, value) => {
                                                                                handlers.handleNewDataChange(sectionKey, index, field, value);
                                                                                if (hideName && field === 'group') {
                                                                                    handlers.handleNewDataChange(sectionKey, index, 'name', value);
                                                                                }
                                                                            }}
                                                                            onRemove={() => handlers.handleRemoveNewRow(sectionKey, index)}
                                                                        />
                                                                    );
                                                                })}
                                                            </AnimatePresence>
                                                            {isEmpty && <p className="text-sm text-gray-500 text-center py-4">Không có dữ liệu để sửa.</p>}
                                                            <div className="flex justify-center items-center py-4 -mb-2">
                                                                <PlusButton
                                                                    disabled={
                                                                        (sectionKey === 'water' && (data.length + currentNewRows.length) >= 4) ||
                                                                        (sectionKey === 'electricity' && (data.length + currentNewRows.length) >= 5)
                                                                    }
                                                                    label={
                                                                        (sectionKey === 'water' && (data.length + currentNewRows.length) >= 4)
                                                                            ? "Đã đủ 4 loại nước"
                                                                            : (sectionKey === 'electricity' && (data.length + currentNewRows.length) >= 5)
                                                                                ? "Đã đủ các loại điện"
                                                                                : `Thêm ô ${label.toLowerCase()}`
                                                                    }
                                                                    onClick={() => handlers.handleAddRow(sectionKey)}
                                                                    className="w-full text-xs font-montserrat text-black"
                                                                />
                                                            </div>
                                                        </div>

                                                        {(sectionKey === 'electricity' || sectionKey === 'water') && (
                                                            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col pb-2">
                                                                <span className="text-sm font-medium text-gray-700 mb-3">Hóa đơn đính kèm (cho toàn bộ mục này):</span>
                                                                <BillImageUpload
                                                                    currentImage={data.find(d => d.billImage)?.billImage || null}
                                                                    onUpload={(file) => {
                                                                        const firstRow = data[0] || currentNewRows[0];
                                                                        if (firstRow) {
                                                                            handleBillFileSelect(firstRow.originalId || firstRow.id, file, firstRow.group);
                                                                        } else {
                                                                            if (file) toast.warning('Vui lòng thêm ít nhất 1 dòng dữ liệu trước khi tải hóa đơn lên.');
                                                                        }
                                                                    }}
                                                                    label=""
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <ReportSectionTable data={data} isEmpty={isEmpty} nameHeader={customNameHeader} hideNameColumn={sectionKey === 'water'} showBillImage={sectionKey === 'electricity' || sectionKey === 'water'} />
                                                )
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </main>

                        {/* Sidebar Lịch sử */}
                        <aside className="lg:w-[346px] lg:min-w-[280px] w-full lg:flex-none bg-white border border-gray-200 rounded-lg p-3 flex flex-col gap-y-2.5 h-fit overflow-hidden">
                            <div className="flex items-center gap-x-2.5 px-4 pt-2.5">
                                <History size={20} className="text-gray-700" />
                                <h3 className="font-roboto font-bold text-xl text-gray-700">Lịch sử chỉnh sửa</h3>
                            </div>
                            <div className="pl-5 pt-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                <ol className="relative border-l-2 border-indigo-200 h-full">
                                    {report.history.map((item, index) => (
                                        <li key={item.id} className={`ml-6 ${index === report.history.length - 1 ? '' : 'mb-6'}`}>
                                            <span className="absolute flex items-center justify-center w-2.5 h-2.5 bg-white rounded-full -left-[6px] border-2 border-indigo-700"></span>
                                            <p className="text-xs text-gray-500 font-roboto">{item.time} - {item.user}</p>
                                            {item.actions.length > 1 ? (
                                                <ul className="text-sm font-semibold text-gray-800 font-roboto mt-1 list-disc pl-4 space-y-1">
                                                    {item.actions.map((action, i) => (
                                                        <li key={i} className="break-words">{action}</li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-sm font-semibold text-gray-800 font-roboto mt-1 break-words">
                                                    {item.actions[0]}
                                                </p>
                                            )}
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </aside>
                    </div>
                </section>
            )}

            {/* Save Spinner */}
            {isSaving && (
                <LoadingSpinner
                    spinning={isSaving}
                    tip="Đang lưu dữ liệu báo cáo..."
                    fullscreen={true}
                />
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                open={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleSaveWithBill}
                title="Xác nhận lưu thay đổi"
                content="Bạn có chắc chắn muốn lưu các thay đổi này không? Hành động này sẽ cập nhật dữ liệu báo cáo."
                confirmType="primary"
                confirmText="Lưu ngay"
                cancelText="Xem lại"
            />
        </div>
    );
};

export default ResourceReportDetailPage;
