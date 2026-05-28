const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function scrape() {
    const urls = [
        'https://moitruonghopnhat.com/danh-muc-chat-thai-nguy-hai-kem-theo-thong-tu-022022tt-btnmt-688.html',
        'https://luatvietnam.vn/van-ban-khac/thong-tu-02-2022-tt-btnmt-bo-tai-nguyen-va-moi-truong-215849-d1.html'
    ];

    for (let url of urls) {
        try {
            console.log("Fetching", url);
            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            const $ = cheerio.load(data);
            const results = [];

            $('table tr').each((i, row) => {
                const cols = $(row).find('td, p'); // Sometimes text is in <p> inside <td>
                // We'll extract all text from the row and look for patterns
                const texts = [];
                $(row).find('td').each((j, td) => {
                    texts.push($(td).text().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim());
                });

                // If the row has texts, see if we can find a code and a name
                let code = '';
                let name = '';
                let foundMatch = false;

                for (let j = 0; j < texts.length; j++) {
                    const cleanText = texts[j].replace(/\*/g, '').trim();
                    if (/^\d{2}\s\d{2}\s\d{2}$/.test(cleanText) || /^\d{2}\s\d{2}$/.test(cleanText) || /^\d{2}$/.test(cleanText)) {
                        code = cleanText;
                        if (j + 1 < texts.length) {
                            name = texts[j + 1];
                        }
                        foundMatch = true;
                        break;
                    }
                }

                if (foundMatch && code && name) {
                    results.push({ code, name });
                }
            });

            if (results.length > 50) {
                console.log(`Scraped ${results.length} codes from ${url}`);
                // Clean up duplicates if any
                const uniqueResults = [];
                const seen = new Set();
                for (let r of results) {
                    if (!seen.has(r.code)) {
                        seen.add(r.code);
                        uniqueResults.push(r);
                    }
                }
                fs.writeFileSync('wasteCodes.json', JSON.stringify(uniqueResults, null, 2));
                return;
            }
        } catch (e) {
            console.error("Failed", url, e.message);
        }
    }
    console.log("Could not find enough data on any URL.");
}
scrape();
