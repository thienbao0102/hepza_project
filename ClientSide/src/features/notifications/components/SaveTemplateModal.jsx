import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Save, X, FileText } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const SaveTemplateModal = ({ open, onClose, onSave, loading = false, name = "" }) => {
    const [templateName, setTemplateName] = useState(name);
    const [error, setError] = useState('');

    // Update internal state when prop name changes
    useEffect(() => {
        if (open) {
            setTemplateName(name);
        }
    }, [name, open]);

    const handleSave = () => {
        const trimmed = templateName.trim();
        if (!trimmed) {
            setError('Tên mẫu không được để trống');
            return;
        }
        if (trimmed.length < 3) {
            setError('Tên mẫu phải có ít nhất 3 ký tự');
            return;
        }
        setError('');
        onSave(trimmed);
    };

    const handleClose = () => {
        setTemplateName('');
        setError('');
        onClose();
    };

    if (!open) return null;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[9999] flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    {/* Modal */}
                    <motion.div
                        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden"
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-6 pb-2">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 bg-[#4E5BA6]/10 rounded-xl">
                                    <FileText className="h-5 w-5 text-[#4E5BA6]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Lưu mẫu thông báo</h3>
                                    <p className="text-sm text-slate-400">Đặt tên để sử dụng lại sau</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X className="h-4 w-4 text-slate-400" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-4">
                            <label className="block text-sm font-semibold text-slate-600 mb-2">
                                Tên mẫu <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={templateName}
                                onChange={(e) => {
                                    setTemplateName(e.target.value);
                                    if (error) setError('');
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                placeholder="VD: Nhắc nộp báo cáo hàng tháng"
                                className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all duration-200
                                    ${error
                                        ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                                        : 'border-slate-200 focus:border-[#4E5BA6] focus:ring-2 focus:ring-[#4E5BA6]/10'
                                    }
                                `}
                                autoFocus
                            />
                            {error && (
                                <p className="text-red-500 text-xs mt-1.5 font-medium">{error}</p>
                            )}
                            <p className="text-xs text-slate-400 mt-2">
                                Mẫu sẽ được lưu với nội dung và đối tượng nhận hiện tại. Bạn có thể chỉnh sửa sau.
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end gap-2 px-6 pb-6 pt-2">
                            <button
                                onClick={handleClose}
                                className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#4E5BA6] rounded-xl hover:bg-[#3D4A8F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm shadow-[#4E5BA6]/20"
                            >
                                {loading ? 'Đang lưu...' : 'Lưu mẫu'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default SaveTemplateModal;
