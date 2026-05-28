const ForbbidenPage = () => {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
            <div className="text-center flex flex-col items-center">
                <img src="/Stop.png" alt="" className="w-50" />
                <h1 className="text-5xl mt-10 font-bold text-[#4E5BA6]">Truy cập bị từ chối</h1>
                <p className="mt-4 text-lg font-normal text-gray-400">Bạn không có quyền hạn để truy cập vào trang này! <br />Chúng tôi đề nghị bạn quay về trang chủ.</p>
                <a href="/" className="mt-6 inline-block px-6 py-3 bg-[#4E5BA6] text-white rounded-xl hover:bg-[#4253b1]transition-colors">
                    Go to Home
                </a>
            </div>
        </div>
    );
}

export default ForbbidenPage;