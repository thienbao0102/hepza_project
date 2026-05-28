import { useState } from "react";
import {
    Tabs,
    Input,
    Select,
    DatePicker,
    Typography,
    Button,
    Alert,
} from "antd";
import dayjs from "dayjs";
import {
    CancelButton,
    SaveButton,
    BackButton,
    LockAccountButton,
    DeactivateAccountButton,
} from "@components/ui/Button";
import PersonalInfoForm from "@/features/admin/components/user/management/EditFormInfoBasic";

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { Option } = Select;

const EditUserPage = ({
    userData = {},
    onSubmit,
    onCancel,
    onBack,
    onLock,
    onUnlock,
}) => {
    const [formState, setFormState] = useState({
        fullName: userData.fullName || "",
        position: userData.position || "",
        department: userData.department || "",
        phoneNumber: userData.phoneNumber || "",
        email: userData.email || "",
        birthday: userData.birthday ? dayjs(userData.birthday) : null,
        zones: userData.zones || [],
    });

    const handleChange = (field, value) => {
        setFormState((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onSubmit({
            ...formState,
            birthday: formState.birthday?.toISOString?.() || null,
        });
    };

    return (
        <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Title level={4}>Chỉnh sửa tài khoản</Title>
                    <span className="text-blue-600 font-semibold cursor-pointer">
                        QL-2023-005
                    </span>
                    <span className="ml-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                        Đang hoạt động
                    </span>
                </div>
                <BackButton onClick={onBack} />
            </div>

            {/* Tabs */}
            <Tabs defaultActiveKey="1">
                <TabPane tab="Thông tin cơ bản" key="1">
                    {/* Thông tin cá nhân */}
                    <div className="bg-white rounded-lg p-6 shadow border">
                        <Title level={5} className="mb-4">
                            Thông tin cá nhân
                        </Title>
                        <PersonalInfoForm formState={formState} onChange={handleChange} />
                    </div>

                    {/* Thao tác nguy hiểm */}
                    <div className="bg-white rounded-lg p-6 shadow border mt-6">
                        <Title level={5}>Thao tác nguy hiểm</Title>
                        <Alert
                            message="Lưu ý: Tài khoản đã xóa không thể khôi phục. Tất cả dữ liệu liên quan sẽ bị mất."
                            type="warning"
                            showIcon
                            className="my-4"
                        />
                        <div className="flex flex-col md:flex-row gap-4">
                            <LockAccountButton onClick={onLock} />
                            <DeactivateAccountButton onClick={onUnlock} />
                        </div>
                    </div>

                    {/* Footer buttons */}
                    <div className="flex justify-end gap-4 mt-6">
                        <CancelButton onClick={onCancel} />
                        <SaveButton onClick={handleSave} />
                    </div>
                </TabPane>
                <TabPane tab="Bảo mật" key="2" disabled />
                <TabPane tab="Phân quyền" key="3" disabled />
                <TabPane tab="Trạng thái" key="4" disabled />
            </Tabs>
        </div>
    );
};

export default EditUserPage;
