const industryRepository = require('../dataAccess/industryRepository');

const getAllIndustryGroups = async (page, limit, search) => {
  return await industryRepository.getAllIndustryGroups(page, limit, search);
};

const getAllIndustries = async (page, limit, search, filter) => {
  return await industryRepository.getAllIndustries(page, limit, search, filter);
};

const createIndustryGroup = async (groupData, session) => {
  return await industryRepository.createIndustryGroup(groupData, session);
};

const createIndustry = async (industryData, session) => {
  return await industryRepository.createIndustry(industryData, session);
};

const updateIndustryGroup = async (groupId, groupData, session) => {
  return await industryRepository.updateIndustryGroup(groupId, groupData, session);
};

const updateIndustry = async (industryId, industryData, session) => {
  return await industryRepository.updateIndustry(industryId, industryData, session);
};

const deleteIndustryGroup = async (groupId, session) => {
  return await industryRepository.deleteIndustryGroup(groupId, session);
};

const deleteIndustry = async (industryId, session) => {
  return await industryRepository.deleteIndustry(industryId, session);
};

const getIndustryGroupById = async (groupId) => {
  return await industryRepository.getIndustryGroupById(groupId);
};

const getIndustryById = async (industryId) => {
  return await industryRepository.getIndustryById(industryId);
};

const countIndustriesByGroup = async (groupId) => {
  return await industryRepository.countIndustriesByGroup(groupId);
};

module.exports = {
  getAllIndustryGroups,
  getAllIndustries,
  createIndustryGroup,
  createIndustry,
  updateIndustryGroup,
  updateIndustry,
  deleteIndustryGroup,
  deleteIndustry,
  getIndustryGroupById,
  getIndustryById,
  countIndustriesByGroup,
};