/**
 * Seed Script: Bulk Create Company Users
 *
 * Tạo hàng loạt tài khoản doanh nghiệp (role: company).
 * - Password lấy từ data (không random, không gửi email)
 * - firstLogin = false (bỏ đổi mật khẩu lần đầu)
 * - Tự động tạo KCN nếu zone_name chưa tồn tại
 * - Theo sát logic createUser & addCompany hiện có
 *
 * Cách chạy:
 *   node ServerSide/scripts/seedBulkCompanyUsers.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ─── Models ───────────────────────────────────────────────────
const Company = require('../models/companyModel');
const User = require('../models/userModel');
const IndustrialZone = require('../models/industrialZoneModel');

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Detect zone_type từ tên KCN/KCX
 * (theo companyController.detectZoneType)
 */
const detectZoneType = (zoneName) => {
  if (!zoneName) return 'KCN';
  const normalized = zoneName.trim().toUpperCase();
  if (normalized.startsWith('KCX')) return 'KCX';
  return 'KCN';
};

/**
 * Normalize value thành mảng
 * (theo companyService.normalizeToArray)
 */
const normalizeToArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
};

// ─── DATA ─────────────────────────────────────────────────────
// Điền data thật vào đây. Tất cả các trường bên dưới là bắt buộc.
const companiesData = [
  // {
  //   "full_name": "Đinh Thuỳ Trang",
  //   "phone_number": "0399770007",
  //   "company_name": "Công ty TNHH Cheng Loong Bình Dương Paper",
  //   "zone_name": "KCN Protrade",
  //   "email": "thuytrangspk@gmail.com",
  //   "industry_group": [
  //     "Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất"
  //   ],
  //   "company_registration_number": "3702420498",
  //   "industry": [
  //     "Sản xuất giấy nhăn, bìa nhăn, bao bì từ giấy và bìa"
  //   ],
  //   "password": "Dinhthuytrang@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "VŨ THỊ VÂN ANH",
  //   "phone_number": "0333151714",
  //   "company_name": "Công ty TNHH Cheng Loong Bình Dương Paper-025",
  //   "zone_name": "KCN Protrade",
  //   "email": "vuthivananh91996@gmail.com",
  //   "industry_group": [
  //     "Khác"
  //   ],
  //   "company_registration_number": "3702420498-025",
  //   "industry": [
  //     "Sản xuất giấy nhăn, bìa nhăn, bao bì từ giấy và bìa"
  //   ],
  //   "password": "Vuthivananh@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Hồ Phương Liên",
  //   "phone_number": "0989082089",
  //   "company_name": "Công ty TNHH MTV Quốc tế Protrade",
  //   "zone_name": "KCN Protrade",
  //   "email": "Lien.hp@pitp.com.vn",
  //   "industry_group": [
  //     "Khác"
  //   ],
  //   "company_registration_number": "3700856169",
  //   "industry": [
  //     "Hoạt động xây dựng chuyên dụng khác"
  //   ],
  //   "password": "Hophuonglien@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Nguyễn Đức Phúc",
  //   "phone_number": "0983283837",
  //   "company_name": "Công ty TNHH DenEast Việt Nam",
  //   "zone_name": "KCN VSIP 2A",
  //   "email": "Phuc.nguyen@deneast.com",
  //   "industry_group": [
  //     "Chế biến lương thực, thực phẩm"
  //   ],
  //   "company_registration_number": "3702612538",
  //   "industry": [
  //     "Chế biến sữa và các sản phẩm từ sữa"
  //   ],
  //   "password": "Nguyenducphuc@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Lê Thị Kim Qui",
  //   "phone_number": "0976246317",
  //   "company_name": "Công ty TNHH Tessellation Bình Dương",
  //   "zone_name": "KCN VSIP 1",
  //   "email": "Qui.le@tessellation.group",
  //   "industry_group": [
  //     "May mặc, thuộc da, dệt nhuộm"
  //   ],
  //   "company_registration_number": "3700350774",
  //   "industry": [
  //     "Sản xuất các sản phẩm may mặc và nguyên phụ liệu phục vụ ngành may mặc"
  //   ],
  //   "password": "Lethikimqui@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Lê Thị Phương Lan",
  //   "phone_number": "0918364071",
  //   "company_name": "CÔNG TY TNHH BOX PAK VN",
  //   "zone_name": "KCN VSIP 1",
  //   "email": "lan@boxpak.com.vn",
  //   "industry_group": [
  //     "Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất"
  //   ],
  //   "company_registration_number": "3700509422",
  //   "industry": [
  //     "Sản xuất giấy nhăn, bìa nhăn, bao bì từ giấy và bìa"
  //   ],
  //   "password": "Lethiphuonglan@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Mai Quốc Phú",
  //   "phone_number": "0785090090",
  //   "company_name": "Công ty TNHH MTV Quốc Tế Protrade-025",
  //   "zone_name": "KCN Protrade",
  //   "email": "phu.mq@pitp.com.vn",
  //   "industry_group": [
  //     "Khác"
  //   ],
  //   "company_registration_number": "3700856169-025",
  //   "industry": [
  //     "Hoạt động xây dựng chuyên dụng khác"
  //   ],
  //   "password": "Maiquocphu@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Trần Thị Thuỳ Thảo",
  //   "phone_number": "0767731399",
  //   "company_name": "CÔNG TY TNHH BOX-PAK (VIỆT NAM)-025",
  //   "zone_name": "KCN VSIP 1",
  //   "email": "personnel@boxpak.com.vn",
  //   "industry_group": [
  //     "Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất"
  //   ],
  //   "company_registration_number": "3700509422-025",
  //   "industry": [
  //     "Sản xuất giấy nhăn, bìa nhăn, bao bì từ giấy và bìa"
  //   ],
  //   "password": "Tranthithuythao@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Đỗ Thị Hân",
  //   "phone_number": "096961588",
  //   "company_name": "Công Ty TNHH Xưởng Giấy Chánh Dương",
  //   "zone_name": "KCN Mỹ Phước",
  //   "email": "Handt@ndpaper.com.vn",
  //   "industry_group": [
  //     "Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất"
  //   ],
  //   "company_registration_number": "3700520987",
  //   "industry": [
  //     "Sản xuất các sản phẩm khác từ giấy và bìa"
  //   ],
  //   "password": "Dothihan@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Trần Thị Thanh Hồng",
  //   "phone_number": "0901544297",
  //   "company_name": "Công ty CP Xi măng Fico Tây Ninh - Trạm nghiền Hiệp Phước",
  //   "zone_name": "KCN Hiệp Phước",
  //   "email": "hong.tran@fico-ytl.com",
  //   "industry_group": [
  //     "Khác"
  //   ],
  //   "company_registration_number": "3900365922-002",
  //   "industry": [
  //     "Sản xuất xi măng, vôi và thạch cao"
  //   ],
  //   "password": "Tranthithanhhong@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Phan Thị Tường Vy",
  //   "phone_number": "0902004247",
  //   "company_name": "Công ty TNHH HỢP KIM VÀ CÔNG NGHỆ VẬT LIỆU KIM THỊNH",
  //   "zone_name": "KCN Hiệp Phước",
  //   "email": "Vy.phan@kimthinh.com",
  //   "industry_group": [
  //     "Khác"
  //   ],
  //   "company_registration_number": "0309117250",
  //   "industry": [
  //     "Bán buôn kim loại và quặng kim loại"
  //   ],
  //   "password": "Phanthituongvy@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Nguyễn Văn Dũng",
  //   "phone_number": "0963200752",
  //   "company_name": "công ty TNHH Thép Tung Ho Việt Nam",
  //   "zone_name": "KCN Phú Mỹ 2",
  //   "email": "a0558@tunghosteel.com",
  //   "industry_group": [
  //     "Khác"
  //   ],
  //   "company_registration_number": "3500791394",
  //   "industry": [
  //     "Sản xuất sắt, thép, gang"
  //   ],
  //   "password": "Nguyenvandung@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Trần Thanh Quang",
  //   "phone_number": "0933330860",
  //   "company_name": "Công ty TNHH Thép Tung Ho Việt Nam-025",
  //   "zone_name": "KCN Phú Mỹ 2",
  //   "email": "Thanhquang2021@tunghosteel.com",
  //   "industry_group": [
  //     "Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất"
  //   ],
  //   "company_registration_number": "3500791394-025",
  //   "industry": [
  //     "Sản xuất sắt, thép, gang"
  //   ],
  //   "password": "Tranthanhquang@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Đoàn Trung Thức",
  //   "phone_number": "0945253191",
  //   "company_name": "WOLRDON COMPANY LIMITED",
  //   "zone_name": "KCN Đông Nam",
  //   "email": "compliance01_worldon@shenzhougroup.com",
  //   "industry_group": [
  //     "May mặc, thuộc da, dệt nhuộm"
  //   ],
  //   "company_registration_number": "0313095786",
  //   "industry": [
  //     "May trang phục"
  //   ],
  //   "password": "Doantrungthuc@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Nguyễn Thị Cẩm Giang",
  //   "phone_number": "0988753171",
  //   "company_name": "Công ty TNHH LEGO Manufacturing Việt Nam",
  //   "zone_name": "KCN VSIP 3",
  //   "email": "Giang.cam@lego.com",
  //   "industry_group": [
  //     "Khác"
  //   ],
  //   "company_registration_number": "3703067162",
  //   "industry": [
  //     "Sản xuất sản phẩm từ plastic"
  //   ],
  //   "password": "Nguyenthicamgiang@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Ngô Thị Ngọc Hoàng",
  //   "phone_number": "0392454746",
  //   "company_name": "Công ty TNHH Posco Việt Nam",
  //   "zone_name": "KCN Phú Mỹ 2",
  //   "email": "ntn.hoang@posco.net",
  //   "industry_group": [
  //     "Khác"
  //   ],
  //   "company_registration_number": "3500771158",
  //   "industry": [
  //     "Sản xuất sắt, thép, gang"
  //   ],
  //   "password": "Ngothingochoang@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Đặng Thế Tư",
  //   "phone_number": "0865515157",
  //   "company_name": "Công ty TNHH Asia Packaging Industries Việt Nam",
  //   "zone_name": "KCN Mỹ Phước 2",
  //   "email": "dang.the.tu@api.com.vn",
  //   "industry_group": [
  //     "Khác"
  //   ],
  //   "company_registration_number": "3700696204",
  //   "industry": [
  //     "Sản xuất sản phẩm từ plastic"
  //   ],
  //   "password": "Dangthetu@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Sơn Phúc",
  //   "phone_number": "0978111470",
  //   "company_name": "Công ty TNHH Polytex Far Eastern (Việt Nam)",
  //   "zone_name": "KCN Bàu Bàng",
  //   "email": "sonphuc@fenc.vn",
  //   "industry_group": [
  //     "May mặc, thuộc da, dệt nhuộm"
  //   ],
  //   "company_registration_number": "3702376432",
  //   "industry": [
  //     "Sản xuất, gia công sản xuất các sản phẩm xơ tổng hợp polyester gồm cả xơ dài filament; sợi công nghiệp HTY."
  //   ],
  //   "password": "Sonphuc@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Nguyễn Anh",
  //   "phone_number": "0918909802",
  //   "company_name": "Công ty cổ phần Giấy Sài Gòn",
  //   "zone_name": "KCN Mỹ Xuân A",
  //   "email": "anhnt@saigonpaper.com",
  //   "industry_group": [
  //     "Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất"
  //   ],
  //   "company_registration_number": "3500813231",
  //   "industry": [
  //     "Sản xuất các sản phẩm khác từ giấy và bìa"
  //   ],
  //   "password": "Nguyenanh@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Lương Thị Thơm",
  //   "phone_number": "0989300050",
  //   "company_name": "Công ty TNHH MTV Xi măng Hạ Long",
  //   "zone_name": "KCN Hiệp Phước",
  //   "email": "luongthithom@vicemhalong.vn",
  //   "industry_group": [
  //     "Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất"
  //   ],
  //   "company_registration_number": "0309453823",
  //   "industry": [
  //     "Sản xuất xi măng, vôi và thạch cao"
  //   ],
  //   "password": "Luongthithom@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Nguyễn Võ Sơn Trà",
  //   "phone_number": "0909346445",
  //   "company_name": "Công ty TNHH SX Hiệp Phước Thành",
  //   "zone_name": "KCN Hiệp Phước",
  //   "email": "tra.nguyen@pte.vn",
  //   "industry_group": [
  //     "Khác"
  //   ],
  //   "company_registration_number": "0302981380",
  //   "industry": [
  //     "Gia công cơ khí"
  //   ],
  //   "password": "Nguyenvosontra@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Huỳnh Ngọc Vân Thanh",
  //   "phone_number": "0768589147",
  //   "company_name": "Công ty TNHH Giấy Kraft Vina",
  //   "zone_name": "KCN Mỹ Phước 3",
  //   "email": "thanh.huynh@vinakraft.com",
  //   "industry_group": [
  //     "Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất"
  //   ],
  //   "company_registration_number": "3700777421",
  //   "industry": [
  //     "Sản xuất giấy nhăn, bìa nhăn, bao bì từ giấy và bìa"
  //   ],
  //   "password": "Huynhngocvanthanh@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Phạm Thị Thu Nga",
  //   "phone_number": "0902176005",
  //   "company_name": "Công Ty TNHH Giấy Kraft Vina-025",
  //   "zone_name": "KCN Mỹ Phước 3",
  //   "email": "nga.pham@vinakraft.com",
  //   "industry_group": [
  //     "Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất"
  //   ],
  //   "company_registration_number": "3700777421-025",
  //   "industry": [
  //     "Sản xuất giấy nhăn, bìa nhăn, bao bì từ giấy và bìa"
  //   ],
  //   "password": "Phamthithunga@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Nguyễn Thanh Trúc",
  //   "phone_number": "0768684810",
  //   "company_name": "Công ty TNHH Giấy Kraft Vina-026",
  //   "zone_name": "KCN Mỹ Phước 3",
  //   "email": "truc.nguyen@vinakraft.com",
  //   "industry_group": [
  //     "Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất"
  //   ],
  //   "company_registration_number": "3700777421-026",
  //   "industry": [
  //     "Sản xuất giấy nhăn, bìa nhăn, bao bì từ giấy và bìa"
  //   ],
  //   "password": "Nguyenthanhtruc@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Anh Đặng Quang Chức",
  //   "phone_number": "0918689863",
  //   "company_name": "CHI NHÁNH CÔNG TY XI MĂNG CHINFON - NHÀ MÁY NGHIỀN CLINKER HIỆP PHƯỚC",
  //   "zone_name": "KCN Hiệp Phước",
  //   "email": "chucdq@cfc.vn",
  //   "industry_group": ["Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất"],
  //   "company_registration_number": "0200110200-006",
  //   "industry": [
  //     "Sản xuất xi măng, vôi và thạch cao"
  //   ],
  //   "password": "Anhdangquangchuc@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Huỳnh Công Thành",
  //   "phone_number": "0966869736",
  //   "company_name": "CÔNG TY CỔ PHẦN HỢP TRÍ SUMMIT",
  //   "zone_name": "KCN Hiệp Phước",
  //   "email": "thanhhc@hoptrisummit.com",
  //   "industry_group": ["Hoá dược, cao su, nhựa"],
  //   "company_registration_number": "0303015573-005",
  //   "industry": [
  //     "Sản xuất thuốc trừ sâu và sản phẩm hoá chất khác"
  //   ],
  //   "password": "Huynhcongthanh@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Nguyễn Ngọc Chinh",
  //   "phone_number": "02743766206",
  //   "company_name": "Công ty TNHH CNTP Liwayway Sai Gòn",
  //   "zone_name": "KCN VSIP",
  //   "email": "sgiso@oishi.com.vn",
  //   "industry_group": ["Chế biến lương thực, thực phẩm"],
  //   "company_registration_number": "3701308172",
  //   "industry": [
  //     "Chế biến lương thực, thực phẩm"
  //   ],
  //   "password": "Nguyenngocchinh@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Vũ Thị Vân Anh",
  //   "phone_number": "0333151710",
  //   "company_name": "Công ty TNHH Cheng Loong Bình Dương Paper-026",
  //   "zone_name": "KCN Protrade",
  //   "email": "vuthivananh.hufi@gmail.com",
  //   "industry_group": ["Khác"],
  //   "company_registration_number": "3702420498-026",
  //   "industry": [
  //     "Sản xuất giấy nhăn, bìa nhăn, bao bì từ giấy và bìa"
  //   ],
  //   "password": "Vuthivananh@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Bùi Văn Vượng",
  //   "phone_number": "0911490239",
  //   "company_name": "Công ty TNHH Asia Packaging Industries Việt Nam -025",
  //   "zone_name": "KCN Mỹ Phước 2",
  //   "email": "bui.van.vuong@api.com.vn",
  //   "industry_group": ["Khác"],
  //   "company_registration_number": "3700696204-025",
  //   "industry": [
  //     "Sản xuất sản phẩm từ plastic"
  //   ],
  //   "password": "Buivanvuong@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Lê Chí Điệp",
  //   "phone_number": "0933920115",
  //   "company_name": "Chi nhánh Tổng công ty Máy động lực và Máy nông nghiệp Việt Nam CTCP-Nhà máy đúc",
  //   "zone_name": "KCN Hiệp Phước",
  //   "email": "vfmain@veamfoundry.vn",
  //   "industry_group": ["Khác"],
  //   "company_registration_number": "0100103866-007",
  //   "industry": [
  //     "Sản xuất sản phẩm khác bằng kim loại"
  //   ],
  //   "password": "Lechidiep@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Trần quốc thắng",
  //   "phone_number": "0962042052",
  //   "company_name": "Công ty TNHH Wattens Việt Nam",
  //   "zone_name": "KCN VSIP 2",
  //   "email": "Thang.tran@delfortgroup.com",
  //   "industry_group": ["Khác"],
  //   "company_registration_number": "3700891452",
  //   "industry": [
  //     "Sản xuất và chế biến các sản phẩm có liên quan đến ngành giấy bao gồm: giấy thuốc lá, giấy đầu lọc, giấy dùng làm bao bì"
  //   ],
  //   "password": "Tranquocthang@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "THÁI BÁ KHÁNH TRÌNH",
  //   "phone_number": "0979833680",
  //   "company_name": "Công Ty TNHH Công Nghiệp KOLON Bình Dương",
  //   "zone_name": "KCN Bàu Bàng Mở Rộng",
  //   "email": "Trinhtbk@kolon.com",
  //   "industry_group": ["Hoá dược, cao su, nhựa"],
  //   "company_registration_number": "3702528269",
  //   "industry": [
  //     "Sản xuất sợi"
  //   ],
  //   "password": "Thaibakhanhtrinh@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Ngô Quang Tài",
  //   "phone_number": "0908077968",
  //   "company_name": "Công ty TNHH Thép Vina Kyoei",
  //   "zone_name": "KCN Phú Mỹ 1",
  //   "email": "quangtai@vinakyoeisteel.com.vn",
  //   "industry_group": ["Khác"],
  //   "company_registration_number": "3500106761",
  //   "industry": [
  //     "Sản xuất sắt, thép, gang"
  //   ],
  //   "password": "Ngoquangtai@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Nguyễn Thị Kim Linh",
  //   "phone_number": "0772985765",
  //   "company_name": "Công ty cổ phần sữa quốc tế LOF",
  //   "zone_name": "KCN Bàu Bàng Mở Rộng",
  //   "email": "Linh.nguyenthikim@lof.vn",
  //   "industry_group": ["Chế biến lương thực, thực phẩm"],
  //   "company_registration_number": "0500463609",
  //   "industry": [
  //     "Chế biến sữa và các sản phẩm từ sữa"
  //   ],
  //   "password": "Nguyenthikimlinh@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Vũ Quốc Viễn",
  //   "phone_number": "0968351143",
  //   "company_name": "Công ty TNHH New Toyo Pulppy VN",
  //   "zone_name": "KCN VSIP",
  //   "email": "vienbuichu@gmail.com",
  //   "industry_group": ["Vật liệu xây dựng, sản xuất giấy, gỗ, trang trí nội thất"],
  //   "company_registration_number": "3700240066",
  //   "industry": [
  //     "Sản xuất, chế biến  giấy vệ sinh và các sản phẩm liên quan đến giấy vệ sinh."
  //   ],
  //   "password": "Vuquocvien@123",
  //   "role": "company"
  // },
  // {
  //   "full_name": "Phan Ngọc Thiện",
  //   "phone_number": "0853749746",
  //   "company_name": "Công ty TNHH Tessellation Bình Dương -001",
  //   "zone_name": "KCN Việt Nam - Singapore",
  //   "email": "thien.phan@compassgreentech.com",
  //   "industry_group": ["May mặc, thuộc da, dệt nhuộm"],
  //   "company_registration_number": "3700350774-001",
  //   "industry": [
  //     "Sản xuất các sản phẩm may mặc và nguyên phụ liệu phục vụ ngành may mặc."
  //   ],
  //   "password": "Phanngocthien@123",
  //   "role": "company"
  // },
  {
    "full_name": "Bùi Minh Tuấn",
    "phone_number": "0927061984",
    "company_name": "Công ty TNHH URC Việt Nam",
    "zone_name": "KCN Vsip",
    "email": "Minhtuan.bui@urcvn.com",
    "industry_group": ["Chế biến lương thực, thực phẩm"],
    "company_registration_number": "3700549827",
    "industry": [
      "Sản xuất đồ uống không cồn, nước khoáng."
    ],
    "password": "Buiminhtuan@123",
    "role": "company"
  },
  {
    "full_name": "Nguyễn Hữu Quân",
    "phone_number": "0987147124",
    "company_name": "Công ty TNHH URC Việt Nam -001",
    "zone_name": "KCN Việt Nam - Singapore",
    "email": "Nguyenhuu.quan@urcvn.com",
    "industry_group": ["Chế biến lương thực, thực phẩm"],
    "company_registration_number": "3700549827-001",
    "industry": [
      "Sản xuất đồ uống không cồn, nước khoáng."
    ],
    "password": "Nguyenhuuquan@123",
    "role": "company"
  },
  {
    "full_name": "Nguyễn Thị Bích Trâm",
    "phone_number": "0906339861",
    "company_name": "Công ty TNHH URC Việt Nam -002",
    "zone_name": "KCN Việt Nam - Singapore",
    "email": "Nguyenthibich.tram@urcvn.com",
    "industry_group": ["Chế biến lương thực, thực phẩm"],
    "company_registration_number": "3700549827-002",
    "industry": [
      "Sản xuất đồ uống không cồn, nước khoáng."
    ],
    "password": "Nguyenthibichtram@123",
    "role": "company"
  },
];
// ─── MAIN ─────────────────────────────────────────────────────
// ALL-OR-NOTHING: 1 transaction duy nhất cho toàn bộ mảng.
// Nếu BẤT KỲ record nào fail → rollback TẤT CẢ, không lưu gì vào DB.

