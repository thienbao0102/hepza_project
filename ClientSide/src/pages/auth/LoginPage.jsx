import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { handlerLogin, handlerVerifyLoginOtp, handlerResendLoginOtp } from '@services/authService';
import { useAuth } from '@app/providers/auth/AuthProvider';
import { EyeOutlined, EyeInvisibleOutlined, LoadingOutlined, InfoCircleOutlined, SafetyOutlined } from '@ant-design/icons';
import packageJson from '../../../package.json';
import { Spin } from 'antd';
import logoHepza from '../../assets/LogoHepza.png';

const LoginPage = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [errors, setErrors] = useState({
        email: '',
        password: ''
    });
    const [serverError, setServerError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [otpRequired, setOtpRequired] = useState(false);
    const [otp, setOtp] = useState('');
    const [otpMessage, setOtpMessage] = useState('');
    const [otpCooldown, setOtpCooldown] = useState(0);
    const navigate = useNavigate();
    const { setUser, user, isAuthenticated, isVerifying } = useAuth();

    const handleChange = (e) => {
        if (serverError) {
            setServerError('');
        }
        if (successMessage) {
            setSuccessMessage('');
        }
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: ''
            });
        }
    };

    const validateForm = () => {
        let valid = true;
        const newErrors = { email: '', password: '' };

        if (!formData.email) {
            newErrors.email = 'Vui lòng nhập email';
            valid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email không hợp lệ';
            valid = false;
        }

        if (!formData.password) {
            newErrors.password = 'Vui lòng nhập mật khẩu';
            valid = false;
        } else if (formData.password.length < 6) {
            newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    useEffect(() => {
        if (isAuthenticated && user && !isVerifying) {
            if (user.firstLogin) {
                navigate('/change-password', { replace: true });
            } else if (user.role === 'admin') {
                navigate('/admin/overview', { replace: true });
            } else if (user.role === 'manager') {
                navigate('/manager/overview', { replace: true });
            } else if (user.role === 'company') {
                navigate('/overview', { replace: true });
            } else {
                navigate('/overview', { replace: true });
            }
        }
    }, [isAuthenticated, user, isVerifying, navigate]);

    useEffect(() => {
        if (otpCooldown <= 0) return undefined;
        const timer = window.setInterval(() => {
            setOtpCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [otpCooldown]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // If OTP step, validate OTP
        if (otpRequired) {
            if (!otp || otp.length !== 6) {
                setServerError('Vui lòng nhập mã OTP 6 chữ số');
                return;
            }
        } else if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        let isOtpNowRequired = false;
        try {
            if (otpRequired) {
                const result = await handlerVerifyLoginOtp(formData.email, otp);
                // OTP was correct and account is unlocked!
                setOtpRequired(false);
                setFormData((prev) => ({ ...prev, password: '' }));
                setOtp('');
                setSuccessMessage(result.message || 'Tài khoản đã được mở khóa. Vui lòng thử lại mật khẩu.');
                setServerError('');
                setErrors({ email: '', password: '' });
                setIsSubmitting(false);
                return;
            }

            const data = await handlerLogin(
                formData.email,
                formData.password
            );

            // Login successful
            const userToSet = {
                ...data.user,
                zone_id: data.zone_id,
            };
            setUser(userToSet);
            setOtpRequired(false);
            setOtp('');
        } catch (error) {
            console.error('Login error:', error);
            if (error.code === 'ERR_NETWORK') {
                navigate('/network-error');
            } else if (error.status === 429) {
                setServerError('Bạn đã đăng nhập quá nhiều lần. Vui lòng quay lại sau.');
            } else if (error.status >= 500) {
                navigate('/server-error');
            } else {
                const errorMsg = error?.response?.data?.error || error.message || '';

                // Backend 403 GATE: forces UI into OTP mode
                if (error.response?.data?.otpRequired) {
                    setOtpRequired(true);
                    isOtpNowRequired = true;
                    setServerError(errorMsg);
                    setOtpMessage('Mã OTP bảo mật đã được gửi đến email của bạn. Vui lòng nhập mã để tiếp tục.');
                    setOtpCooldown(60);
                    setErrors({ email: '', password: '' });
                } else if (errorMsg.includes('OTP')) {
                    setServerError(errorMsg);
                } else {
                    setServerError('');
                    setErrors({
                        email: 'Thông tin đăng nhập không chính xác.',
                        password: 'Thông tin đăng nhập không chính xác.'
                    });
                }
            }
        } finally {
            // Do not clear password if OTP is currently required or just became required
            if (!otpRequired && !isOtpNowRequired) {
                setFormData((prev) => ({ ...prev, password: '' }));
            }
            setIsSubmitting(false);
        }
    };

    const handleBackToLogin = () => {
        setOtpRequired(false);
        setOtp('');
        setOtpMessage('');
        setOtpCooldown(0);
        setServerError('');
        setFormData({ email: '', password: '' });
    };

    const handleResendOtp = async () => {
        if (otpCooldown > 0 || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const result = await handlerResendLoginOtp(formData.email);
            setOtpMessage(result.message || 'Mã OTP mới đã được gửi đến email của bạn.');
            setServerError('');
            setOtpCooldown(60);
        } catch (error) {
            setServerError(error?.response?.data?.error || error.message || 'Không thể gửi lại mã OTP.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-screen flex bg-gray-50 relative">
            <div className='absolute left-2 bottom-2 text-sm text-gray-500'>
                <p>Phiên bản: {packageJson.version}</p>
                <p>Ngày phát hành: {packageJson.dateRelease}</p>
            </div>
            <div className="w-full lg:w-1/2 bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="flex flex-col items-center justify-center">
                        <img
                            src={logoHepza}
                            alt="Logo"
                            className="h-25 w-auto"
                        />
                        <h2 className=" text-xl text-center font-medium text-gray-900">
                            BAN QUẢN LÝ CÁC KHU CHẾ XUẤT VÀ CÔNG NGHIỆP THÀNH PHỐ HỒ CHÍ MINH
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            {otpRequired
                                ? 'Xác thực bảo mật hai bước'
                                : 'Chào mừng trở lại, vui lòng nhập thông tin dưới đây'}
                        </p>
                    </div>

                    <div className="mt-2 bg-gray-50 py-8 px-4 sm:rounded-lg sm:px-10">
                        {serverError && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
                                <InfoCircleOutlined />
                                {serverError}
                            </div>
                        )}

                        {successMessage && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
                                <SafetyOutlined />
                                {successMessage}
                            </div>
                        )}

                        {otpRequired && otpMessage && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg flex items-center gap-2">
                                <SafetyOutlined />
                                {otpMessage}
                            </div>
                        )}

                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {!otpRequired ? (
                                <>
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                            Email
                                        </label>
                                        <div className="mt-1 relative">
                                            <input
                                                id="email"
                                                name="email"
                                                type="email"
                                                autoComplete="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                className={`appearance-none block w-full px-3 py-2 border ${errors.email ? 'border-red-300' : 'border-gray-300'} rounded-[14px] shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                                                placeholder="Nhập email của bạn"
                                            />
                                            {errors.email && (
                                                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                            Mật khẩu
                                        </label>
                                        <div className="mt-1 relative">
                                            <input
                                                id="password"
                                                name="password"
                                                type={showPassword ? 'text' : 'password'}
                                                autoComplete="current-password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                className={`appearance-none block w-full px-3 py-2 border ${errors.password ? 'border-red-300' : 'border-gray-300'} rounded-[14px] shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10`}
                                                placeholder="Nhập mật khẩu của bạn"
                                            />
                                            <div
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 cursor-pointer"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? (
                                                    <EyeInvisibleOutlined className="h-5 w-5 text-gray-400" />
                                                ) : (
                                                    <EyeOutlined className="h-5 w-5 text-gray-400" />
                                                )}
                                            </div>
                                        </div>
                                        {errors.password && (
                                            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                                        )}
                                    </div>

                                    <div className="text-sm text-right">
                                        <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                                            Quên mật khẩu?
                                        </Link>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                                            Mã xác thực (OTP)
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                id="otp"
                                                name="otp"
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={6}
                                                autoComplete="one-time-code"
                                                value={otp}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setOtp(val);
                                                    if (serverError) setServerError('');
                                                }}
                                                className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-[14px] shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-[0.5em] font-mono"
                                                placeholder="000000"
                                                autoFocus
                                            />
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500 text-center">
                                            Nhập mã 6 chữ số đã gửi đến email <span className="font-medium text-gray-700">{formData.email}</span>
                                        </p>
                                    </div>

                                    <div className="text-sm text-center">
                                        <button
                                            type="button"
                                            onClick={handleResendOtp}
                                            disabled={otpCooldown > 0 || isSubmitting}
                                            className={`mb-3 font-medium ${otpCooldown > 0 || isSubmitting ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-500'}`}
                                        >
                                            {otpCooldown > 0 ? `Gửi lại OTP sau ${otpCooldown}s` : 'Gửi lại mã OTP'}
                                        </button>
                                    </div>

                                    <div className="text-sm text-center">
                                        <button
                                            type="button"
                                            onClick={handleBackToLogin}
                                            className="font-medium text-blue-600 hover:text-blue-500"
                                        >
                                            ← Quay lại đăng nhập
                                        </button>
                                    </div>
                                </>
                            )}

                            <div>
                                <button
                                    type="submit"
                                    className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-[14px] shadow-sm text-sm font-medium text-white bg-[#4E5BA6] hover:bg-[#404c8a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Spin
                                                indicator={<LoadingOutlined style={{ fontSize: 16, color: 'white' }} spin />}
                                                size="small"
                                            />
                                            <span className="ml-2">{otpRequired ? 'Đang xác thực...' : 'Đang đăng nhập...'}</span>
                                        </>
                                    ) : (
                                        otpRequired ? 'Xác thực OTP' : 'Đăng nhập'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
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

export default LoginPage;
