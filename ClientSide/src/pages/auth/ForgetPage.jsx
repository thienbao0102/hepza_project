import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { handlerRequestPasswordReset } from '@services/authService';
import logoHepza from '../../assets/LogoHepza.png';

const ForgetPage = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            setError('Vui lòng nhập email');
            return;
        }
        setError('');
        setMessage('');
        setIsSubmitting(true);
        try {
            await handlerRequestPasswordReset(email);
            setMessage('Link đặt lại mật khẩu đã được gửi đến email của bạn.');
            navigate('/check-email', { state: { email } });
        } catch (err) {
            setError(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-screen flex bg-gray-50">
            {/* Cột form */}
            <div className="w-full lg:w-1/2 bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <div className="flex flex-col items-center justify-center">
                        <img
                            src={logoHepza}
                            alt="Logo"
                            className="h-25 w-auto"
                        />
                        <h2 className="mt-2 text-xl text-center font-medium text-gray-900">
                            BAN QUẢN LÝ CÁC KHU CHẾ XUẤT VÀ CÔNG NGHIỆP THÀNH PHỐ HỒ CHÍ MINH
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Điền email của bạn để bắt đầu quá trình đặt lại mật khẩu
                        </p>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`appearance-none block w-full px-3 py-2 border ${error ? 'border-red-300' : 'border-gray-300'} rounded-[14px] shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                                    placeholder="Nhập email của bạn"
                                />
                            </div>
                        </div>

                        {message && <p className="text-sm text-green-600 text-center">{message}</p>}
                        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-[14px] shadow-sm text-sm font-medium text-white bg-[#4E5BA6] hover:bg-[#404c8a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70"
                            >
                                {isSubmitting ? 'Đang gửi...' : 'Gửi email đặt lại mật khẩu'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <Link to="/login" className="font-medium text-gray-700 hover:text-gray-900 flex items-center justify-center text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                            Quay lại trang đăng nhập
                        </Link>
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

export default ForgetPage;
