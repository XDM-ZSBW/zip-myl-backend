const express = require('express');
const router = express.Router();

// Bot-friendly endpoints for automated access
router.get('/status', (req, res) => {
  res.json({
    service: 'zip-myl-backend',
    status: 'operational',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      metrics: '/metrics',
      api: '/api',
      docs: '/docs',
    },
  });
});

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    platform: process.platform,
  });
});

router.get('/api/status', (req, res) => {
  res.json({
    api: {
      version: '1.0.0',
      status: 'operational',
      endpoints: {
        auth: {
          register: 'POST /api/v1/auth/device/register',
          login: 'POST /api/v1/auth/login',
          refresh: 'POST /api/v1/auth/refresh',
          logout: 'POST /api/v1/auth/logout',
        },
        device: {
          info: 'GET /api/v1/device/info',
          update: 'PUT /api/v1/device/update',
          revoke: 'DELETE /api/v1/device/revoke',
        },
        admin: {
          keys: {
            create: 'POST /api/v1/admin/keys/create',
            list: 'GET /api/v1/admin/keys/list',
            update: 'PUT /api/v1/admin/keys/update',
            revoke: 'DELETE /api/v1/admin/keys/revoke',
          },
        },
      },
      features: [
        'anonymous-device-auth',
        'zero-knowledge-architecture',
        'rate-limiting',
        'api-key-management',
        'audit-logging',
        'health-monitoring',
      ],
    },
    timestamp: new Date().toISOString(),
  });
});

// Sitemap for bots
router.get('/sitemap.xml', (req, res) => {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://api.myl.zip/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://api.myl.zip/docs</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://api.myl.zip/api/docs/swagger</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://api.myl.zip/health</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.send(sitemap);
});

// Robots.txt for bots
router.get('/robots.txt', (req, res) => {
  const robots = `User-agent: *
Allow: /
Allow: /docs
Allow: /api/docs/
Allow: /health
Allow: /bot/

Disallow: /api/v1/auth/
Disallow: /api/v1/admin/
Disallow: /api/v1/device/

Sitemap: https://api.myl.zip/sitemap.xml

# API Documentation
# Human-readable docs: https://api.myl.zip/docs
# Machine-readable API spec: https://api.myl.zip/api/docs/openapi.json
# Interactive API explorer: https://api.myl.zip/api/docs/swagger
# Health check: https://api.myl.zip/health
# Bot status: https://api.myl.zip/bot/status`;

  res.setHeader('Content-Type', 'text/plain');
  res.send(robots);
});

module.exports = router;
