import React from 'react';
import { useNavigate } from 'react-router-dom';

const PasswordResetSuccessPage = () => {
    const navigate = useNavigate();

    const handleGoToLogin = () => {
        navigate('/login');
    };

    return (
        <div className="h-screen flex items-center justify-center bg-white">
            <div className="text-center max-w-lg mx-auto p-8">
                <img
                    src="/LogoKey.png"
                    alt="Password Reset Success"
                    className="mx-auto h-40 w-auto mb-8"
                />
                <h1 className="text-3xl font-bold text-[#4E5BA6]">
                    Đổi mật khẩu thành công
                </h1>
                <p className="mt-4 text-base text-gray-600">
                    Đã thay đổi mật khẩu! Bạn đã đặt lại mật khẩu thành công!
                </p>
                <div className="mt-8">
                    <button
                        onClick={handleGoToLogin}
                        className="w-full sm:w-auto inline-flex justify-center py-3 px-8 border border-transparent rounded-[14px] shadow-sm text-sm font-medium text-white bg-[#4E5BA6] hover:bg-[#404c8a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Vào trang đăng nhập
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PasswordResetSuccessPage;
