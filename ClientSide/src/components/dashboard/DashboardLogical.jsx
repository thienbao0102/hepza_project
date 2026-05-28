import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

/**
 * Format số với suffix tiếng Việt cho số lớn.
 * - >= 1 tỷ (1,000,000,000) -> "X tỷ"
 * - >= 1 triệu (1,000,000) -> "X triệu"
 * - >= 10 nghìn (10,000) -> "X nghìn"
 * - Số nhỏ hơn giữ nguyên format với dấu phân cách hàng nghìn
 */
export function formatSmallNumbers(value) {
    if (value === null || value === undefined) {
        return '0';
    }

    const num = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    const formatShorthand = (val, unit) => {
        const formatted = new Intl.NumberFormat('vi-VN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
            useGrouping: true
        }).format(val);
        return `${sign}${formatted} ${unit}`;
    };

    // Tỷ (Billion)
    if (num >= 1_000_000_000) {
        return formatShorthand(num / 1_000_000_000, 'tỷ');
    }

    // Triệu (Million)
    if (num >= 1_000_000) {
        return formatShorthand(num / 1_000_000, 'triệu');
    }

    // Nghìn (Thousand) - hiển thị từ 10,000
    if (num >= 10_000) {
        return formatShorthand(num / 1_000, 'nghìn');
    }

    // Số nhỏ: hiển thị tối đa 2 số thập phân
    return `${sign}${new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
        useGrouping: true
    }).format(num)}`;
}

export function formatCompactDashboard(value) {
    if (value === null || value === undefined) return '0';
    const num = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    const fmt = (v, suffix) => {
        const formatted = new Intl.NumberFormat('vi-VN', {
            maximumFractionDigits: 1
        }).format(v);
        return `${sign}${formatted}${suffix}`;
    };

    if (num >= 1_000_000_000) return fmt(num / 1_000_000_000, ' Tỷ');
    if (num >= 1_000_000) return fmt(num / 1_000_000, ' Tr');
    if (num >= 1_000) return fmt(num / 1_000, 'K');
    
    return `${sign}${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(num)}`;
}

export function formatFullNumber(value) {
    if (value === null || value === undefined) return '0';
    return new Intl.NumberFormat('vi-VN').format(value);
}

export const transformDataToMonthlyMap = (rawArray, valuePath, name, color, totalMonths = 12) => {
    const getNestedValue = (obj, path) => {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === undefined || current === null) return undefined;
            current = current[part];
        }
        return current;
    };

    // Lấy tháng hiện tại
    const currentMonth = new Date().getMonth() + 1; // 1-12

    const monthlyMap = {};

    const isMulti = Array.isArray(name);

    // Chỉ khởi tạo các tháng <= currentMonth
    for (let i = 1; i <= currentMonth; i++) {
        if (isMulti) {
            monthlyMap[i] = name.map((n, idx) => ({ Name: n, Value: 0, Color: color[idx] }));
        } else {
            monthlyMap[i] = [{ Name: name, Value: 0, Color: color }];
        }
    }

    // Đảm bảo rawArray là một mảng
    const safeArray = Array.isArray(rawArray) ? rawArray : (rawArray?.summaryRecord || []);

    safeArray.forEach(item => {
        const periodKey = item.periodKey;
        const value = typeof valuePath === 'function' ? valuePath(item) : getNestedValue(item, valuePath);

        if (periodKey && value !== undefined && value !== null) {
            const month = parseInt(periodKey.toString().slice(-2), 10);

            // Chỉ cập nhật nếu tháng <= currentMonth
            if (month >= 1 && month <= currentMonth) {
                if (isMulti && Array.isArray(value)) {
                    monthlyMap[month] = name.map((n, idx) => ({
                        Name: n,
                        Value: value[idx],
                        Color: color[idx],
                    }));
                } else {
                    monthlyMap[month] = [{
                        Name: name,
                        Value: value,
                        Color: color,
                    }];
                }
            }
        }
    });

    return monthlyMap;
};

export const calcPercentageChange = ({ previousMonthData, currentMonthData }) => {
    if (typeof previousMonthData !== 'number' || typeof currentMonthData !== 'number') {
        return (
            <span className=" flex gap-1 text-gray-500 text-sm px-2 leading-5 invisible">
                <Minus strokeWidth={1.3} />
                <p className="text-nowrap"></p>
            </span>
        );
    }

    if (previousMonthData === 0) {
        if (currentMonthData > 0) {
            return (
                <span className="flex items-center  gap-1 text-blue-600 text-sm px-2 leading-5">
                    <ArrowUpRight strokeWidth={1.3} />
                    <p className="text-nowrap">Mới</p>
                </span>
            );
        }
        return (
            <span className=" flex gap-1 text-gray-500 text-sm px-2 leading-5 invisible">
                <Minus strokeWidth={1.3} />
                <p className="text-nowrap"></p>
            </span>
        );
    }

    const percent = ((currentMonthData - previousMonthData) / previousMonthData) * 100;
    const absPercent = Math.abs(percent);
    const isPositive = percent > 0;

    let displayValue;
    if (isPositive && absPercent >= 100) {
        const multiplier = Math.round(absPercent / 100 + 1);
        displayValue = `x${multiplier.toLocaleString('vi-VN')}`;
    } else {
        displayValue = `${Math.round(absPercent).toLocaleString('vi-VN')}%`;
    }

    if (percent < 0) {
        return (
            <span className="flex items-center  gap-1 text-red-600 text-sm px-2 leading-5">
                <ArrowDownRight strokeWidth={1.3} />
                <p className="text-nowrap">Giảm {displayValue}</p>
            </span>
        );
    }

    if (percent > 0) {
        return (
            <span className="flex items-center  gap-1 text-green-600 text-sm px-2 leading-5">
                <ArrowUpRight strokeWidth={1.3} />
                <p className="text-nowrap">Tăng {displayValue}</p>
            </span>
        );
    }

    return (
        <span className="flex items-center  gap-1 text-gray-500 text-sm px-2 leading-5">
            <Minus strokeWidth={1.3} />
            <p className="text-nowrap">Không đổi</p>
        </span>
    );
}

export const calculateTrend = (current = 0, previous = 0) => {
    if (!previous || previous === 0) {
        return current > 0 ? 'NEW' : 0;
    }
    const trend = ((current - previous) / previous) * 100;
    return Math.round(trend); // Bỏ số thập phân, làm tròn thành số nguyên
};