import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Typography, Space } from 'antd';
import { handlerVerifyEmailOtp, handlerUpdateMyProfile } from '@services/userService';
import { useAuth } from '@app/providers/auth/AuthProvider';
import { MailOutlined } from '@ant-design/icons';
import { getRoundedAntdModalProps } from '@/components/common/roundedAntdModal';

const { Text } = Typography;

const VerifyEmailOtpModal = ({ open, onCancel, loading, user, email, onSuccess, onError }) => {
    const [form] = Form.useForm();
    const [otp, setOtp] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [timer, setTimer] = useState(10 * 60);
    const [canResend, setCanResend] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [resendCount, setResendCount] = useState(0);
    const MAX_RESEND = 3;
    const { logout } = useAuth();

    useEffect(() => {
        let interval = null;
        if (open && timer > 0) {
            interval = setInterval(() => {
                setTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        setCanResend(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [open, timer]);

    useEffect(() => {
        if (open) {
            setTimer(10 * 60);
            setCanResend(false);
            setOtp('');
            setResendCount(0);
            form.resetFields();
        }
    }, [open, form]);

    const handleVerifyOtp = async () => {
        if (otp.length !== 6) {
            form.setFields([{ name: 'otp', errors: ['Mã OTP phải có đúng 6 ký tự'] }]);
            return;
        }
    
        setIsVerifying(true);
        try {
            const response = await handlerVerifyEmailOtp(user.user_id, otp);
            onSuccess('Email đã được xác minh thành công.');
            if (response.logoutRequired) {
                logout('Email của bạn đã được cập nhật, vui lòng đăng nhập lại', false);
            }
            onCancel();
        } catch (error) {
            form.setFields([{
                name: 'otp',
                errors: [error.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.'],
            }]);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendCount >= MAX_RESEND) {
            onError('Đã vượt quá số lần gửi lại OTP. Vui lòng thử lại sau.');
            return;
        }
        setIsResending(true);
        try {
            await handlerUpdateMyProfile({ email }, null);
            setTimer(10 * 60);
            setCanResend(false);
            setOtp('');
            setResendCount(prev => prev + 1);
            form.resetFields();
            onSuccess('OTP đã được gửi lại thành công.');
        } catch (error) {
            onError(error.message || 'Gửi lại OTP thất bại. Vui lòng thử lại.');
        } finally {
            setIsResending(false);
        }
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <Modal
            {...getRoundedAntdModalProps({
                width: 520,
                title: null,
                footer: null,
                styles: {
                    body: { padding: '28px' },
                },
            })}
            open={open}
            onCancel={onCancel}
        >
            <div className="p-4 text-center">
                <MailOutlined className="text-4xl text-blue-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2 text-gray-800">Xác thực Email của bạn</h2>
                <p className="text-gray-500 mb-6">
                    Chúng tôi đã gửi mã xác thực đến <Text strong>{email}</Text>. Vui lòng kiểm tra hộp thư của bạn.
                </p>
            </div>

            <Form form={form} onFinish={handleVerifyOtp} className="px-4 pb-4">
                <Form.Item
                    name="otp"
                    rules={[{ required: true, message: 'Vui lòng nhập mã OTP!' }]}
                    validateTrigger={['onChange', 'onBlur']}
                >
                    <div className="flex justify-center">
                        <Input.OTP
                            length={6}
                            size="large"
                            onChange={(value) => {
                                let strValue = '';
                                if (typeof value === 'string') {
                                    strValue = value;
                                } else if (Array.isArray(value)) {
                                    strValue = value.join('');
                                }
                                setOtp(strValue);
                                // Sync vào form để required hoạt động và hiển thị error
                                form.setFieldsValue({ otp: strValue });
                                // Optional: clear error khi đang nhập đủ
                                if (strValue.length === 6) {
                                    form.setFields([{ name: 'otp', errors: [] }]);
                                }
                            }}
                        />
                    </div>
                </Form.Item>

                <div className="text-center mb-6">
                    {timer > 0 ? (
                        <Text type="secondary">Mã sẽ hết hạn sau <Text strong className="text-blue-600">{formatTime(timer)}</Text></Text>
                    ) : (
                        <Text type="danger">Mã OTP đã hết hạn.</Text>
                    )}
                </div>

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={isVerifying || loading}
                        disabled={otp.length !== 6 || isVerifying || loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                        size="large"
                    >
                        Xác minh
                    </Button>
                </Form.Item>

                <div className="text-center">
                    <Space>
                        <Text>Chưa nhận được mã?</Text>
                        <Button
                            type="link"
                            onClick={handleResendOtp}
                            loading={isResending}
                            disabled={!canResend || resendCount >= MAX_RESEND}
                            className="font-semibold"
                        >
                            Gửi lại
                        </Button>
                        {resendCount >= MAX_RESEND && <Text type="danger" className="text-xs">Đã hết lượt gửi lại.</Text>}
                    </Space>
                </div>
            </Form>
        </Modal>
    );
};

export default VerifyEmailOtpModal;
