import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TableCell, Tooltip, IconButton } from "@mui/material";
import { UserX } from "lucide-react";
import UserFilterTabs from "@/features/admin/components/user/UserFilterTabs";
import SearchBox from "@components/ui/SearchBox";
import ButtonFilter from "@components/ui/ButtonFilter";
import {
    CreateAccountButton,
    DeleteSelectedButton,
} from "@components/ui/Button";
import UserTable from "@/features/admin/components/user/UserTable";
import {
    useUsersByRole,
    useDeleteUser,
    useDeleteUsers,
    usePreviewSoftDeleteUsers,
} from "@features/admin/hooks/useUserQueries";
import { useHeader } from "@/components/common/Header/HeaderContext";
import { useAuthenticatedUser } from "@features/auth/hooks/useAuthQueries";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import useZones from "@features/industrialzone/hooks/useZones";
import { useCompanies } from "@features/company/hooks/useCompanyQueries";
import toast from "@/utils/toast";

const fieldLabels = {
    zone: "Khu công nghiệp",
    company: "Doanh nghiệp",
    date_range: "Theo ngày cập nhật lần cuối",
};

export default function UserPage() {
    const navigate = useNavigate();
    const location = useLocation();
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

    const [activeTab, setActiveTab] = useState(() => (
        currentRole === "manager" ? "company" : (location.state?.activeTab || "company")
    ));
    const [selectedCount, setSelectedCount] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [searchTerm, setSearchTerm] = useState("");
    const [filters, setFilters] = useState({});
    const [sort, setSort] = useState({});
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        ids: [],
    });
    const [replacementUserId, setReplacementUserId] = useState("");
    const [selectedUserIds, setSelectedUserIds] = useState([]);

    const { setHeaderConfig } = useHeader();

    useEffect(() => {
        setHeaderConfig({
            title: isManager
                ? `Nhân sự doanh nghiệp | ${resolvedManagerZoneName || currentZoneId || "KCN được phân công"}`
                : "Quản lý người dùng hệ thống",
            description: isManager
                ? `Bạn đang thao tác trên tài khoản doanh nghiệp thuộc ${resolvedManagerZoneName || currentZoneId || "khu công nghiệp được phân công"}`
                : "Danh sách tất cả người dùng trong hệ thống",
            showWeather: true,
            showDatePicker: false,
        });
    }, [currentZoneId, isManager, resolvedManagerZoneName, setHeaderConfig]);

    useEffect(() => {
        if (isManager && activeTab !== "company") {
            setActiveTab("company");
        }
    }, [activeTab, isManager]);

    useEffect(() => {
        setSelectedUserIds([]);
        setSelectedCount(0);
    }, [activeTab]);

    const handleActions = {
        filter: (newFilters) => {
            const { sort: nextSort, ...restFilters } = newFilters;
            const cleanedSort = {};

            if (nextSort && Array.isArray(nextSort) && nextSort.length > 0) {
                cleanedSort.updated_at = nextSort[0];
            }

            setFilters(restFilters);
            setSort(cleanedSort);
            setPage(1);
        },
        search: (query) => {
            setSearchTerm(query);
            setPage(1);
        },
        add: () => {
            const basePath = isManager ? "/manager" : "/admin";
            navigate(`${basePath}/user/create`);
        },
    };

    const apiFilters = {
        ...(searchTerm && { search: searchTerm }),
        ...(isManager && currentZoneId && { zone: [currentZoneId] }),
    };

    Object.keys(filters).forEach((key) => {
        const value = filters[key];
        if (value && Array.isArray(value) && value.length === 0) {
            return;
        }
        apiFilters[key] = value;
    });

    const { data: companiesData } = useCompanies({
        page: 1,
        limit: 100,
        filters: apiFilters.zone ? { zone_id: apiFilters.zone } : {},
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
        ...(activeTab === "company" && (isManager || apiFilters.zone)
            ? { company: companies.map((c) => c.id || c.company_id) }
            : {}),
        date_range: [],
    };

    const optionLabels = {
        zone: zoneLabels,
        company: companyLabels,
    };

    const {
        data: usersData,
        isLoading: loading,
    } = useUsersByRole({
        role: activeTab,
        page,
        limit: pageSize,
        filters: apiFilters,
        sort,
        enabled: !isAuthLoading && (!isManager || !!currentZoneId),
    });

    const previewSoftDeleteMutation = usePreviewSoftDeleteUsers();
    const deleteUserMutation = useDeleteUser();
    const deleteUsersMutation = useDeleteUsers();

    const userList = usersData?.users || [];
    const total = usersData?.totalPages || 0;

    const handleSelectionUpdate = (ids) => {
        setSelectedUserIds(ids);
        setSelectedCount(ids.length);
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
                    <Tooltip title={isManager ? "Tài khoản doanh nghiệp bị vô hiệu hóa" : "Người dùng bị vô hiệu hóa"}>
                        <IconButton
                            onClick={() => {
                                const basePath = isManager ? "/manager" : "/admin";
                                navigate(`${basePath}/user/trash`);
                            }}
                            sx={{
                                bgcolor: "error.main",
                                color: "white",
                                "&:hover": { bgcolor: "error.dark" },
                                width: 36,
                                height: 36,
                                borderRadius: "12px",
                            }}
                        >
                            <UserX size={20} />
                        </IconButton>
                    </Tooltip>
                </div>

                <div className="flex flex-1 h-9 gap-2 justify-end items-center min-w-0">
                    {selectedCount > 0 && (
                        <DeleteSelectedButton
                            selectedCount={selectedCount}
                            onClick={() => {
                                setReplacementUserId("");
                                setConfirmDialog({ isOpen: true, ids: selectedUserIds });
                            }}
                        />
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
                    <CreateAccountButton
                        onClick={handleActions.add}
                        text={isManager ? "Thêm nhân sự doanh nghiệp" : "Thêm tài khoản"}
                    />
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
                    sort={sort}
                    onSort={(field, order) => setSort({ [field]: order })}
                    onDeleteUser={(id) => {
                        setReplacementUserId("");
                        setConfirmDialog({ isOpen: true, ids: [id] });
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
                        if (confirmDialog.ids.length === 1) {
                            await deleteUserMutation.mutateAsync({
                                userId: confirmDialog.ids[0],
                                newRepresentativeUserId: replacementUserId || undefined,
                            });
                            toast.success("Thành công", "Đã vô hiệu hóa tài khoản đã chọn");
                        } else {
                            await deleteUsersMutation.mutateAsync(confirmDialog.ids);
                            toast.success("Thành công", "Đã vô hiệu hóa các tài khoản đã chọn");
                        }

                        if (
                            confirmDialog.ids.length > 1 ||
                            (selectedUserIds.length === 1 && confirmDialog.ids[0] === selectedUserIds[0])
                        ) {
                            setSelectedUserIds([]);
                            setSelectedCount(0);
                        }

                        setConfirmDialog({ isOpen: false, ids: [] });
                        setReplacementUserId("");
                    } catch (error) {
                        console.error("Delete users failed:", error);
                        toast.error("Thao tác thất bại", error?.message || error?.response?.data?.message || "Đã có lỗi xảy ra. Vui lòng thử lại.");
                    }
                }}
                title="Xác nhận xóa người dùng"
                isHardDelete={false}
                selectedIds={confirmDialog.ids}
                previewMutation={previewSoftDeleteMutation}
                deleteMutation={confirmDialog.ids.length === 1 ? deleteUserMutation : deleteUsersMutation}
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
