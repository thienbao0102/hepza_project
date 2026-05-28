import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, DatePicker, Select, Button, ConfigProvider, Upload, AutoComplete } from 'antd';
import { X, Info, Coins, CalendarClock, Package, Tag, FileText, ChevronDown, ChevronUp, ImagePlus } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { searchWasteCodes } from '@/services/wasteCodeService';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

const SymbiosisModal = ({ open, onClose, type = 'buy', onSubmit, initialData = null, loading = false }) => {
    const [form] = Form.useForm();
    const [showAdvanced, setShowAdvanced] = useState(false);
    const isSell = type === 'sell';
    const isEdit = !!initialData;
    const [fileList, setFileList] = useState([]);
    const [wasteCodeOptions, setWasteCodeOptions] = useState([]);

    // Refined Theme: Clean, White, Bordered
    const theme = isSell ? {
        primary: '#568D65', // Green
        text: 'text-[#568D65]',
        bg: 'bg-[#568D65]/5',
        border: 'border-[#568D65]/20',
        title: isEdit ? 'Cập nhật tin Bán' : 'Đăng tin Cần Bán',
        badge: 'Cung cấp',
        icon: Package
    } : {
        primary: '#4E5BA6', // Blue
        text: 'text-[#4E5BA6]',
        bg: 'bg-[#4E5BA6]/5',
        border: 'border-[#4E5BA6]/20',
        title: isEdit ? 'Cập nhật tin Mua' : 'Đăng tin Cần Mua',
        badge: 'Nhu cầu',
        icon: Package
    };

    useEffect(() => {
        if (open) {
            if (initialData) {
                form.setFieldsValue({
                    ...initialData,
                    expiryDate: initialData.expiryDate ? dayjs(initialData.expiryDate) : null
                });
                // Map existing attachments thành antd fileList format để hiện preview
                const existingFiles = (initialData.attachments || []).map((att, idx) => {
                    const url = typeof att === 'object' ? att.url : att;
                    return {
                        uid: `existing-${idx}`,
                        name: att?.originalName || `file-${idx + 1}`,
                        status: 'done',
                        url,
                        thumbUrl: url,
                        // Đánh dấu đây là file cũ từ server
                        isExisting: true,
                        serverData: att,
                    };
                });
                setFileList(existingFiles);
            } else {
                form.resetFields();
                setFileList([]);
            }
        }
    }, [open, initialData, form]);

    const handleWasteCodeSearch = async (query) => {
        if (!isSell || !query?.trim()) {
            setWasteCodeOptions([]);
            return;
        }

        const results = await searchWasteCodes(query, 20);
        setWasteCodeOptions(results.map(item => ({
            value: item.code,
            label: `${item.code} - ${item.name}`,
            item,
        })));
    };

    const handleWasteCodeSelect = (value, option) => {
        form.setFieldsValue({
            wasteCode: value,
            wasteName: option.item?.name || form.getFieldValue('wasteName'),
        });
    };

    const handleFinish = (values) => {
        // Tách file mới (cần upload) vs file cũ (giữ lại)
        const newFiles = fileList.filter(f => f.originFileObj).map(f => f.originFileObj);
        const existingAttachments = fileList.filter(f => f.isExisting).map(f => f.serverData);

        const payload = {
            ...values,
            expiryDate: values.expiryDate ? values.expiryDate.toISOString() : null,
            type,
            currency: 'VND',
            _id: initialData?._id,
            __v: initialData?.__v ?? null,
            existingAttachments,
        };
        onSubmit?.(payload, newFiles);
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: theme.primary,
                    borderRadius: 12,
                    controlHeight: 42,
                    fontFamily: 'inherit',
                    colorBorder: '#E2E8F0',
                    colorBgContainer: '#ffffff',
                },
                components: {
                    Input: { activeBorderColor: theme.primary, hoverBorderColor: theme.primary },
                    Select: { activeBorderColor: theme.primary, hoverBorderColor: theme.primary },
                    InputNumber: { activeBorderColor: theme.primary, hoverBorderColor: theme.primary },
                    DatePicker: { activeBorderColor: theme.primary, hoverBorderColor: theme.primary },
                    Button: {
                        colorPrimary: theme.primary,
                        algorithm: true,
                        fontWeight: 600
                    }
                }
            }}
        >
            <Modal
                title={
                    <div className="flex items-center justify-between pr-8 py-1">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${theme.bg} border ${theme.border}`}>
                                <theme.icon size={20} className={theme.text} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 m-0 leading-tight">{theme.title}</h3>
                                <p className="text-sm text-gray-500 m-0 font-normal">Điền nhanh thông tin</p>
                            </div>
                        </div>
                    </div>
                }
                open={open}
                onCancel={onClose}
                footer={null}
                width={550}
                centered
                destroyOnClose
                className="clean-modal-rounded"
                closeIcon={<div className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 transition-colors"><X size={18} /></div>}
                styles={{
                    content: { padding: '24px', borderRadius: '24px' },
                    header: { marginBottom: '24px', borderBottom: 'none' }
                }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleFinish}
                    requiredMark={false}
                    className="flex flex-col gap-4"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-x-4 gap-y-4">
                        <Form.Item
                            label={<span className="font-medium text-gray-700">Tên tài nguyên / Chất thải</span>}
                            name="wasteName"
                            className="col-span-1 sm:col-span-6 mb-0"
                            rules={[{ required: true, message: 'Vui lòng nhập tên tài nguyên' }]}
                        >
                            <Input placeholder="Ví dụ: Giấy vụn, Pallet..." prefix={<Tag size={16} className="text-gray-400 mr-1" />} />
                        </Form.Item>

                        <Form.Item
                            label={<span className="font-medium text-gray-700">Tên gọi khác (Tùy chọn)</span>}
                            name="otherWasteName"
                            className="col-span-1 sm:col-span-6 mb-0"
                        >
                            <Input placeholder="Nhập tên gọi khác nếu có..." />
                        </Form.Item>

                        <Form.Item
                            label={<span className="font-medium text-gray-700">Nhóm ngành</span>}
                            name="industrialGrs"
                            initialValue="Khác"
                            className="col-span-1 sm:col-span-4 mb-0"
                            rules={[{ required: true, message: 'Vui lòng chọn nhóm ngành' }]}
                        >
                            <Select>
                                <Option value="Khác">Khác</Option>
                                <Option value="Cơ khí, điện, điện tử">Cơ khí</Option>
                                <Option value="Hoá dược, cao su, nhựa">Nhựa, Hoá chất</Option>
                                <Option value="Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất">VLXD, Giấy, Gỗ</Option>
                                <Option value="May mặc, thuộc da, dệt nhuộm">Dệt may</Option>
                                <Option value="Chế biến lương thực, thực phẩm">Thực phẩm</Option>
                            </Select>
                        </Form.Item>

                        <Form.Item
                            label={<span className="font-medium text-gray-700">Số lượng</span>}
                            name="quantity"
                            className="col-span-1 sm:col-span-6 mb-0"
                            rules={[
                                { required: true, message: 'Nhập số lượng' },
                                { type: 'number', min: 0, message: 'Lớn hơn 0' }
                            ]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                placeholder="0"
                                formatter={value => value ? `${value}` : ''}
                                parser={value => value.replace(/[^0-9.]/g, '')}
                                addonAfter={
                                    <Form.Item name="unit" noStyle initialValue="kg">
                                        <Select style={{ width: 70 }} bordered={false} className="bg-transparent">
                                            <Option value="kg">kg</Option>
                                            <Option value="tấn">tấn</Option>
                                            <Option value="cái">cái</Option>
                                            <Option value="m³">m³</Option>
                                            <Option value="lít">lít</Option>
                                        </Select>
                                    </Form.Item>
                                }
                            />
                        </Form.Item>

                        <Form.Item
                            label={<span className="font-medium text-gray-700">Đơn giá dự kiến</span>}
                            name="price"
                            className="col-span-1 sm:col-span-6 mb-0"
                            rules={[
                                { required: true, message: 'Nhập giá' },
                                { type: 'number', min: 0, message: 'Lớn hơn 0' }
                            ]}
                        >
                            <InputNumber
                                style={{ width: '100%' }}
                                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={value => value.replace(/\D/g, '')}
                                addonAfter="VNĐ"
                                placeholder="0"
                            />
                        </Form.Item>

                        <Form.Item
                            label={<span className="font-medium text-gray-700">Ngày hết hạn</span>}
                            name="expiryDate"
                            className="col-span-1 sm:col-span-12 mb-0"
                        >
                            <DatePicker
                                style={{ width: '100%' }}
                                format="DD/MM/YYYY"
                                placeholder="Chọn ngày hết hạn bài đăng..."
                                disabledDate={d => d && d < dayjs().startOf('day')}
                            />
                        </Form.Item>

                        <div className="col-span-1 sm:col-span-12 mt-1">
                            <button
                                type="button"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
                            >
                                {showAdvanced ? (
                                    <><ChevronUp size={16} /> Ẩn tùy chọn nâng cao</>
                                ) : (
                                    <><ChevronDown size={16} /> Thêm tùy chọn (Mã quản lý, Ghi chú...)</>
                                )}
                            </button>
                        </div>

                        {showAdvanced && (
                            <div className="col-span-1 sm:col-span-12 grid grid-cols-1 sm:grid-cols-12 gap-x-4 gap-y-4 pt-3 border-t border-gray-100 mt-1">
                                <Form.Item
                                    label={<span className="font-medium text-gray-700">Mã quản lý (Nếu có)</span>}
                                    name={isSell ? "wasteCode" : "desiredWasteCode"}
                                    className="col-span-1 sm:col-span-6 mb-0"
                                >
                                    {isSell ? (
                                        <AutoComplete
                                            options={wasteCodeOptions}
                                            placeholder="Nhập mã CTNH..."
                                            onSearch={handleWasteCodeSearch}
                                            onSelect={handleWasteCodeSelect}
                                            onChange={(value) => form.setFieldValue('wasteCode', value)}
                                            allowClear
                                        />
                                    ) : (
                                        <Input placeholder="Mã CTNH..." />
                                    )}
                                </Form.Item>

                                {isSell ? (
                                    <>
                                        <Form.Item
                                            label={<span className="font-medium text-gray-700">Mức độ nguy hại</span>}
                                            name="hazardLevel"
                                            className="col-span-1 sm:col-span-6 mb-0"
                                        >
                                            <Select placeholder="Chọn mức độ" allowClear>
                                                <Option value="non-hazardous">Không nguy hại</Option>
                                                <Option value="low">Ít nguy hại</Option>
                                                <Option value="medium">Độc hại</Option>
                                                <Option value="high">Rất độc hại</Option>
                                            </Select>
                                        </Form.Item>

                                        <Form.Item
                                            label={<span className="font-medium text-gray-700">Tần suất cung cấp</span>}
                                            name="frequency"
                                            initialValue="một lần"
                                            className="col-span-1 sm:col-span-6 mb-0"
                                        >
                                            <Select>
                                                <Option value="một lần">Một lần duy nhất</Option>
                                                <Option value="hằng tuần">Hàng tuần</Option>
                                                <Option value="hằng tháng">Hàng tháng</Option>
                                                <Option value="hằng quý">Hàng quý</Option>
                                                <Option value="hằng năm">Hàng năm</Option>
                                            </Select>
                                        </Form.Item>
                                        <div className="col-span-1 sm:col-span-6 hidden sm:block"></div>
                                    </>
                                ) : (
                                    <div className="col-span-1 sm:col-span-6 hidden sm:block"></div>
                                )}

                                <Form.Item
                                    label={<span className="font-medium text-gray-700">Tài liệu đính kèm / Hình ảnh</span>}
                                    className="col-span-1 sm:col-span-12 mb-0"
                                >
                                    <Upload
                                        multiple
                                        listType="picture-card"
                                        fileList={fileList}
                                        onChange={({ fileList: newFileList }) => setFileList(newFileList)}
                                        beforeUpload={() => false}
                                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                    >
                                        {fileList.length >= 5 ? null : (
                                            <div className="flex flex-col items-center gap-1 text-gray-400">
                                                <ImagePlus size={20} />
                                                <span className="text-xs">Thêm file</span>
                                            </div>
                                        )}
                                    </Upload>
                                </Form.Item>

                                <Form.Item
                                    label={<span className="font-medium text-gray-700">Thông tin bổ sung</span>}
                                    name="notes"
                                    className="col-span-1 sm:col-span-12 mb-0"
                                >
                                    <TextArea
                                        rows={2}
                                        placeholder="Ghi chú về quy cách đóng gói, phương thức giao nhận..."
                                    />
                                </Form.Item>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <Button
                            size="large"
                            onClick={onClose}
                            disabled={loading}
                            className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 px-6 h-11"
                        >
                            Hủy
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            loading={loading}
                            disabled={loading}
                            className="rounded-xl px-8 shadow-md shadow-indigo-100 h-11"
                        >
                            {loading ? 'Đang lưu...' : (isSell ? 'Đăng Tin Bán' : 'Đăng Tin Mua')}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </ConfigProvider>
    );
};

export default SymbiosisModal;