const seedBulkCompanyUsers = async () => {
  const results = [];

  try {
    await mongoose.connect(process.env.ATLAS_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`📋 Processing ${companiesData.length} records (all-or-nothing)...\n`);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      for (let i = 0; i < companiesData.length; i++) {
        const data = companiesData[i];
        const label = `[${i + 1}/${companiesData.length}] ${data.company_name}`;

        // ── 1. Validate bắt buộc ──────────────────────────
        if (!data.full_name || !data.phone_number || !data.company_name ||
          !data.zone_name || !data.email || !data.password ||
          !data.company_registration_number) {
          throw new Error(`${label}: Thiếu trường bắt buộc (full_name, phone_number, company_name, zone_name, email, password, company_registration_number)`);
        }

        const industry = normalizeToArray(data.industry);
        const industryGroup = normalizeToArray(data.industry_group);
        if (!industry.length) throw new Error(`${label}: industry là bắt buộc`);
        if (!industryGroup.length) throw new Error(`${label}: industry_group là bắt buộc`);

        // ── 2. Tìm hoặc tạo Zone ─────────────────────────
        let zone = await IndustrialZone.findOne({
          zone_name: data.zone_name,
          deleted_at: null,
        }).session(session);

        if (!zone) {
          console.log(`  🏭 Zone "${data.zone_name}" chưa tồn tại → đang tạo mới...`);
          zone = new IndustrialZone({
            zone_name: data.zone_name,
            zone_type: detectZoneType(data.zone_name),
            status: 'active',
          });
          await zone.save({ session });
          console.log(`  ✅ Zone tạo thành công: ${zone.zone_id}`);
        }

        const zone_id = zone.zone_id;

        // ── 3. Validate MST ───────────────────────────────
        const mst = data.company_registration_number.trim();
        let isBranch = false;
        if (!/^\d{10}(-\d{3})?$/.test(mst)) {
          throw new Error(`${label}: MST "${mst}" không đúng format (10 hoặc 13 chữ số)`);
        }
        if (mst.includes('-')) {
          isBranch = true;
        }

        // Check trùng MST (trong DB hiện tại)
        const existingMST = await Company.findOne({
          company_registration_number: mst,
        }).session(session);
        if (existingMST) {
          throw new Error(`${label}: MST "${mst}" đã tồn tại trong hệ thống`);
        }

        // ── 4. Tạo Company ────────────────────────────────
        // Bỏ qua hook `pre('save')` trong CompanyModel vì hook đó không gọi `.session(session)`
        // Nên nếu để hook tự tạo `company_id`, nó sẽ không thấy Zone mới tạo.
        const { generateCompanyId } = require('../utils/autoIncrement');
        const companyId = await generateCompanyId(zone_id ? zone_id : 'UNASSIGNED', session);

        const company = new Company({
          company_id: companyId,
          company_name: data.company_name,
          company_registration_number: mst,
          zone_id,
          industry,
          industry_group: industryGroup,
          company_type: data.company_type || 'Private',
          address: data.address || 'N/A - ' + mst,
          website: data.website || undefined,
          total_workers: data.total_workers || undefined,
          revenue: data.revenue || undefined,
          revenue_currency: data.revenue_currency || undefined,
          market: data.market || undefined,
          founded_year: data.founded_year || undefined,
          status: data.status || 'Đang hoạt động',
          licenses: [],
        });
        await company.save({ session });

        // ── 5. Validate trùng phone/email cho User ────────
        const existingPhone = await User.countDocuments({
          phone_number: data.phone_number,
        }).session(session);
        if (existingPhone) {
          throw new Error(`${label}: Số điện thoại "${data.phone_number}" đã tồn tại`);
        }

        const existingEmail = await User.countDocuments({
          email: data.email,
        }).session(session);
        if (existingEmail) {
          throw new Error(`${label}: Email "${data.email}" đã tồn tại`);
        }

        // Check company chưa có user
        const existingCompanyUser = await User.findOne({
          role: 'company',
          company_id: company.company_id,
          deleted_at: null,
        }).session(session);
        if (existingCompanyUser) {
          throw new Error(`${label}: Company ${company.company_id} đã có tài khoản đại diện`);
        }

        // ── 6. Hash password & tạo User ──────────────────
        const hashedPassword = await bcrypt.hash(data.password, 10);

        const user = new User({
          full_name: data.full_name,
          phone_number: data.phone_number,
          email: data.email,
          role: 'company',
          zone_id,
          company_id: company.company_id,
          password: hashedPassword,
          firstLogin: false,   // ← KHÁC: không bắt đổi mk lần đầu
        });
        await user.save({ session });

        // ── 7. Đồng bộ company.user_id ────────────────────
        await Company.findOneAndUpdate(
          { company_id: company.company_id },
          { $set: { user_id: user.user_id } },
          { session },
        );

        console.log(`  ✅ ${label} → ${company.company_id} | ${user.user_id}`);
        results.push({
          company_name: data.company_name,
          company_id: company.company_id,
          user_id: user.user_id,
          email: data.email,
        });
      }

      // ── Tất cả thành công → commit ────────────────────
      await session.commitTransaction();
      session.endSession();

      console.log('\n' + '═'.repeat(60));
      console.log(`🎉 THÀNH CÔNG: Tất cả ${results.length}/${companiesData.length} records đã được lưu vào DB!`);
      console.log('\n📋 Chi tiết:');
      results.forEach((s, idx) => {
        console.log(`  ${idx + 1}. ${s.company_name} → company_id: ${s.company_id}, user_id: ${s.user_id}, email: ${s.email}`);
      });
      console.log('═'.repeat(60));

    } catch (err) {
      // ── Có lỗi → rollback TẤT CẢ ─────────────────────
      await session.abortTransaction();
      session.endSession();

      console.error('\n' + '═'.repeat(60));
      console.error(`💥 THẤT BẠI: ${err.message}`);
      if (err.errors) console.error('  --> Details:', err.errors);
      if (err.writeErrors) console.error('  --> WriteErrors:', err.writeErrors);
      if (err.keyValue) console.error('  --> Duplicate Key:', err.keyValue);
      console.error(`⚠️  ROLLBACK: Tất cả ${results.length} records đã xử lý trước đó đều bị hủy. Không có gì được lưu vào DB.`);
      console.error('═'.repeat(60));
    }

  } catch (err) {
    console.error('💥 Fatal error (connection):', err.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
};

seedBulkCompanyUsers();
