import React from "react";
import { Info, KeyRound } from 'lucide-react';
import { Button, Space } from 'antd';

const FormPrivacy = ({
    formData = {},
    handleCancel,
    handleAddAccount,
    loading = false,
    isUpdate = false,
}) => {
    return (
        <div>
            <span className="flex items-start gap-2 text-[#4E5BA6]">
                <KeyRound />
                <p className="text-2xl font-medium">Thông tin đăng nhập</p>
            </span>
            <p className="block mt-2">
                {isUpdate
                    ? "Thông tin đăng nhập của người dùng. Tên đăng nhập là email."
                    : "Hệ thống sẽ tự động tạo mã tài khoản và mật khẩu sau khi bạn nhấn \"Tạo tài khoản\"."}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-2">
                <div className="">
                    <p className="block mb-1 font-medium text-gray-700">Tên đăng nhập</p>
                    <span className="block w-full bg-gray-200 text-gray-600 p-2 rounded-[10px] mt-1">
                        {formData.email || 'Vui lòng nhập email'}
                    </span>
                </div>

                <div className="">
                    <p className="block mb-1 font-medium text-gray-700">Mật khẩu</p>
                    <span className="block w-full bg-gray-200 text-gray-600 p-2 rounded-[10px] mt-1">
                        {isUpdate ? "********" : "Mật khẩu sẽ được gửi về email"}
                    </span>
                </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
                <Button
                    size="large"
                    onClick={handleCancel}
                    className="px-6"
                >
                    Hủy
                </Button>
                <Button
                    type="primary"
                    size="large"
                    onClick={handleAddAccount}
                    loading={loading}
                    className="px-6 bg-[#4E5BA6] hover:bg-[#404c8a]"
                >
                    {isUpdate ? "Cập nhật tài khoản" : "Tạo tài khoản"}
                </Button>
            </div>
        </div>
    );
};

export default FormPrivacy;