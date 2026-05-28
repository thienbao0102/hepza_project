import { Button } from "@mui/material";
import { Upload, Download, Trash2, Plus, MessageSquare, RefreshCcw } from "lucide-react";
import { Popconfirm } from 'antd';
import { EditOutlined, DeleteOutlined, UndoOutlined } from '@ant-design/icons';

/**
 * ActionButtons component
 * @param {Object} props
 * @param {Function} props.onEdit - Callback khi nhấn Sửa
 * @param {Function} props.onDelete - Callback khi xác nhận Xoá
 */
const ActionButtons = ({
    onEdit,
    onDelete,
    onRestore,
    onViewDiscussion,
    isDeleteConfirm = false,
    deleteConfirmTitle = 'Xác nhận xóa',
    deleteConfirmDescription = 'Bạn có chắc chắn muốn xóa mục này? Hành động không thể hoàn tác.',
}) => (
    <div className="flex items-center justify-center gap-2">
        {onViewDiscussion && (
            <button
                onClick={onViewDiscussion}
                className="p-1 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                aria-label="Xem thảo luận"
            >
                <MessageSquare size={16} />
            </button>
        )}
        {onRestore && (
            <button
                onClick={onRestore}
                className="p-1 text-green-600 hover:text-green-800 transition-colors cursor-pointer"
                aria-label="Khôi phục"
            >
                <UndoOutlined />
            </button>
        )}
        {onEdit && (
            <button
                onClick={onEdit}
                className="p-1 text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                aria-label="Sửa"
            >
                <EditOutlined />
            </button>
        )}
        {onDelete && (isDeleteConfirm ? (
            <Popconfirm
                title={deleteConfirmTitle}
                description={deleteConfirmDescription}
                okText="Xóa"
                cancelText="Hủy"
                okButtonProps={{ danger: true }}
                onConfirm={onDelete}
            >
                <button
                    className="p-1 text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                    aria-label="Xoá"
                    type="button"
                >
                    <DeleteOutlined />
                </button>
            </Popconfirm>
        ) : (
            <button
                onClick={onDelete}
                className="p-1 text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                aria-label="Xoá"
            >
                <DeleteOutlined />
            </button>
        ))}
    </div>
);

/**
 * Component DataActions
 * - Chứa các nút để nhập và xuất dữ liệu.
 * - Nút Nhập dữ liệu gọi hàm onImport khi được nhấn.
 * - Nút Xuất dữ liệu gọi hàm onExport khi được nhấn.
 *
 * Props:
 * - onImport: function – Callback khi người dùng nhấn nút Nhập dữ liệu.
 * - onExport: function – Callback khi người dùng nhấn nút Xuất dữ liệu.
 */
const DataActions = ({ onImport, onExport, showImport = true }) => {
    return (
        <div className="flex gap-2">
            {showImport && (
                <Button
                    variant="contained"
                    startIcon={<Upload size={18} />}
                    onClick={onImport}
                    className="relative overflow-hidden"
                    sx={{
                        height: "36px",
                        borderRadius: "12px",
                        background: "linear-gradient(135deg, #1976D2 0%, #42A5F5 100%)",
                        color: "#ffffff",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        textTransform: "none",
                        px: 3,
                        boxShadow: "0 4px 14px 0 rgba(25, 118, 210, 0.4)",
                        border: "none",
                        position: "relative",
                        overflow: "hidden",
                        transition: "all 0.3s ease",
                        "&:hover": {
                            background: "linear-gradient(135deg, #1565C0 0%, #1E88E5 100%)",
                            boxShadow: "0 6px 24px 0 rgba(25, 118, 210, 0.6)",
                            transform: "translateY(-2px)",
                        },
                        "&:active": {
                            transform: "translateY(0px)",
                        },
                        "&::after": {
                            content: '""',
                            position: "absolute",
                            top: 0,
                            left: "-100%",
                            width: "50%",
                            height: "100%",
                            background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)",
                            transform: "skewX(-25deg)",
                            animation: "sweepShine 3s cubic-bezier(0.4, 0, 0.2, 1) infinite",
                        },
                        "@keyframes sweepShine": {
                            "0%": { left: "-100%" },
                            "50%, 100%": { left: "200%" },
                        },
                    }}
                >
                    Nhập dữ liệu
                </Button>
            )}
            <Button
                variant="outlined"
                startIcon={<Download size={16} />}
                onClick={onExport}
                sx={{
                    height: "36px",
                    borderRadius: "12px",
                    boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.06)",
                    borderColor: "rgba(229, 231, 233, 1)",
                    backgroundColor: "#ffffff",
                    color: "#374151",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    textTransform: "none",
                    px: 2,
                    "&:hover": {
                        backgroundColor: "#f9fafb",
                        borderColor: "#cbd5e1",
                    },
                }}
            >
                Xuất dữ liệu
            </Button>
        </div>
    );
};

/**
 * Component DeleteSelectedButton
 * - Hiển thị nút Xoá để xóa các mục đã chọn.
 * - Nút sẽ chỉ kích hoạt khi có ít nhất 1 mục được chọn.
 *
 * Props:
 * - selectedCount: number – Số lượng mục đã chọn.
 * - onClick: function – Callback khi người dùng nhấn nút Xoá.
 */
const DeleteSelectedButton = ({ selectedCount = 0, onClick }) => {
    return (
        <Button
            variant="contained"
            sx={{
                backgroundColor: "rgba(240, 68, 56, 1)",
                borderRadius: "14px",
                boxShadow: 2,
                borderColor: "rgba(229, 231, 233, 1)",
                textTransform: "none",
                "&:hover": {
                    backgroundColor: "rgba(220, 55, 40, 1)",
                },
            }}
            disabled={selectedCount === 0}
            onClick={onClick}
            startIcon={<Trash2 />}
        >
            Xoá {selectedCount > 0 && `${selectedCount}`} mục đã chọn
        </Button>
    );
};

