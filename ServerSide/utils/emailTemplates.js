const getClientLink = () => {
    const origins = (process.env.ORIGIN || '').split(',');
    return origins[0] || 'http://localhost:5173';
};

const getBackendUrl = () => {
    if (process.env.BACKEND_URL) return process.env.BACKEND_URL;

    const origins = (process.env.ORIGIN || '').split(',');
    const apiOrigin = origins.find((origin) => origin.includes('api'));
    if (apiOrigin) return apiOrigin;

    return 'http://localhost:5000';
};

const buttonStyle = [
    'display:inline-block',
    'padding:12px 24px',
    'background-color:#4E5BA6',
    'color:#ffffff',
    'text-decoration:none',
    'border-radius:4px',
    'font-weight:700',
    'font-family:Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    'margin-top:20px',
    'border:1px solid #4E5BA6',
    'line-height:1.2',
    'mso-padding-alt:0',
].join(';');

const getButtonLink = (href, label) => `
    <a href="${href}" class="button" style="${buttonStyle}">
        <span style="color:#ffffff !important; text-decoration:none !important;">${label}</span>
    </a>
`;

const getCopyValueBox = (label, value, options = {}) => {
    const {
        accent = '#4E5BA6',
        hint = 'Nhấn hoặc nhấn giữ vào toàn bộ khối để sao chép đầy đủ.',
        isOtp = false,
    } = options;

    const valueStyle = isOtp
        ? [
            'display:inline-block',
            'font-size:32px',
            'font-weight:700',
            'letter-spacing:5px',
            `color:${accent}`,
            'background:#f0f2f5',
            'padding:10px 20px',
            'border-radius:8px',
            `border:1px dashed ${accent}`,
            'user-select:all',
            '-webkit-user-select:all',
            '-moz-user-select:all',
            '-ms-user-select:all',
            'word-break:break-all',
        ].join(';')
        : [
            'display:block',
            'font-size:22px',
            'font-weight:700',
            'letter-spacing:1px',
            `color:${accent}`,
            'background:#f0f2f5',
            'padding:12px 16px',
            'border-radius:8px',
            `border:1px dashed ${accent}`,
            'font-family:Consolas, Monaco, Courier New, monospace',
            'user-select:all',
            '-webkit-user-select:all',
            '-moz-user-select:all',
            '-ms-user-select:all',
            'word-break:break-all',
        ].join(';');

    return `
        <div style="margin:20px 0;">
            <div style="font-size:13px; color:#566072; font-weight:700; margin-bottom:8px;">${label}</div>
            <div style="text-align:${isOtp ? 'center' : 'left'};">
                <span style="${valueStyle}">${value}</span>
            </div>
            <div style="margin-top:8px; font-size:12px; color:#6b7280;">${hint}</div>
        </div>
    `;
};

const getInfoBox = (content) => `
    <div class="info-box">
        ${content}
    </div>
`;

