/**
 * ═══════════════════════════════════════════════════════════════
 *  HEPZA - SEED ALL: Khởi tạo dữ liệu ban đầu cho database mới
 * ═══════════════════════════════════════════════════════════════
 * 
 * Chạy: node scripts/seedAll.js
 * 
 * Script này sẽ chạy tuần tự các seed script theo đúng thứ tự:
 *   1. seedAdmin.js         - Tạo tài khoản Admin
 *   2. seedZone.js          - Tạo 31 KCN/KCX
 *   3. seedIndustry.js      - Tạo 495 ngành nghề VSIC
 *   4. seekAbbreviation.js  - Tạo nhóm viết tắt tài nguyên/chất thải
 *   5. seedHazardousWasteCodes.js - Mã chất thải nguy hại
 *   6. seed_regulations.js  - Quy định pháp luật
 *   7. seekSolution.js      - Giải pháp xanh
 * 
 * Lưu ý: Đảm bảo file .env đã có ATLAS_URI trỏ đến MongoDB
 */
const { execSync } = require('child_process');
const path = require('path');

const scripts = [
  { file: 'seedAdmin.js',              label: '👤 Tạo tài khoản Admin' },
  { file: 'seedZone.js',               label: '🏭 Tạo KCN/KCX' },
  { file: 'seedIndustry.js',           label: '📋 Tạo ngành nghề VSIC' },
  { file: 'seekAbbreviation.js',       label: '🔤 Tạo nhóm viết tắt' },
  { file: 'seedHazardousWasteCodes.js', label: '☣️  Tạo mã chất thải nguy hại' },
  { file: 'seed_regulations.js',       label: '📜 Tạo quy định pháp luật' },
  { file: 'seekSolution.js',           label: '💡 Tạo giải pháp xanh' },
];

const run = () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  HEPZA - SEED ALL: Khởi tạo dữ liệu ban đầu');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < scripts.length; i++) {
    const { file, label } = scripts[i];
    const scriptPath = path.join(__dirname, file);

    console.log(`\n[${i + 1}/${scripts.length}] ${label}`);
    console.log(`   Running: ${file}`);
    console.log('   ' + '─'.repeat(50));

    try {
      execSync(`node "${scriptPath}"`, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        env: { ...process.env }
      });
      console.log(`   ✅ ${file} — Hoàn tất`);
      passed++;
    } catch (error) {
      console.error(`   ❌ ${file} — Thất bại (exit code: ${error.status})`);
      failed++;
      // Tiếp tục chạy script tiếp theo
    }
  }

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  KẾT QUẢ: ${passed} thành công, ${failed} thất bại`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  if (failed > 0) {
    console.log('⚠️  Một số script thất bại. Kiểm tra log ở trên để biết chi tiết.');
    process.exit(1);
  } else {
    console.log('🎉 Tất cả seed scripts đã chạy thành công!');
    console.log('   Bạn có thể khởi động server: npm run dev');
    process.exit(0);
  }
};

run();
