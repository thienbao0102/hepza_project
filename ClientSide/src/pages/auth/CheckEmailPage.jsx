import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const CheckEmailPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const email = location.state?.email || '';

    const handleGoBack = () => {
        // Navigate back to the forget password page
        navigate('/forgot-password');
    };

    const inboxLink = email.endsWith('@gmail.com')
        ? 'https://mail.google.com/'
        : `mailto:${email}`;

    return (
        <div className="h-screen flex items-center justify-center bg-white">
            <div className="text-center max-w-lg mx-auto p-8">
                <img src="/LogoEmail.png" alt="Email Sent" className="mx-auto h-40 w-40" />

                <h1 className="mt-6 text-3xl font-bold text-[#4E5BA6]">
                    Kiểm tra email của bạn!
                </h1>
                <p className="mt-4 text-base text-gray-600">
                    Cảm ơn bạn! Một email đã được gửi{email ? ` đến ${email}` : ''}, trong đó có chứa liên kết để bạn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư đến và làm theo hướng dẫn.
                </p>

                <div className="mt-8">
                    <a
                        href={inboxLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto inline-flex justify-center py-3 px-8 border border-transparent rounded-[14px] shadow-sm text-sm font-medium text-white bg-[#4E5BA6] hover:bg-[#404c8a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Mở hộp thư đến
                    </a>
                </div>

                <div className="mt-6">
                    <button
                        onClick={handleGoBack}
                        className="font-medium text-gray-700 hover:text-gray-900 flex items-center justify-center text-sm mx-auto"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Quay lại trang gửi email
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CheckEmailPage;
