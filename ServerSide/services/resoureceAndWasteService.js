// Barrel re-export — backward compatibility for existing imports
// Decomposed into domain-focused services (Phase 3: PERF-02)
module.exports = {
  ...require('./resourceCrudService'),
  ...require('./resourceImportService'),
  ...require('./resourceRecalculateService'),
};
