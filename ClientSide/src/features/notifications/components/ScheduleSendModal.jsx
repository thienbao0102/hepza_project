import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CalendarCog, X, Clock, Repeat, CalendarDays } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const inputClasses = `bg-white border border-slate-200 rounded-xl px-2 py-2.5 text-sm font-medium text-slate-700 
    outline-none focus:border-[#4E5BA6] focus:ring-2 focus:ring-[#4E5BA6]/10 transition-all
    hover:border-slate-300 placeholder:font-normal placeholder:text-slate-300`;

const TimeSelect24h = ({ value = '08:00', onChange, error = false }) => {
    const parts = (value || '08:00').split(':');
    const h = parts[0] !== undefined ? parts[0] : '08';
    const m = parts[1] !== undefined ? parts[1] : '00';

    const handleHourChange = (e) => {
        let val = e.target.value.replace(/\D/g, ''); // Chỉ cho phép nhập số
        if (val.length > 2) val = val.slice(0, 2);
        if (val !== '' && parseInt(val) > 23) val = '23';
        onChange(`${val}:${m}`);
    };

    const handleHourBlur = () => {
        let padded = h;
        if (h === '') padded = '00';
        else if (h.length === 1) padded = `0${h}`;
        onChange(`${padded}:${m}`);
    };

    const handleMinuteChange = (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val.length > 2) val = val.slice(0, 2);
        if (val !== '' && parseInt(val) > 59) val = '59';
        onChange(`${h}:${val}`);
    };

    const handleMinuteBlur = () => {
        let padded = m;
        if (m === '') padded = '00';
        else if (m.length === 1) padded = `0${m}`;
        onChange(`${h}:${padded}`);
    };

    return (
        <div className="flex items-center gap-1.5">
            <input
                type="text"
                inputMode="numeric"
                value={h}
                onChange={handleHourChange}
                onBlur={handleHourBlur}
                placeholder="00"
                className={`${inputClasses} w-[48px] text-center ${error ? '!border-red-300' : ''}`}
            />
            <span className="text-slate-400 font-bold text-lg select-none pb-0.5">:</span>
            <input
                type="text"
                inputMode="numeric"
                value={m}
                onChange={handleMinuteChange}
                onBlur={handleMinuteBlur}
                placeholder="00"
                className={`${inputClasses} w-[48px] text-center ${error ? '!border-red-300' : ''}`}
            />
            <span className="text-xs text-slate-400 ml-1 select-none">(24h)</span>
        </div>
    );
};

const DAYS_OF_WEEK = [
    { value: 1, label: 'T2' },
    { value: 2, label: 'T3' },
    { value: 3, label: 'T4' },
    { value: 4, label: 'T5' },
    { value: 5, label: 'T6' },
    { value: 6, label: 'T7' },
    { value: 0, label: 'CN' },
];

