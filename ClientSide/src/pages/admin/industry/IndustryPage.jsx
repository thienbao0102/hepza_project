import { useState, useMemo, useEffect } from 'react';
import { Input, Modal, Button, Pagination, Tooltip, Select, Spin, Empty, Tag } from 'antd';
import { Search, Plus, Edit2, Trash2, Layers } from 'lucide-react';
import { useIndustryGroups, useIndustries, useCreateIndustry, useUpdateIndustry, useDeleteIndustry, useCreateIndustryGroup, useUpdateIndustryGroup, useDeleteIndustryGroup } from '@features/industry/hooks/useIndustryQueries';
import { useHeader } from '@/components/common/Header/HeaderContext';
import ConfirmDeleteDialog from '@/components/common/ConfirmDeleteDialog';
import toast from '@/utils/toast';
import './IndustryPage.css';

const { Option } = Select;

/* ═══ MÀU ĐỘNG CHO TẤT CẢ NHÓM NGÀNH ═══ */
function getDynamicColor(groupId) {
    if (!groupId) return { bg: '#F8FAFC', border: '#94A3B8', text: '#334155', tag: 'default', dot: '#94A3B8' };
    let hash = 0;
    for (let i = 0; i < groupId.length; i++) {
        hash = groupId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.floor(Math.abs(hash * 137.508)) % 360;
    // h: hue (0-360), saturation 75%, lightness adjusted for contrast
    // Không dùng trắng tinh (L=100) hay đen thui (L=0)
    return {
        bg: `hsl(${h}, 50%, 95%)`,
        border: `hsl(${h}, 60%, 65%)`,
        text: `hsl(${h}, 70%, 30%)`,
        tag: `hsl(${h}, 70%, 50%)`,
        dot: `hsl(${h}, 60%, 55%)`
    };
}

/* ═══════════════ FORM THÊM / SỬA NGÀNH ═══════════════ */
function IndustryFormModal({ open, onClose, editData, groups, groupColorMap }) {
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [groupId, setGroupId] = useState('');

    const createMutation = useCreateIndustry();
    const updateMutation = useUpdateIndustry();
    const isEdit = !!editData;

    useEffect(() => {
        if (editData) {
            setCode(editData.industry_code || '');
            setName(editData.industry_name || '');
            setGroupId(editData.group_id || '');
        } else {
            setCode(''); setName(''); setGroupId('');
        }
    }, [editData, open]);

    const handleSubmit = async () => {
        if (!code.trim() || !name.trim() || !groupId) {
            toast.error('Vui lòng nhập đầy đủ thông tin');
            return;
        }
        try {
            if (isEdit) {
                await updateMutation.mutateAsync({
                    industryId: editData.industry_id,
                    data: { industry_code: code.trim(), industry_name: name.trim(), group_id: groupId }
                });
                toast.success('Cập nhật ngành thành công');
            } else {
                await createMutation.mutateAsync({
                    industry_code: code.trim(),
                    industry_name: name.trim(),
                    group_id: groupId
                });
                toast.success('Thêm ngành thành công');
            }
            onClose();
        } catch (err) {
            toast.error(err.message || 'Có lỗi xảy ra');
        }
    };

    return (
        <Modal
            title={isEdit ? 'Sửa ngành nghề' : 'Thêm ngành nghề'}
            open={open}
            onCancel={onClose}
            onOk={handleSubmit}
            okText={isEdit ? 'Cập nhật' : 'Thêm'}
            cancelText="Huỷ"
            confirmLoading={createMutation.isLoading || updateMutation.isLoading}
            destroyOnClose
            className="industry-modal"
        >
            <div className="industry-form">
                <label>Mã ngành (VSIC)</label>
                <Input
                    placeholder="VD: 1071"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={4}
                />
                <label>Tên ngành</label>
                <Input
                    placeholder="VD: Sản xuất các loại bánh từ bột"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <label>Nhóm ngành</label>
                <Select
                    placeholder="Chọn nhóm ngành"
                    value={groupId || undefined}
                    onChange={setGroupId}
                    style={{ width: '100%' }}
                >
                    {(groups || []).map((g) => (
                        <Option key={g.group_id} value={g.group_id}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <span style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: groupColorMap[g.group_id]?.dot
                                }} />
                                {g.group_name}
                            </span>
                        </Option>
                    ))}
                </Select>
            </div>
        </Modal>
    );
}

