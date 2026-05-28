const emissionRepository = require('../dataAccess/emissionRepository');

// Service to get emission by periodKey
const getEmissionByPeriod = async (company_id, zone_id, periodKeyStart, periodKeyEnd) => {
    return await emissionRepository.getEmission(company_id, zone_id, periodKeyStart, periodKeyEnd);
}

module.exports = {
    getEmissionByPeriod
};