const RestoreSelectedButton = ({ selectedCount = 0, onClick }) => {
    return (
        <Button
            variant="contained"
            sx={{
                backgroundColor: "#34C759", // Green color for restore
                borderRadius: "14px",
                boxShadow: 2,
                textTransform: "none",
                color: "#fff",
                "&:hover": {
                    backgroundColor: "#2a9d4a",
                },
            }}
            disabled={selectedCount === 0}
            onClick={onClick}
            startIcon={<UndoOutlined />}
        >
            Khôi phục {selectedCount > 0 && `${selectedCount}`} mục đã chọn
        </Button>
    );
};

/**
 * Component AddCompanyButton
 * - Hiển thị nút Thêm doanh nghiệp để thêm doanh nghiệp mới.
 * - Nút kích hoạt hàm onClick khi được nhấn.
 *
 * Props:
 * - onClick: function – Callback khi người dùng nhấn nút Thêm doanh nghiệp.
 */
const AddCompanyButton = ({ onClick }) => {
    return (
        <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={onClick}
            sx={{
                // height: "36px",
                borderRadius: "14px",
                backgroundColor: "#34C759",
                // width: "100%",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 500,
                textTransform: "none",
                height: "100%",
                px: 2, // Giảm padding ngang (hoặc bỏ nếu muốn theo content hoàn toàn)
                minWidth: "unset", //Cho phép chiều rộng theo nội dung
                width: "fit-content", //Đặt chiều rộng vừa đủ nội dung
                boxShadow: "none",

                "&:hover": {
                    backgroundColor: "#2a9d4a",
                    boxShadow: "none",
                },
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            Thêm doanh nghiệp
        </Button >
    );
};

const AddButton = ({ onClick, text, className }) => {
    return (
        <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={onClick}
            sx={{
                height: "100%",
                borderRadius: "14px",
                backgroundColor: "#34C759",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 500,
                textTransform: "none",
                px: 2, // Giảm padding ngang (hoặc bỏ nếu muốn theo content hoàn toàn)
                minWidth: "unset", //Cho phép chiều rộng theo nội dung
                width: "fit-content", //Đặt chiều rộng vừa đủ nội dung
                boxShadow: "none",

                "&:hover": {
                    backgroundColor: "#2a9d4a",
                    boxShadow: "none"
                },
            }}
            className={className}
        >
            {text}
        </Button>
    );
};

const AddResourceButton = ({ onClick }) => (
    <AddButton onClick={onClick} text="Thêm mới" />
);

const AddZoneButton = ({ onClick }) => (
    <AddButton onClick={onClick} text="Thêm khu công nghiệp" />
);

// Nút thêm tài khoản tại Table
const CreateAccountButton = ({ onClick, text = "Thêm tài khoản" }) => (
    <AddButton onClick={onClick} text={text} />
);

// Nút Hủy bỏ tạo tài khoản khi admin đang tạo tài khoản mới
const CancelButton = ({ onClick, children = "Hủy bỏ", ...props }) => (
    <button
        onClick={onClick}
        className="px-6 py-2 mr-5 font-bold text-gray-400 transition-colors duration-200 bg-gray-100 border rounded"
        {...props}
    >
        {children}
    </button>
);

// Nút Tạo tài khoản
const AddAccountButton = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="px-6 py-2 rounded text-white bg-[#0D5E8B] transition-colors duration-200 font-bold"
        >
            Thêm tài khoản
        </button>
    );
};

// Nút Lưu thông tin
const SaveButton = ({ onClick, children = "Lưu thông tin", ...props }) => (
    <button
        onClick={onClick}
        className="px-6 py-2 rounded text-white bg-[#0D5E8B] transition-colors duration-200 font-bold"
        {...props}
    >
        {children}
    </button>
);

// Nút Quay về
const BackButton = ({ onClick, children = "Quay về", ...props }) => (
    <button
        onClick={onClick}
        className="px-6 py-2 font-bold text-gray-600 transition-colors duration-200 bg-gray-200 rounded"
        {...props}
    >
        {children}
    </button>
);

// Nút Khóa tài khoản
const LockAccountButton = ({
    onClick,
    children = "Khóa tài khoản",
    ...props
}) => (
    <button
        onClick={onClick}
        className="px-6 py-2 font-bold text-white transition-colors duration-200 bg-red-500 rounded"
        {...props}
    >
        {children}
    </button>
);

// Nút Ngưng tài khoản
const DeactivateAccountButton = ({
    onClick,
    children = "Ngưng tài khoản",
    ...props
}) => (
    <button
        onClick={onClick}
        className="px-6 py-2 font-bold text-white transition-colors duration-200 bg-red-500 rounded"
        {...props}
    >
        {children}
    </button>
);

// Nút Làm mới
const RefreshButton = ({ onClick, loading = false, className = "", title = "Làm mới" }) => (
    <button
        onClick={onClick}
        className={`h-9 w-9 flex items-center justify-center rounded-2xl border border-gray-300 bg-white text-gray-500 hover:text-[#4E5BA6] hover:border-[#4E5BA6] transition-all ${className}`}
        title={title}
    >
        <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
    </button>
);

export {
    ActionButtons,
    DataActions,
    DeleteSelectedButton,
    RestoreSelectedButton,
    AddCompanyButton,
    AddZoneButton,
    AddAccountButton,
    CancelButton,
    SaveButton,
    BackButton,
    LockAccountButton,
    DeactivateAccountButton,
    CreateAccountButton,
    AddResourceButton,
    AddButton,
    RefreshButton
};