/* ═══════════════ FORM THÊM / SỬA NHÓM NGÀNH ═══════════════ */
function GroupFormModal({ open, onClose, editData }) {
    const [name, setName] = useState('');
    const createMutation = useCreateIndustryGroup();
    const updateMutation = useUpdateIndustryGroup();
    const isEdit = !!editData;

    useEffect(() => {
        if (editData) setName(editData.group_name || '');
        else setName('');
    }, [editData, open]);

    const handleSubmit = async () => {
        if (!name.trim()) { toast.error('Vui lòng nhập tên nhóm ngành'); return; }
        try {
            if (isEdit) {
                await updateMutation.mutateAsync({ groupId: editData.group_id, data: { group_name: name.trim() } });
                toast.success('Cập nhật nhóm ngành thành công');
            } else {
                await createMutation.mutateAsync({ group_name: name.trim() });
                toast.success('Thêm nhóm ngành thành công');
            }
            onClose();
        } catch (err) {
            toast.error(err.message || 'Có lỗi xảy ra');
        }
    };

    return (
        <Modal
            title={isEdit ? 'Sửa nhóm ngành' : 'Thêm nhóm ngành'}
            open={open} onCancel={onClose} onOk={handleSubmit}
            okText={isEdit ? 'Cập nhật' : 'Thêm'} cancelText="Huỷ"
            confirmLoading={createMutation.isLoading || updateMutation.isLoading}
            destroyOnClose
            className="industry-modal"
        >
            <div className="industry-form">
                <label>Tên nhóm ngành</label>
                <Input placeholder="VD: Cơ khí, điện, điện tử" value={name} onChange={e => setName(e.target.value)} />
            </div>
        </Modal>
    );
}

