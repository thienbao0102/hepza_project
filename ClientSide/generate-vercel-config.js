import fs from 'node:fs';
import path from 'node:path';

const vercelPath = path.resolve(process.cwd(), 'vercel.json');

const apiOrigin = process.env.VERCEL_API_ORIGIN || 'https://api2.hepza.click';
const frontendOrigin = process.env.VERCEL_CORS_ORIGIN || 'https://www.hepza.click';

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)' },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https://res.cloudinary.com https://*.tile.openstreetmap.org; connect-src 'self' https://hepza.click https://www.hepza.click https://api2.hepza.click wss://hepza.click wss://www.hepza.click wss://api2.hepza.click https://api.openweathermap.org https://router.project-osrm.org; upgrade-insecure-requests",
  },
];

const config = {
  rewrites: [
    {
      source: '/api/(.*)',
      destination: `${apiOrigin}/api/$1`,
    },
    {
      source: '/(.*)',
      destination: '/',
    },
  ],
  headers: [
    {
      source: '/(.*)',
      headers: securityHeaders,
    },
    {
      source: '/api/(.*)',
      headers: [
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { key: 'Access-Control-Allow-Origin', value: frontendOrigin },
        { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,PATCH' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type,x-csrf-token' },
      ],
    },
  ],
};

fs.writeFileSync(vercelPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log(`[generate-vercel-config] Wrote ${vercelPath}`);
