import { z } from 'zod';

// Zod Schema for Enterprise Import
export const enterpriseSchema = z.object({
    name: z.string().min(1, "Thiếu Tên DN"),
    tax_id: z.string().optional(),
    industrial_park: z.string().min(1, "Thiếu KCN"),
    established_year: z.string().optional(),
    address: z.string().optional(),
    industry_group: z.string().min(1, "Thiếu Nhóm ngành"),
    industry: z.string().min(1, "Thiếu Ngành nghề"),
    type: z.string().optional(),
    employee_count: z.string().optional(),
    website: z.string().optional(),
    revenue: z.string().optional(),
    market: z.string().optional(),

    // Representative
    representative: z.string().optional(),
    email: z.string().email("Email sai định dạng").optional().or(z.literal('')),
    phone: z.string().optional(),
});

// Helper: Format File Size
export const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
