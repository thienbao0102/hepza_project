import React from 'react';
import { Modal, Button, Tooltip, Image } from 'antd';
import { X, Building2, MapPin, Phone, Copy, Check, Info, ImagePlus, Download, FileText } from 'lucide-react';
import { BUSINESS_SYMBIOSIS_ROUTES } from '@constants/constants';
import { apiClient } from '@/lib/api-client';
import { useState } from 'react';

const CompanyContactModal = ({ open, onClose, company, type = 'buy' }) => {
    const [copied, setCopied] = useState(false);

    if (!company) return null;

    const isSell = type === 'sell';
    const theme = isSell ? {
        primary: '#568D65',
        bg: 'bg-[#568D65]/5',
        text: 'text-[#568D65]',
        border: 'border-[#568D65]/20'
    } : {
        primary: '#4E5BA6',
        bg: 'bg-[#4E5BA6]/5',
        text: 'text-[#4E5BA6]',
        border: 'border-[#4E5BA6]/20'
    };

    const contactPhone = company.phone_number || '';

    const handleCopyPhone = () => {
        if (contactPhone) {
            navigator.clipboard.writeText(contactPhone);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            closeIcon={<div className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 transition-colors"><X size={18} /></div>}
            centered
            width={450}
            styles={{
                content: { padding: 0, borderRadius: '24px', overflow: 'hidden' }
            }}
        >
            <div className={`p-6 border-b border-gray-100 ${theme.bg}`}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl bg-white shadow-sm border ${theme.border}`}>
                        <Building2 size={24} className={theme.text} />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest m-0 leading-tight">Thông tin liên hệ</h3>
                        <Tooltip title={company.company_name} placement="bottomLeft">
                            <h2 className="text-xl font-bold text-gray-800 m-0 truncate max-w-[300px] cursor-default">{company.company_name}</h2>
                        </Tooltip>
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-6">
                {/* Industrial Park */}
                <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-gray-50 text-gray-400">
                        <MapPin size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Khu công nghiệp</p>
                        <p className="text-gray-700 font-medium">
                            {company.zone_name || company.zone_id || 'Chưa cập nhật'}
                        </p>
                    </div>
                </div>

                {/* Phone Number */}
                <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-gray-50 text-gray-400">
                        <Phone size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Số điện thoại</p>
                        <div className="flex items-center justify-between">
                            <p className="text-lg font-bold text-gray-800 tracking-tight">
                                {contactPhone || 'Chưa cập nhật'}
                            </p>
                            {contactPhone && (
                                <Tooltip title={copied ? "Đã copy!" : "Copy số điện thoại"}>
                                    <button
                                        onClick={handleCopyPhone}
                                        className={`p-2 rounded-lg transition-all ${copied ? 'bg-green-50 text-green-500' : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                                    >
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                </div>

                {/* Notes (Thông tin bổ sung) */}
                {company.notes && (
                    <div className="flex items-start gap-4">
                        <div className="p-2.5 rounded-xl bg-gray-50 text-gray-400">
                            <Info size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Thông tin bổ sung</p>
                            <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                                {company.notes}
                            </p>
                        </div>
                    </div>
                )}

                {/* Attachments / Hình ảnh & Tài liệu */}
                {company.attachments && company.attachments.length > 0 && (() => {
                    const imageExts = /\.(jpg|jpeg|png|webp|gif)$/i;
                    const images = company.attachments.filter(att => {
                        const url = typeof att === 'object' ? att?.url : att;
                        return att?.mimeType?.startsWith('image/') || imageExts.test(url || '');
                    });
                    const docs = company.attachments.filter(att => {
                        const url = typeof att === 'object' ? att?.url : att;
                        return !(att?.mimeType?.startsWith('image/') || imageExts.test(url || ''));
                    });

                    return (
                        <div className="flex items-start gap-4">
                            <div className="p-2.5 rounded-xl bg-gray-50 text-gray-400">
                                <ImagePlus size={20} />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    Hình ảnh / Tài liệu đính kèm ({company.attachments.length})
                                </p>

                                {/* Ảnh — preview */}
                                {images.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2">
                                        <Image.PreviewGroup>
                                            {images.map((att, idx) => {
                                                const url = typeof att === 'object' ? att?.url : att;
                                                if (!url) return null;
                                                const fullUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_API_BASE_URL || ''}${url.startsWith('/') ? '' : '/'}${url}`;
                                                return (
                                                    <div key={`img-${idx}`} className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 shadow-sm cursor-pointer hover:border-gray-300 transition-colors">
                                                        <Image
                                                            src={fullUrl}
                                                            alt={att?.originalName || `image-${idx}`}
                                                            className="object-cover w-full h-full"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </Image.PreviewGroup>
                                    </div>
                                )}

                                {/* Tài liệu — download */}
                                {docs.length > 0 && (
                                    <div className="space-y-1.5">
                                        {docs.map((att, idx) => {
                                            const url = typeof att === 'object' ? att?.url : att;
                                            if (!url) return null;
                                            const fullUrl = url.startsWith('http') ? url : `${import.meta.env.VITE_API_BASE_URL || ''}${url.startsWith('/') ? '' : '/'}${url}`;
                                            const name = att?.originalName || `file-${idx + 1}`;
                                            const handleDownload = async (e) => {
                                                e.preventDefault();
                                                try {
                                                    const res = await apiClient.get(`/api/business-symbiosis/download`, {
                                                        params: { url: fullUrl, filename: name },
                                                        responseType: 'blob',
                                                    });
                                                    const blobUrl = window.URL.createObjectURL(res.data);
                                                    const link = document.createElement('a');
                                                    link.href = blobUrl;
                                                    link.download = name;
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    link.remove();
                                                    window.URL.revokeObjectURL(blobUrl);
                                                } catch (err) {
                                                    console.error('Download failed:', err);
                                                    import('antd').then(({ message }) => message.error('Tải file thất bại. Vui lòng thử lại.'));
                                                }
                                            };
                                            return (
                                                <div
                                                    key={`doc-${idx}`}
                                                    onClick={handleDownload}
                                                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-colors group cursor-pointer"
                                                >
                                                    <FileText size={16} className="text-gray-400 flex-shrink-0" />
                                                    <span className="text-sm text-gray-600 truncate flex-1 group-hover:text-gray-800">{name}</span>
                                                    <Download size={14} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* CTA */}
                <Button
                    type="primary"
                    block
                    size="large"
                    onClick={onClose}
                    className="h-12 rounded-xl font-bold shadow-lg mt-4"
                    style={{ backgroundColor: theme.primary }}
                >
                    Đóng cửa sổ
                </Button>
            </div>
        </Modal>
    );
};

export default CompanyContactModal;
