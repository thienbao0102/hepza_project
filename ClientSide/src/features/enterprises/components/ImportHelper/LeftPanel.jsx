import ImportUploadZone from '@/components/common/Import/ImportUploadZone';

const LeftPanel = ({ file, onFileSelect, onRemoveFile, isManager, managedZoneLabel }) => {
  return (
    <div className="flex h-full flex-col gap-6 lg:col-span-2">
      <ImportUploadZone
        file={file}
        onFileSelect={onFileSelect}
        onRemoveFile={onRemoveFile}
      />

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-[#4B5563]">
          Quy định nhập dữ liệu
        </h3>

        {isManager ? (
          <div className="mb-3 rounded-lg border border-[#C7D2FE] bg-[#EEF2FF] px-3 py-2 text-sm text-[#3730A3]">
            Tất cả doanh nghiệp trong file sẽ được gán vào KCN bạn đang quản lý:
            <span className="ml-1 font-semibold">{managedZoneLabel}</span>
          </div>
        ) : null}

        <ul className="list-disc space-y-2 pl-4 text-sm text-gray-700">
          <li>
            Mỗi dòng hợp lệ phải có đủ <span className="font-medium">tên doanh nghiệp, số đăng ký kinh doanh, 1 nhóm ngành, 1 ngành nghề chi tiết</span> và <span className="font-medium">thông tin tài khoản đại diện</span>.
          </li>
          <li>
            Hệ thống sẽ tạo ngay <span className="font-medium">tài khoản đại diện đầu tiên</span> khi import thành công.
          </li>
          <li>
            Email hoặc số điện thoại của tài khoản đại diện bị trùng sẽ bị <span className="font-medium">đánh dấu không hợp lệ</span> ngay ở bước kiểm tra file.
          </li>
          <li>
            Template hiện giữ theo style chuẩn của HEPZA và dùng <span className="font-medium">1 nhóm ngành + 1 ngành nghề</span> để thao tác nhanh, rõ và ít lỗi hơn.
          </li>
          <li>
            {isManager
              ? 'File của manager không có cột Khu công nghiệp; hệ thống tự gán theo phạm vi quản lý hiện tại.'
              : 'File của admin có thêm cột Khu công nghiệp; KCN/KCX phải tồn tại sẵn trong hệ thống trước khi import.'}
          </li>
          <li>
            Nhóm ngành và ngành nghề nên chọn đúng theo danh mục mới trong sheet <span className="font-medium">Danh_muc</span> hoặc dropdown ngay trong sheet nhập liệu.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default LeftPanel;
