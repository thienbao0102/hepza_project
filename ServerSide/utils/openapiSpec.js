const fs = require('fs');
const path = require('path');

const ROUTE_MOUNTS = Object.freeze({
  authRoutes: '/api/auth',
  companyRoutes: '/api/companies',
  userRoutes: '/api/users',
  industrialZoneRoutes: '/api/zones',
  hashtagRoutes: '/api/hashtags',
  summaryRecordRoutes: '/api/report',
  emissionRoutes: '/api/emission',
  solutionRoutes: '/api/solution',
  resoureceAndWasteRoutes: '/api/resource-waste',
  industryRoutes: '/api/industries',
  notificationRoutes: '/api/notifications',
  exportRouter: '/api/export',
  businessSymbiosisRoutes: '/api/business-symbiosis',
  errorLogRoutes: '/api/error-logs',
  regulationRoutes: '/api/regulations',
  environmentalReportRoutes: '/api/env-reports',
  onlineRoutes: '/api/online',
  enterpriseListRoutes: '/api/enterprise-list',
  wasteCodeRoutes: '/api/waste-codes',
});

const PUBLIC_ENDPOINTS = new Set([
  'POST /api/auth/login',
  'POST /api/auth/verify-login-otp',
  'POST /api/auth/resend-login-otp',
  'POST /api/auth/request-password-reset',
  'GET /api/auth/reset-password/init',
  'POST /api/auth/reset-password',
  'GET /api/health',
]);

const WRITE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

function toOpenApiPath(routePath) {
  return routePath.replace(/:([A-Za-z0-9_]+)/g, '{$1}').replace(/\/+$/, '') || '/';
}

function toTitle(value) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildTagFromRouteFile(routeFileName) {
  return toTitle(routeFileName.replace(/Routes?|Router$/i, ''));
}

function extractRouteDefinitions(fileContent) {
  const definitions = [];
  const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let match;

  while ((match = routeRegex.exec(fileContent)) !== null) {
    definitions.push({
      method: match[1],
      path: match[2],
      index: match.index,
    });
  }

  return definitions;
}

function extractAuthorizeRoles(fileContent, index) {
  const routeSnippet = fileContent.slice(index, index + 900);
  const rolesMatch = routeSnippet.match(/authorize\(\s*\[([^\]]+)\]/);
  if (!rolesMatch) return [];

  return rolesMatch[1]
    .split(',')
    .map((role) => role.replace(/['"\s]/g, ''))
    .filter(Boolean);
}

function extractRouteMiddlewareFlags(fileContent, index) {
  const routeSnippet = fileContent.slice(index, index + 900);
  return {
    requiresAuth: routeSnippet.includes('authenticate'),
    requiresCsrf: routeSnippet.includes('verifyCsrfToken'),
  };
}

function buildParameters(openApiPath) {
  const parameters = [];
  const paramRegex = /{([^}]+)}/g;
  let match;

  while ((match = paramRegex.exec(openApiPath)) !== null) {
    parameters.push({
      name: match[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
    });
  }

  return parameters;
}

function buildRequestBody(method) {
  if (!WRITE_METHODS.has(method)) return undefined;

  return {
    required: false,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          additionalProperties: true,
        },
      },
      'multipart/form-data': {
        schema: {
          type: 'object',
          additionalProperties: true,
        },
      },
    },
  };
}

