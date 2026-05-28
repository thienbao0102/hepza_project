const hexToRgb = (hex) => {
    if (!hex) return "0, 0, 0"; // Fallback nếu không có màu

    // Xử lý short hex (vd: #fff)
    let shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b) {
        return r + r + g + g + b + b;
    });

    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

    // Trả về dạng: "255, 255, 255" (KHÔNG có chữ rgb)
    return result
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : "0, 0, 0";
}

export default hexToRgb;