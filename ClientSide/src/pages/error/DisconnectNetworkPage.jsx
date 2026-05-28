import { useNavigate } from 'react-router-dom';

const DisconnectNetworkPage = () => {
    const navigate = useNavigate();

    const handleGoBack = () => {
        navigate(-1); // Go back to the previous page
    };

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="text-center flex flex-col items-center">
                <img src="/Disconnect.png" alt="Network Disconnected" className="w-50" />
                <h1 className="text-5xl mt-10 font-bold text-[#4E5BA6]">Mất Kết Nối Mạng</h1>
                <p className="mt-4 text-lg font-normal text-gray-400">Không thể kết nối đến máy chủ. <br />Vui lòng kiểm tra lại đường truyền Internet của bạn.</p>
                <button onClick={handleGoBack} className="mt-6 inline-block px-6 py-3 bg-[#4E5BA6] text-white rounded-xl hover:bg-[#4253b1] transition-colors">
                    Thử lại
                </button>
            </div>
        </div>
    );
}

export default DisconnectNetworkPage;
