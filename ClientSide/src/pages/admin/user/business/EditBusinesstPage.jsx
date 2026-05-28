import { Input, DatePicker, Button, Alert, Typography } from "antd";
import { useState } from "react";
import { DeleteOutlined, StopOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
    CancelButton,
    SaveButton,
    BackButton,
    LockAccountButton,
    DeactivateAccountButton,
} from "@components/ui/Button";
import BusinessInfoForm from "@/features/admin/components/user/business/EditFormInfoBasic";
import CompanyInfoBlock from "@/features/admin/components/user/business/FormBusiness";
import { Save } from "lucide-react";

const { Title, Text } = Typography;

const EditBusinessPage = ({
    businessData = {},
    onSubmit,
    onCancel,
    onBack,
    onLock,
    onUnlock,
}) => {
    const [formState, setFormState] = useState({
        fullName: businessData.fullName || "",
        position: businessData.position || "",
        department: businessData.department || "",
        phoneNumber: businessData.phoneNumber || "",
        email: businessData.email || "",
        birthday: businessData.birthday ? dayjs(businessData.birthday) : null,
        zones: businessData.zones || [],
    });

    const handleChange = (field, value) => {
        setFormState((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onSubmit &&
            onSubmit({
                ...formState,
                birthday: formState.birthday?.toISOString?.() || null,
            });
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <Title level={4}>Chỉnh sửa tài khoản</Title>
                    <div className="flex items-center space-x-2">
                        <span className="text-blue-600 font-semibold cursor-pointer">
                            DN-2025-023
                        </span>
                        <span className="bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full font-medium">
                            Đang hoạt động
                        </span>
                        <span className="bg-green-50 text-green-800 text-sm px-3 py-1 rounded-full font-medium border border-green-300">
                            Công ty TNHH Sản xuất Điện tử ABC
                        </span>
                    </div>
                </div>
                <BackButton onClick={onBack} />
            </div>

            {/* Tabs giả lập */}
            <div className="flex space-x-6 border-b pb-2 text-gray-600 font-medium">
                <span className="text-blue-600 border-b-2 border-blue-600 pb-1 cursor-pointer">
                    Thông tin cơ bản
                </span>
                <span className="cursor-not-allowed text-gray-400">Bảo mật</span>
                <span className="cursor-not-allowed text-gray-400">Quyền truy cập</span>
                <span className="cursor-not-allowed text-gray-400">Trạng thái</span>
            </div>

            {/* Thông tin doanh nghiệp */}
            <div className="bg-gray-50 p-4 rounded border space-y-2">
                <Title level={5} className="!mb-2">
                    🏢 Thông tin doanh nghiệp
                </Title>
                <CompanyInfoBlock
                    company={{
                        name: "Công ty TNHH Sản xuất Điện tử ABC",
                        taxCode: "0312345678",
                        industryZone: "Tân Tạo - Lô A12",
                        manager: "Nguyễn Văn A (Giám đốc)",
                    }}
                />

            </div>

            {/* Thông tin cá nhân */}
            <div className="bg-gray-50 p-4 rounded border space-y-4">
                <Title level={5} className="!mb-2">
                    👤 Thông tin cá nhân
                </Title>
                <BusinessInfoForm formState={formState} onChange={handleChange} />
            </div>

            {/* Thao tác nguy hiểm */}
            <div className="bg-gray-50 p-4 rounded border space-y-4">
                <Title level={5}>⚠️ Thao tác nguy hiểm</Title>
                <Alert
                    type="warning"
                    message="Lưu ý: Tài khoản đã xóa không thể khôi phục. Tất cả dữ liệu liên quan sẽ bị xoá vĩnh viễn."
                    showIcon
                />
                <div className="flex flex-col md:flex-row gap-4">
                    <DeactivateAccountButton onClick={onLock}>Xóa tài khoản</DeactivateAccountButton>
                    <LockAccountButton onClick={onUnlock} />
                </div>
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end gap-4 mt-4">
                <CancelButton onClick={onCancel} />
                <SaveButton onClick={handleSave} />
            </div>
        </div>
    );
};

export default EditBusinessPage;