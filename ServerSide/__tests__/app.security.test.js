const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.ORIGIN = 'http://localhost:3000';

jest.mock('../monitoring/metrics', () => ({
  httpMetricsMiddleware: (req, res, next) => next(),
  createMetricsHandler: () => (_req, res) => res.status(200).json({ ok: true }),
}));

jest.mock('../utils/logger', () => ({
  installConsoleBridge: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../middleware/requestLogger', () => (req, res, next) => next());

jest.mock('../utils/openapiSpec', () => ({
  buildOpenApiSpec: () => ({ openapi: '3.0.0', info: { title: 'Mock API' } }),
  renderSwaggerHtml: () => '<html><body>Swagger</body></html>',
}));

jest.mock('../utils/perfLogger', () => ({
  perfMiddleware: (req, res, next) => next(),
}));

jest.mock('../routes/authRoutes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../routes/companyRoutes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../routes/userRoutes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../routes/industrialZoneRoutes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../routes/hashtagRoutes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../routes/summaryRecordRoutes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../routes/emissionRoutes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../routes/solutionRoutes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../routes/resoureceAndWasteRoutes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../routes/industryRoutes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../routes/notificationRoutes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../routes/exportRouter', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../routes/businessSymbiosisRoutes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../routes/errorLogRoutes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../routes/regulationRoutes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../routes/environmentalReportRoutes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../routes/onlineRoutes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../routes/enterpriseListRoutes', () => {
  const express = require('express');
  return express.Router();
});
jest.mock('../routes/wasteCodeRoutes', () => {
  const express = require('express');
  return express.Router();
});

const app = require('../app');

describe('app security headers', () => {
  test('GET /api/health returns hardened API headers', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('X-Forwarded-Proto', 'https');

    expect(response.status).toBe(200);
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['strict-transport-security']).toBe(
      'max-age=31536000; includeSubDomains'
    );
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
    expect(response.body.status).toBe('ok');
  });

  test('GET /api/docs stays available with Swagger-specific CSP', async () => {
    const response = await request(app).get('/api/docs');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Swagger');
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    expect(response.headers['content-security-policy']).toContain("script-src 'self' 'unsafe-inline' https://unpkg.com");
  });

  test('GET /api/docs.json returns OpenAPI payload', async () => {
    const response = await request(app).get('/api/docs.json');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        openapi: '3.0.0',
      })
    );
  });
});
