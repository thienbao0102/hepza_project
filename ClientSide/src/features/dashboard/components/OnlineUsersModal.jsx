import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Building, MapPin, Search } from 'lucide-react';
import { apiClient } from '@lib/api-client';
import { useAuth } from '@app/providers/auth/AuthProvider';

const OnlineUsersModal = ({ isOpen, onClose }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { user: currentUser } = useAuth();
    const role = currentUser?.role;

    useEffect(() => {
        if (isOpen) {
            const fetchUsers = async () => {
                setLoading(true);
                try {
                    const response = await apiClient.get('/api/online/users');
                    setUsers(response.data.users || []);
                } catch (err) {
                    console.error("Failed to fetch online users:", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchUsers();
            const interval = setInterval(fetchUsers, 10000);
            return () => clearInterval(interval);
        } else {
            setSearchQuery('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const visibleUsers = users.filter(
        (u) => String(u.user_id || '') !== String(currentUser?.user_id || '')
    );

    const filteredUsers = searchQuery
        ? visibleUsers.filter(u =>
            u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.zone_name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : visibleUsers;

    const modalWidth = role === 'admin' ? '600px' : role === 'manager' ? '480px' : '380px';

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="bg-white rounded-[20px] shadow-2xl flex flex-col overflow-hidden border border-gray-100"
                    style={{ width: '90%', maxWidth: modalWidth, maxHeight: '75vh' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-50 text-emerald-600">
                                <Users className="size-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-800">Đang trực tuyến</h3>
                                <p className="text-xs text-gray-400 font-medium">{filteredUsers.length} tài khoản</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            <X className="size-4" />
                        </button>
                    </div>

                    {/* Search */}
                    {role !== 'company' && visibleUsers.length > 3 && (
                        <div className="px-4 py-3 border-b border-gray-50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full h-9 pl-9 pr-3 bg-gray-50 border border-transparent rounded-xl text-sm placeholder-gray-400
                                    focus:bg-white focus:border-[#4E5BA6] focus:ring-2 focus:ring-[#4E5BA6]/10 focus:outline-none transition-all"
                                />
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                        {loading && visibleUsers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 space-y-3">
                                <div className="w-7 h-7 border-[3px] border-[#4E5BA6] border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-xs text-gray-400 font-medium">Đang tải...</p>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 space-y-2 opacity-60">
                                <Users className="size-8 text-gray-300" />
                                <p className="text-sm text-gray-400 font-medium">
                                    {searchQuery ? 'Không tìm thấy kết quả' : 'Không có ai trực tuyến'}
                                </p>
                            </div>
                        ) : (
                            <div className="p-3 space-y-1.5">
                                {filteredUsers.map((u, i) => (
                                    <motion.div
                                        key={u.user_id || i}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-gray-50 transition-colors group"
                                    >
                                        {/* Online dot + avatar */}
                                        <div className="relative shrink-0">
                                            <div className="flex items-center justify-center size-9 rounded-xl bg-gradient-to-br from-[#4E5BA6]/10 to-[#6B7BC4]/10 text-[#4E5BA6] text-sm font-bold">
                                                {u.full_name?.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-semibold text-gray-800 truncate">{u.full_name}</p>
                                                {role === 'admin' && u.role && (
                                                    <span className={`px-1.5 py-[1px] rounded text-[9px] font-bold uppercase tracking-wider border shrink-0 ${u.role === 'admin' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                            u.role === 'manager' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                u.role === 'company' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                    'bg-gray-50 text-gray-600 border-gray-100'
                                                        }`}>
                                                        {u.role === 'admin' ? 'Admin' : u.role === 'manager' ? 'BQL' : u.role === 'company' ? 'DN' : u.role}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                {(role === 'admin' || role === 'manager') && u.company_name && u.company_name !== 'N/A' && (
                                                    <span className="flex items-center gap-1 text-[11px] text-gray-400 truncate">
                                                        <Building className="size-3 shrink-0" />
                                                        <span className="truncate">{u.company_name}</span>
                                                    </span>
                                                )}
                                                {role === 'admin' && u.zone_name && u.zone_name !== 'N/A' && (
                                                    <span className="flex items-center gap-1 text-[11px] text-gray-400 truncate">
                                                        <MapPin className="size-3 shrink-0" />
                                                        <span className="truncate">{u.zone_name}</span>
                                                    </span>
                                                )}
                                                {role === 'company' && u.email && (
                                                    <span className="text-[11px] text-gray-400 truncate">{u.email}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Status dot label */}
                                        <span className="shrink-0 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                            Online
                                        </span>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default OnlineUsersModal;
