import { useState, useMemo } from 'react';
import { Edit, Trash2, Plus, FileText, Calendar, Shield, ShieldAlert, ShieldCheck, Building } from 'lucide-react';
import { Dialog } from '@mui/material';
import dayjs from 'dayjs';
import toast from '@/utils/toast';
import { mapErrorToNotification } from '@/utils/Error/mapErrorToNotification';
import { useAddLicense, useUpdateLicense, useDeleteLicense } from '@/features/company/hooks/useCompanyQueries';
import AddLicenseForm from './AddLicenseForm';
import { useIsAuthenticated } from "@/features/auth/hooks/useAuthQueries"; // Import Auth Query
import ConfirmationModal from '@/components/common/ConfirmationModal';

const LicenseSection = ({ company }) => {
    const [editMode, setEditMode] = useState(false);
    const [openModal, setOpenModal] = useState(false);
    const [editingLicense, setEditingLicense] = useState(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [licenseToDelete, setLicenseToDelete] = useState(null);

    // Get role from auth query
    const { user } = useIsAuthenticated();
    const userRole = user?.user?.role;

    const { mutate: updateLicense } = useUpdateLicense();
    const { mutate: deleteLicense } = useDeleteLicense();
    const { mutate: addLicense } = useAddLicense();

    const licenses = useMemo(() => company?.licenses || [], [company?.licenses]);

    const showNotification = (type, title, description) => {
        toast({ type, title, description });
    };

    const handleSubmit = (data) => {
        const payload = {
            license_id: data.number,
            license_name: data.name,
            issuing_authority: data.place,
            issue_date: data.startDate,
            expiry_date: data.expiredDate,
            file_url: editingLicense?.file_url || null,
            file: data.file || null,
            keep_existing_file: Boolean(editingLicense?.file_url && !data.file),
        };

        if (editingLicense) {
            updateLicense({
                companyId: company.company_id,
                licenseId: editingLicense.license_id,
                updateData: payload
            }, {
                onSuccess: () => {
                    setOpenModal(false);
                    setEditingLicense(null);
                    showNotification('success', 'Thành công', 'Cập nhật giấy phép thành công');
                },
                onError: (err) => {
                    const { title, description } = mapErrorToNotification(err, 'UPDATE_LICENSE');
                    showNotification('error', title, description);
                }
            });
        } else {
            addLicense({
                companyId: company.company_id,
                licenseData: payload
            }, {
                onSuccess: () => {
                    setOpenModal(false);
                    setEditingLicense(null);
                    showNotification('success', 'Thành công', 'Thêm giấy phép thành công');
                },
                onError: (err) => {
                    const { title, description } = mapErrorToNotification(err, 'CREATE_LICENSE');
                    showNotification('error', title, description);
                }
            });
        }
    };

    const handleDeleteClick = (licenseId) => {
        setLicenseToDelete(licenseId);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (licenseToDelete) {
            deleteLicense({
                companyId: company.company_id,
                licenseId: licenseToDelete
            }, {
                onSuccess: () => {
                    showNotification('success', 'Thành công', 'Xóa giấy phép thành công');
                    setDeleteConfirmOpen(false);
                    setLicenseToDelete(null);
                },
                onError: (err) => {
                    const { title, description } = mapErrorToNotification(err, 'DELETE_LICENSE');
                    showNotification('error', title, description);
                    setDeleteConfirmOpen(false);
                    setLicenseToDelete(null);
                }
            });
        }
    };

    const handleEdit = (item) => {
        setEditingLicense({
            ...item,
            name: item.license_name,
            number: item.license_id,
            place: item.issuing_authority,
            startDate: item.issue_date ? dayjs(item.issue_date).format('YYYY-MM-DD') : '',
            expiredDate: item.expiry_date ? dayjs(item.expiry_date).format('YYYY-MM-DD') : '',
            file_url: item.file_url || null,
        });
        setOpenModal(true);
    };

    const getExpiryStatus = (expiryDate) => {
        if (!expiryDate) return { label: 'Không rõ', color: 'text-gray-400', bg: 'bg-gray-100', Icon: Shield };
        const now = dayjs();
        const exp = dayjs(expiryDate);
        if (exp.isBefore(now)) return { label: 'Hết hạn', color: 'text-red-600', bg: 'bg-red-50', Icon: ShieldAlert };
        if (exp.diff(now, 'day') <= 30) return { label: 'Sắp hết hạn', color: 'text-amber-600', bg: 'bg-amber-50', Icon: ShieldAlert };
        return { label: 'Còn hiệu lực', color: 'text-emerald-600', bg: 'bg-emerald-50', Icon: ShieldCheck };
    };

    return (
        <div className="col-span-full flex flex-col gap-2 xl:gap-3">
            {/* Header */}
            <span className="flex justify-between pr-2 items-center">
                <p className="text-gray-900 font-bold text-lg xl:text-xl 2xl:text-xl uppercase tracking-wide">
                    Giấy phép và Giấy chứng nhận
                </p>
                {userRole === 'company' && (
                    <button
                        onClick={() => setEditMode(p => !p)}
                        className={`px-4 py-1.5 xl:px-5 xl:py-2 rounded-lg text-sm xl:text-base font-semibold transition-all flex items-center gap-2 cursor-pointer
                            ${editMode
                                ? 'bg-white text-[#4E5BA6] hover:bg-indigo-50 border border-[#4E5BA6]'
                                : 'bg-[#4E5BA6] text-white hover:bg-[#3d4885] shadow-md hover:shadow-lg'
                            }`}
                    >
                        {editMode ? <span>Hoàn tất</span> : <><Edit size={14} /><span>Chỉnh sửa</span></>}
                    </button>
                )}
            </span>

            {/* License Cards Grid */}
            <div className="flex flex-col gap-3 xl:gap-4">
                {/* Add Button */}
                {editMode && (
                    <div
                        onClick={() => { setEditingLicense(null); setOpenModal(true); }}
                        className="bg-white border-2 border-dashed border-[#4E5BA6]/30 rounded-2xl flex items-center justify-center p-5 xl:p-6 2xl:p-8 gap-3 cursor-pointer hover:border-[#4E5BA6] hover:bg-[#4E5BA6]/[0.03] transition-all duration-200 min-h-[160px] xl:min-h-[180px] 2xl:min-h-[200px] group"
                    >
                        <div className="flex flex-col items-center gap-2 xl:gap-3">
                            <div className="h-11 w-11 xl:h-14 xl:w-14 2xl:h-16 2xl:w-16 bg-[#4E5BA6]/10 rounded-xl xl:rounded-2xl flex items-center justify-center group-hover:bg-[#4E5BA6]/20 transition-colors duration-200">
                                <Plus className="w-5 h-5 xl:w-6 xl:h-6 2xl:w-7 2xl:h-7 text-[#4E5BA6]" />
                            </div>
                            <div className="text-center">
                                <p className="font-semibold text-gray-600 text-sm xl:text-base 2xl:text-lg">Thêm giấy phép</p>
                                <p className="text-[11px] xl:text-xs 2xl:text-sm text-gray-400">Bấm để thêm mới</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* License Cards */}
                {licenses.map((item) => {
                    const status = getExpiryStatus(item.expiry_date);
                    const StatusIcon = status.Icon;

                    return (
                        <div
                            key={item.license_id || item._id}
                            className="bg-white border border-black/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col"
                        >
                            {/* Top accent gradient */}
                            <div className="h-[3px] xl:h-[4px] bg-gradient-to-r from-[#4E5BA6] to-[#7C8ADB]" />

                            {/* Card Content */}
                            <div className="p-4 xl:p-5 2xl:p-6 flex flex-col gap-3 xl:gap-4 flex-1">
                                {/* Header: icon + name + status badge */}
                                <div className="flex items-start gap-3 xl:gap-4">
                                    <div className="h-10 w-10 xl:h-12 xl:w-12 2xl:h-14 2xl:w-14 bg-[#4E5BA6]/10 rounded-xl xl:rounded-2xl flex items-center justify-center shrink-0">
                                        <FileText className="w-[18px] h-[18px] xl:w-5 xl:h-5 2xl:w-6 2xl:h-6 text-[#4E5BA6]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 text-[15px] xl:text-base 2xl:text-lg truncate leading-tight" title={item.license_name}>
                                            {item.license_name}
                                        </p>
                                        <p className="text-[11px] xl:text-xs 2xl:text-sm text-gray-400 mt-0.5 font-semibold">
                                            Số: <span className="text-gray-500">{item.license_id}</span>
                                        </p>
                                    </div>
                                    <span className={`text-[10px] xl:text-[11px] 2xl:text-xs font-bold px-2 py-1 xl:px-2.5 xl:py-1.5 rounded-lg ${status.bg} ${status.color} flex items-center gap-1 shrink-0 uppercase tracking-wide whitespace-nowrap`}>
                                        <StatusIcon className="w-[11px] h-[11px] xl:w-3 xl:h-3 2xl:w-3.5 2xl:h-3.5" />
                                        {status.label}
                                    </span>
                                </div>

                                {/* Details rows */}
                                <div className="flex flex-col gap-1.5 xl:gap-2 text-[13px] xl:text-sm 2xl:text-base pl-[52px] xl:pl-[64px] 2xl:pl-[72px]">
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Building className="w-[13px] h-[13px] xl:w-4 xl:h-4 2xl:w-5 2xl:h-5 text-gray-300 shrink-0" />
                                        <span className="truncate" title={item.issuing_authority}>
                                            {item.issuing_authority || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-500">
                                        <Calendar className="w-[13px] h-[13px] xl:w-4 xl:h-4 2xl:w-5 2xl:h-5 text-gray-300 shrink-0" />
                                        <span>
                                            {item.issue_date ? dayjs(item.issue_date).format('DD/MM/YYYY') : '—'}
                                            <span className="text-gray-300 mx-1">→</span>
                                            {item.expiry_date ? dayjs(item.expiry_date).format('DD/MM/YYYY') : '—'}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions (edit mode only) */}
                                {editMode && (
                                    <div className="flex gap-2 pt-2 xl:pt-3 mt-auto border-t border-gray-100">
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 px-3 py-2 xl:py-2.5 rounded-lg text-xs xl:text-sm font-semibold text-[#4E5BA6] bg-[#4E5BA6]/[0.06] hover:bg-[#4E5BA6]/[0.12] transition-colors duration-200"
                                        >
                                            <Edit className="w-[13px] h-[13px] xl:w-4 xl:h-4" />
                                            Chỉnh sửa
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(item.license_id)}
                                            className="cursor-pointer flex items-center justify-center gap-1 px-3 py-2 xl:py-2.5 rounded-lg text-xs xl:text-sm font-semibold text-red-500 bg-red-50 hover:bg-red-100 transition-colors duration-200"
                                        >
                                            <Trash2 className="w-[13px] h-[13px] xl:w-4 xl:h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Empty state */}
                {licenses.length === 0 && !editMode && (
                    <div className="col-span-full bg-white border border-black/10 rounded-2xl p-10 xl:p-14 2xl:p-16 flex flex-col items-center justify-center text-center shadow-sm">
                        <div className="h-14 w-14 xl:h-16 xl:w-16 2xl:h-20 2xl:w-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
                            <FileText className="w-6 h-6 xl:w-7 xl:h-7 2xl:w-8 2xl:h-8 text-gray-300" />
                        </div>
                        <p className="font-bold text-gray-500 text-[15px] xl:text-base 2xl:text-lg">Chưa có giấy phép nào</p>
                        <p className="text-xs xl:text-sm 2xl:text-base text-gray-400 mt-1">Bấm "Chỉnh sửa" để thêm giấy phép và chứng nhận</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            <Dialog
                open={openModal}
                onClose={() => setOpenModal(false)}
                fullWidth
                maxWidth="lg"
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <div className="p-5">
                    <AddLicenseForm
                        initialData={editingLicense}
                        mode={editingLicense ? 'edit' : 'add'}
                        onSubmit={handleSubmit}
                        onClose={() => setOpenModal(false)}
                    />
                </div>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                open={deleteConfirmOpen}
                onClose={() => {
                    setDeleteConfirmOpen(false);
                    setLicenseToDelete(null);
                }}
                onConfirm={confirmDelete}
                title="Xác nhận xóa giấy phép"
                content="Bạn có chắc chắn muốn xóa giấy phép này không? Dữ liệu sau khi xóa sẽ không thể khôi phục."
                confirmType="danger"
                confirmText="Xác nhận xóa"
                cancelText="Hủy"
            />
        </div>
    );
};

export default LicenseSection;