function buildRouteOperation({ method, mountPath, path: routePath, routeFileName, fileContent, index }) {
  const fullPath = toOpenApiPath(`${mountPath}${routePath === '/' ? '' : routePath}`);
  const roles = extractAuthorizeRoles(fileContent, index);
  const operationId = `${method}_${fullPath.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
  const securityKey = `${method.toUpperCase()} ${fullPath}`;
  const isPublic = PUBLIC_ENDPOINTS.has(securityKey);
  const middlewareFlags = extractRouteMiddlewareFlags(fileContent, index);

  const operation = {
    tags: [buildTagFromRouteFile(routeFileName)],
    summary: `${method.toUpperCase()} ${fullPath}`,
    operationId,
    parameters: buildParameters(fullPath),
    responses: {
      200: {
        description: 'Thao tác thành công',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ApiResponse' },
          },
        },
      },
      400: { $ref: '#/components/responses/BadRequest' },
      401: { $ref: '#/components/responses/Unauthorized' },
      403: { $ref: '#/components/responses/Forbidden' },
      500: { $ref: '#/components/responses/InternalServerError' },
    },
  };

  if (!isPublic && middlewareFlags.requiresAuth) {
    operation.security = middlewareFlags.requiresCsrf
      ? [{ cookieAuth: [], csrfHeader: [] }]
      : [{ cookieAuth: [] }];
  }

  if (roles.length) {
    operation.description = `Vai trò được phép: ${roles.join(', ')}.`;
  }

  const requestBody = buildRequestBody(method);
  if (requestBody) {
    operation.requestBody = requestBody;
  }

  return { fullPath, method, operation };
}

function buildPaths() {
  const routesDir = path.resolve(__dirname, '../routes');
  const paths = {
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        operationId: 'get_api_health',
        responses: {
          200: {
            description: 'Server is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
  };

  Object.entries(ROUTE_MOUNTS).forEach(([routeFileBaseName, mountPath]) => {
    const routeFileName = `${routeFileBaseName}.js`;
    const routeFilePath = path.join(routesDir, routeFileName);
    if (!fs.existsSync(routeFilePath)) return;

    const fileContent = fs.readFileSync(routeFilePath, 'utf8');
    extractRouteDefinitions(fileContent).forEach((definition) => {
      const { fullPath, method, operation } = buildRouteOperation({
        ...definition,
        mountPath,
        routeFileName,
        fileContent,
        index: definition.index,
      });

      paths[fullPath] = paths[fullPath] || {};
      paths[fullPath][method] = operation;
    });
  });

  return paths;
}

function buildOpenApiSpec(req) {
  const protocol = req?.headers?.['x-forwarded-proto'] || req?.protocol || 'http';
  const host = req?.get?.('host') || process.env.API_PUBLIC_HOST || `localhost:${process.env.PORT || 5000}`;
  const baseUrl = process.env.API_PUBLIC_URL || `${protocol}://${host}`;

  return {
    openapi: '3.0.3',
    info: {
      title: 'HEPZA API',
      version: process.env.npm_package_version || '1.0.0',
      description: 'OpenAPI spec phục vụ bàn giao và kiểm thử tích hợp. Spec được sinh từ route Express hiện tại; schema request/response chi tiết cần bổ sung dần theo module.',
    },
    servers: [{ url: baseUrl }],
    tags: Object.values(ROUTE_MOUNTS).map((mountPath) => ({
      name: toTitle(mountPath.split('/').pop()),
    })),
    paths: buildPaths(),
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: process.env.NODE_ENV === 'production' ? '__Secure-authToken' : 'authToken',
        },
        csrfHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'x-csrf-token',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          additionalProperties: true,
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            error: { type: 'string' },
            code: { type: 'string' },
          },
          additionalProperties: true,
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
            timestamp: { type: 'string', format: 'date-time' },
            uptime: { type: 'integer' },
            env: { type: 'string' },
          },
        },
      },
      responses: {
        BadRequest: {
          description: 'Request không hợp lệ',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
        Unauthorized: {
          description: 'Chưa đăng nhập hoặc phiên không hợp lệ',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
        Forbidden: {
          description: 'Không đủ quyền truy cập',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
        InternalServerError: {
          description: 'Lỗi hệ thống',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
      },
    },
  };
}

function renderSwaggerHtml() {
  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>HEPZA API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
    <style>
      body { margin: 0; background: #f7fafc; }
      .topbar { display: none; }
      .swagger-ui .info { margin: 32px 0; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: '/api/docs.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        persistAuthorization: true,
        displayRequestDuration: true,
      });
    </script>
  </body>
</html>`;
}

module.exports = {
  buildOpenApiSpec,
  renderSwaggerHtml,
};
