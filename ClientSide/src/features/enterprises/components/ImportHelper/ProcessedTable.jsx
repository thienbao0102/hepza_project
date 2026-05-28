import ImportEmptyState from '@/components/common/Import/ImportEmptyState';

const ProcessedTable = ({ tableData, file, onCheckFile, isProcessing, isManager }) => {
  const renderStatusBadge = (row) => {
    switch (row.status) {
    case 'valid':
      return (
        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-[#BBF7D0] bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-medium text-[#16A34A]">
                        Hợp lệ
        </span>
      );
    case 'error':
      return (
        <span
          className="inline-flex cursor-help items-center whitespace-nowrap rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-medium text-[#DC2626]"
          title={row?.errors?.join(', ') || ''}
        >
          {row?.errors?.[0] || 'Thiếu hoặc sai dữ liệu bắt buộc'}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center whitespace-nowrap rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2 py-0.5 text-[10px] font-medium text-[#6B7280]">
                        Chưa kiểm tra
        </span>
      );
    }
  };

  return (
    <div className="flex h-0 flex-grow flex-col overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
      {tableData.length === 0 ? (
        <ImportEmptyState
          hasFile={!!file}
          isProcessing={isProcessing}
          onCheckFile={onCheckFile}
        />
      ) : (
        <div className="h-full w-full overflow-auto">
          <table className="min-w-[1200px] w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-[#F3F4F6] shadow-sm">
              <tr>
                <th className="w-10 border-b-2 border-gray-200 p-3 text-center text-xs font-bold text-gray-700" rowSpan="2">#</th>
                <th className="border-b-2 border-r border-gray-200 bg-gray-100 p-2 text-center text-xs font-bold text-gray-700" colSpan={isManager ? 12 : 13}>
                                    Thông tin doanh nghiệp
                </th>
                <th className="border-b-2 border-gray-200 bg-gray-100 p-2 text-center text-xs font-bold text-gray-700" colSpan="3">
                                    Tài khoản đại diện
                </th>
                <th className="w-32 border-b-2 border-gray-200 bg-gray-50 p-3 text-center text-xs font-bold text-gray-700" rowSpan="2">
                                    Trạng thái
                </th>
              </tr>
              <tr>
                <th className="min-w-[150px] whitespace-nowrap border-b-2 border-gray-200 p-2 text-[11px] font-semibold text-gray-600">Tên doanh nghiệp *</th>
                <th className="whitespace-nowrap border-b-2 border-gray-200 p-2 text-[11px] font-semibold text-gray-600">Mã số thuế / ĐKKD *</th>
                <th className="whitespace-nowrap border-b-2 border-gray-200 p-2 text-[11px] font-semibold text-gray-600">Mã môi trường</th>
                {!isManager && <th className="whitespace-nowrap border-b-2 border-gray-200 p-2 text-[11px] font-semibold text-gray-600">Khu công nghiệp / Khu chế xuất *</th>}
                <th className="whitespace-nowrap border-b-2 border-gray-200 p-2 text-[11px] font-semibold text-gray-600">Năm thành lập</th>
                <th className="min-w-[150px] whitespace-nowrap border-b-2 border-gray-200 p-2 text-[11px] font-semibold text-gray-600">Địa chỉ</th>
                <th className="whitespace-nowrap border-b-2 border-gray-200 p-2 text-[11px] font-semibold text-gray-600">Nhóm ngành *</th>
                <th className="whitespace-nowrap border-b-2 border-gray-200 p-2 text-[11px] font-semibold text-gray-600">Ngành nghề *</th>
                <th className="whitespace-nowrap border-b-2 border-gray-200 p-2 text-[11px] font-semibold text-gray-600">Loại hình doanh nghiệp</th>
                <th className="whitespace-nowrap border-b-2 border-gray-200 p-2 text-[11px] font-semibold text-gray-600">Quy mô nhân sự</th>
                <th className="whitespace-nowrap border-b-2 border-gray-200 p-2 text-[11px] font-semibold text-gray-600">Website</th>
                <th className="whitespace-nowrap border-b-2 border-gray-200 p-2 text-[11px] font-semibold text-gray-600">Doanh thu</th>
                <th className="whitespace-nowrap border-b-2 border-gray-200 p-2 text-[11px] font-semibold text-gray-600">Thị trường</th>
                <th className="whitespace-nowrap border-b-2 border-gray-200 p-2 text-[11px] font-semibold text-gray-600">Họ tên</th>
                <th className="whitespace-nowrap border-b-2 border-gray-200 p-2 text-[11px] font-semibold text-gray-600">Email</th>
                <th className="whitespace-nowrap border-b-2 border-gray-200 p-2 text-[11px] font-semibold text-gray-600">Số điện thoại</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-200">
              {tableData.map((row, idx) => (
                <tr key={idx} className="transition-colors hover:bg-blue-50/50">
                  <td className="whitespace-nowrap p-2 text-center text-xs font-medium text-gray-500">{idx + 1}</td>
                  <td className="whitespace-nowrap p-2 text-xs font-medium text-gray-800">{row.name}</td>
                  <td className="whitespace-nowrap p-2 text-xs text-gray-600">{row.tax_id}</td>
                  <td className="whitespace-nowrap p-2 text-xs text-gray-600">{row.env_legal_id}</td>
                  {!isManager && <td className="whitespace-nowrap p-2 text-xs text-gray-600">{row.industrial_park}</td>}
                  <td className="whitespace-nowrap p-2 text-center text-xs text-gray-600">{row.established_year}</td>
                  <td className="max-w-[150px] truncate whitespace-nowrap p-2 text-xs text-gray-600" title={row.address}>{row.address}</td>
                  <td className="whitespace-nowrap p-2 text-xs text-gray-600">{row.industry_group}</td>
                  <td className="whitespace-nowrap p-2 text-xs text-gray-600">{row.industry}</td>
                  <td className="whitespace-nowrap p-2 text-center text-xs text-gray-600">{row.type}</td>
                  <td className="whitespace-nowrap p-2 text-center text-xs text-gray-600">{row.employee_count}</td>
                  <td className="max-w-[100px] truncate whitespace-nowrap p-2 text-xs text-gray-600">{row.website}</td>
                  <td className="whitespace-nowrap p-2 text-right text-xs text-gray-600">{row.revenue}</td>
                  <td className="whitespace-nowrap p-2 text-xs text-gray-600">{row.market}</td>
                  <td className="whitespace-nowrap p-2 text-xs font-medium text-gray-800">{row.representative}</td>
                  <td className="whitespace-nowrap p-2 text-xs text-gray-600">{row.email}</td>
                  <td className="whitespace-nowrap p-2 text-xs text-gray-600">{row.phone}</td>
                  <td className="whitespace-nowrap p-2 text-center">{renderStatusBadge(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProcessedTable;
