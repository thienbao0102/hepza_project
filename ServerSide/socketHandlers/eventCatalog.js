module.exports = {
  company: [
    'company:getAll', 'company:getById', 'company:create', 'company:createBatch',
    'company:update', 'company:deleteOne', 'company:deleteMany',
    'company:restoreOne', 'company:restoreMany',
    'company:getDeleted', 'company:hardDeleteOne', 'company:hardDeleteMany',
    'company:previewSoftDelete', 'company:previewHardDelete', 'company:previewImport',
    'company:license:add', 'company:license:update', 'company:license:deleteOne',
    'company:license:get', 'company:license:deleteMany'
  ],
  user: [
    'user:create', 'user:update', 'user:deleteOne', 'user:deleteMany',
    'user:getByRole', 'user:getById', 'user:restoreOne', 'user:restoreMany',
    'user:profile:update', 'user:profile:verifyEmailOtp',
    'user:getDeletedByRole', 'user:hardDeleteOne', 'user:hardDeleteMany',
    'user:previewSoftDelete', 'user:previewHardDelete'
  ],
  zone: [
    'zone:getAll', 'zone:getById', 'zone:create', 'zone:update',
    'zone:deleteOne', 'zone:deleteMany', 'zone:restoreOne', 'zone:restoreMany',
    'zone:hardDeleteOne', 'zone:hardDeleteMany', 'zone:previewSoftDelete', 'zone:previewHardDelete'
  ],
  industry: [
    'industry:getGroups', 'industry:getAll', 'industry:getGroupById', 'industry:getById',
    'industry:createGroup', 'industry:create', 'industry:updateGroup', 'industry:update',
    'industry:deleteGroup', 'industry:delete', 'industry:restoreGroup', 'industry:restore'
  ],
  hashtag: ['hashtag:getAll', 'hashtag:create'],
  resourceWaste: ['resourceWaste:create', 'resourceWaste:update', 'resourceWaste:getData', 'resourceWaste:getAllWithHistory', 'resourceWaste:import'],
  notification: [
    'notification:template:create', 'notification:template:update', 'notification:template:disable',
    'notification:template:getAll', 'notification:template:getById', 'notification:template:restore',
    'notification:template:getDisabled', 'notification:template:hardDelete',
    'notification:send', 'notification:sendImmediate', 'notification:getSendHistory',
    'notification:log:pin', 'notification:log:unpin', 'notification:log:getById',
    'notification:user:getMy', 'notification:user:markRead', 'notification:user:pin',
    'notification:user:unpin', 'notification:user:getInstanceById',
    'notification:user:deleteOne', 'notification:user:deleteMany',
    'notification:admin:deleteOne', 'notification:admin:deleteByTemplate',
    'notification:admin:deleteMany', 'notification:admin:deleteManySendLogs'
  ],
  regulation: ['regulation:getAll', 'regulation:getById', 'regulation:create', 'regulation:update', 'regulation:deleteOne', 'regulation:deleteMany'],
  solution: ['solution:getAll', 'solution:getById', 'solution:create', 'solution:update', 'solution:deleteOne', 'solution:deleteMany'],
  summary: ['summary:getRecord', 'summary:getByPeriodKey'],
  emission: ['emission:getData'],
  export: ['export:resourceWaste', 'export:init', 'export:getStatus', 'export:getHistory', 'export:deleteHistoryItem', 'export:pinHistoryItem'],
  errorLog: ['errorLog:getAll', 'errorLog:create', 'errorLog:updateStatus', 'errorLog:delete'],
  enterpriseList: ['enterpriseList:getList', 'enterpriseList:getUndeclared', 'enterpriseList:getYearlyMatrix']
};
