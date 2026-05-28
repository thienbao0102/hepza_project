const mongoose = require('mongoose');
const Company = require('./models/companyModel');
const User = require('./models/userModel');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const companiesData = [
  { 
    company_name: 'CÔNG TY CỔ PHẦN CƠ KHÍ XÂY DỰNG THƯƠNG MẠI ĐẠI DŨNG', 
    website: 'www.daidung.com', 
    address: 'Lô số 38, Khu C, Đường D1, Khu công nghiệp An Hạ, Xã Phạm Văn Hai, Huyện Bình Chánh, Thành phố Hồ Chí Minh', 
    company_type: 'Private', 
    zone_id: 'KCN001', 
    industry: ['Cơ khí xây dựng'], 
    industry_group: ['Cơ khí, điện, điện tử'],
    total_workers: 1600, 
    revenue: '1000 tỷ /năm', 
    revenue_currency: null, 
    market: 'Xuất khẩu', 
    founded_year: 1995, 
    phone_number: '0912345678',
    email: 'daidung@example.com',
    password: 'company123'
  },
  { 
    company_name: 'CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI LINH VÂN KIỆT', 
    website: '', 
    address: '30A, KHU B, DƯỜNG D2, KCN AN HẠ, XÃ PHẬM VĂN HAI, HUYỆN BÌNH CHÁNH , TP.HCM', 
    company_type: 'Private', 
    zone_id: 'KCN001', 
    industry: ['BAO BÌ GIẤY'], 
    industry_group: ['Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất'],
    total_workers: 40, 
    revenue: null, 
    revenue_currency: null, 
    market: 'Thị trường nội địa', 
    founded_year: 2013, 
    phone_number: '0912345679',
    email: 'linhvankiet@example.com',
    password: 'company123'
  },
  { 
    company_name: 'CÔNG TY TNHH CƠ KHÍ DƯỢC TUẤN THẮNG', 
    website: 'www.mayduoc.vn', 
    address: 'Lô số 4, khu G, đường N4, KCN An Hạ, xã Phạm Văn Hai, Bình Chánh, TP.HCM', 
    company_type: 'Private', 
    zone_id: 'KCN001', 
    industry: ['Thiết kế, sản xuất và kinh doanh máy móc thiết bị dùng trong ngành dược, thực phẩm và đồ uống'], 
    industry_group: ['Cơ khí, điện, điện tử'],
    total_workers: 18, 
    revenue: '15 tỷ /năm', 
    revenue_currency: null, 
    market: 'Thị trường nội địa', 
    founded_year: 2004, 
    phone_number: '0912345680',
    email: 'tuantang@example.com',
    password: 'company123'
  },
  { 
    company_name: 'CÔNG TY TNHH BZT USA', 
    website: 'https://bztusa.vn/', 
    address: 'Lô số 01, Khu H, đường N7, KCN An Hạ, Xã Phạm Văn Hai, Huyện Bình Chánh, TPHCM', 
    company_type: 'Private', 
    zone_id: 'KCN001', 
    industry: ['Sản xuất thức ăn chăn nuôi', 'Chất bổ sung dinh dưỡng', 'Chất cải tạo môi trường nuôi trồng thuỷ sản'], 
    industry_group: ['Chế biến lương thực, thực phẩm'],
    total_workers: 5, 
    revenue: '29.6 tỷ/năm', 
    revenue_currency: null, 
    market: 'Thị trường nội địa', 
    founded_year: 2011, 
    phone_number: '0912345681',
    email: 'bztusa@example.com',
    password: 'company123'
  },
  { 
    company_name: 'CÔNG TY TNHH CÁP ĐIỆN HIỆP THÀNH', 
    website: '', 
    address: 'Lô số 1, Khu H, Đường D2, KCN An Hạ, Xã Phạm Văn Hai, Huyện Bình Chánh, Thành Phố Hồ Chí Minh', 
    company_type: 'Private', 
    zone_id: 'KCN001', 
    industry: ['Sản xuất dây và cáp điện'], 
    industry_group: ['Cơ khí, điện, điện tử'],
    total_workers: 8, 
    revenue: '13 tỷ/năm', 
    revenue_currency: null, 
    market: 'Thị trường nội địa', 
    founded_year: 2018, 
    phone_number: '0912345682',
    email: 'hiepthanh@example.com',
    password: 'company123'
  },
  { 
    company_name: 'Công ty tnhh sxtm bao bì tân tiến phát tài', 
    website: '', 
    address: 'Lô 29 khu G đường D2 KCN An Hạ, xã phạm Văn Hai, Bình Chánh', 
    company_type: 'Private', 
    zone_id: 'KCN001', 
    industry: ['Sản xuất bao bì nhựa'], 
    industry_group: ['Hoá dược, cao su, nhựa'],
    total_workers: 197, 
    revenue: null, 
    revenue_currency: null, 
    market: 'Thị trường nội địa', 
    founded_year: 2004, 
    phone_number: '0912345683',
    email: 'tantienphattai@example.com',
    password: 'company123'
  },
  { 
    company_name: 'Công ty CP UV', 
    website: '', 
    address: '18 Lô G, Đường D1, KCN An Hạ, Xã Phạm Văn Hai, BÌnh Chánh, TPHCM', 
    company_type: 'Private', 
    zone_id: 'KCN001', 
    industry: ['Thuốc thú y', 'Thuốc thủy sản'], 
    industry_group: ['Hoá dược, cao su, nhựa'],
    total_workers: 120, 
    revenue: '284 tỷ/năm', 
    revenue_currency: null, 
    market: 'Thị trường nội địa, Xuất khẩu', 
    founded_year: 2007, 
    phone_number: '0912345684',
    email: 'uv@example.com',
    password: 'company123'
  },
  { 
    company_name: 'CÔNG TY CỔ PHẦN DẦU NHỜN PVOIL', 
    website: '', 
    address: '201 Điện Biên Phủ, phường 15, quận Bình Thạnh, TP.HCM', 
    company_type: 'State', 
    zone_id: 'KCN002', 
    industry: ['Sản xuất dầu nhờn'], 
    industry_group: ['Hoá dược, cao su, nhựa'],
    total_workers: 9, 
    revenue: null, 
    revenue_currency: null, 
    market: 'Thị trường nội địa', 
    founded_year: 2000, 
    phone_number: '0912345685',
    email: 'pvoil@example.com',
    password: 'company123'
  },
  { 
    company_name: 'CÔNG TY TNHH TOAN THẮNG', 
    website: '', 
    address: 'Lô E – KCN Bình Chiểu – TP. Thủ Đức – TP. Hồ Chí Minh', 
    company_type: 'Foreign', 
    zone_id: 'KCN002', 
    industry: ['Cá ngừ đóng hộp'], 
    industry_group: ['Chế biến lương thực, thực phẩm'],
    total_workers: 224, 
    revenue: null, 
    revenue_currency: null, 
    market: 'Xuất khẩu', 
    founded_year: 1999, 
    phone_number: '0912345686',
    email: 'toanthang@example.com',
    password: 'company123'
  },
  { 
    company_name: 'Công ty TNHH MTV In Bến Thành', 
    website: 'benthanhprint.com', 
    address: '160 Hai Bà Trưng, phường Đakao, quận 1, TP.Hồ Chí Minh', 
    company_type: 'JointVenture', 
    zone_id: 'KCN002', 
    industry: ['In ấn'], 
    industry_group: ['Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất'],
    total_workers: 36, 
    revenue: '34 tỷ/năm', 
    revenue_currency: null, 
    market: 'Thị trường nội địa, Xuất khẩu', 
    founded_year: 2014, 
    phone_number: '0912345687',
    email: 'benthanh@example.com',
    password: 'company123'
  }
];

