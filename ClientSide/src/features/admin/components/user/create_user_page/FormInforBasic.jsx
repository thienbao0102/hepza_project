import React, { useEffect } from 'react';
import { Typography, Input, Select, DatePicker, Form } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import SearchableSelect from '@/features/admin/components/user/create_user_page/SeachableSelect';
import { handlerGetAllZones } from '@services/zoneService';
import useZones from '@features/industrialzone/hooks/useZones';
// import useCompanies from '@features/enterprises/hooks/useCompanyQueries';
import { useCompanies } from "@features/company/hooks/useCompanyQueries";
import { Info, Plus } from 'lucide-react';


const UserFormDetails = ({ formData, setFormData, handleAddAccount, errors, isEditMode = false }) => {
    const [queryParams, setQueryParams] = useState({
        page: 1,
        limit: 1000,
        search: "",
        filters: {},
    });
    const {
        data: zonesData,
        isLoading: isZonesLoading,
        error: zonesError,
        isFetching: isZonesFetching,
        refetch: refetchZones,
    } = useZones(queryParams);
    const {
        zones = [],
        totalItems = 0,
        totalPages = 0,
        currentPage = 1,
    } = zonesData || {};

    const [zoneClickId, setZoneClickId] = useState(null)

    const {
        data: companiesData,
        isLoading: isCompaniesLoading,
        refetch: refetchCompanies,
    } = useCompanies({ page: 1, limit: 1000, filters: zoneClickId ? { zone_id: zoneClickId } : {} });

    // useEffect(() => {
    //     console.log(companiesData);
    // }, [companiesData])

    // Đồng bộ zoneClickId khi formData.zoneId được set (đặc biệt hữu ích khi Edit)
    useEffect(() => {
        if (formData.zoneId) {
            setZoneClickId(formData.zoneId);
        }
    }, [formData.zoneId]);

    // const [errors, setErrors] = useState({}); // lưu lỗi

    // const validateForm = () => {
    //     let newErrors = {};

    //     if (!formData.fullName.trim()) newErrors.fullName = "Họ và tên là bắt buộc";

    //     if (!formData.email.trim()) {
    //         newErrors.email = "Email là bắt buộc";
    //     } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
    //         newErrors.email = "Email không hợp lệ (Ví dụ: abc@hepza.gov.vn)";
    //     }

    //     if (!formData.phoneNumber.trim()) newErrors.phoneNumber = "Số điện thoại là bắt buộc";

    //     if (!formData.zoneId)
    //         newErrors.zoneId = "Vui lòng chọn khu công nghiệp / khu chế xuất";

    //     if (formData.role === "company" && !formData.company_id)
    //         newErrors.company_id = "Vui lòng chọn doanh nghiệp";

    //     setErrors(newErrors);
    //     return Object.keys(newErrors).length === 0;
    // };


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        // Xóa lỗi khi người dùng gõ lại
        if (errors[name]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    useEffect(() => {
        if (formData.role === "manager") {
            setFormData((prev) => ({
                ...prev,
                companyId: "",
            }))
        }
    }, [formData.role]);

    return (
        <form className="">
            {/* Title */}
            <span className='flex items-center gap-2 mb-4 text-[#4E5BA6]'>
                <Info />
                <h2 className="text-2xl font-medium ">
                    Nhập thông tin tài khoản:
                </h2>
            </span>

            {/* Section: Role - Hidden in Edit Mode */}
            {!isEditMode && (
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-700">Phân quyền <span className="text-red-500 italic text-xs font-normal">(yêu cầu)</span></h3>
                    <div className="flex gap-3">
                        {[
                            { value: "manager", label: "Quản lý KCN/KCX" },
                            { value: "company", label: "Doanh nghiệp" },
                        ].map((role) => (
                            <label
                                key={role.value}
                                className={`px-4 py-3 rounded-xl border cursor-pointer transition text-sm font-medium
            ${formData.role === role.value
                                        ? "bg-[#4E5BA6]/5 text-[#4E5BA6] outline-none border-offset-1 border-[#4E5BA6]"
                                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
                            >
                                <input
                                    type="radio"
                                    name="role"
                                    value={role.value}
                                    checked={formData.role === role.value}
                                    onChange={handleChange}
                                    className="hidden"
                                />
                                {role.label}
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Section: Personal Info */}
            <div className="mt-4 space-y-3">
                <h3 className="text-lg font-medium text-gray-700">Thông tin cá nhân</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ">
                    <div>
                        <label className="block text-sm font-normal text-gray-600 mb-1">
                            Họ và Tên <span className="text-red-500 italic text-xs font-normal">(yêu cầu)</span>
                        </label>
                        <input
                            type="text"
                            name="fullName"
                            placeholder="Nhập họ và tên"
                            value={formData.fullName}
                            onChange={handleChange}
                            className={`w-full border rounded-xl p-3 focus:outline-none 
            ${errors.fullName ? "border-red-500" : "border-gray-300"}`}
                        />
                        {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-normal text-gray-600 mb-1">
                            Chức vụ
                        </label>
                        <input
                            type="text"
                            name="position"
                            placeholder="Nhập chức vụ"
                            value={formData.position}
                            onChange={handleChange}
                            className="w-full border-1 border-gray-300 rounded-xl p-3 focus:outline-none focus:border-1 focus:border-[#4E5BA6] focus:border-offset-1"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-normal text-gray-600 mb-1">
                            Email <span className="text-red-500 italic text-xs font-normal">(yêu cầu)</span>
                        </label>
                        <input
                            type="text"
                            name="email"
                            placeholder="example.hepza@gov.com"
                            value={formData.email}
                            onChange={handleChange}
                            className={`w-full border rounded-xl p-3 focus:outline-none 
            ${errors.email ? "border-red-500" : "border-gray-300"}`}
                        />
                        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-normal text-gray-600 mb-1">
                            Số điện thoại <span className="text-red-500 italic text-xs font-normal">(yêu cầu)</span>
                        </label>
                        <input
                            type="tel"
                            name="phoneNumber"
                            placeholder="0123 456 789"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            className="w-full border-1 border-gray-300 rounded-xl p-3 focus:outline-none focus:border-1 focus:border-[#4E5BA6] focus:border-offset-1"
                        />
                        {errors.phoneNumber && <p className="text-xs text-red-500 mt-1">{errors.phoneNumber}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-normal text-gray-600 mb-1">
                            Ngày sinh
                        </label>
                        <input
                            type="date"
                            name="dob"
                            value={formData.dob}
                            onChange={handleChange}
                            className="w-full border-1 border-gray-300 rounded-xl p-3 focus:outline-none focus:border-1 focus:border-[#4E5BA6] focus:border-offset-1"
                        />
                    </div>

                    <div>
                    </div>
                </div>
            </div>

            {/* Section: Company Info */}
            <div className="space-y-3 mt-4">
                <div className="flex gap-4">
                    <div className={`flex-grow ${formData.role === "admin" ? "hidden" : "visible"}`}>
                        <label className="block text-sm font-normal text-gray-600 mb-1">
                            Khu công nghiệp / khu chế xuất quản lý <span className="text-red-500 italic text-xs font-normal">(yêu cầu)</span>
                        </label>
                        <SearchableSelect
                            options={zones}
                            optionKey="zone_id"
                            optionLabel="name"
                            value={formData.zoneId}
                            onChange={(zone) => {
                                setFormData((prev) => ({
                                    ...prev,
                                    zoneId: zone.zone_id,
                                    zoneName: zone.name,
                                    companyId: ""
                                }));
                                setZoneClickId(zone.zone_id);

                                // Clear lỗi cho field zoneId nếu có
                                if (errors.zoneId) {
                                    setErrors((prev) => {
                                        const newErrors = { ...prev };
                                        delete newErrors.zoneId;
                                        return newErrors;
                                    });
                                }
                            }}
                            placeholder="Chọn khu công nghiệp / khu chế xuất"
                        />
                        {errors.zoneId && <p className="text-xs text-red-500 mt-1">{errors.zoneId}</p>}
                    </div>

                    {(formData.role === "company" || formData.companyId) && (
                        <div className="flex-grow">
                            <label className="block text-sm font-normal text-gray-600 mb-1">
                                Doanh nghiệp <span className="text-red-500 italic text-xs font-normal">(yêu cầu)</span>
                            </label>
                            <SearchableSelect
                                options={formData.zoneId ? (companiesData?.companies || []) : []}
                                optionKey="company_id"
                                optionLabel="company_name"
                                value={formData.companyId}
                                onChange={(company) => {
                                    setFormData((prev) => ({ ...prev, companyId: company.company_id }));
                                    if (errors.companyId) {
                                        setErrors((prev) => {
                                            const newErrors = { ...prev };
                                            delete newErrors.companyId;
                                            return newErrors;
                                        });
                                    }
                                }}
                                placeholder={
                                    formData.zoneId
                                        ? "Chọn doanh nghiệp"
                                        : "Vui lòng chọn khu công nghiệp trước"
                                }
                                disabled={!formData.zoneId || isCompaniesLoading}
                            />
                            {errors.companyId && (
                                <p className="text-xs text-red-500 mt-1">{errors.companyId}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </form>
    );
};

export default UserFormDetails;
