import { useNavigate } from 'react-router-dom';

const ErrorServerPage = () => {
    const navigate = useNavigate();

    const handleGoBack = () => {
        navigate(-1); // Go back to the previous page
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="text-center flex flex-col items-center">
                <img src="/ServerError.png" alt="Server Error" className="w-50" />
                <h1 className="text-5xl mt-10 font-bold text-[#4E5BA6]">Lỗi Máy Chủ</h1>
                <p className="mt-4 text-lg font-normal text-gray-400">Đã có lỗi xảy ra từ phía máy chủ. <br />Vui lòng thử lại sau ít phút.</p>
                <button onClick={handleGoBack} className="mt-6 inline-block px-6 py-3 bg-[#4E5BA6] text-white rounded-xl hover:bg-[#4253b1] transition-colors">
                    Thử lại
                </button>
            </div>
        </div>
    );
}

export default ErrorServerPage;
