import { useAuth } from '@app/providers/auth/AuthProvider';
import ReportTable from '@/features/resources/components/ReportTable';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useHeader } from '@/components/common/Header/HeaderContext';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { DataActions } from '@/components/ui/Button';

const ITEMS_PER_PAGE = 15;

const ResourceReportListPage = () => {
  const { user } = useAuth();
  const role = user?.role ?? user?.user?.role;
  const companyId = user?.company_id ?? user?.user?.company_id;
  const zoneId = user?.zone_id ?? user?.user?.zone_id;
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (location.state?.shouldRefresh) {
      queryClient.invalidateQueries({ queryKey: ['resource-history'] });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);
  const { setHeaderConfig, setBreadcrumbItems } = useHeader();

  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isCompany = role === 'company';

  const handleNavigateToDeclare = () => {
    navigate('/resources/resource-form');
  };

  const declareButton = isCompany ? (
    <button
      className="flex items-center gap-2 rounded-xl bg-[#4E5BA6] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#4E5BA6]/90"
      type="button"
      onClick={handleNavigateToDeclare}
    >
      <Plus size={16} />
      Khai báo
    </button>
  ) : null;
  useEffect(() => {
    setHeaderConfig({
      title: 'Danh sách bản khai báo Tài nguyên và Chất thải',
      description: 'Tạo và quản lý các kỳ khai báo của bạn',
      showWeather: true,
      showDatePicker: false,
      // rightContent: (
      //     <DataActions
      //         onExport={() => navigate('/reports')}
      //     />
      // ),
    });

    setBreadcrumbItems([
      {
        key: '/resources',
        title: 'Quản lý tài nguyên',
      },
      {
        key: '/resources/resources-list',
        title: 'Danh sách bản khai báo Tài nguyên và Chất thải',
      },
    ]);
  }, []);
  const getTitle = () => {
    if (isAdmin) return 'Danh sách bản khai báo Tài nguyên và Chất thải';
    if (isManager) return 'Danh sách bản khai báo Tài nguyên và Chất thải';
    return ' Danh sách bản khai báo Tài nguyên và Chất thải';
  };

  const getDescription = () => {
    if (isAdmin || isManager) return 'Xem các bản khai báo từ doanh nghiệp';
    return 'Tạo và quản lý các kỳ khai báo của bạn';
  };

  return (
    <div className="flex h-full flex-col ">

      <div className="flex-1 flex">
        <ReportTable
          companyId={companyId}
          extraToolbarContent={declareButton}
          itemsPerPage={ITEMS_PER_PAGE}
          role={role}
          zoneId={zoneId}
        />
      </div>
    </div>
  );
};
export default ResourceReportListPage;
