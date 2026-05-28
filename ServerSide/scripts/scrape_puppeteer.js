const puppeteer = require('puppeteer');
const fs = require('fs');

async function run() {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // We'll go to an article that has the table
    const url = 'https://chutieu.com/danh-muc-chat-thai-nguy-hai-kem-theo-thong-tu-02-2022-tt-btnmt.html';
    console.log(`Navigating to ${url}...`);
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

        const data = await page.evaluate(() => {
            const results = [];
            // Assuming there are tables on the page
            const rows = document.querySelectorAll('table tr');
            rows.forEach(tr => {
                const cols = tr.querySelectorAll('td');
                if (cols.length >= 3) {
                    const codeText = (cols[1].textContent || '').replace(/\*/g, '').replace(/\n/g, '').replace(/\s+/g, ' ').trim();
                    const nameText = (cols[2].textContent || '').replace(/\n/g, '').replace(/\s+/g, ' ').trim();

                    // Filter code matches like '01', '01 01', '01 01 01'
                    if (/^\d{2}(\s\d{2})*$/.test(codeText) && nameText) {
                        results.push({ code: codeText, name: nameText });
                    }
                }
            });
            return results;
        });

        console.log(`Found ${data.length} codes.`);
        if (data.length > 50) {
            fs.writeFileSync('wasteCodes.json', JSON.stringify(data, null, 2));
            console.log('Saved to wasteCodes.json');
        } else {
            console.log('Not enough codes found, maybe table structure is different.');
        }
    } catch (e) {
        console.error('Error with chutieu:', e.message);
    }

    // If not successful, let's try luatminhkhue
    if (!fs.existsSync('wasteCodes.json') || JSON.parse(fs.readFileSync('wasteCodes.json')).length < 50) {
        const url2 = 'https://luatvietnam.vn/van-ban-khac/thong-tu-02-2022-tt-btnmt-bo-tai-nguyen-va-moi-truong-215849-d1.html';
        console.log(`Trying ${url2}...`);
        try {
            await page.goto(url2, { waitUntil: 'networkidle2', timeout: 30000 });

            const data2 = await page.evaluate(() => {
                const results = [];
                const rows = document.querySelectorAll('table tr');
                rows.forEach(tr => {
                    const texts = [];
                    tr.querySelectorAll('td').forEach(td => {
                        texts.push((td.textContent || '').replace(/\*/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim());
                    });

                    for (let i = 0; i < texts.length; i++) {
                        const txt = texts[i];
                        if (/^\d{2}(\s\d{2})*$/.test(txt)) {
                            const name = texts[i + 1] || texts[i + 2] || '';
                            if (name) {
                                results.push({ code: txt, name: name });
                                break;
                            }
                        }
                    }
                });
                return results;
            });
            console.log(`Found ${data2.length} codes.`);
            if (data2.length > 50) {
                fs.writeFileSync('wasteCodes.json', JSON.stringify(data2, null, 2));
            }
        } catch (e) {
            console.error('Error with luatvietnam:', e.message);
        }
    }

    await browser.close();
}

run();
