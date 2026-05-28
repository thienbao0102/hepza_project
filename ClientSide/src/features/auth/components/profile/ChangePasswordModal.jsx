import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Checkbox } from 'antd';
import zxcvbn from 'zxcvbn';
import { getRoundedAntdModalProps } from '@/components/common/roundedAntdModal';

const ChangePasswordModal = ({ open, visible, onCancel, onFinish, loading, onForgotPasswordClick }) => {
    const [form] = Form.useForm();
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', color: '' });
    const newPassword = Form.useWatch('newPassword', form);
    const isOpen = open ?? visible;

    useEffect(() => {
        if (newPassword) {
            const result = zxcvbn(newPassword);
            const strength = {
                0: { text: 'Rất yếu', color: 'bg-red-500' },
                1: { text: 'Yếu', color: 'bg-orange-500' },
                2: { text: 'Trung bình', color: 'bg-yellow-500' },
                3: { text: 'Mạnh', color: 'bg-blue-500' },
                4: { text: 'Rất mạnh', color: 'bg-green-500' },
            };
            setPasswordStrength({ score: result.score, ...strength[result.score] });
        } else {
            setPasswordStrength({ score: 0, text: '', color: '' });
        }
    }, [newPassword]);

    const handleCancel = () => {
        form.resetFields();
        onCancel();
    };

    return (
        <Modal
            title={<span className="text-2xl font-bold">Đổi mật khẩu</span>}
            {...getRoundedAntdModalProps({
                width: 480,
                styles: {
                    body: { padding: '5px 5px 5px' },
                },
            })}
            open={isOpen}
            onCancel={handleCancel}
            footer={null}
        >
            <div className="p-4">
                <p className="mb-6 text-gray-600">
                    Mật khẩu của bạn phải có tối thiểu 8 ký tự, đồng thời bao gồm cả chữ số, chữ cái và ký tự đặc biệt (!@$%).
                </p>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    autoComplete="off"
                >
                    <Form.Item
                        name="currentPassword"
                        label="Mật khẩu hiện tại"
                        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }]}
                    >
                        <Input.Password size="large" placeholder="Nhập mật khẩu hiện tại" />
                    </Form.Item>

                    <Form.Item
                        name="newPassword"
                        label="Mật khẩu mới"
                        rules={[
                            { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                            { min: 8, message: 'Mật khẩu phải có ít nhất 8 ký tự!' },
                        ]}
                        hasFeedback
                    >
                        <Input.Password size="large" placeholder="Nhập mật khẩu mới" />
                    </Form.Item>
                    {newPassword && (
                        <div className="mb-4 -mt-4">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full ${passwordStrength.color}`}
                                    style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                                ></div>
                            </div>
                            <p className="text-sm mt-1 text-right">{passwordStrength.text}</p>
                        </div>
                    )}

                    <Form.Item
                        name="confirmPassword"
                        label="Nhập lại mật khẩu mới"
                        dependencies={['newPassword']}
                        hasFeedback
                        rules={[
                            { required: true, message: 'Vui lòng xác nhận mật khẩu mới!' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Mật khẩu mới không khớp!'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password size="large" placeholder="Nhập lại mật khẩu mới" />
                    </Form.Item>

                    <div className="text-left">
                        <a
                            className="text-blue-600 hover:text-blue-800"
                            onClick={onForgotPasswordClick}
                        >
                            Bạn quên mật khẩu ư?
                        </a>
                    </div>

                    <Form.Item shouldUpdate>
                        {() => (
                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                block
                                className="!bg-[#4E5BA6]"
                                loading={loading}
                                disabled={
                                    !form.isFieldsTouched(['currentPassword', 'newPassword', 'confirmPassword']) ||
                                    !!form.getFieldsError(['currentPassword', 'newPassword', 'confirmPassword']).filter(({ errors }) => errors.length).length
                                }
                            >
                                Đổi mật khẩu
                            </Button>
                        )}
                    </Form.Item>
                </Form>
            </div>
        </Modal>
    );
};

export default ChangePasswordModal;
