const SummaryRecordRepository = require('../dataAccess/summaryRecordRepository');
const companyService = require('./companyService');

// Service to get summary record
const getSummaryRecord = async (company_id, zone_id, periodKeyStart, periodKeyEnd, include = [1]) => {
  const aggregateByMonth = false;
  return await SummaryRecordRepository.getSummaryRecordAggregate(company_id, zone_id, periodKeyStart, periodKeyEnd, include, aggregateByMonth);
}

// Service to get summary record by periodKey
const getSummaryRecordByPeriodKey = async (company_id, zone_id, periodKeyStart, periodKeyEnd, include = [1]) => {
  const aggregateByMonth = true;
  return await SummaryRecordRepository.getSummaryRecordAggregate(company_id, zone_id, periodKeyStart, periodKeyEnd, include, aggregateByMonth);
}

// get missing company_id not declared summary for a given periodKey
const getMissingCompanyIdsByPeriod = async (periodKey) => {
  return await SummaryRecordRepository.getMissingCompanyIdsByPeriod(periodKey);
}

const checkAccessPermission = async (user, company_id, zone_id, res) => {
  if (user.role === 'company') {
    if (!company_id) return { company_id: user.company_id, zone_id };
    if (user.company_id !== company_id) {
      res.status(403).json({
        message: 'You\'re not authorized to access information from another company.',
        isSuccess: false
      });
      return null;
    }
  } else if (user.role === 'manager') {
    // Luôn dùng zone_id của manager để kiểm tra quyền
    const managerZoneId = user.zone_id;
    if (!company_id && !zone_id) return { company_id, zone_id: managerZoneId };
    if (zone_id && zone_id !== managerZoneId) {
      res.status(403).json({
        message: 'You\'re not authorized to access information from another zone.',
        isSuccess: false
      });
      return null;
    }
    // Khi có company_id → check company thuộc zone của manager
    if (company_id && !(await companyService.checkCompanyBelongToZone(company_id, managerZoneId))) {
      res.status(403).json({
        message: 'You\'re not authorized to access information from companies outside your management zone.',
        isSuccess: false
      });
      return null;
    }
    // Đảm bảo zone_id luôn có giá trị
    return { company_id, zone_id: zone_id || managerZoneId };
  }

  return { company_id, zone_id };
};


module.exports = {
  getSummaryRecord,
  getSummaryRecordByPeriodKey,
  checkAccessPermission,
  getMissingCompanyIdsByPeriod
};