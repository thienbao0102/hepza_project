# HEPZA-EMS Frontend

## 🚀 Giới thiệu

Đây là dự án Frontend cho hệ thống quản lý môi trường HEPZA (Hepza Environmental Management System), xây dựng với ReactJS, Vite, Tailwind CSS và các công nghệ hiện đại. Dự án đã được chuẩn hóa coding convention, cấu trúc thư mục, và tích hợp các công cụ kiểm tra tự động để đảm bảo chất lượng code.

---

## 📁 Cấu trúc thư mục

```
src/
├── components/          # UI & reusable components
│   ├── common/         # Components chung
│   ├── ui/             # UI components (Button, Widget, ...)
│   ├── admin/          # Admin-specific components
│   └── SideMenu.jsx    # Navigation
├── pages/              # Page components (route-level)
│   ├── admin/          # Admin pages
│   ├── resource/       # Resource pages
│   └── *.jsx           # Main pages
├── features/           # Feature-based modules
│   ├── admin/
│   ├── dashboard/
│   ├── enterprises/
│   └── industrialzone/
├── hooks/              # Custom hooks (nên tách riêng)
├── contexts/           # React contexts (nếu có)
├── services/           # API services
├── utils/              # Utility functions
├── lib/                # Third-party configs
├── assets/             # Static assets (images, icons, ...)
├── styles/             # Global styles (nếu có)
└── router/             # Routing config
```

---

## ⚡️ Cài đặt & khởi động

```bash
# Clone repository
git clone <repository-url>
cd Hepza_Project/ClientSide

# Cài dependencies
npm install

# Khởi động server dev
npm run dev
```

---

## 🛠️ Scripts hữu ích

```bash
npm run dev           # Chạy server phát triển
npm run build         # Build production
npm run preview       # Xem thử bản build
npm run lint          # Kiểm tra ESLint
npm run lint:fix      # Sửa lỗi ESLint tự động
npm run format        # Format code với Prettier
npm run format:check  # Kiểm tra format code
```

---

## 🧑‍💻 Coding Convention

- **Naming:** PascalCase cho component, camelCase cho biến/hàm, UPPER_SNAKE_CASE cho constants, prefix `use` cho custom hook.
- **Import order:** React → Thư viện ngoài → Internal absolute → Relative.
- **Component:** 1 file/1 component chính, props destructuring, dùng arrow function.
- **JSX:** Indent 2 spaces, fragment khi cần, tối ưu performance với React.memo/useMemo/useCallback.
- **Tailwind:** Thứ tự class theo logic (layout → spacing → color → effect), responsive từ mobile-first.
- **Comment:** JSDoc cho component/hook, TODO/FIXME có cấu trúc, giải thích "tại sao".
- **Pre-commit:** Tự động lint & format code với Husky + lint-staged.

> Xem chi tiết tại [`docs/CODING_CONVENTIONS.md`](./docs/CODING_CONVENTIONS.md)

---

## 🔧 Công cụ & cấu hình

- **ESLint:** Kiểm tra code quality, rule nghiêm ngặt cho React.
- **Prettier:** Định dạng code nhất quán.
- **Husky + lint-staged:** Kiểm tra code trước khi commit.
- **EditorConfig:** Đồng bộ cấu hình editor.
- **VS Code:** Đã có sẵn `.vscode/settings.json` và `.vscode/extensions.json`.

---

## 🤝 Đóng góp (Contributing)

1. Fork repository
2. Tạo branch mới: `git checkout -b feature/ten-tinh-nang`
3. Code và commit theo convention
4. Push lên remote: `git push origin feature/ten-tinh-nang`
5. Tạo Pull Request, mô tả rõ thay đổi
6. Đảm bảo pass tất cả pre-commit checks

---

## 📚 Tài liệu nội bộ

- [Coding Convention](./docs/CODING_CONVENTIONS.md)
- [Project Analysis](./docs/PROJECT_ANALYSIS.md) *(nếu có)*
- [Setup Guide](./docs/SETUP_GUIDE.md) *(nếu có)*

---

## 📞 Liên hệ

- **Team Lead:** [Tên + email/phone]
- **Senior Dev:** [Tên + email/phone]
- **Tài liệu:** [Project Wiki hoặc link Google Drive]

---

## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.
