<div align="center">

# 🌿 HEPZA PROJECT
### Nền Tảng Quản Lý & Cộng Sinh Công Nghiệp Tương Lai

![Dashboard](docs/images/dashboard.png)

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

---

<p align="center">
  <b>Số hóa quản lý - Tối ưu tài nguyên - Kết nối cộng sinh</b><br/>
  Giải pháp toàn diện cho các Khu Chế Xuất & Khu Công Nghiệp TP.HCM (HEPZA)
</p>

</div>

## ✨ Tính Năng Đột Phá

| Tính Năng | Mô Tả |
| :--- | :--- |
| **📊 Dashboard Thông Minh** | Tổng quan trực quan về tiêu thụ điện, nước, và phát thải theo thời gian thực. |
| **🏭 Quản Lý Doanh Nghiệp** | Hồ sơ số hóa chi tiết, theo dõi giấy phép và hoạt động sản xuất. |
| **♻️ Cộng Sinh Công Nghiệp** | "Tinder cho Phế liệu" - Kết nối cung cầu tái chế, thúc đẩy kinh tế tuần hoàn. |
| **👥 Phân Quyền Đa Cấp** | Hệ thống Role-based (Admin, Manager, Company) bảo mật và linh hoạt. |
| **🔔 Thông Báo Real-time** | Cập nhật tức thì qua Socket.io & Redis Pub/Sub. |

---

## 📸 Giao Diện Người Dùng

### 1. Quản Trị Hệ Thống
![Dashboard](docs/images/dashboard.png)

### 2. Hồ Sơ Doanh Nghiệp
![Quản Lý Doanh Nghiệp](docs/images/companies.png)

### 3. Sàn Giao Dịch Cộng Sinh
![Cộng Sinh Công Nghiệp](docs/images/symbiosis.png)

### 4. Quản Lý Người Dùng
![Quản Lý Người Dùng](docs/images/users.png)

---

## 🛠 Công Nghệ Sử Dụng

### Client Side 🎨
- **Core**: React 18, Vite
- **UI/UX**: Tailwind CSS v4, Ant Design, Material UI
- **State**: React Query (TanStack), Context API
- **Maps**: React Leaflet
- **Charts**: Recharts

### Server Side ⚙️
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **High Performance**: Redis (Caching & Queue), BullMQ
- **Real-time**: Socket.io

---

## 📐 Kiến Trúc Hệ Thống

### Sơ đồ ERD (Tóm tắt)
```mermaid
erDiagram
    User ||--o{ Company : "quản lý"
    Company }|--|| IndustrialZone : "trực thuộc"
    Company ||--o{ License : "sở hữu"
    
    User { string email "Unique identity" string role "admin/manager/company" }
    Company { string name "Tên doanh nghiệp" string industry "Ngành nghề" }
    IndustrialZone { string name "Tên KCN" string location "Vị trí" }
    Solution { string name "Giải pháp" }
    WasteResource { string type "Loại rác thải" }
```

---

## 🚀 Cài Đặt & Triển Khai

### Yêu cầu tiên quyết
*   Node.js v18+
*   MongoDB & Redis running

### 1. Khởi chạy Backend
```bash
cd ServerSide
npm install
# Tạo file .env dựa trên .env.example
npm start
# Hoặc chế độ dev
npm run dev
```

### 2. Khởi chạy Frontend
```bash
cd ClientSide
npm install
npm run dev
```

Truy cập hệ thống tại: `http://localhost:5173`

---

## 🔌 API Cheatsheet

| Method | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Đăng nhập hệ thống |
| `GET` | `/api/companies` | Lấy danh sách doanh nghiệp |
| `POST` | `/api/business-symbiosis/buy-demand` | Đăng nhu cầu mua phế liệu |
| `GET` | `/api/report` | Xuất báo cáo tổng hợp |

---

<div align="center">

**Developed with ❤️ by Hepza Team**
<br/>
Last update: 03/03/2026

</div>



