import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Radio } from 'antd';
import toast from '@/utils/toast';
import { mapErrorToNotification } from '@/utils/Error/mapErrorToNotification';
import { handlerRequestPasswordReset } from '@services/authService';
import { getRoundedAntdModalProps } from '@/components/common/roundedAntdModal';

const ForgotPasswordConfirmModal = ({ open, visible, onCancel, user }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const isOpen = open ?? visible;

    if (!user) return null;

    const maskEmail = (email) => {
        if (!email) return '';
        const [localPart, domain] = email.split('@');
        if (localPart.length <= 3) {
            return `${localPart[0]}*****@${domain}`;
        }
        return `${localPart.substring(0, 2)}*****${localPart.slice(-1)}@${domain}`;
    };

    const handleContinue = async () => {
        setLoading(true);
        try {
            await handlerRequestPasswordReset(user.email);
            onCancel(); // Close this modal
            navigate('/check-email', { state: { email: user.email } });
        } catch (error) {
            const { title, description } = mapErrorToNotification(error, 'COMMON');
            toast.error(title ?? 'Không thể gửi yêu cầu', description ?? (error.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={<span className="text-2xl font-bold">Đặt lại mật khẩu của bạn</span>}
            {...getRoundedAntdModalProps({
                width: 620,
            })}
            open={isOpen}
            onCancel={onCancel}
            footer={[
                <Button key="back" size="large" onClick={onCancel} className="font-semibold hover:text-[#4E5BA6]">
                    Không phải bạn?
                </Button>,
                <Button key="submit" type="primary" size="large" loading={loading} onClick={handleContinue} className="font-semibold bg-[#4E5BA6] hover:bg-[#4E5BA6]">
                    Tiếp tục
                </Button>,
            ]}
            centered
            width={600}
        >
            <div className="flex items-start justify-between pt-4">
                <div className="flex-grow">
                    <p className="font-semibold text-base">Bạn muốn nhận mã để đặt lại mật khẩu bằng cách nào?</p>
                    <Radio.Group defaultValue="email" className="mt-4">
                        <Radio value="email" className="flex items-center">
                            <div className="ml-2">
                                <p className="font-medium">Gửi mã qua email</p>
                                <p className="text-gray-500">{maskEmail(user.email)}</p>
                            </div>
                        </Radio>
                    </Radio.Group>
                </div>
                <div className="text-center ml-8 flex-shrink-0">
                    <img src={user.avatar || 'https://i.pravatar.cc/150'} alt="avatar" className="w-20 h-20 mx-auto rounded-full" />
                    <p className="mt-2 font-semibold">{user.full_name}</p>
                    <p className="text-sm text-gray-500">Người dùng</p>
                </div>
            </div>
        </Modal>
    );
};

export default ForgotPasswordConfirmModal;
