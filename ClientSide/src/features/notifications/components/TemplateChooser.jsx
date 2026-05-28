import { useState, useRef, useEffect } from 'react';
import { useTemplates } from '@/features/notifications/hooks/useNotificationTemplate';
import { FileText, ChevronDown, Loader2 } from 'lucide-react';

const TemplateChooser = ({ onSelect }) => {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef(null);

    const { data, isLoading } = useTemplates({ page: 1, limit: 50 }, {
        enabled: open,
    });

    const templates = data?.templates ?? [];

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#4E5BA6] bg-[#4E5BA6]/5 border border-[#4E5BA6]/20 rounded-xl hover:bg-[#4E5BA6]/10 transition-colors cursor-pointer"
            >
                <FileText className="h-4 w-4" />
                Chọn từ mẫu
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 z-50 w-80 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Chọn mẫu có sẵn</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-6 text-slate-400">
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Đang tải...
                            </div>
                        ) : templates.length === 0 ? (
                            <div className="flex flex-col items-center py-6 text-slate-400">
                                <FileText className="h-8 w-8 mb-2 text-slate-200" />
                                <p className="text-sm">Chưa có mẫu nào</p>
                            </div>
                        ) : (
                            templates.map((t) => (
                                <button
                                    key={t.notification_T_id}
                                    onClick={() => {
                                        onSelect(t);
                                        setOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-[#4E5BA6]/5 border-b border-slate-50 last:border-0 transition-colors cursor-pointer"
                                >
                                    <p className="text-sm font-semibold text-slate-700 truncate">{t.name}</p>
                                    <p className="text-xs text-slate-400 truncate">{t.title}</p>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TemplateChooser;