const ScheduleSendModal = ({ open, onClose, onSchedule, loading = false, initialData }) => {
    const [templateName, setTemplateName] = useState('');
    const [scheduleMode, setScheduleMode] = useState('ONE_TIME'); // ONE_TIME | RECURRING
    const [sendAt, setSendAt] = useState('');
    const [frequency, setFrequency] = useState('daily');
    const [time, setTime] = useState('08:00');
    const [daysOfWeek, setDaysOfWeek] = useState([]);
    const [dayOfMonth, setDayOfMonth] = useState(1);
    const [interval, setInterval] = useState(1);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (open) {
            setErrors({});
            if (initialData) {
                setTemplateName(initialData.templateName || '');
                if (initialData.scheduleData && initialData.scheduleData.type !== 'MANUAL') {
                    setScheduleMode(initialData.scheduleData.type);
                    if (initialData.scheduleData.type === 'ONE_TIME' && initialData.scheduleData.sendAt) {
                        const dateObj = new Date(initialData.scheduleData.sendAt);
                        const pad = (n) => n.toString().padStart(2, '0');
                        setSendAt(`${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`);
                    } else if (initialData.scheduleData.type === 'RECURRING') {
                        // Backend only stores cronString, not the repeat object
                        const cron = initialData.scheduleData.cronString;
                        if (cron) {
                            const parts = cron.split(' ');
                            if (parts.length === 5) {
                                const [minute, hour, dom, mon, dow] = parts;
                                const pad = (n) => n.toString().padStart(2, '0');
                                setTime(`${pad(hour)}:${pad(minute)}`);

                                if (dom.startsWith('*/') && mon === '*' && dow === '*') {
                                    setFrequency('daily');
                                    setInterval(parseInt(dom.replace('*/', '')) || 1);
                                } else if (dom === '*' && mon === '*' && dow !== '*') {
                                    setFrequency('weekly');
                                    setInterval(1);
                                    setDaysOfWeek(dow.split(',').map(Number));
                                } else if (dom !== '*' && mon.startsWith('*/') && dow === '*') {
                                    setFrequency('monthly');
                                    setInterval(parseInt(mon.replace('*/', '')) || 1);
                                    setDayOfMonth(parseInt(dom) || 1);
                                }
                            }
                        } else if (initialData.scheduleData.repeat) {
                            const r = initialData.scheduleData.repeat;
                            setFrequency(r.frequency || 'daily');
                            setTime(r.time || '08:00');
                            setInterval(r.interval || 1);
                            setDaysOfWeek(r.daysOfWeek || []);
                            setDayOfMonth(r.dayOfMonth || 1);
                        }
                    }
                } else {
                    setScheduleMode('ONE_TIME');
                    setSendAt('');
                    setFrequency('daily');
                    setTime('08:00');
                    setDaysOfWeek([]);
                    setDayOfMonth(1);
                    setInterval(1);
                }
            } else {
                setTemplateName('');
                setScheduleMode('ONE_TIME');
                setSendAt('');
                setFrequency('daily');
                setTime('08:00');
                setDaysOfWeek([]);
                setDayOfMonth(1);
                setInterval(1);
            }
        }
    }, [open, initialData]);

    const validate = () => {
        const errs = {};

        if (!templateName.trim()) {
            errs.name = 'Tên lịch không được để trống';
        }

        if (scheduleMode === 'ONE_TIME') {
            if (!sendAt) {
                errs.sendAt = 'Vui lòng chọn thời gian gửi';
            } else if (new Date(sendAt) <= new Date()) {
                errs.sendAt = 'Thời gian gửi phải lớn hơn hiện tại';
            }
        } else {
            if (!time) errs.time = 'Vui lòng chọn giờ gửi';
            if (frequency === 'weekly' && daysOfWeek.length === 0) {
                errs.daysOfWeek = 'Vui lòng chọn ít nhất 1 ngày';
            }
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;

        let scheduleData;

        if (scheduleMode === 'ONE_TIME') {
            scheduleData = {
                type: 'ONE_TIME',
                sendAt: new Date(sendAt).toISOString(),
            };
        } else {
            let cronString = '* * * * *';
            const [h, m] = time.split(':').map(Number);
            const hour = isNaN(h) ? '*' : h;
            const minute = isNaN(m) ? '*' : m;
            
            if (frequency === 'daily') {
                cronString = `${minute} ${hour} */${interval || 1} * *`;
            } else if (frequency === 'weekly') {
                const days = [...daysOfWeek].sort((a, b) => a - b).join(',');
                cronString = `${minute} ${hour} * * ${days}`;
            } else if (frequency === 'monthly') {
                cronString = `${minute} ${hour} ${dayOfMonth || 1} */${interval || 1} *`;
            }

            scheduleData = {
                type: 'RECURRING',
                cronString,
                repeat: {
                    frequency,
                    interval: Number(interval),
                    time,
                    ...(frequency === 'weekly' && { daysOfWeek }),
                    ...(frequency === 'monthly' && { dayOfMonth: Number(dayOfMonth) }),
                },
            };
        }

        onSchedule(templateName.trim(), scheduleData);
    };

    const handleClose = () => {
        setTemplateName('');
        setSendAt('');
        setErrors({});
        setScheduleMode('ONE_TIME');
        onClose();
    };

    const toggleDay = (day) => {
        setDaysOfWeek(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    // Min datetime for the datetime-local input (current time + 5 min)
    const getMinDatetime = () => {
        const now = new Date(Date.now() + 5 * 60 * 1000);
        return now.toISOString().slice(0, 16);
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
                        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] overflow-y-auto"
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-6 pb-2">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 bg-[#4E5BA6]/10 rounded-xl">
                                    <CalendarCog className="h-5 w-5 text-[#4E5BA6]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">
                                        {initialData?.scheduleData && initialData.scheduleData.type !== 'MANUAL' ? 'Cập nhật lịch gửi' : 'Tạo lịch gửi thông báo'}
                                    </h3>
                                    <p className="text-sm text-slate-400">Lên lịch gửi tự động theo thời gian</p>
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
                        <div className="px-6 py-4 space-y-5">
                            {/* Template name */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-2">
                                    Tên lịch gửi <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => {
                                        setTemplateName(e.target.value);
                                        if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                                    }}
                                    placeholder="VD: Nhắc nộp báo cáo cuối tháng"
                                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all
                                        ${errors.name ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-[#4E5BA6] focus:ring-[#4E5BA6]/10'}
                                        focus:ring-2
                                    `}
                                    autoFocus
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>

                            {/* Schedule Mode Toggle */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-600 mb-2">Loại lịch</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setScheduleMode('ONE_TIME')}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer
                                            ${scheduleMode === 'ONE_TIME'
                                                ? 'bg-[#4E5BA6]/10 text-[#4E5BA6] ring-1 ring-[#4E5BA6]/30'
                                                : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                                            }
                                        `}
                                    >
                                        <CalendarDays className="h-4 w-4" />
                                        Gửi một lần
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setScheduleMode('RECURRING')}
                                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer
                                            ${scheduleMode === 'RECURRING'
                                                ? 'bg-[#4E5BA6]/10 text-[#4E5BA6] ring-1 ring-[#4E5BA6]/30'
                                                : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                                            }
                                        `}
                                    >
                                        <Repeat className="h-4 w-4" />
                                        Lặp lại
                                    </button>
                                </div>
                            </div>

                            {scheduleMode === 'ONE_TIME' && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex flex-col sm:flex-row gap-4"
                                >
                                    <div className="flex-1">
                                        <label className="block text-sm font-semibold text-slate-600 mb-2">
                                            Ngày gửi <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={sendAt ? sendAt.split('T')[0] : ''}
                                            min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 10)}
                                            onChange={(e) => {
                                                const currentTime = sendAt ? sendAt.split('T')[1] || '08:00' : '08:00';
                                                setSendAt(e.target.value ? `${e.target.value}T${currentTime}` : '');
                                                if (errors.sendAt) setErrors(prev => ({ ...prev, sendAt: '' }));
                                            }}
                                            className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all cursor-pointer
                                                ${errors.sendAt ? 'border-red-300' : 'border-slate-200 focus:border-[#4E5BA6]'}
                                                focus:ring-2 focus:ring-[#4E5BA6]/10
                                            `}
                                        />
                                        {errors.sendAt && <p className="text-red-500 text-xs mt-1">{errors.sendAt}</p>}
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 mb-2">
                                            <Clock className="h-3.5 w-3.5" />
                                            Giờ gửi <span className="text-red-500">*</span>
                                        </label>
                                        <TimeSelect24h
                                            value={sendAt ? sendAt.split('T')[1] || '08:00' : '08:00'}
                                            onChange={(newTime) => {
                                                const currentDate = sendAt ? sendAt.split('T')[0] : '';
                                                if (currentDate) {
                                                    setSendAt(`${currentDate}T${newTime}`);
                                                } else {
                                                    const today = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 10);
                                                    setSendAt(`${today}T${newTime}`);
                                                }
                                                if (errors.sendAt) setErrors(prev => ({ ...prev, sendAt: '' }));
                                            }}
                                            error={!!errors.sendAt}
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* RECURRING: Frequency + options */}
                            {scheduleMode === 'RECURRING' && (
                                <motion.div
                                    className="space-y-4"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    {/* Frequency */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-600 mb-2">Tần suất</label>
                                        <div className="flex gap-2">
                                            {[
                                                { value: 'daily', label: 'Hàng ngày' },
                                                { value: 'weekly', label: 'Hàng tuần' },
                                                { value: 'monthly', label: 'Hàng tháng' },
                                            ].map(opt => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() => setFrequency(opt.value)}
                                                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer
                                                        ${frequency === opt.value
                                                            ? 'bg-[#4E5BA6]/10 text-[#4E5BA6] ring-1 ring-[#4E5BA6]/30'
                                                            : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                                                        }
                                                    `}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Time */}
                                    <div>
                                        <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 mb-2">
                                            <Clock className="h-3.5 w-3.5" />
                                            Giờ gửi <span className="text-red-500">*</span>
                                        </label>
                                        <TimeSelect24h
                                            value={time}
                                            onChange={setTime}
                                            error={!!errors.time}
                                        />
                                        {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time}</p>}
                                    </div>

                                    {/* Daily: interval */}
                                    {frequency === 'daily' && (
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-600 mb-2">
                                                Mỗi bao nhiêu ngày?
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={31}
                                                value={interval}
                                                onChange={(e) => {
                                                    const v = Math.min(31, Math.max(1, Number(e.target.value) || 1));
                                                    setInterval(v);
                                                }}
                                                onInput={(e) => { e.target.value = e.target.value.slice(0, 2); }}
                                                className="w-24 px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#4E5BA6] focus:ring-2 focus:ring-[#4E5BA6]/10"
                                            />
                                            <span className="text-sm text-slate-400 ml-2">ngày/lần</span>
                                        </div>
                                    )}

                                    {/* Weekly: days selection */}
                                    {frequency === 'weekly' && (
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-600 mb-2">
                                                Chọn ngày trong tuần <span className="text-red-500">*</span>
                                            </label>
                                            <div className="flex gap-2 flex-wrap">
                                                {DAYS_OF_WEEK.map(day => (
                                                    <button
                                                        key={day.value}
                                                        type="button"
                                                        onClick={() => toggleDay(day.value)}
                                                        className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all cursor-pointer
                                                            ${daysOfWeek.includes(day.value)
                                                                ? 'bg-[#4E5BA6] text-white shadow-sm shadow-[#4E5BA6]/20'
                                                                : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                                                            }
                                                        `}
                                                    >
                                                        {day.label}
                                                    </button>
                                                ))}
                                            </div>
                                            {errors.daysOfWeek && <p className="text-red-500 text-xs mt-1">{errors.daysOfWeek}</p>}
                                        </div>
                                    )}

                                    {/* Monthly: day of month */}
                                    {frequency === 'monthly' && (
                                        <div className="flex gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-600 mb-2">Ngày trong tháng</label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={31}
                                                    value={dayOfMonth}
                                                    onChange={(e) => {
                                                        const v = Math.min(31, Math.max(1, Number(e.target.value) || 1));
                                                        setDayOfMonth(v);
                                                    }}
                                                    onInput={(e) => { e.target.value = e.target.value.slice(0, 2); }}
                                                    className="w-20 px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#4E5BA6] focus:ring-2 focus:ring-[#4E5BA6]/10"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-600 mb-2">Mỗi bao nhiêu tháng?</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={12}
                                                        value={interval}
                                                        onChange={(e) => {
                                                            const v = Math.min(12, Math.max(1, Number(e.target.value) || 1));
                                                            setInterval(v);
                                                        }}
                                                        onInput={(e) => { e.target.value = e.target.value.slice(0, 2); }}
                                                        className="w-20 px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#4E5BA6] focus:ring-2 focus:ring-[#4E5BA6]/10"
                                                    />
                                                    <span className="text-sm text-slate-400">tháng/lần</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
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
                                onClick={handleSubmit}
                                disabled={loading}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#4E5BA6] rounded-xl hover:bg-[#3D4A8F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm shadow-[#4E5BA6]/20"
                            >
                                {loading ? 'Đang xử lý...' : (initialData?.scheduleData && initialData.scheduleData.type !== 'MANUAL' ? 'Cập nhật lịch' : 'Tạo lịch')}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ScheduleSendModal;
