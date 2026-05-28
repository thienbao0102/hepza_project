const Counter = require('../models/counterModel');

// === TỰ ĐỘNG MỞ RỘNG ĐỘ DÀI ===
const getNextSequenceValue = async (counterName, minDigits = 3) => {
  const counter = await Counter.findOneAndUpdate(
    { _id: counterName },
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return { seq: counter.sequence_value, digits: counter.digits || minDigits };
};

// === CHỈ DÀNH CHO admin, manager, company_user... (KHÔNG CÓ company) ===
const generateId = async (type, prefix) => {
  const minDigits = 3; // Chỉ còn 3 chữ số cho các loại khác
  const counterName = type;

  const { seq, digits } = await getNextSequenceValue(counterName, minDigits);
  return `${prefix}${seq.toString().padStart(digits, '0')}`;
};

// === RIÊNG CHO COMPANY, THEO ZONE ===
const generateCompanyId = async (zoneId) => {
  const counterName = `company_${zoneId}`;
  const { seq, digits } = await getNextSequenceValue(counterName, 5); // bắt đầu 5 số
  return `${zoneId}DN${seq.toString().padStart(digits, '0')}`;
};

module.exports = { generateId, generateCompanyId };