const mongoose = require("mongoose");
require("dotenv").config();

const SummaryRecord = require("./models/summaryRecordsModel");
const FuelResource = require("./models/fuelResourcesModel");
const Emission = require("./models/emissionModel");

// =============================
// CONFIG
// =============================
const COMPANY_ID = "KCN001DN00001";
const ZONE_ID = "KCN001";
const yearStart = 2010;
const yearEnd = 2024;

const fuelGroups = {
  // Điện
  el: ["Grid", "Renewable"],
  // Nước
  wa: ['tap', 'rain', 'well', 'recycle'],
  // Chất đốt (Combustion)
  co: ["COL", "BIO", "PET", "GASF", "COTH"],
};

// =============================
// UTILS
// =============================
const rand = (min, max) => Math.round(Math.random() * (max - min) + min);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// hệ số phát thải CO₂ (kg CO2 / đơn vị)
const CO2_FACTORS = {
  el: { grid: 0.7, renewable: 0.2 },
  wa: { tap: 0.05, rain: 0.01, well: 0.02, recycle: 0.03 },
  co: { COL: 2.5, BIO: 1.0, PET: 3.2, GASF: 2.0, COTH: 1.5 },
};

// =============================
// SEED FUNCTION
// =============================
async function seed() {
  await mongoose.connect(process.env.ATLAS_URI);
  console.log("Connected to MongoDB");

  // Clear old data
  await SummaryRecord.deleteMany({});
  await FuelResource.deleteMany({});
  await Emission.deleteMany({});
  console.log("Cleared existing collections");

  for (let YEAR = yearStart; YEAR <= yearEnd; YEAR++) {
    for (let month = 1; month <= 9; month++) {
      const periodKey = YEAR * 100 + month;
      console.log(`\nGenerating data for periodKey: ${periodKey}`);

      const summary = new SummaryRecord({
        company_id: COMPANY_ID,
        zone_id: ZONE_ID,
        periodKey,
        fuels: {},
        emissions: {},
        waste: {},
      });

      ["fuels", "emissions"].forEach((section) => {
        Object.keys(SummaryRecord.schema.obj[section]).forEach((key) => {
          // Chỉ gán 0 cho các field kiểu tổng, bỏ qua các trường "unit_"
          if (!key.startsWith("unit_")) {
            summary[section][key] = 0;
          }
        });
      });

      const numFuelRecords = rand(8, 15);
      const allResources = [];

      for (let i = 0; i < numFuelRecords; i++) {
        const main_group = pick(Object.keys(fuelGroups));
        const sub_group = pick(fuelGroups[main_group]);
        const quantity = rand(100, 10000);
        const unit =
          main_group === "el" ? "kWh" : main_group === "wa" ? "m³" : "tấn";

        // Create FuelResource
        const fuel = new FuelResource({
          fuelName: `${main_group.toUpperCase()}_${sub_group}`,
          quantity,
          unit,
          company_id: COMPANY_ID,
          zone_id: ZONE_ID,
          periodKey,
          main_group,
          sub_group,
        });
        await fuel.save();

        // Không gán lại _id của detail
        // detailDoc._id = fuel._id; // Xóa dòng này
        // await detailDoc.save();

        // Create Emission
        const factor = CO2_FACTORS[main_group][sub_group] || 0;
        const co2Emission = quantity * factor;
        const emission = new Emission({
          emission_name: `CO₂ từ ${main_group.toUpperCase()} - ${sub_group}`,
          quantity: co2Emission,
          unit: "Tấn",
          company_id: COMPANY_ID,
          zone_id: ZONE_ID,
          periodKey,
          main_group: "resource",
          sub_group: main_group,
        });
        await emission.save();

        allResources.push({ main_group, sub_group, quantity });
      }

      // Calculate totals (unchanged)
      const sumBy = (filterFn) =>
        allResources
          .filter(filterFn)
          .reduce((acc, cur) => acc + cur.quantity, 0);

      // Electricity
      summary.fuels.total_electricity_grid = sumBy(
        (r) => r.main_group === "el" && r.sub_group === "Grid"
      );
      summary.fuels.total_electricity_renewable = sumBy(
        (r) => r.main_group === "el" && r.sub_group === "Renewable"
      );
      summary.fuels.total_electricity =
        summary.fuels.total_electricity_grid +
        summary.fuels.total_electricity_renewable;

      // Water
      summary.fuels.total_water_tap = sumBy(
        (r) => r.main_group === "wa" && r.sub_group === "tap"
      );
      summary.fuels.total_water_rain = sumBy(
        (r) => r.main_group === "wa" && r.sub_group === "rain"
      );
      summary.fuels.total_water_well = sumBy(
        (r) => r.main_group === "wa" && r.sub_group === "well"
      );
      summary.fuels.total_water_recycle = sumBy(
        (r) => r.main_group === "wa" && r.sub_group === "recycle"
      );
      summary.fuels.total_water =
        summary.fuels.total_water_tap +
        summary.fuels.total_water_rain +
        summary.fuels.total_water_well +
        summary.fuels.total_water_recycle;

      // Combustion
      ["COL", "BIO", "PET", "GASF", "COTH"].forEach((sg) => {
        summary.fuels[`total_combustion_${sg}`] = sumBy(
          (r) => r.main_group === "co" && r.sub_group === sg
        );
      });
      summary.fuels.total_combustion = ["COL", "BIO", "PET", "GASF", "COTH"].reduce(
        (acc, sg) => acc + summary.fuels[`total_combustion_${sg}`],
        0
      );

      summary.fuels.total_fuels =
        summary.fuels.total_electricity +
        summary.fuels.total_water +
        summary.fuels.total_combustion;

      // Emissions
      allResources.forEach((r) => {
        const factor = CO2_FACTORS[r.main_group][r.sub_group] || 0;
        const co2 = r.quantity * factor;

        summary.emissions.total_co2 += co2;

        if (r.main_group === "el") {
          summary.emissions.total_co2_from_electricity += co2;
          summary.emissions[`total_co2_from_electricity_${r.sub_group}`] = co2;
        } else if (r.main_group === "wa") {
          summary.emissions.total_co2_from_water += co2;
          summary.emissions[`total_co2_from_water_${r.sub_group}`] = co2;
        } else if (r.main_group === "co") {
          summary.emissions.total_co2_from_combustion += co2;
          summary.emissions[`total_co2_from_combustion_${r.sub_group}`] = co2;
        }
      });

      await summary.save();
    }
  }

  console.log("\nDone seeding all SummaryRecord + FuelResource + Detail + Emission");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  mongoose.disconnect();
});
