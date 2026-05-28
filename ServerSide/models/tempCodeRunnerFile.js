//indexes
SummaryRecordSchema.index({ company_id: 1, periodKey: 1 });
SummaryRecordSchema.index({ zone_id: 1, company_id: 1, periodKey: 1 });