import {
  ADD_BUY_DEMAND_ROUTE,
  ADD_SELL_SUPPLY_ROUTE,
  GET_BUY_DEMANDS_ROUTE,
  GET_SELL_SUPPLIES_ROUTE,
  DELETE_BUY_DEMAND_ROUTE,
  DELETE_SELL_SUPPLY_ROUTE,
  UPDATE_BUY_DEMAND_ROUTE,
  UPDATE_SELL_SUPPLY_ROUTE,
  RECOMMENDATION_BUY_DEMAND_ROUTE,
  RECOMMENDATION_SELL_SUPPLY_ROUTE,
} from '@constants/constants';
import { requestViaTransport } from '@lib/transport-selector';
import { apiClient } from '@lib/api-client';

/**
 * Normalize response shape between socket and HTTP paths.
 * - Socket: socketRequest resolves ack.data (unwrapped)
 * - HTTP: callHttp returns full { message, data, isSuccess }
 * This ensures consumers always get the inner data.
 */
const unwrap = (result) => result?.data ?? result;

/**
 * Build FormData from data object + files array.
 * @param {Object} data   - plain fields (JSON serializable)
 * @param {File[]} files  - array of File objects for upload
 * @returns {FormData}
 */
const buildFormData = (data, files = []) => {
  const formData = new FormData();
  formData.append('data', JSON.stringify(data));
  for (const file of files) {
    formData.append('attachments', file);
  }
  return formData;
};

/**
 * Axios config override cho FormData — PHẢI xóa Content-Type
 * để Axios tự set multipart/form-data kèm boundary.
 */
const formDataConfig = {
  headers: { 'Content-Type': undefined },
};

// ===== GET RECOMMENDATIONS =====

export const getBuyRecommendations = async () => {
  const result = await requestViaTransport({
    method: 'get',
    url: RECOMMENDATION_BUY_DEMAND_ROUTE,
    event: 'symbiosis:getBuyRecommendations',
  });
  return unwrap(result);
};

export const getSellRecommendations = async () => {
  const result = await requestViaTransport({
    method: 'get',
    url: RECOMMENDATION_SELL_SUPPLY_ROUTE,
    event: 'symbiosis:getSellRecommendations',
  });
  return unwrap(result);
};

// ===== GET OWN LISTS =====

export const getBuyDemands = async () => {
  const result = await requestViaTransport({
    method: 'get',
    url: GET_BUY_DEMANDS_ROUTE,
    event: 'symbiosis:getBuyDemands',
  });
  return unwrap(result);
};

export const getSellSupplies = async () => {
  const result = await requestViaTransport({
    method: 'get',
    url: GET_SELL_SUPPLIES_ROUTE,
    event: 'symbiosis:getSellSupplies',
  });
  return unwrap(result);
};

// ===== ADD (HTTPS only — multipart/form-data for file uploads) =====

export const addBuyDemand = async (data = {}, files = []) => {
  const { wasteName, otherWasteName, industrialGrs, desiredWasteCode, quantity, unit, price,
    currency, notes, expiryDate } = data;
  const payload = {
    wasteName,
    otherWasteName: otherWasteName || undefined,
    industrialGrs: industrialGrs || undefined,
    desiredWasteCode: desiredWasteCode || undefined,
    quantity: quantity || 0,
    unit: unit || 'Tấn',
    price,
    currency: currency || 'VND',
    notes,
    expiryDate: expiryDate || null,
  };

    const formData = buildFormData(payload, files);
    const result = await apiClient.post(ADD_BUY_DEMAND_ROUTE, formData, formDataConfig);
    return result.data;
};

export const addSellSupply = async (data = {}, files = []) => {
  const { wasteName, otherWasteName, industrialGrs, wasteCode, hazardLevel, quantity, unit, price,
    currency, frequency, expiryDate, notes } = data;
  const payload = {
    wasteName,
    otherWasteName: otherWasteName || undefined,
    industrialGrs: industrialGrs || undefined,
    wasteCode: wasteCode || undefined,
    hazardLevel: hazardLevel || undefined,
    quantity: quantity || 0,
    unit: unit || 'Tấn',
    price,
    currency: currency || 'VND',
    frequency: frequency || 'một lần',
    expiryDate: expiryDate || null,
    notes,
  };

    const formData = buildFormData(payload, files);
    const result = await apiClient.post(ADD_SELL_SUPPLY_ROUTE, formData, formDataConfig);
    return result.data;
};

// ===== DELETE (still dual transport — no file upload needed) =====

export const deleteBuyDemand = async (demandId) => {
    return await requestViaTransport({
        method: 'delete',
        url: DELETE_BUY_DEMAND_ROUTE(demandId),
        event: 'symbiosis:deleteBuyDemand',
        payload: { _id: demandId },
    });
};

export const deleteSellSupply = async (supplyId) => {
    return await requestViaTransport({
        method: 'delete',
        url: DELETE_SELL_SUPPLY_ROUTE(supplyId),
        event: 'symbiosis:deleteSellSupply',
        payload: { _id: supplyId },
  });
};

// ===== UPDATE (HTTPS only — multipart/form-data for file uploads) =====

export const updateBuyDemand = async (demandId, data = {}, files = []) => {
  const { wasteName, otherWasteName, desiredMainGroup, desiredWasteCode, quantity, unit, price,
    currency, notes, expiryDate, existingAttachments } = data;
  const payload = {
    wasteName,
    otherWasteName,
    desiredMainGroup,
    desiredWasteCode,
    quantity,
    unit,
    price,
    currency,
    notes,
    expiryDate,
    existingAttachments: existingAttachments || [],
    __v: data.__v,
  };

    const formData = buildFormData(payload, files);
    const result = await apiClient.put(UPDATE_BUY_DEMAND_ROUTE(demandId), formData, formDataConfig);
    return unwrap(result.data);
};

export const updateSellSupply = async (supplyId, data = {}, files = []) => {
  const { wasteName, otherWasteName, industrialGrs, wasteCode, hazardLevel, quantity, unit, price,
    currency, frequency, expiryDate, notes, existingAttachments } = data;
  const payload = {
    wasteName,
    otherWasteName,
    industrialGrs,
    wasteCode: wasteCode || undefined,
    hazardLevel: hazardLevel || undefined,
    quantity,
    unit,
    price,
    currency,
    frequency,
    expiryDate: expiryDate || null,
    notes,
    existingAttachments: existingAttachments || [],
    __v: data.__v,
  };

    const formData = buildFormData(payload, files);
    const result = await apiClient.put(UPDATE_SELL_SUPPLY_ROUTE(supplyId), formData, formDataConfig);
    return unwrap(result.data);
};
