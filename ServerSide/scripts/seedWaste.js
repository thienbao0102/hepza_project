const mongoose = require('mongoose');
const WasteResource = require('./models/wasteResourcesModel');
const WasteDetail = require('./models/wasteDetailResourcesModel');
const SummaryRecord = require('./models/summaryRecordsModel');
const Emission = require("./models/emissionModel");
require('dotenv').config();

// ----------------- CONFIG -----------------
const CO2_FACTORS_WASTE = { // kg CO₂ / tấn
  DO: 0.45,
  RE: 0.30,
  HA: 0.70,
  NH: 0.40,
};

// ----------------- UTILS -----------------
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateWasteData(year = 2024) {
  const enumGroups = ["DO", "RE", "HA", "NH"];
  const wasteNames = {
    DO: ["Domestic Waste", "Household Garbage"],
    RE: ["Plastic Recyclables", "Metal Scrap", "Paper Waste"],
    HA: ["Hazardous Chemicals", "Medical Waste"],
    NH: ["Industrial Non-hazardous", "Packaging Waste"]
  };

  const data = [];

  for (let month = 1; month <= 12; month++) {
    const periodKey = parseInt(`${year}${month.toString().padStart(2, "0")}`);
    const count = rand(8, 15);

    for (let i = 0; i < count; i++) {
      const main_group = enumGroups[rand(0, enumGroups.length - 1)];
      const wasteName = wasteNames[main_group][rand(0, wasteNames[main_group].length - 1)];

      const record = {
        wasteName,
        quantity: rand(1, 15),
        unit: "Tấn",
        company_id: "KCN001DN00001",
        zone_id: "KCN001",
        periodKey,
        main_group,
        purpose: main_group === "RE" ? "Recycling" : undefined,
        price: main_group === "RE" ? rand(1000, 5000) : undefined,
        purchasingAddress:
          main_group === "RE" ? `${rand(1, 999)} Recycle Street, City` : undefined,
        purchasingUnit:
          main_group === "RE" ? "Recycle Co." : undefined,
      };

      Object.keys(record).forEach(k => record[k] === undefined && delete record[k]);
      data.push(record);
    }
  }

  return data;
}

const wasteData = generateWasteData(2024);

function resetTotals() {
  return {
    total_waste: 0,
    total_waste_DO: 0,
    total_waste_RE: 0,
    total_waste_HA: 0,
    total_waste_NH: 0,
    total_co2_from_waste: 0,
    total_co2_from_waste_DO: 0,
    total_co2_from_waste_RE: 0,
    total_co2_from_waste_HA: 0,
    total_co2_from_waste_NH: 0,
  };
}

function accumulateTotals(totals, record) {
  const q = parseFloat(record.quantity);
  totals.total_waste += q;
  totals.total_co2_from_waste += q * 0.5;

  switch (record.main_group) {
    case "DO":
      totals.total_waste_DO += q;
      totals.total_co2_from_waste_DO += q * 0.45;
      break;
    case "RE":
      totals.total_waste_RE += q;
      totals.total_co2_from_waste_RE += q * 0.3;
      break;
    case "HA":
      totals.total_waste_HA += q;
      totals.total_co2_from_waste_HA += q * 0.7;
      break;
    case "NH":
      totals.total_waste_NH += q;
      totals.total_co2_from_waste_NH += q * 0.4;
      break;
  }
}

async function upsertSummary(company_id, periodKey, totals) {
  await SummaryRecord.findOneAndUpdate(
    { company_id, periodKey },
    {
      $set: {
        'waste.total_waste': totals.total_waste,
        'waste.total_waste_DO': totals.total_waste_DO,
        'waste.total_waste_RE': totals.total_waste_RE,
        'waste.total_waste_HA': totals.total_waste_HA,
        'waste.total_waste_NH': totals.total_waste_NH,

        'emissions.total_co2_from_waste': totals.total_co2_from_waste,
        'emissions.total_co2_from_waste_DO': totals.total_co2_from_waste_DO,
        'emissions.total_co2_from_waste_RE': totals.total_co2_from_waste_RE,
        'emissions.total_co2_from_waste_HA': totals.total_co2_from_waste_HA,
        'emissions.total_co2_from_waste_NH': totals.total_co2_from_waste_NH,
      },
      $inc: { 'emissions.total_co2': totals.total_co2_from_waste }
    },
    { upsert: true, new: true }
  );
  console.log(`Upserted SummaryRecord for ${company_id} - ${periodKey}`);
}

async function findExistingWaste(company_id, periodKey, main_group, wasteName) {
  return await WasteResource.findOne({ company_id, periodKey, main_group, wasteName });
}

// ----------------- MAIN SEED SCRIPT -----------------
const seedWasteResources = async () => {
  try {
    await mongoose.connect(process.env.ATLAS_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB Atlas');

    let currentMonth = wasteData[0].periodKey;
    let totals = resetTotals();

    for (const record of wasteData) {
      if (record.periodKey !== currentMonth) {
        await upsertSummary(record.company_id, currentMonth, totals);
        totals = resetTotals();
        currentMonth = record.periodKey;
      }

      const existingWaste = await findExistingWaste(
        record.company_id,
        record.periodKey,
        record.main_group,
        record.wasteName
      );
      if (existingWaste) {
        console.log(`Skipping existing WasteResource: ${record.company_id} - ${record.periodKey} - ${record.main_group} - ${record.wasteName}`);
        continue;
      }

      accumulateTotals(totals, record);

      let wasteDetailId = null;
      if (record.purpose || record.price || record.purchasingAddress || record.purchasingUnit) {
        const detail = new WasteDetail({
          purpose: record.purpose,
          price: record.price,
          purchasingAddress: record.purchasingAddress,
          purchasingUnit: record.purchasingUnit
        });
        const savedDetail = await detail.save();
        wasteDetailId = savedDetail.wasteDetail_id;
      }

      //Tạo WasteResource
      const waste = new WasteResource({
        wasteName: record.wasteName,
        quantity: record.quantity,
        unit: record.unit,
        company_id: record.company_id,
        zone_id: record.zone_id,
        periodKey: record.periodKey,
        main_group: record.main_group,
        wasteDetailId
      });
      await waste.save();

      //Tính và tạo Emission tương ứng
      const factor = CO2_FACTORS_WASTE[record.main_group] || 0.5;
      const co2Emission = +(record.quantity * factor).toFixed(3);

      const emission = new Emission({
        emission_name: `CO2 từ ${record.wasteName}`,
        quantity: co2Emission,
        unit: "tấn",
        company_id: record.company_id,
        zone_id: record.zone_id,
        periodKey: record.periodKey,
        main_group: "waste",
        sub_group: record.main_group,
      });
      await emission.save();

      console.log(`Inserted WasteResource + Emission: ${record.company_id} - ${record.periodKey} - ${record.main_group} - ${record.wasteName}`);
    }

    await upsertSummary(
      wasteData[wasteData.length - 1].company_id,
      currentMonth,
      totals
    );

  } catch (err) {
    console.error('Error seeding waste data:', err);
  } finally {
    await mongoose.connection.close();
  }
};

// ----------------- RUN -----------------
seedWasteResources();

// delete all documents in WasteResource and WasteDetail collections

async function clearCollections() {
  try {
    await mongoose.connect(process.env.ATLAS_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB Atlas for clearing collections');
    await WasteResource.deleteMany({});
    await WasteDetail.deleteMany({});
    console.log('Cleared WasteResource and WasteDetail collections');
  } catch (error) {
    console.error('Error clearing collections:', error);
  } finally {
    await mongoose.connection.close();
  }
}

// clearCollections();
