import React, { useState, useMemo } from 'react';
import { handlerResetPassword } from '@services/authService';
import { useNavigate } from 'react-router-dom';
import { EyeOutlined, EyeInvisibleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import zxcvbn from 'zxcvbn';

const ResetPasswordPage = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', color: '' });

    const isNewPasswordValid = useMemo(() => newPassword.length >= 8, [newPassword]);
    const isConfirmPasswordValid = useMemo(() => newPassword && newPassword === confirmPassword, [newPassword, confirmPassword]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        if (!isNewPasswordValid) {
            setError('Mật khẩu phải có ít nhất 8 ký tự.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Mật khẩu không trùng khớp.');
            return;
        }

        try {
            await handlerResetPassword(newPassword, confirmPassword);
            navigate('/password-reset-success');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="h-screen flex bg-gray-50">
            <div className="w-full lg:w-1/2 bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="flex flex-col items-center justify-center">
                        <img src="/LogoEmail2.png" alt="Email Sent" className="mx-auto h-40 w-40" />

                        <h1 className="mt-6 text-3xl font-bold text-[#4E5BA6]">
                            Đặt lại mật khẩu
                        </h1>
                        <p className="mt-4 text-base text-gray-600">
                            Vui lòng đặt mật khẩu mới của bạn.
                        </p>
                    </div>
                    <div className="mt-2 bg-gray-50 py-8 px-4 sm:rounded-lg sm:px-10">
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            <div>
                                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                                    Mật khẩu mới
                                </label>
                                <div className="mt-1 relative">
                                    <input
                                        id="new-password"
                                        type={passwordVisible ? 'text' : 'password'}
                                        value={newPassword}
                                        placeholder="Nhập mật khẩu của bạn"
                                        onChange={(e) => {
                                            const password = e.currentTarget.value;
                                            setNewPassword(password);
                                            if (password) {
                                                const result = zxcvbn(password);
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
                                        }}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-[14px] placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        required
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                                        {isNewPasswordValid && <CheckCircleOutlined className="text-green-500 mr-2" />}
                                        <button type="button" onClick={() => setPasswordVisible(!passwordVisible)} className="text-gray-500 focus:outline-none focus:text-gray-600">
                                            {passwordVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                                        </button>
                                    </div>
                                </div>
                                {newPassword.length > 0 && !isNewPasswordValid && (
                                    <p className="mt-2 text-sm text-red-600">
                                        Mật khẩu phải có ít nhất 8 ký tự.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                                    Xác nhận mật khẩu mới
                                </label>
                                <div className="mt-1 relative">
                                    <input
                                        id="confirm-password"
                                        type={confirmPasswordVisible ? 'text' : 'password'}
                                        value={confirmPassword}
                                        placeholder="Nhập mật khẩu của bạn"
                                        onChange={(e) => setConfirmPassword(e.currentTarget.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-[14px] shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
                                        required
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                                        {isConfirmPasswordValid && <CheckCircleOutlined className="text-green-500 mr-2" />}
                                        <button type="button" onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)} className="text-gray-500 focus:outline-none focus:text-gray-600">
                                            {confirmPasswordVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {message && <p className="text-green-600 text-center font-medium">{message}</p>}
                            {error && <p className="text-red-600 text-center font-medium">{error}</p>}
                            <p className="text-xs text-gray-500">
                                Mật khẩu của bạn phải có tối thiểu 8 ký tự, đồng thời bao gồm cả chữ số, chữ cái và ký tự đặc biệt (!@$%).
                            </p>
                            {newPassword && (
                                <div className="mb-4">
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                            className={`h-2.5 rounded-full ${passwordStrength.color}`}
                                            style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-sm mt-1 text-right">{passwordStrength.text}</p>
                                </div>
                            )}

                            <div>
                                <button
                                    type="submit"
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-[14px] shadow-sm text-sm font-medium text-white bg-[#4E5BA6] hover:bg-[#404c8a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Đặt lại mật khẩu
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            {/* Cột hình ảnh - chiếm 1/2 màn hình */}
            <div className="hidden lg:block w-1/2 bg-gray-50">
                <div className="h-full flex justify-end">
                    <img
                        src="ImageLogin.png"
                        alt="HEPZA Background"
                        className="max-w-full max-h-[100vh] object-contain rounded-lg"
                    />
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;