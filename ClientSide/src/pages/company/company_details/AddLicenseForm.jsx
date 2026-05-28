import { useState } from "react";
import { X, FileText } from "lucide-react";
import { useNotification } from '@app/providers/notification/NotificationProvider';
import { mapErrorToNotification } from '@/utils/Error/mapErrorToNotification';


const AddLicenseForm = ({ onClose, onSubmit, initialData, mode }) => {
  const [form, setForm] = useState({
    name: initialData?.name || "",
    number: initialData?.number || "",
    place: initialData?.place || "",
    startDate: initialData?.startDate || "",
    expiredDate: initialData?.expiredDate || "",
    file: initialData?.file || null
  });

  const [errors, setErrors] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const { notify } = useNotification();

  const onChange = (key) => (e) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleFileChange = (e) => {
    setForm((prev) => ({ ...prev, file: e.target.files[0] }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      setForm((prev) => ({ ...prev, file: e.dataTransfer.files[0] }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = "Vui lòng nhập tên giấy phép";
    if (!form.place.trim()) newErrors.place = "Vui lòng nhập nơi cấp";
    if (!form.number.trim()) newErrors.number = "Vui lòng nhập số giấy phép";

    if (!form.startDate) newErrors.startDate = "Vui lòng chọn ngày cấp";
    if (!form.expiredDate) newErrors.expiredDate = "Vui lòng chọn ngày hết hạn";

    if (form.startDate && form.expiredDate) {
      const start = new Date(form.startDate);
      const exp = new Date(form.expiredDate);
      if (start > exp) {
        newErrors.expiredDate = "Ngày hết hạn phải sau ngày cấp";
        const { title } = mapErrorToNotification(null, 'CREATE_LICENSE');
        notify({ type: 'error', title, description: newErrors.expiredDate });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit(form);
  };

  const isEdit = mode === 'edit';

  return (
    <div className="flex flex-col">
      {/* ── Modal Header ── */}
      <div className="relative pb-5 mb-6">
        {/* Gradient accent line */}
        <div className="absolute -top-5 -left-5 -right-5 h-[4px] bg-gradient-to-r from-[#4E5BA6] to-[#7C8ADB] rounded-t-3xl" />

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 xl:h-12 xl:w-12 bg-[#4E5BA6]/10 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 xl:w-6 xl:h-6 text-[#4E5BA6]" />
            </div>
            <div>
              <h2 className="text-xl xl:text-2xl font-extrabold text-gray-900 leading-tight">
                {isEdit ? 'Chỉnh sửa giấy phép' : 'Thêm giấy phép mới'}
              </h2>
              <p className="text-xs xl:text-sm text-gray-400 mt-0.5">
                {isEdit ? 'Cập nhật thông tin giấy phép & chứng nhận' : 'Nhập thông tin giấy phép & chứng nhận'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 xl:h-10 xl:w-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors duration-200 cursor-pointer"
          >
            <X className="w-4 h-4 xl:w-5 xl:h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* ── Form Body ── */}
      <div className="space-y-5">

        {/* Row 1: Tên GP + Nơi cấp */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-5">
          <FormField
            label="Tên giấy phép / chứng nhận"
            required
            error={errors.name}
          >
            <input
              value={form.name}
              onChange={onChange("name")}
              placeholder="VD: Giấy phép môi trường"
              className={inputClass(errors.name)}
            />
          </FormField>

          <FormField
            label="Nơi cấp"
            required
            error={errors.place}
          >
            <input
              value={form.place}
              onChange={onChange("place")}
              placeholder="VD: Bộ Tài nguyên và Môi trường"
              className={inputClass(errors.place)}
            />
          </FormField>
        </div>

        {/* Row 2: Số GP + 2 Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-5">
          <FormField
            label="Số giấy phép"
            required
            error={errors.number}
          >
            <input
              value={form.number}
              onChange={onChange("number")}
              placeholder="VD: 123456"
              className={inputClass(errors.number)}
            />
          </FormField>

          <FormField
            label="Ngày cấp"
            required
            error={errors.startDate}
          >
            <input
              type="date"
              value={form.startDate}
              onChange={onChange("startDate")}
              className={inputClass(errors.startDate)}
            />
          </FormField>

          <FormField
            label="Ngày hết hạn"
            required
            error={errors.expiredDate}
          >
            <input
              type="date"
              value={form.expiredDate}
              onChange={onChange("expiredDate")}
              className={inputClass(errors.expiredDate)}
            />
          </FormField>
        </div>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 xl:px-6 xl:py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm xl:text-base flex items-center gap-2 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 xl:px-7 xl:py-3 rounded-xl bg-[#4E5BA6] text-white font-semibold text-sm xl:text-base flex items-center gap-2 hover:bg-[#3d4885] shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer"
          >
            {isEdit ? 'Cập nhật' : 'Lưu giấy phép'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Reusable FormField wrapper ── */
const FormField = ({ icon, label, required, error, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="flex items-center gap-1.5 text-sm xl:text-base font-semibold text-gray-700">
      {icon}
      {label}
      {required && <span className="text-red-400 text-xs">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-xs xl:text-sm text-red-500 font-medium flex items-center gap-1 mt-0.5">
        <span className="inline-block w-1 h-1 rounded-full bg-red-400" />
        {error}
      </p>
    )}
  </div>
);

/* ── Input class helper ── */
const inputClass = (hasError) =>
  `w-full rounded-xl px-4 py-3 xl:px-5 xl:py-3.5 border text-sm xl:text-base text-gray-800 placeholder:text-gray-300 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 transition-all duration-200
   ${hasError
    ? "border-red-300 focus:ring-red-400/30 focus:border-red-400"
    : "border-gray-200 focus:ring-[#4E5BA6]/20 focus:border-[#4E5BA6]"
  }`;

export default AddLicenseForm;
