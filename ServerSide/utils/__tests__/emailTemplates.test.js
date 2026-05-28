const {
  getWelcomeTemplate,
  getEmailResetTemplate,
  getOtpTemplate,
  getLoginOtpTemplate,
  getUpdatedCredentialsTemplate,
  getSessionTerminatedTemplate,
  getPasswordResetTemplate,
} = require('../emailTemplates');

describe('emailTemplates', () => {
  const originalOrigin = process.env.ORIGIN;

  afterEach(() => {
    process.env.ORIGIN = originalOrigin;
    delete process.env.BACKEND_URL;
  });

  test('getWelcomeTemplate includes fullName and password', () => {
    const html = getWelcomeTemplate('Nguyen Van A', 'TempPass123');
    expect(html).toContain('Nguyen Van A');
    expect(html).toContain('TempPass123');
    expect(html).toContain('Đăng nhập ngay');
  });

  test('getEmailResetTemplate includes newEmail and newPassword', () => {
    const html = getEmailResetTemplate('Nguyen Van A', 'new@example.com', 'NewPass456');
    expect(html).toContain('new@example.com');
    expect(html).toContain('NewPass456');
  });

  test('getOtpTemplate includes OTP and 10 phút', () => {
    const html = getOtpTemplate('Nguyen Van A', '123456');
    expect(html).toContain('123456');
    expect(html).toContain('10 phút');
  });

  test('getLoginOtpTemplate includes login OTP warning', () => {
    const html = getLoginOtpTemplate('Nguyen Van A', '654321');
    expect(html).toContain('654321');
    expect(html).toContain('đăng nhập không thành công');
  });

  test('getUpdatedCredentialsTemplate includes newPassword', () => {
    const html = getUpdatedCredentialsTemplate('Nguyen Van A', 'UpdatedPass789');
    expect(html).toContain('UpdatedPass789');
  });

  test('getSessionTerminatedTemplate includes login alert', () => {
    const html = getSessionTerminatedTemplate();
    expect(html).toContain('đăng nhập lạ');
  });

  test('getPasswordResetTemplate includes reset link', () => {
    const html = getPasswordResetTemplate('https://example.com/reset?token=abc');
    expect(html).toContain('https://example.com/reset?token=abc');
    expect(html).toContain('Đặt lại mật khẩu');
  });

  test('templates use ORIGIN env for links', () => {
    process.env.ORIGIN = 'https://myapp.com';
    const html = getWelcomeTemplate('Test', 'pass');
    expect(html).toContain('https://myapp.com');
  });

  test('templates fallback to localhost when ORIGIN missing', () => {
    delete process.env.ORIGIN;
    const html = getWelcomeTemplate('Test', 'pass');
    expect(html).toContain('http://localhost:5173');
  });

  test('templates use BACKEND_URL when set', () => {
    process.env.ORIGIN = 'https://myapp.com';
    process.env.BACKEND_URL = 'https://api.myapp.com';
    const html = getWelcomeTemplate('Test', 'pass');
    expect(html).toContain('https://api.myapp.com/LogoHepza.png');
  });
});
