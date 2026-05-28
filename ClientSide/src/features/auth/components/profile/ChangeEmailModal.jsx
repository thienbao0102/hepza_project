import React, { useEffect } from 'react';
import { Modal, Form, Input, Button } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { getRoundedAntdModalProps } from '@/components/common/roundedAntdModal';

const ChangeEmailModal = ({ open, visible, onCancel, loading, onFinish }) => {
    const [form] = Form.useForm();
    const isOpen = open ?? visible;

    useEffect(() => {
        if (isOpen) {
            form.resetFields();
        }
    }, [isOpen, form]);

    return (
        <Modal
            {...getRoundedAntdModalProps({
                width: 520,
                title: null,
                footer: null,
                styles: {
                    body: { padding: '5px' },
                },
            })}
            open={isOpen}
            onCancel={onCancel}
        >
            <div className="p-4 text-center">
                <h2 className="text-2xl font-bold mb-2 text-gray-800">Cập nhật Email</h2>
                <p className="text-gray-500 mb-6">Vui lòng nhập mật khẩu và email mới của bạn.</p>
            </div>

            <Form
                form={form}
                onFinish={onFinish}
                layout="vertical"
                className="px-4 pb-4"
            >
                <Form.Item
                    name="currentPassword"
                    label={<span className="font-semibold text-gray-600">Mật khẩu hiện tại</span>}
                    rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại!' }]}
                >
                    <Input.Password
                        prefix={<LockOutlined className="site-form-item-icon" />}
                        placeholder="Nhập mật khẩu của bạn"
                        size="large"
                        className="rounded-md"
                    />
                </Form.Item>

                <Form.Item
                    name="newEmail"
                    label={<span className="font-semibold text-gray-600">Email mới</span>}
                    rules={[{ required: true, type: 'email', message: 'Email không hợp lệ!' }]}
                >
                    <Input
                        prefix={<MailOutlined className="site-form-item-icon" />}
                        placeholder="Nhập email mới"
                        size="large"
                        className="rounded-md"
                    />
                </Form.Item>

                <Form.Item className="mt-6">
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        className="w-full bg-[#4E5BA6] hover:bg-[#4E5BA6] text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                        size="large"
                    >
                        Xác nhận thay đổi
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ChangeEmailModal;
