const mongoose = require('mongoose');
const InputResource = require('./models/inputResourcesModel');
const SummaryRecord = require('./models/summaryRecordsModel');
const Emission = require('./models/emissionModel');
require('dotenv').config();

const subgroupMapping = {
  material: ["MET", "NMET", "POL", "WOOD", "TEX", "AGRI", "PAC"],
  chemical: ["ACD", "BAS", "SLT", "SOL", "GAS", "ADD", "REDOX", "CHOT"],
};

// ----------------- Helper -----------------
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function round(num, digits = 3) {
  return +(num.toFixed(digits));
}

const CO2_FACTORS = {
  material: 0.25, // 0.25 tấn CO₂ / tấn vật liệu
  chemical: 0.4,  // 0.4 tấn CO₂ / tấn hóa chất
};

// ----------------- Sinh dữ liệu ngẫu nhiên -----------------
function generateInputData(year = 2024) {
  const data = [];

  for (let month = 1; month <= 12; month++) {
    const periodKey = parseInt(`${year}${month.toString().padStart(2, "0")}`);
    const totalRecords = rand(10, 18);

    for (let i = 0; i < totalRecords; i++) {
      const main_group = Math.random() > 0.5 ? "material" : "chemical";
      const subList = subgroupMapping[main_group];
      const sub_group = subList[rand(0, subList.length - 1)];

      data.push({
        name: `${main_group === "material" ? "Material" : "Chemical"}-${sub_group}-${rand(1, 999)}`,
        quantity: rand(1, 20),
        unit: "Tấn",
        company_id: "KCN001DN00001",
        zone_id: "KCN001",
        periodKey,
        main_group,
        sub_group,
      });
    }
  }

  return data;
}

const inputData = generateInputData(2024);

// ----------------- Reset tổng -----------------
function resetTotals() {
  return {
    // Materials
    total_materials: 0,
    total_co2_from_materials: 0,
    per_material: {},

    // Chemicals
    total_chemicals: 0,
    total_co2_from_chemicals: 0,
    per_chemical: {},
  };
}

// ----------------- Tính toán tích lũy -----------------
function accumulateTotals(totals, record) {
  const q = parseFloat(record.quantity);
  const factor = CO2_FACTORS[record.main_group] || 0.3;
  const co2 = round(q * factor);

  if (record.main_group === "material") {
    totals.total_materials += q;
    totals.total_co2_from_materials += co2;
    totals.per_material[record.sub_group] =
      (totals.per_material[record.sub_group] || 0) + q;
  } else if (record.main_group === "chemical") {
    totals.total_chemicals += q;
    totals.total_co2_from_chemicals += co2;
    totals.per_chemical[record.sub_group] =
      (totals.per_chemical[record.sub_group] || 0) + q;
  }
}

// ----------------- Upsert SummaryRecord -----------------
async function upsertSummary(company_id, periodKey, totals) {
  const setFields = {};

  // MATERIALS
  setFields['input_materials.total_materials'] = totals.total_materials;
  setFields['emissions.total_co2_from_materials'] = totals.total_co2_from_materials;
  for (const sub in totals.per_material) {
    setFields[`input_materials.total_materials_${sub}`] = totals.per_material[sub];
    setFields[`emissions.total_co2_from_materials_${sub}`] =
      round(totals.per_material[sub] * CO2_FACTORS.material);
  }

  // CHEMICALS
  setFields['input_chemicals.total_chemicals'] = totals.total_chemicals;
  setFields['emissions.total_co2_from_chemicals'] = totals.total_co2_from_chemicals;
  for (const sub in totals.per_chemical) {
    setFields[`input_chemicals.total_chemicals_${sub}`] = totals.per_chemical[sub];
    setFields[`emissions.total_co2_from_chemicals_${sub}`] =
      round(totals.per_chemical[sub] * CO2_FACTORS.chemical);
  }

  // Tổng CO₂
  setFields['emissions.total_co2'] =
    totals.total_co2_from_materials + totals.total_co2_from_chemicals;

  await SummaryRecord.findOneAndUpdate(
    { company_id, periodKey },
    { $set: setFields },
    { upsert: true, new: true }
  );

  console.log(`Updated SummaryRecord for ${company_id} - ${periodKey}`);
}

// ----------------- Seed Main -----------------
async function seedInputResources() {
  try {
    await mongoose.connect(process.env.ATLAS_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB Atlas");

    let currentMonth = inputData[0].periodKey;
    let totals = resetTotals();

    for (const record of inputData) {
      if (record.periodKey !== currentMonth) {
        await upsertSummary(record.company_id, currentMonth, totals);
        totals = resetTotals();
        currentMonth = record.periodKey;
      }

      const exist = await InputResource.findOne({
        company_id: record.company_id,
        periodKey: record.periodKey,
        main_group: record.main_group,
        sub_group: record.sub_group,
        name: record.name,
      });
      if (exist) {
        console.log(`Skipping existing ${record.name}`);
        continue;
      }

      accumulateTotals(totals, record);

      const input = new InputResource(record);
      await input.save();

      // ➕ Tạo emission
      const emission = new Emission({
        emission_name: `CO2 from ${record.name}`,
        quantity: round(record.quantity * CO2_FACTORS[record.main_group]),
        unit: "Tấn",
        periodKey : record.periodKey,
        company_id: record.company_id,
        zone_id: record.zone_id,
        main_group: record.main_group,
        sub_group: record.sub_group,
      });
      await emission.save();

      console.log(
        `Added InputResource + Emission: ${record.name} (${record.main_group}/${record.sub_group})`
      );
    }

    // Cập nhật tháng cuối cùng
    await upsertSummary(
      inputData[inputData.length - 1].company_id,
      currentMonth,
      totals
    );

    console.log("Finished seeding InputResource + Emissions!");
  } catch (err) {
    console.error("Error seeding:", err);
  } finally {
    await mongoose.connection.close();
  }
}

seedInputResources();

async function clearCollections() {
  try {
    await mongoose.connect(process.env.ATLAS_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB Atlas for clearing collections');
    await InputResource.deleteMany({});
    await Emission.deleteMany({});
    console.log('Cleared WasteResource and WasteDetail collections');
  } catch (error) {
    console.error('Error clearing collections:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// clearCollections();