const seedCompanies = async () => {
    try {
      await mongoose.connect(process.env.ATLAS_URI, { useNewUrlParser: true, useUnifiedTopology: true });
      console.log('Connected to MongoDB Atlas at 01:35 AM +07, May 29, 2025');
  
      for (const companyData of companiesData) {
        const existingCompany = await Company.findOne({ company_name: companyData.company_name, deleted_at: null });
        let company;
        if (!existingCompany) {
          company = await Company.create({
            company_name: companyData.company_name,
            website: companyData.website,
            address: companyData.address,
            company_type: companyData.company_type,
            zone_id: companyData.zone_id,
            industry: companyData.industry,
            industry_group: companyData.industry_group,
            total_workers: companyData.total_workers,
            revenue: companyData.revenue,
            revenue_currency: companyData.revenue_currency,
            market: companyData.market,
            founded_year: companyData.founded_year,
            created_by: companyData.created_by,
            updated_by: companyData.updated_by
          });
          console.log(`Company ${company.company_name} created with company_id: ${company.company_id}`);
        } else {
          company = existingCompany;
          console.log(`Company ${company.company_name} already exists`);
        }
  
        const existingUser = await User.findOne({ company_id: company.company_id, role: 'company', deleted_at: null });
        if (!existingUser) {
          const hashedPassword = await bcrypt.hash(companyData.password || 'defaultPassword123', 10);
          const user = await User.create({
            full_name: companyData.company_name,
            phone_number: companyData.phone_number || `090${Math.floor(10000000 + Math.random() * 90000000)}`,
            email: companyData.email,
            role: 'company',
            company_id: company.company_id,
            password: hashedPassword,
            firstLogin: true,
            created_at: new Date(),
            updated_at: new Date()
          });
          console.log(`User created for company ${company.company_name} with user_id: ${user.user_id}, email: ${user.email}`);
        } else {
          console.log(`User for company ${company.company_name} already exists`);
        }
      }
    } catch (error) {
      console.error('Error seeding companies:', error);
    } finally {
      await mongoose.connection.close();
    }
  };

// seedCompanies();