const getEmailWrapper = (content) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
        .header { background-color: #4E5BA6; padding: 20px; text-align: center; }
        .header img { max-width: 150px; height: auto; }
        .content { padding: 30px; background-color: #ffffff; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #e0e0e0; }
        .button, .button:link, .button:visited { color: #ffffff !important; text-decoration: none !important; }
        .highlight { color: #4E5BA6; font-weight: bold; }
        .info-box { background-color: #f0f2f5; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4E5BA6; }
        h1, h2, h3 { color: #2c3e50; margin-top: 0; }
        p { margin: 0 0 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <a href="${getClientLink()}" style="display:inline-block; background-color:#ffffff; padding:10px; border-radius:8px; line-height:0; text-decoration:none;">
                <img src="${getBackendUrl()}/LogoHepza.png" alt="Hepza Logo" style="max-width:80px; height:auto; display:block;">
            </a>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Ban Quản lý các Khu chế xuất và Công nghiệp TP.HCM (HEPZA)</p>
            <p>Địa chỉ: 35 Nguyễn Bỉnh Khiêm, Quận 1, TP. Hồ Chí Minh</p>
            <p>Đây là email tự động, vui lòng không trả lời email này.</p>
        </div>
    </div>
</body>
</html>
`;

const getWelcomeTemplate = (fullName, password) => getEmailWrapper(`
    <h2>Chào mừng ${fullName} gia nhập HEPZA!</h2>
    <p>Tài khoản của bạn đã được khởi tạo thành công trên hệ thống quản lý của chúng tôi.</p>
    ${getInfoBox(`
        <p><strong>Thông tin đăng nhập của bạn:</strong></p>
        <p>Email: <span class="highlight">Sử dụng email này</span></p>
        ${getCopyValueBox('Mật khẩu tạm thời', password, {
    hint: 'Nhấn vào toàn bộ chuỗi mật khẩu để sao chép đầy đủ, tránh thiếu ký tự.'
})}
    `)}
    <p>Vui lòng đăng nhập để bắt đầu sử dụng dịch vụ. Hệ thống sẽ yêu cầu bạn đổi mật khẩu trong lần đăng nhập đầu tiên để đảm bảo tính bảo mật.</p>
    <div style="text-align:center;">
        ${getButtonLink(`${getClientLink()}/login`, 'Đăng nhập ngay')}
    </div>
`);

const getEmailResetTemplate = (fullName, newEmail, newPassword) => getEmailWrapper(`
    <h2>Thông báo thay đổi Email tài khoản</h2>
    <p>Chào ${fullName},</p>
    <p>Tài khoản của bạn đã được Admin cập nhật thông tin email mới.</p>
    ${getInfoBox(`
        <p><strong>Thông tin mới:</strong></p>
        <p>Email mới: <span class="highlight">${newEmail}</span></p>
        ${getCopyValueBox('Mật khẩu tạm thời', newPassword, {
    hint: 'Nhấn vào toàn bộ chuỗi mật khẩu để sao chép đầy đủ.'
})}
    `)}
    <p>Tất cả các phiên đăng nhập cũ đã được vô hiệu hóa. Vui lòng sử dụng thông tin mới để đăng nhập lại vào hệ thống.</p>
    <div style="text-align:center;">
        ${getButtonLink(`${getClientLink()}/login`, 'Đăng nhập lại')}
    </div>
`);

const getOtpTemplate = (fullName, otp) => getEmailWrapper(`
    <h2>Mã xác thực thay đổi Email</h2>
    <p>Chào ${fullName},</p>
    <p>Bạn đang thực hiện thay đổi email trên hệ thống HEPZA. Vui lòng sử dụng mã xác thực dưới đây để hoàn tất quy trình:</p>
    ${getCopyValueBox('Mã OTP', otp, {
    isOtp: true,
    hint: 'Nhấn hoặc nhấn giữ vào toàn bộ mã OTP để sao chép chính xác 100%.'
})}
    <p>Mã này có hiệu lực trong vòng <span class="highlight">10 phút</span>. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
`);

const getLoginOtpTemplate = (fullName, otp) => getEmailWrapper(`
    <h2>Xác thực đăng nhập</h2>
    <p>Chào ${fullName},</p>
    <p>Hệ thống phát hiện nhiều lần đăng nhập không thành công cho tài khoản của bạn. Để đảm bảo an toàn, vui lòng nhập mã xác thực dưới đây để tiếp tục đăng nhập:</p>
    ${getCopyValueBox('Mã OTP đăng nhập', otp, {
    isOtp: true,
    hint: 'Nhấn hoặc nhấn giữ vào toàn bộ mã OTP để sao chép chính xác 100%.'
})}
    <p>Mã này có hiệu lực trong vòng <span class="highlight">10 phút</span>.</p>
    <p>Nếu bạn không thực hiện yêu cầu này, có thể ai đó đang cố đăng nhập vào tài khoản của bạn. Vui lòng đổi mật khẩu ngay.</p>
`);

const getUpdatedCredentialsTemplate = (fullName, newPassword) => getEmailWrapper(`
    <h2>Cập nhật thông tin tài khoản thành công</h2>
    <p>Chào ${fullName},</p>
    <p>Email và mật khẩu của bạn đã được cập nhật thành công trên hệ thống.</p>
    ${getInfoBox(`
        ${getCopyValueBox('Mật khẩu mới', newPassword, {
    hint: 'Nhấn vào toàn bộ chuỗi mật khẩu để sao chép đầy đủ.'
})}
    `)}
    <p>Vì lý do bảo mật, vui lòng đăng nhập và đổi mật khẩu ngay sau khi truy cập.</p>
    <div style="text-align:center;">
        ${getButtonLink(`${getClientLink()}/login`, 'Đăng nhập ngay')}
    </div>
`);

const getSessionTerminatedTemplate = () => getEmailWrapper(`
    <h2>Thông báo phát hiện đăng nhập lạ</h2>
    <p>Hệ thống ghi nhận tài khoản của bạn vừa được đăng nhập từ một thiết bị hoặc trình duyệt khác.</p>
    <p>Để bảo vệ tài khoản, chúng tôi đã tự động đăng xuất các phiên hoạt động cũ. Nếu đây không phải là bạn, vui lòng đổi mật khẩu ngay lập tức hoặc liên hệ với Ban quản trị.</p>
    <div style="text-align:center;">
        ${getButtonLink(`${getClientLink()}/login`, 'Kiểm tra tài khoản')}
    </div>
`);

const getPasswordResetTemplate = (resetLink) => getEmailWrapper(`
    <h2>Yêu cầu khôi phục mật khẩu</h2>
    <p>Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản liên kết với email này.</p>
    <p>Vui lòng nhấn vào nút dưới đây để thiết lập mật khẩu mới:</p>
    <div style="text-align:center;">
        ${getButtonLink(resetLink, 'Đặt lại mật khẩu')}
    </div>
    <p>Liên kết này sẽ hết hạn sau <span class="highlight">1 giờ</span>. Nếu bạn không yêu cầu đổi mật khẩu, bạn có thể yên tâm bỏ qua email này.</p>
`);

module.exports = {
    getWelcomeTemplate,
    getEmailResetTemplate,
    getOtpTemplate,
    getLoginOtpTemplate,
    getUpdatedCredentialsTemplate,
    getSessionTerminatedTemplate,
    getPasswordResetTemplate
};
