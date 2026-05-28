
import React, { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@app/providers/auth/AuthProvider';
import { useAuthenticatedUser, useChangePassword } from '@features/auth/hooks/useAuthQueries';
import { useUpdateMyProfile, useVerifyEmailOtp } from '@features/admin/hooks/useUserQueries';
import { Layout, Avatar, Input, Select, Button } from 'antd';
import ChangePasswordModal from '@features/auth/components/profile/ChangePasswordModal';
import ForgotPasswordConfirmModal from '@features/auth/components/profile/ForgotPasswordConfirmModal';
import ChangeEmailModal from '@features/auth/components/profile/ChangeEmailModal';
import VerifyEmailOtpModal from '@features/auth/components/profile/VerifyEmailOtpModal';
import Notification from '@components/common/Notifications';
import ConfirmationModal from '@components/common/ConfirmationModal';
import { useHeader } from '@/components/common/Header/HeaderContext';
import { SearchOutlined, BellOutlined, MailOutlined, EditOutlined, LogoutOutlined } from '@ant-design/icons';
import { LogOut } from 'lucide-react';
import { useZone } from '@features/industrialzone/hooks/useZoneQueries';


const { Content } = Layout;
const { Option } = Select;

const FormItem = memo(({ label, placeholder, type = 'input', options = [] }) => (
    <div className="flex flex-col gap-2">
        <label className="font-medium text-gray-700">{label}</label>
        {type === 'select' ? (
            <Select placeholder={placeholder} className="h-10 rounded-lg">
                {options.map(opt => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}
            </Select>
        ) : (
            <Input placeholder={placeholder} className="h-10 rounded-lg" />
        )}
    </div>
));

const ProfilePage = ({ isEmbedded = false }) => {
    const { logout } = useAuth();

    // Use TanStack Query for auth data
    const {
        data: authData,
        isLoading: loading,
        error: authError,
        refetch: refetchUser
    } = useAuthenticatedUser();

    const user = authData?.user ?? authData;
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [initialFormData, setInitialFormData] = useState({}); // State to store initial form data
    const [isFormChanged, setIsFormChanged] = useState(false); // State to track form changes
    const [phoneError, setPhoneError] = useState("");
    // TanStack Query mutations
    const updateProfileMutation = useUpdateMyProfile();
    const changePasswordMutation = useChangePassword();
    const verifyOtpMutation = useVerifyEmailOtp();
    const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
    const [isForgotModalVisible, setIsForgotModalVisible] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isEmailModalVisible, setIsEmailModalVisible] = useState(false);
    const [isOtpModalVisible, setIsOtpModalVisible] = useState(false);
    const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [notification, setNotification] = useState({ open: false, type: 'info', title: '', description: '' });
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const { setHeaderConfig, date, setDate, setBreadcrumbItems } = useHeader();

    useEffect(() => {
        if (!isEmbedded) {
            setHeaderConfig({
                title: "TRANG CÁ NHÂN",
                description: "Tất cả thông tin của bạn đều được bảo mật và an toàn.",
                showWeather: true,
                showDatePicker: false,
            });
            setBreadcrumbItems([
                {
                    key: '/profile',
                    title: "Trang cá nhân"
                },
            ])
        }
    }, [isEmbedded]);
    useEffect(() => {
        if (user) {
            const initialData = {
                fullName: user.full_name || '',
                phone_number: user.phone_number || '',
                role: user.role === 'admin' ? 'Quản trị viên' : user.role === 'manager' ? 'Ban quản lý' : user.role === 'company' ? 'Đại diện doanh nghiệp' : 'Người dùng',
                first_login: user.firstLogin === false ? 'Đã thay đổi mật khẩu lần đầu' : 'Chưa thay đổi mật khẩu lần đầu',
                zoneManageId: user.managed_company_ids || '',

            };
            setFormData(initialData);
            setInitialFormData(initialData);
        }
    }, [user]);







    useEffect(() => {
        // Check if form data has changed from the initial state
        setIsFormChanged(JSON.stringify(formData) !== JSON.stringify(initialFormData));
    }, [formData, initialFormData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEdit = () => setIsEditing(true);

    const handleCancel = () => {
        setIsEditing(false);
        setFormData(initialFormData); // Reset form data to initial state
    };

    const handleChangePassword = async (values) => {
        const { currentPassword, newPassword, confirmPassword } = values;

        changePasswordMutation.mutate(
            { currentPassword, newPassword, confirmPassword },
            {
                onSuccess: () => {
                    setIsPasswordModalVisible(false);
                    setNotification({
                        open: true,
                        type: 'success',
                        title: 'THÀNH CÔNG',
                        description: 'Mật khẩu của bạn đã được thay đổi thành công.',
                        buttonText: 'Đóng',
                    });
                },
                onError: (error) => {
                    let errorMessage = 'Đã có lỗi xảy ra. Vui lòng thử lại.';

                    // Map cac thong diep loi pho bien cho UX ro rang hon
                    if (error && typeof error.message === 'string') {
                        const msg = error.message;
                        if (
                            msg.includes('Current password is incorrect') ||
                            msg.includes('Mật khẩu hiện tại không đúng') ||
                            msg.includes('incorrect password') ||
                            msg.includes('wrong password') ||
                            msg.includes('Sai mật khẩu cũ')
                        ) {
                            errorMessage = 'Mật khẩu cũ không đúng. Vui lòng kiểm tra lại.';
                        } else if (
                            msg.includes('Password too weak') ||
                            msg.includes('Mật khẩu quá yếu')
                        ) {
                            errorMessage = 'Mật khẩu mới quá yếu. Vui lòng chọn mật khẩu mạnh hơn.';
                        } else {
                            errorMessage = msg;
                        }
                    }

                    setNotification({
                        open: true,
                        type: 'error',
                        title: 'THẤT BẠI',
                        description: errorMessage,
                        buttonText: 'Thử lại',
                    });
                }
            }
        );
    };

    const handleSave = async () => {
        if (!formData.fullName) {
            setNotification({
                open: true,
                type: 'error',
                title: 'THẤT BẠI',
                description: 'Họ và tên không được để trống.',
                buttonText: 'Thử lại',
            });
            return;
        }
        if (formData.phone_number && !/^\d{10,11}$/.test(formData.phone_number)) {
            setNotification({
                open: true,
                type: 'error',
                title: 'THẤT BẠI',
                description: 'Số điện thoại không hợp lệ.',
                buttonText: 'Thử lại',
            });
            return;
        }

        const updateData = {
            full_name: formData.fullName,
            phone_number: formData.phone_number,
        };

        updateProfileMutation.mutate(
            { updateData },
            {
                onSuccess: (response) => {
                    if (response.otpRequired) {
                        setNotification({
                            open: true,
                            type: 'error',
                            title: 'THẤT BẠI',
                            description: 'Cập nhật email không được phép trong form này',
                            buttonText: 'Thử lại',
                        });
                        return;
                    }

                    // Refetch user data to update cache
                    refetchUser();

                    setNotification({
                        open: true,
                        type: 'success',
                        title: 'THÀNH CÔNG',
                        description: 'Thông tin của bạn đã được cập nhật.',
                        buttonText: 'Đóng',
                    });
                    setIsEditing(false);
                },
                onError: (error) => {
                    let errorMessage = error.message || 'Cập nhật thất bại. Vui lòng thử lại.';
                    if (typeof errorMessage === 'string' && errorMessage.includes('E11000') && errorMessage.includes('phone_number')) {
                        errorMessage = 'Số điện thoại đã có người sử dụng.';
                    }
                    setNotification({
                        open: true,
                        type: 'error',
                        title: 'THẤT BẠI',
                        description: errorMessage,
                        buttonText: 'Thử lại',
                    });
                }
            }
        );
    };

    const handleUpdateEmail = async (values) => {
        if (values.newEmail === user.email) {
            setNotification({
                open: true,
                type: 'error',
                title: 'THẤT BẠI',
                description: 'Email mới phải khác email hiện tại',
                buttonText: 'Thử lại',
            });
            return;
        }

        const updateData = { email: values.newEmail };

        updateProfileMutation.mutate(
            { updateData, currentPassword: values.currentPassword },
            {
                onSuccess: (response) => {
                    // Refetch user data to update cache
                    refetchUser();

                    setNewEmail(updateData.email);

                    // HTTP returns { otpRequired: true }, Socket (via service layer) returns { updatedUser: { otpRequired: true } }
                    const isOtpRequired = response?.otpRequired || response?.updatedUser?.otpRequired;

                    if (isOtpRequired) {
                        // OTP required - close email modal and open OTP modal directly
                        setIsEmailModalVisible(false);
                        setIsOtpModalVisible(true);
                    } else {
                        setNotification({
                            open: true,
                            type: 'success',
                            title: 'THÀNH CÔNG',
                            description: 'Email đã được cập nhật thành công.',
                            buttonText: 'Đóng',
                        });
                    }
                },
                onError: (error) => {
                    setNotification({
                        open: true,
                        type: 'error',
                        title: 'THẤT BẠI',
                        description: error.message || 'Cập nhật email thất bại. Vui lòng thử lại.',
                        buttonText: 'Thử lại',
                    });
                }
            }
        );
    };

    const handleNotificationClose = () => {
        setNotification({ ...notification, open: false });
        console.log('Notification closed, isOtpModalVisible:', isOtpModalVisible); // Debug
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className={`h-full overflow-y-auto font-sans ${isEmbedded ? 'py-2' : ''}`}>
            <div className="">
                {/* ---- 3. Card Profile chinh voi hieu ung do bong va bo tron lon hon ---- */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* ---- 4. Banner va Avatar duoc cai tien ---- */}
                    <div className="relative mb-24">
                        {/* Su dung anh that hoac mot gradient dep hon. Them lop phu toi de chu noi bat */}
                        <div
                            className="h-40 md:h-48 rounded-t-2xl bg-cover bg-center"
                            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1553095066-5014bc7b7f2d?q=80&w=2787&auto=format&fit=crop')" }}
                        >
                            <div className="w-full h-full bg-black/30"></div>
                        </div>
                        {/* Can chinh lai vi tri avatar va cac nut */}
                        <div className="absolute flex flex-col sm:flex-row items-center sm:items-end justify-between w-full px-6 -bottom-20 sm:-bottom-16">
                            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
                                {/* Avatar noi bat voi vien lon va do bong */}
                                <Avatar
                                    size={128}
                                    src={user?.avatar || `/default-avatar.png`}
                                    className="border-8 border-white rounded-full shadow-md"
                                />
                                <div className="text-center sm:text-left mb-0 sm:mb-2">
                                    <h2 className="text-2xl font-bold text-slate-800">{user?.full_name}</h2>
                                    <p className="text-slate-500">{user?.email}</p>
                                </div>
                            </div>
                            {/* ---- 5. He thong Button moi nhat quan ---- */}
                            {isEditing ? (
                                <div className="flex gap-3 mt-4 sm:mt-0">
                                    <Button size="large" className="!rounded-lg" onClick={handleCancel}>{"Hủy"}</Button>
                                    <Button
                                        size="large"
                                        className="!rounded-lg !bg-[#4E5BA6] hover:!bg-[#4E5BA6] !text-white !font-semibold"
                                        onClick={handleSave}
                                        loading={updateProfileMutation.isPending}
                                        disabled={!isFormChanged || updateProfileMutation.isPending}
                                    >
                                        {"Lưu thay đổi"}
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex gap-3 mt-4 sm:mt-0">
                                    <Button
                                        icon={<LogOut />}
                                        onClick={() => setShowLogoutConfirm(true)}
                                        className="!font-semibold !text-slate-600 !bg-white hover:!bg-red-50 hover:!text-red-600 !border !border-slate-200 !rounded-lg !flex !items-center !shadow-sm"
                                        size="large"
                                    >
                                        {"Đăng xuất"}
                                    </Button>
                                    <Button
                                        size="large"
                                        className="!rounded-lg !bg-[#4E5BA6] hover:!bg-[#4E5BA6] !text-white !font-semibold"
                                        onClick={handleEdit}
                                        icon={<EditOutlined />}
                                    >
                                        {"Chỉnh sửa"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ---- 6. Form duoc thiet ke lai voi label va input ro rang hon ---- */}
                    <div className="p-6 md:p-8">
                        <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2 border-b border-slate-200 pb-8">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">{"Họ và Tên"}</label>
                                <Input
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    disabled={!isEditing}
                                    className="!h-11 !rounded-md !border-slate-300 focus:!border-indigo-500 focus:!ring-indigo-500 disabled:!bg-slate-100 !text-slate-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">{"Số điện thoại"}</label>
                                <Input
                                    name="phone_number"
                                    value={formData.phone_number}
                                    disabled={!isEditing}
                                    placeholder={"Chưa cập nhật"}
                                    maxLength={11}
                                    inputMode="numeric"
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setFormData(prev => ({
                                            ...prev,
                                            phone_number: value,
                                        }));
                                        setPhoneError("");
                                    }}
                                    className="!h-11 !rounded-md !border-slate-300 focus:!border-indigo-500 focus:!ring-indigo-500 disabled:!bg-slate-100 !text-slate-600"
                                />

                                {phoneError && (
                                    <p className="text-red-500 text-sm mt-1">
                                        {phoneError}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">{"Vai trò"}</label>
                                <Input
                                    name="role"
                                    value={formData.role}
                                    disabled
                                    className="!h-11 !rounded-md !border-slate-300 !bg-slate-100 !text-slate-600"
                                />
                            </div>
                        </div>

                        {/* ---- 7. Khu vuc Bao mat duoc lam lai theo dang danh sach ---- */}
                        <div className="mt-8">
                            <h3 className="text-xl font-bold text-slate-800 mb-4">{"Email và Bảo mật"}</h3>
                            <ul className="divide-y divide-slate-200">
                                <li className="flex items-center justify-between py-4 hover:bg-slate-50 rounded-md px-2 -mx-2">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center justify-center w-10 h-10 text-[#4E5BA6] bg-[#4E5BA620] rounded-full shrink-0">
                                            <MailOutlined />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">{"Địa chỉ Email"}</p>
                                            <p className="text-slate-600">{user?.email}</p>
                                        </div>
                                    </div>
                                    <Button
                                        type="default"
                                        className="!font-semibold"
                                        onClick={() => setIsEmailModalVisible(true)}
                                    >
                                        {"Thay đổi"}
                                    </Button>
                                </li>
                                <li className="flex items-center justify-between py-4 hover:bg-slate-50 rounded-md px-2 -mx-2">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center justify-center w-10 h-10 text-[#4E5BA6] bg-[#4E5BA620] rounded-full shrink-0">
                                            <LogOut />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-700">{"Mật khẩu"}</p>
                                            <p className="text-slate-600">{"Lần cập nhật cuối: 2 tháng trước"}</p>
                                        </div>
                                    </div>
                                    <Button
                                        type="default"
                                        className="!font-semibold"
                                        onClick={() => setIsPasswordModalVisible(true)}
                                    >
                                        {"Thay đổi"}
                                    </Button>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <ChangePasswordModal
                        open={isPasswordModalVisible}
                        onCancel={() => setIsPasswordModalVisible(false)}
                        onFinish={handleChangePassword}
                        loading={changePasswordMutation.isPending}
                        user={user}
                        onForgotPasswordClick={() => {
                            setIsPasswordModalVisible(false);
                            setIsForgotModalVisible(true);
                        }}
                    />

                    <ForgotPasswordConfirmModal
                        open={isForgotModalVisible}
                        onCancel={() => setIsForgotModalVisible(false)}
                        user={user}
                    />

                    <ChangeEmailModal
                        open={isEmailModalVisible}
                        onCancel={() => setIsEmailModalVisible(false)}
                        onOtpRequired={() => setIsOtpModalVisible(true)}
                        loading={updateProfileMutation.isPending}
                        user={user}
                        onFinish={handleUpdateEmail}
                        onError={(message) =>
                            setNotification({
                                open: true,
                                type: 'error',
                                title: 'THẤT BẠI',
                                description: message,
                                buttonText: 'Thử lại',
                            })
                        }
                    />

                    <VerifyEmailOtpModal
                        open={isOtpModalVisible}
                        onCancel={() => setIsOtpModalVisible(false)}
                        loading={verifyOtpMutation.isPending}
                        user={user}
                        email={newEmail}
                        onSuccess={(message) =>
                            setNotification({
                                open: true,
                                type: 'success',
                                title: 'THÀNH CÔNG',
                                description: message,
                                buttonText: 'Đóng',
                            })
                        }
                        onError={(message) =>
                            setNotification({
                                open: true,
                                type: 'error',
                                title: 'THẤT BẠI',
                                description: message,
                                buttonText: 'Thử lại',
                            })
                        }
                    />

                    <Notification
                        open={notification.open}
                        type={notification.type}
                        title={notification.title}
                        description={notification.description}
                        buttonText={notification.buttonText}
                        onClose={handleNotificationClose}
                        onButtonClick={handleNotificationClose}
                        cancelText={"Hủy"}
                    />

                    <ConfirmationModal
                        open={showLogoutConfirm}
                        onClose={() => setShowLogoutConfirm(false)}
                        onConfirm={handleLogout}
                        title={"Xác nhận đăng xuất"}
                        content={"Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?"}
                        confirmText={"Đăng xuất"}
                        cancelText={"Hủy bỏ"}
                    />
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
