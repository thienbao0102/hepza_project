const convertToCron = (schedule) => {
    if (schedule.type !== 'RECURRING') return null;

    if (typeof schedule?.cronString === 'string' && schedule.cronString.trim()) {
        return schedule.cronString.trim();
    }

    if (!schedule?.repeat || typeof schedule.repeat !== 'object') {
        throw new Error('Thiếu cấu hình lặp lại cho lịch gửi định kỳ.');
    }

    const { frequency, interval = 1, daysOfWeek, dayOfMonth, time } = schedule.repeat;
    
    let hour = '*';
    let minute = '*';

    if (time && time !== '*:*') {
        const [h, m] = time.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) throw new Error('Thời gian không hợp lệ (HH:mm)');
        if (h < 0 || h > 23 || m < 0 || m > 59) throw new Error('Giờ/phút không hợp lệ');
        hour = h;
        minute = m;
    }
    let cron = '';

    switch (frequency) {
        case 'daily':
            if (interval < 1 || interval > 31) {
                throw new Error('Interval cho daily phải từ 1 đến 31');
            }
            cron = `${minute} ${hour} */${interval} * *`;
            break;

        case 'weekly':
            if (interval !== 1) {
                throw new Error('Interval cho weekly phải = 1');
            }
            if (!daysOfWeek || daysOfWeek.length === 0) {
                throw new Error('Vui lòng chọn ít nhất 1 ngày trong tuần');
            }
            const days = daysOfWeek.sort((a, b) => a - b).join(',');
            cron = `${minute} ${hour} * * ${days}`;
            break;

        case 'monthly':
            if (interval < 1 || interval > 12) {
                throw new Error('Interval cho monthly phải từ 1 đến 12');
            }
            if (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31) {
                throw new Error('Ngày trong tháng phải từ 1 đến 31');
            }
            cron = `${minute} ${hour} ${dayOfMonth} */${interval} *`;
            break;

        default:
            throw new Error('Frequency không hợp lệ: daily | weekly | monthly');
    }

    return cron;
};

module.exports = { convertToCron };