/* ═══════════════ TRANG CHÍNH ═══════════════ */
export default function IndustryPage() {
    const { setHeaderConfig } = useHeader();
    useEffect(() => {
        setHeaderConfig({
            title: 'Quản lý ngành nghề',
            showBackButton: false,
            description: 'Dữ liệu được áp dụng theo Quyết định 36/2025/QĐ-TTg về Hệ thống ngành kinh tế Việt Nam'
        });
    }, [setHeaderConfig]);

    // ── State ──
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit] = useState(15);
    const [editMode, setEditMode] = useState(false); // CHẾ ĐỘ CHỈNH SỬA

    // ── Modals ──
    const [industryModalOpen, setIndustryModalOpen] = useState(false);
    const [industryEditData, setIndustryEditData] = useState(null);
    const [groupModalOpen, setGroupModalOpen] = useState(false);
    const [groupEditData, setGroupEditData] = useState(null);

    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: '', id: null, title: '', description: '' });

    // ── Debounce search ──
    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // ── Queries ──
    const { data: groupsData, isLoading: groupsLoading } = useIndustryGroups({ limit: 100 });
    const groups = groupsData?.groups || [];

    const filters = useMemo(() => (selectedGroupId ? { group_id: selectedGroupId } : {}), [selectedGroupId]);
    const { data: industriesData, isLoading: industriesLoading } = useIndustries({
        page, limit, search: debouncedSearch, filters
    });
    const industries = industriesData?.industries || [];
    const total = industriesData?.total || 0;
    const globalTotal = useMemo(() => groups.reduce((acc, g) => acc + (g.industry_count || 0), 0), [groups]);

    // ── Mutations ──
    const deleteIndustry = useDeleteIndustry();
    const deleteGroup = useDeleteIndustryGroup();

    // ── Group helpers ──
    const groupNameMap = useMemo(() => {
        const map = {};
        groups.forEach(g => { map[g.group_id] = g.group_name; });
        return map;
    }, [groups]);

    const groupColorMap = useMemo(() => {
        const map = {};
        groups.forEach((g) => { map[g.group_id] = getDynamicColor(g.group_id); });
        return map;
    }, [groups]);

    // ── Handlers ──
    const handleAddIndustry = () => { setIndustryEditData(null); setIndustryModalOpen(true); };
    const handleEditIndustry = (record) => { setIndustryEditData(record); setIndustryModalOpen(true); };

    const handleEditGroup = (group) => { setGroupEditData(group); setGroupModalOpen(true); };
    const handleAddGroup = () => { setGroupEditData(null); setGroupModalOpen(true); };

    return (
        <div className="industry-page" >
            {/* ═══ PANEL TRÁI: NHÓM NGÀNH ═══ */}
            < aside className="industry-sidebar" >
                <div className="sidebar-header">
                    <h3><Layers size={18} /> Nhóm ngành</h3>
                    {editMode && (
                        <Tooltip title="Thêm nhóm ngành mới">
                            <button className="btn-icon-sm" onClick={handleAddGroup}><Plus size={16} /></button>
                        </Tooltip>
                    )}
                </div>

                {groupsLoading ? (
                    <div className="sidebar-loading"><Spin size="small" /></div>
                ) : (
                    <ul className="group-list">
                        <li
                            className={`group-item ${selectedGroupId === null ? 'active' : ''}`}
                            onClick={() => { setSelectedGroupId(null); setPage(1); }}
                        >
                            <div className="group-info">
                                <span className="group-dot" style={{ background: '#6366F1' }} />
                                <span className="group-name">Tất cả ngành</span>
                            </div>
                            <Tag color="blue" className="group-count-tag">{globalTotal}</Tag>
                        </li>
                        {groups.map((g) => {
                            const color = groupColorMap[g.group_id] || getDynamicColor(g.group_id);
                            return (
                                <li
                                    key={g.group_id}
                                    className={`group-item ${selectedGroupId === g.group_id ? 'active' : ''}`}
                                    onClick={() => { setSelectedGroupId(g.group_id); setPage(1); }}
                                    style={selectedGroupId === g.group_id ? { background: color.bg, borderLeftColor: color.border } : {}}
                                >
                                    <div className="group-info">
                                        <span className="group-dot" style={{ background: color.dot }} />
                                        <span className="group-name">{g.group_name}</span>
                                    </div>
                                    <div className="group-right">
                                        <Tag style={{ background: color.bg, color: color.text, borderColor: color.border }} className="group-count-tag">
                                            {g.industry_count ?? '–'}
                                        </Tag>
                                        {editMode && (
                                            <div className="group-actions" onClick={e => e.stopPropagation()}>
                                                <Tooltip title="Sửa"><button className="btn-icon-xs" onClick={() => handleEditGroup(g)}><Edit2 size={13} /></button></Tooltip>
                                                <Tooltip title="Xoá">
                                                    <button className="btn-icon-xs danger" onClick={() => setDeleteConfirm({
                                                        open: true,
                                                        type: 'group',
                                                        id: g.group_id,
                                                        title: 'Xác nhận xoá nhóm ngành',
                                                        description: `Bạn có chắc muốn xoá vĩnh viễn nhóm "${g.group_name}" không?`
                                                    })}>
                                                        <Trash2 size={13} />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </aside >

            {/* ═══ PANEL PHẢI: BẢNG NGÀNH ═══ */}
            < main className="industry-main" >
                <div className="main-toolbar">
                    <div className="search-box">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Tìm theo mã hoặc tên ngành..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    {/* <div style={{ display: 'flex', gap: '10px' }}>
                        <Button
                            className={editMode ? 'btn-edit-mode-active' : ''}
                            type={editMode ? 'default' : 'dashed'}
                            icon={<Edit2 size={16} />}
                            onClick={() => setEditMode(!editMode)}
                            danger={editMode}
                        >
                            {editMode ? 'Thoát chỉnh sửa' : 'Chỉnh sửa'}
                        </Button>
                        {editMode && (
                            <Button type="primary" icon={<Plus size={16} />} onClick={handleAddIndustry}>
                                Thêm ngành
                            </Button>
                        )}
                    </div> */}
                </div>

                {
                    industriesLoading ? (
                        <div className="table-loading"><Spin size="large" tip="Đang tải..." /></div>
                    ) : industries.length === 0 ? (
                        <div className="empty-state">
                            <Empty description="Không có ngành nào" />
                        </div>
                    ) : (
                        <>
                            <div className="industry-table-wrapper">
                                <table className="industry-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: 90 }}>Mã VSIC</th>
                                            <th>Tên ngành</th>
                                            {!selectedGroupId && <th style={{ width: 260 }}>Nhóm ngành</th>}
                                            {editMode && <th style={{ width: 100 }}>Thao tác</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {industries.map(ind => {
                                            const color = groupColorMap[ind.group_id] || getDynamicColor(ind.group_id);
                                            return (
                                                <tr key={ind.industry_id}>
                                                    <td className="code-cell">{ind.industry_code}</td>
                                                    <td className="name-cell">{ind.industry_name}</td>
                                                    {!selectedGroupId && (
                                                        <td>
                                                            <span className="group-tag" style={{
                                                                background: color.bg,
                                                                color: color.text,
                                                                border: `1px solid ${color.border}30`,
                                                            }}>
                                                                {groupNameMap[ind.group_id] || ind.group_id}
                                                            </span>
                                                        </td>
                                                    )}
                                                    {editMode && (
                                                        <td className="actions-cell">
                                                            <Tooltip title="Sửa">
                                                                <button className="btn-icon-xs" onClick={() => handleEditIndustry(ind)}>
                                                                    <Edit2 size={14} />
                                                                </button>
                                                            </Tooltip>
                                                            <Tooltip title="Xoá">
                                                                <button className="btn-icon-xs danger" onClick={() => setDeleteConfirm({
                                                                    open: true,
                                                                    type: 'industry',
                                                                    id: ind.industry_id,
                                                                    title: 'Xác nhận xoá ngành',
                                                                    description: `Bạn có chắc muốn xoá vĩnh viễn "${ind.industry_code} - ${ind.industry_name}" không?`
                                                                })}>
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </Tooltip>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="table-footer">
                                <span className="total-info">Tổng: <strong>{total}</strong> ngành</span>
                                <Pagination
                                    current={page}
                                    pageSize={limit}
                                    total={total}
                                    onChange={p => setPage(p)}
                                    showSizeChanger={false}
                                    size="small"
                                />
                            </div>
                        </>
                    )
                }
            </main >

            {/* ═══ MODALS ═══ */}
            < IndustryFormModal
                open={industryModalOpen}
                onClose={() => setIndustryModalOpen(false)}
                editData={industryEditData}
                groups={groups}
                groupColorMap={groupColorMap}
            />
            <GroupFormModal
                open={groupModalOpen}
                onClose={() => setGroupModalOpen(false)}
                editData={groupEditData}
            />

            <ConfirmDeleteDialog
                open={deleteConfirm.open}
                onClose={() => setDeleteConfirm({ ...deleteConfirm, open: false })}
                onConfirm={async () => {
                    try {
                        if (deleteConfirm.type === 'industry') {
                            const res = await deleteIndustry.mutateAsync(deleteConfirm.id);
                            toast.success(res?.message || 'Đã xoá ngành nghề');
                        } else {
                            const res = await deleteGroup.mutateAsync(deleteConfirm.id);
                            toast.success(res?.message || 'Đã xoá nhóm ngành');
                            if (selectedGroupId === deleteConfirm.id) setSelectedGroupId(null);
                        }
                    } catch (err) {
                        toast.error(err.response?.data?.error || err.message || 'Xoá thất bại');
                    } finally {
                        setDeleteConfirm({ ...deleteConfirm, open: false });
                    }
                }}
                title={deleteConfirm.title}
                description={deleteConfirm.description}
                isHardDelete={true}
                selectedIds={deleteConfirm.id ? [deleteConfirm.id] : []}
            />
        </div >
    );
}
