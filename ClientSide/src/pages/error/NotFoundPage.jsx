import { Link } from "react-router-dom";

const NotFoundPage = () => {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="text-center flex flex-col items-center">
                <img src="/404.png" alt="" className="w-50" />
                <h1 className="text-5xl mt-10 font-bold text-[#4E5BA6]">Không tìm thấy trang</h1>
                <p className="mt-4 text-lg font-normal text-gray-400">Trang này không tồn tại hoặc đã bị xóa! <br />Chúng tôi đề nghị bạn quay về trang chủ.</p>
                <Link to={"/"} className="mt-6 inline-block px-6 py-3 bg-[#4E5BA6] text-white rounded-xl hover:bg-[#4253b1]transition-colors">
                    Go to Home
                </Link>
            </div>
        </div>
    );
}

export default NotFoundPage;