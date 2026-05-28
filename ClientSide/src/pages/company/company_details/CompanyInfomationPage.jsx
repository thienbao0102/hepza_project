import CompanyInfoSection from './CompanyInfoSection';
import LicenseSection from './LicenseSection';
import EnvironmentalReportSection from './EnvironmentalReportSection';
import SymbiosisSummaryWidget from '@features/industrial-symbiosis/components/SymbiosisSummaryWidget';
import { useEnvReports } from '@/features/resources/hooks/useEnvironmentalReport';
import { AlertTriangle } from 'lucide-react';

const CompanyInfomationPage = ({ role, company, zone }) => {
    const companyId = company?.company_id || company?._id || company?.id;
    const currentYear = new Date().getFullYear();
    const { data: envReports = [] } = useEnvReports(companyId, { enabled: !!companyId && role === 'company' });
    const hasCurrentYearReport = envReports.some(r => r.year === currentYear);
    const showReminder = role === 'company' && !hasCurrentYearReport;

    return (
        <div className="grid grid-cols-6 gap-3 w-full pb-8">
            {/* Banner nhắc nhở nộp báo cáo môi trường */}
            {showReminder && (
                <div className="col-span-full flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 shadow-sm">
                    <div className="h-9 w-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-amber-800">
                            Chưa nộp Báo cáo Môi trường năm {currentYear}
                        </p>
                        <p className="text-xs text-amber-600 mt-0.5">
                            Vui lòng tải lên báo cáo môi trường hàng năm ở phần <strong>Báo cáo Môi trường</strong> bên dưới.
                        </p>
                    </div>
                </div>
            )}

            {/* Thông tin doanh nghiệp */}
            <CompanyInfoSection role={role} company={company} zone={zone} />

            <SymbiosisSummaryWidget />

            {/* Giấy phép & Báo cáo môi trường — side by side */}
            <div className="col-span-full grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
                <div><LicenseSection company={company} /></div>
                <div><EnvironmentalReportSection company={company} role={role} /></div>
            </div>
        </div>
    );
};

export default CompanyInfomationPage;

