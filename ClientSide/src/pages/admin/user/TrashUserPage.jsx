import React, { useState, useEffect } from "react";
import { TableCell, Button, Tooltip, IconButton } from "@mui/material";
import { RotateCcw, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
    useDeletedUsersByRole,
    useHardDeleteUser,
    useHardDeleteUsers,
    useRestoreUsers,
    usePreviewHardDeleteUsers,
} from "@features/admin/hooks/useUserQueries";
import UserTable from "@/features/admin/components/user/UserTable";
import UserFilterTabs from "@/features/admin/components/user/UserFilterTabs";
import ButtonFilter from "@components/ui/ButtonFilter";
import SearchBox from "@components/ui/SearchBox";
import { DeleteSelectedButton } from "@components/ui/Button";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import { useHeader } from "@/components/common/Header/HeaderContext";
import toast from "@/utils/toast";
import useZones from "@features/industrialzone/hooks/useZones";
import { useCompanies } from "@features/company/hooks/useCompanyQueries";
import { useAuthenticatedUser } from "@features/auth/hooks/useAuthQueries";

const fieldLabels = {
    zone: "Khu công nghiệp",
    company: "Doanh nghiệp",
    date_range: "Theo ngày cập nhật lần cuối",
};

export default function TrashUserPage() {
    const { data: user, isLoading: isAuthLoading } = useAuthenticatedUser();
    const currentRole = user?.role || user?.user?.role;
    const currentZoneId = user?.zone_id || user?.user?.zone_id || "";
    const currentZoneName = user?.zone_name || user?.user?.zone_name || "";
    const isManager = currentRole === "manager";
    const { data: zonesData } = useZones({ page: 1, limit: 100 });
    const zones = zonesData?.zones || [];
    const resolvedManagerZoneName = currentZoneName || zones.find(
        (zone) => String(zone.zone_id || zone.id) === String(currentZoneId || '')
    )?.zone_name || currentZoneId;

    const [activeTab, setActiveTab] = useState("company");
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({});
    const [selectedUserIds, setSelectedUserIds] = useState([]);
    const [replacementUserId, setReplacementUserId] = useState("");
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        actionType: "restore",
        ids: [],
    });
    const navigate = useNavigate();

    const { setHeaderConfig } = useHeader();
    const restoreUsersMutation = useRestoreUsers();
    const previewHardDeleteMutation = usePreviewHardDeleteUsers();
    const hardDeleteUserMutation = useHardDeleteUser();
    const hardDeleteUsersMutation = useHardDeleteUsers();

    useEffect(() => {
        const basePath = isManager ? "/manager" : "/admin";
        setHeaderConfig({
            title: isManager
                ? `Tài khoản đã vô hiệu hóa | ${resolvedManagerZoneName || currentZoneId || "KCN được phân công"}`
                : "Người dùng bị vô hiệu hóa",
            description: isManager
                ? `Bạn đang xem các tài khoản doanh nghiệp bị vô hiệu hóa thuộc ${resolvedManagerZoneName || currentZoneId || "khu công nghiệp được phân công"}`
                : "Danh sách người dùng đã bị vô hiệu hóa tạm thời",
            showWeather: true,
            showDatePicker: false,
            breadcrumbItems: [
                { title: "Người dùng", key: `${basePath}/user` },
                { title: "Người dùng bị vô hiệu hóa", key: `${basePath}/user/trash` },
            ],
        });
    }, [currentZoneId, isManager, resolvedManagerZoneName, setHeaderConfig]);

    useEffect(() => {
        if (isManager && activeTab !== "company") {
            setActiveTab("company");
        }
    }, [activeTab, isManager]);

    const {
        data: deletedUsersData,
        isLoading: loading,
    } = useDeletedUsersByRole({
        role: activeTab,
        page,
        limit: pageSize,
        filters: {
            ...filters,
            search: searchTerm,
            ...(isManager && currentZoneId && { zone: [currentZoneId] }),
        },
        enabled: !isAuthLoading && (!isManager || !!currentZoneId),
    });

    const { data: companiesData } = useCompanies({
        page: 1,
        limit: 100,
        filters: filters.zone ? { zone_id: filters.zone } : {},
        enabled: true,
    });
    const companies = companiesData?.companies || [];

    const zoneLabels = zones.reduce((acc, z) => {
        acc[z.zone_id || z.id] = z.zone_name || z.name;
        return acc;
    }, {});

    const companyLabels = companies.reduce((acc, c) => {
        acc[c.id || c.company_id] = c.name || c.company_name;
        return acc;
    }, {});

    const filterOptions = {
        ...(!isManager && { zone: zones.map((z) => z.zone_id || z.id) }),
        ...(activeTab === "company" && (isManager || filters.zone)
            ? { company: companies.map((c) => c.id || c.company_id) }
            : {}),
        date_range: [],
    };

    const optionLabels = {
        zone: zoneLabels,
        company: companyLabels,
    };

    const handleActions = {
        filter: (newFilters) => {
            setFilters(newFilters);
            setPage(1);
        },
        search: (query) => {
            setSearchTerm(query);
            setPage(1);
        },
    };

    useEffect(() => {
        setSelectedUserIds([]);
    }, [activeTab]);

    const userList = deletedUsersData?.users || [];
    const total = deletedUsersData?.totalPages || 0;

    const handleSelectionUpdate = (ids) => {
        setSelectedUserIds(ids);
    };

    const handleRestoreSelected = () => {
        if (selectedUserIds.length === 0) return;
        setConfirmDialog({
            isOpen: true,
            actionType: "restore",
            ids: selectedUserIds,
        });
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden gap-2">
            <div className="flex flex-wrap gap-2 justify-between items-center w-full">
                <div className="flex items-center gap-2">
                    {!isManager && (
                        <UserFilterTabs
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            setPage={setPage}
                            showManagerTab={true}
                        />
                    )}
                    <Tooltip title={isManager ? "Danh sách tài khoản doanh nghiệp đang hoạt động" : "Danh sách người dùng"}>
                        <IconButton
                            onClick={() => {
                                const basePath = isManager ? "/manager" : "/admin";
                                navigate(`${basePath}/user`);
                            }}
                            sx={{
                                bgcolor: "#4E5BA6",
                                color: "white",
                                "&:hover": { bgcolor: "#3a4480" },
                                width: 36,
                                height: 36,
                                borderRadius: "12px",
                            }}
                        >
                            <Users size={20} />
                        </IconButton>
                    </Tooltip>
                </div>

                <div className="flex flex-1 h-9 gap-2 justify-end items-center min-w-0">
                    {selectedUserIds.length > 0 && (
                        <div className="flex gap-2">
                            <DeleteSelectedButton
                                selectedCount={selectedUserIds.length}
                                onClick={() => {
                                    setReplacementUserId("");
                                    setConfirmDialog({
                                        isOpen: true,
                                        ids: selectedUserIds,
                                        actionType: "hard-delete",
                                    });
                                }}
                            />
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<RotateCcw size={18} />}
                                onClick={handleRestoreSelected}
                                className="h-10 text-sm font-medium normal-case shadow-none rounded-2xl"
                            >
                                Khôi phục ({selectedUserIds.length})
                            </Button>
                        </div>
                    )}
                    <ButtonFilter
                        onFilter={handleActions.filter}
                        filterOptions={filterOptions}
                        fieldLabels={fieldLabels}
                        optionLabels={optionLabels}
                        selectedFilters={filters}
                        setSelectedFilters={setFilters}
                    />
                    <div className="w-full h-full max-w-xs">
                        <SearchBox
                            placeholder={isManager ? "Tìm kiếm tài khoản doanh nghiệp..." : "Tìm kiếm người dùng..."}
                            onSearch={handleActions.search}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <UserTable
                    type={activeTab}
                    data={userList}
                    loading={loading}
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    onPageChange={setPage}
                    selected={selectedUserIds}
                    onSelectionChange={handleSelectionUpdate}
                    sort={{}}
                    onSort={() => { }}
                    isDeletedView={true}
                    onRestoreUser={(id) => {
                        setReplacementUserId("");
                        setConfirmDialog({ isOpen: true, actionType: "restore", ids: [id] });
                    }}
                    onDeleteUser={(id) => {
                        setReplacementUserId("");
                        setConfirmDialog({ isOpen: true, actionType: "hard-delete", ids: [id] });
                    }}
                />
            </div>

            <ConfirmDeleteDialog
                open={confirmDialog.isOpen}
                onClose={() => {
                    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                    setReplacementUserId("");
                }}
                onConfirm={async () => {
                    try {
                        if (confirmDialog.actionType === "restore") {
                            await restoreUsersMutation.mutateAsync(confirmDialog.ids);
                            toast.success("Thành công", "Khôi phục tài khoản thành công");
                        } else if (confirmDialog.ids.length === 1) {
                            await hardDeleteUserMutation.mutateAsync({
                                userId: confirmDialog.ids[0],
                                newRepresentativeUserId: replacementUserId || undefined,
                            });
                            toast.success("Thành công", "Xóa vĩnh viễn tài khoản thành công");
                        } else {
                            await hardDeleteUsersMutation.mutateAsync(confirmDialog.ids);
                            toast.success("Thành công", "Xóa vĩnh viễn các tài khoản đã chọn thành công");
                        }

                        setSelectedUserIds([]);
                        setConfirmDialog({ isOpen: false, actionType: "restore", ids: [] });
                        setReplacementUserId("");
                    } catch (error) {
                        console.error("Trash user action failed:", error);
                        toast.error("Thao tác thất bại", error?.message || error?.response?.data?.message || "Đã có lỗi xảy ra. Vui lòng thử lại.");
                    }
                }}
                title={confirmDialog.actionType === "restore" ? "Xác nhận khôi phục người dùng" : "Xác nhận xóa vĩnh viễn người dùng"}
                actionType={confirmDialog.actionType}
                isHardDelete={confirmDialog.actionType === "hard-delete"}
                selectedIds={confirmDialog.ids}
                previewMutation={confirmDialog.actionType === "hard-delete" ? previewHardDeleteMutation : null}
                deleteMutation={
                    confirmDialog.actionType === "restore"
                        ? restoreUsersMutation
                        : (confirmDialog.ids.length === 1 ? hardDeleteUserMutation : hardDeleteUsersMutation)
                }
                columns={[
                    { label: "Mã" },
                    { label: "Họ và tên" },
                    { label: "Email" },
                    { label: "Vai trò" },
                ]}
                renderRow={(row) => (
                    <>
                        <TableCell>{row.user_id}</TableCell>
                        <TableCell>{row.full_name}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.role}</TableCell>
                    </>
                )}
                replacementValue={replacementUserId}
                onReplacementChange={setReplacementUserId}
            />
        </div>
    );
}
