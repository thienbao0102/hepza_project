const mongoose = require('mongoose');
const abbreviation = require('../models/abbreviationModel');
require('dotenv').config();

const abbreviations = [
    // nhóm chính
    { _id: "material", name_group: "nguyên vật liệu" },
    { _id: "chemical", name_group: "hóa chất" },
    { _id: "waste", name_group: "chất thải" },
    { _id: "resource", name_group: "tài nguyên năng lượng" },
    
    // Nhóm vật liệu
    { _id: "MET", name_group: "kim loại & hợp kim" },
    { _id: "NMET", name_group: "phi kim" },
    { _id: "POL", name_group: "nhựa & polyme" },
    { _id: "WOOD", name_group: "gỗ & Liên quan gỗ" },
    { _id: "TEX", name_group: "vải & Sợi vải" },
    { _id: "AGRI", name_group: "thực phẩm & nông sản" },
    { _id: "PAC", name_group: "giấy & bìa carton" },
    { _id: "MOTH", name_group: "vật liệu khác" },

    // Nhóm hóa chất
    { _id: "HAZ", name_group: "hóa chất nguy hiểm" },
    { _id: "ACD", name_group: "axit" },
    { _id: "BAS", name_group: "bazơ / kiềm" },
    { _id: "SLT", name_group: "muối" },
    { _id: "SOL", name_group: "dung môi" },
    { _id: "GAS", name_group: "khí & hóa chất bay hơi" },
    { _id: "ADD", name_group: "phụ gia / chất trợ" },
    { _id: "REDOX", name_group: "chất khử / chất oxy hóa" },
    { _id: "CHOT", name_group: "hóa chất khác" },

    //nhiên liệu
    { _id: "el", name_group: "điện" },
    { _id: "wa", name_group: "nước" },
    { _id: "co", name_group: "chất đốt & nhiên liệu" },
    // Điện
    { _id: "Grid", name_group: "điện lưới" },
    { _id: "Renewable", name_group: "điện tái tạo" },
    //nước
    { _id: "tap", name_group: "nước cấp" },
    { _id: "rain", name_group: "nước mưa" },
    { _id: "well", name_group: "nước Giếng" },
    { _id: "recycle", name_group: "nước tái chế" },
    //chất đốt
    { _id: "COL", name_group: "than" },
    { _id: "BIO", name_group: "biomass / sinh khối" },
    { _id: "PET", name_group: "nhiên liệu dầu mỏ" },
    { _id: "GASF", name_group: "chất đốt dạng khí" },
    { _id: "COTH", name_group: "chất đốt khác" },

    //chất thải
    { _id: "DO", name_group: "chất thải sinh hoạt" },
    { _id: "IND", name_group: "chất thải công nghiệp" },
    { _id: "HA", name_group: "chất thải nguy hại" },
    { _id: "WWA", name_group: "nước thải" },
    { _id: "GASW", name_group: "khí thải" },

    // // Chất thải rắn
    // { _id: "WSO", name_group: "chất thải rắn" },
    // { _id: "DOS", name_group: "chất thải rắn sinh hoạt" },
    // { _id: "INDS", name_group: "chất thải rắn công nghiệp" },
    // { _id: "HAS", name_group: "chất thải rắn nguy hại" },

    // // nước thải
    // { _id: "WWA", name_group: "nước thải" },
    // { _id: "DOW", name_group: "nước thải sinh hoạt" },
    // { _id: "INDW", name_group: "nước thải công nghiệp" },
    // { _id: "HAW", name_group: "nước thải nguy hại" },
    
    // //khí thải
    // { _id: "GASW", name_group: "khí thải" },
    // { _id: "GHG", name_group: "khí nhà kính" },
    // { _id: "APG", name_group: "khí thải ô nhiễm không khí" },
    // { _id: "TOG", name_group: "khí thải độc hại" },

];

/* --------------------------- SEED FUNCTION --------------------------- */
const seedAbbreviations = async () => {
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('Connected to MongoDB Atlas');

    const existingCount = await abbreviation.countDocuments({});
    if (existingCount > 0) {
        console.log(`⚠️ Đã có ${existingCount} abbreviations → SKIP (không tạo lại)`);
        console.log('   Nếu muốn tạo lại, hãy xóa thủ công collection: abbreviations');
        mongoose.connection.close();
        return;
    }

    await abbreviation.insertMany(abbreviations);
    console.log(`✅ Seeded ${abbreviations.length} abbreviations successfully!`);

    mongoose.connection.close();
}

seedAbbreviations()