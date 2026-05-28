export const resourceGroups = [
    // 1. NGUYÊN VẬT LIỆU (InputResource)
    {
        name: "Nguyên vật liệu",
        icon: "Container",
        color: "#4E5BA6",
        label: "Nguyên liệu",
        requiredGroupValue: false,
        fields: [
            {
                label: "Gỗ & liên quan Gỗ",
                subGroupKey: "WOOD", // Khớp với BE: subgroupMapping.material
                description: "Gỗ tự nhiên, ván ép, MDF...",
                required: false,
                listType: "dynamic",
                list: [],
                inputSchema: [
                    { name: "name", label: "Tên vật liệu", type: "text", required: true },
                    { name: "value", label: "Khối lượng", type: "number", required: true },
                    { name: "unit", label: "Đơn vị", type: "select", options: ["kg", "tấn", "lít", "m³"], required: true },
                    // { name: "price", label: "Chi phí (VNĐ)", type: "number", required: false },
                    { name: "note", label: "Ghi chú", type: "text", required: false }
                ]
            },
            {
                label: "Kim loại & Hợp kim",
                subGroupKey: "MET",
                description: "Sắt, thép, nhôm, đồng...",
                required: false,
                listType: "dynamic",
                list: [],
                inputSchema: [
                    { name: "name", label: "Tên kim loại", type: "text", required: true },
                    { name: "value", label: "Khối lượng", type: "number", required: true },
                    { name: "unit", label: "Đơn vị", type: "select", options: ["kg", "tấn", "lít", "m³"], required: true },
                    { name: "note", label: "Ghi chú", type: "text", required: false }
                    // { name: "price", label: "Chi phí", type: "number" }
                ]
            },
            {
                label: "Phi kim",
                subGroupKey: "NMET",
                description: "Xi măng, cát, đá, gốm...",
                required: false,
                listType: "dynamic",
                list: [],
                inputSchema: [
                    { name: "name", label: "Tên vật liệu", type: "text", required: true },
                    { name: "value", label: "Khối lượng", type: "number", required: true },
                    { name: "unit", label: "Đơn vị", type: "select", options: ["kg", "tấn", "lít", "m³"], required: true },
                    { name: "note", label: "Ghi chú", type: "text", required: false }
                    // { name: "price", label: "Chi phí", type: "number" }
                ]
            },
            {
                label: "Nhựa & Polyme",
                subGroupKey: "POL",
                description: "Nhựa, cao su...",
                required: false,
                listType: "dynamic",
                list: [],
                inputSchema: [
                    { name: "name", label: "Tên loại nhựa", type: "text", required: true },
                    { name: "value", label: "Khối lượng", type: "number", required: true },
                    { name: "unit", label: "Đơn vị", type: "select", options: ["kg", "tấn", "lít", "m³"], required: true },
                    { name: "note", label: "Ghi chú", type: "text", required: false },
                ]
            },
            {
                label: "Dệt may (Vải & Sợi)",
                subGroupKey: "TEX",
                description: "Sợi tự nhiên, sợi tổng hợp...",
                required: false,
                listType: "dynamic",
                list: [],
                inputSchema: [
                    { name: "name", label: "Tên loại vải", type: "text", required: true },
                    { name: "value", label: "Khối lượng", type: "number", required: true },
                    { name: "unit", label: "Đơn vị", type: "select", options: ["kg", "tấn", "lít", "m³"], required: true },
                    { name: "note", label: "Ghi chú", type: "text", required: false },
                ]
            },
            {
                label: "Nông sản & Thực phẩm",
                subGroupKey: "AGRI",
                description: "Ngũ cốc, thực phẩm thô...",
                required: false,
                listType: "dynamic",
                list: [],
                inputSchema: [
                    { name: "name", label: "Tên sản phẩm", type: "text", required: true },
                    { name: "value", label: "Khối lượng", type: "number", required: true },
                    { name: "unit", label: "Đơn vị", type: "select", options: ["kg", "tấn", "lít", "m³"], required: true },
                    { name: "note", label: "Ghi chú", type: "text", required: false }
                ]
            },
            {
                label: "Bao bì & Đóng gói",
                subGroupKey: "PAC",
                description: "Giấy, bìa carton, vật liệu đóng gói...",
                required: false,
                listType: "dynamic",
                list: [],
                inputSchema: [
                    { name: "name", label: "Tên vật liệu", type: "text", required: true },
                    { name: "value", label: "Khối lượng", type: "number", required: true },
                    { name: "unit", label: "Đơn vị", type: "select", options: ["kg", "tấn", "lít", "m³"], required: true },
                    { name: "note", label: "Ghi chú", type: "text", required: false },
                ]
            },
            {
                label: "Khác",
                subGroupKey: "MOTH",
                description: "Vật liệu khác",
                required: false,
                listType: "dynamic",
                list: [],
                inputSchema: [
                    { name: "name", label: "Tên vật liệu", type: "text", required: true },
                    { name: "value", label: "Khối lượng", type: "number", required: true },
                    { name: "unit", label: "Đơn vị", type: "select", options: ["kg", "tấn", "lít", "m³"], required: true },
                    { name: "note", label: "Ghi chú", type: "text", required: false },
                ]
            }
        ]
    },

    // 2. HÓA CHẤT (InputResource)
    {
        name: "Hóa chất",
        icon: "Atom",
        color: "#0051FF",
        label: "Hóa chất",
        requiredGroupValue: false,
        // Schema chung cho hóa chất: Tên, Lượng, Đơn vị (kg/l/m3 quan trọng cho tính toán), Giá
        inputSchemaTemplate: [
            { name: "name", label: "Tên hóa chất", type: "text", required: true },
            { name: "value", label: "Số lượng", type: "number", required: true },
            { name: "unit", label: "Đơn vị", type: "select", options: ["kg", "tấn", "lít", "m³"], required: true },
            { name: "note", label: "Ghi chú", type: "text", required: false },
        ],
        fields: [
            {
                label: "Hóa chất nguy hiểm",
                subGroupKey: "HAZ", // BE: HAZ
                description: "H2SO4, Methanol, HCl...",
                required: false,
                listType: "dynamic",
                list: [],
                inputSchema: [ // Có thể custom schema riêng nếu cần trường hazardClass
                    { name: "name", label: "Tên hóa chất", type: "text", required: true },
                    { name: "value", label: "Số lượng", type: "number", required: true },
                    { name: "unit", label: "Đơn vị", type: "select", options: ["kg", "tấn", "lít", "m³"], required: true },
                    { name: "note", label: "Ghi chú", type: "text", required: false },
                ]
            },
            { label: "Axit", subGroupKey: "ACD", description: "HCl, H2SO4, HNO3...", listType: "dynamic", list: [], useTemplate: true },
            { label: "Bazơ / Kiềm", subGroupKey: "BAS", description: "NaOH, KOH...", listType: "dynamic", list: [], useTemplate: true },
            { label: "Muối", subGroupKey: "SLT", description: "Muối vô cơ/hữu cơ...", listType: "dynamic", list: [], useTemplate: true },
            { label: "Dung môi", subGroupKey: "SOL", description: "Ethanol, Acetone...", listType: "dynamic", list: [], useTemplate: true },
            { label: "Khí & Bay hơi", subGroupKey: "GAS", description: "CO2, LPG, NH3...", listType: "dynamic", list: [], useTemplate: true },
            { label: "Phụ gia", subGroupKey: "ADD", description: "Chất xúc tác, ổn định...", listType: "dynamic", list: [], useTemplate: true },
            { label: "Oxy hóa / Khử", subGroupKey: "REDOX", description: "Javen, H2O2...", listType: "dynamic", list: [], useTemplate: true },
            { label: "Hóa chất khác", subGroupKey: "CHOT", description: "Các loại khác", listType: "dynamic", list: [], useTemplate: true },
        ]
    },

    // 3. ĐIỆN (FuelResource - Group 3)
    {
        name: "Điện",
        icon: "HousePlug",
        color: "#9CAA00",
        requiredGroupValue: true,
        label: "Điện năng",
        inputSchemaTemplate: [
            { name: "value", label: "Số lượng", type: "number", required: true },
            { name: "unit", label: "Đơn vị", type: "select", options: ["kWh", "MWh"], required: true },
            // { name: "price", label: "Chi phí", type: "number" }
        ],
        // Lưu ý: BE xử lý điện dựa trên usageType (key của object gửi lên).
        // Frontend cần gom data gửi lên dạng: { "Sản xuất": [...items], "Sinh hoạt": [...items] }
        fields: [
            {
                label: "Điện lưới quốc gia",
                subGroupKey: "Grid",
                description: "Tổng sản lượng điện tiêu thụ từ lưới EVN",
                unitOptions: ["kWh", "MWh"],
                required: true,
                listType: "fixed",
                useTemplate: true,
                list: [
                    { value: 0, unit: "kWh", required: true }
                ]
            },
            {
                label: "Điện tái tạo",
                subGroupKey: "Renewable",
                description: "Điện mặt trời mái nhà, điện gió tự cung cấp",
                unitOptions: ["kWh", "MWh"],
                required: false,
                listType: "fixed",
                useTemplate: true,
                list: [
                    { value: 0, unit: "kWh", required: false }
                ]
            }
        ]
    },

    // 4. NƯỚC (FuelResource - Group 4)
    {
        name: "Nước",
        icon: "Droplet",
        color: "#00A6FF",
        requiredGroupValue: true,
        label: "Nước",
        inputSchemaTemplate: [
            { name: "value", label: "Số lượng", type: "number", required: true },
            { name: "unit", label: "Đơn vị", type: "select", options: ["m3"], required: true },
            // { name: "price", label: "Chi phí", type: "number" }
        ],
        fields: [
            {
                label: "Nước cấp (Thủy cục)",
                subGroupKey: "tap", // BE: wa -> tap
                description: "Nước máy sử dụng từ mạng lưới cấp nước",
                required: true,
                listType: "fixed",
                list: [
                    { value: 0, unit: "m3", required: true }
                ]
            },
            {
                label: "Nước mưa",
                subGroupKey: "rain", // BE: wa -> rain
                description: "Thu gom nước mưa để sử dụng",
                required: false,
                listType: "fixed",
                list: [
                    { value: 0, unit: "m3", required: false }
                ]
            },
            {
                label: "Nước giếng / Nước ngầm",
                subGroupKey: "well", // BE: wa -> well
                description: "Khai thác từ giếng khoan",
                required: false,
                listType: "fixed",
                list: [
                    { value: 0, unit: "m3", required: false }
                ]
            },
            {
                label: "Nước tái sử dụng",
                subGroupKey: "recycle", // BE: wa -> recycle
                description: "Nước thải được xử lý để dùng lại",
                required: false,
                listType: "fixed",
                list: [
                    { value: 0, unit: "m3", required: false }
                ]
            }
        ]
    },

    // 5. CHẤT ĐỐT (FuelResource - Group 5)
    {
        name: "Chất đốt & Nhiên liệu",
        icon: "FlameKindling",
        color: "#FF0000",
        label: "Nhiên liệu",
        requiredGroupValue: false,
        // BE FuelResource có các trường: fuelName, quantity, unit, purpose
        inputSchemaTemplate: [
            { name: "fuelName", label: "Tên nhiên liệu", type: "text", required: true },
            { name: "value", label: "Số lượng", type: "number", required: true },
            { name: "unit", label: "Đơn vị", type: "select", options: ["kg", "tấn", "lít", "m³"], required: true },
            { name: "note", label: "Ghi chú", type: "text", required: false }
        ],
        fields: [
            { label: "Than", subGroupKey: "COL", description: "Than đá, than cốc...", listType: "dynamic", list: [], useTemplate: true },
            { label: "Biomass / Sinh khối", subGroupKey: "BIO", description: "Củi, trấu, viên nén...", listType: "dynamic", list: [], useTemplate: true },
            { label: "Xăng dầu (Nhiên liệu lỏng)", subGroupKey: "PET", description: "Xăng, Dầu DO, FO (Nhập chính xác tên để tính CO2)", listType: "dynamic", list: [], useTemplate: true },
            { label: "Khí đốt (Gas)", subGroupKey: "GASF", description: "LPG, CNG, LNG...", listType: "dynamic", list: [], useTemplate: true },
            { label: "Khác", subGroupKey: "COTH", description: "Nhiên liệu khác", listType: "dynamic", list: [], useTemplate: true },
        ]
    },

    // 6. CHẤT THẢI (WasteResource - Group 6)
    {
        name: "Chất thải",
        icon: "Trash",
        color: "#00EA4A",
        requiredGroupValue: false,
        label: "Chất thải",
        fields: [
            {
                label: "Chất thải sinh hoạt",
                subGroupKey: "DO", // BE: waste -> DO
                description: "Rác văn phòng, nhà ăn...",
                required: false,
                listType: "dynamic",
                list: [],
                inputSchema: [
                    { name: "wasteName", label: "Tên chất thải", type: "text", required: true },
                    { name: "value", label: "Khối lượng", type: "number", required: true },
                    { name: "unit", label: "Đơn vị", type: "select", options: ["kg", "tấn", "lít", "m³"], required: true },
                    { name: "note", label: "Ghi chú", type: "text", required: false }
                ]
            },
            {
                label: "Chất thải rắn công nghiệp",
                subGroupKey: "IND", // BE: waste -> IND
                description: "Bao bì, phế phẩm không nguy hại...",
                required: false,
                listType: "dynamic",
                list: [],
                inputSchema: [
                    { name: "wasteName", label: "Tên chất thải", type: "text", required: true },
                    { name: "value", label: "Khối lượng", type: "number", required: true },
                    { name: "unit", label: "Đơn vị", type: "select", options: ["kg", "tấn", "lít", "m³"], required: true },
                    { name: "note", label: "Ghi chú", type: "text", required: false }
                ]
            },
            {
                label: "Chất thải nguy hại",
                subGroupKey: "HA", // BE: waste -> HA
                description: "Pin, dầu thải, bóng đèn, giẻ lau dính dầu...",
                required: false,
                listType: "dynamic",
                list: [],
                inputSchema: [
                    { name: "wasteName", label: "Tên chất thải", type: "text", required: true, row: 1 },
                    { name: "codeWaste", label: "Mã CTNH", type: "text", required: false, placeholder: "VD: 13 02 01", row: 1 },
                    { name: "value", label: "Khối lượng", type: "number", required: true, row: 1 },
                    { name: "unit", label: "Đơn vị", type: "select", options: ["kg", "tấn", "lít", "m³"], required: true, row: 1 },
                    { name: "status", label: "Trạng thái", type: "select", optionsKey: "statusOptions", disableWhenNoOptions: true, required: false, placeholder: "Trạng thái", row: 2 },
                    { name: "treatmentMethods", label: "Phương pháp xử lý", type: "suggest", optionsKey: "treatmentMethodsOptions", required: false, placeholder: "Gợi ý theo mã CTNH", row: 2 }
                ]
            },
            {
                label: "Nước thải công nghiệp",
                subGroupKey: "WWA", // BE: waste -> WWA
                description: "Nước thải sản xuất/sinh hoạt xả ra môi trường",
                required: false,
                listType: "dynamic",
                list: [],
                inputSchema: [
                    { name: "wasteName", label: "Loại nước thải", type: "text", required: true },
                    { name: "value", label: "Khối lượng", type: "number", required: true },
                    { name: "unit", label: "Đơn vị", type: "select", options: ["kg", "tấn", "lít", "m³"], required: true },
                    { name: "note", label: "Ghi chú", type: "text", required: false }
                ]
            },
            {
                label: "Khí thải công nghiệp",
                subGroupKey: "GASW", // BE: waste -> GASW
                description: "Khí thải từ ống khói, hệ thống xử lý khí",
                required: false,
                listType: "dynamic",
                list: [],
                inputSchema: [
                    { name: "wasteName", label: "Nguồn phát thải", type: "text", required: true },
                    { name: "value", label: "Khối lượng", type: "number", required: true },
                    { name: "unit", label: "Đơn vị", type: "select", options: ["mg/l"], required: true },
                    { name: "note", label: "Ghi chú", type: "text", required: false }
                ]
            }
        ]
    }
];