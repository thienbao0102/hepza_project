import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { handlerInitiateResetPassword } from '@services/authService';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const ResetPasswordInit = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    useEffect(() => {
        const initiateReset = async () => {
            if (token) {
                try {
                    await handlerInitiateResetPassword(token); // Gọi API để khởi tạo reset password
                    navigate('/reset-password'); // Chuyển hướng đến trang reset password
                } catch (error) {
                    console.error('Error initiating reset:', error.message);
                    navigate('/error', { state: { error: error.message } }); // Chuyển hướng đến trang lỗi
                }
            } else {
                navigate('/error', { state: { error: 'No token provided' } });
            }
        };

        initiateReset();
    }, [token, navigate]);

    return (
        <div className="flex items-center justify-center h-screen">
            <LoadingSpinner tip="Đang xử lý..." />
        </div>
    );
};

export default ResetPasswordInit;