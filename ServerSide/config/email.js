const { Resend } = require('resend');
const logger = require('../utils/logger');

let resendClient = null;

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Missing RESEND_API_KEY for Resend email provider');
  }

  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }

  return resendClient;
}

async function sendMail({ to, subject, html }) {
  // Bỏ qua gửi email thực tế cho các tài khoản ảo của bài test K6 để tránh "cháy" quota của tài khoản Resend
  if (to && to.includes('@perf.hepza.test')) {
    logger.info(`[Perf Benchmark] Skipped sending email to dummy address: ${to}`);
    return;
  }

  try {
    await getResendClient().emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
  } catch (err) {
    logger.error('Resend email failed:', err.message);
    throw err;
  }
}

module.exports = { sendMail };
