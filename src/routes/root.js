const express = require('express');
const router = express.Router();

// Root endpoint - provides API information
router.get('/', (req, res) => {
  const userAgent = req.get('User-Agent') || '';
  const isBot = /bot|crawler|spider|scraper|curl|wget|postman|insomnia/i.test(userAgent);

  if (isBot) {
    // Bot-friendly JSON response
    res.json({
      name: 'Zip MyL Backend API',
      version: '1.0.0',
      description: 'Anonymous Device-Based Authentication & Zero-Knowledge Architecture',
      documentation: {
        human: 'https://api.myl.zip/docs',
        api: 'https://api.myl.zip/api/docs/openapi.json',
        swagger: 'https://api.myl.zip/api/docs/swagger',
      },
      endpoints: {
        health: 'https://api.myl.zip/health',
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
        'Anonymous device-based authentication',
        'Zero-knowledge architecture',
        'Client-side encryption',
        'Rate limiting',
        'API key management',
        'Audit logging',
        'Health monitoring',
      ],
      status: 'operational',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } else {
    // Human-friendly HTML response
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zip MyL Backend API</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
            text-align: center;
        }
        
        .card {
            background: white;
            border-radius: 20px;
            padding: 60px 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
            backdrop-filter: blur(10px);
        }
        
        .logo {
            font-size: 4rem;
            margin-bottom: 20px;
        }
        
        h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .subtitle {
            font-size: 1.2rem;
            color: #666;
            margin-bottom: 40px;
        }
        
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 40px 0;
        }
        
        .feature {
            padding: 20px;
            background: #f8f9fa;
            border-radius: 12px;
            border-left: 4px solid #667eea;
        }
        
        .feature-icon {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        
        .feature h3 {
            margin-bottom: 10px;
            color: #333;
        }
        
        .feature p {
            color: #666;
            font-size: 0.9rem;
        }
        
        .buttons {
            display: flex;
            gap: 20px;
            justify-content: center;
            margin: 40px 0;
            flex-wrap: wrap;
        }
        
        .btn {
            display: inline-block;
            padding: 15px 30px;
            border-radius: 50px;
            text-decoration: none;
            font-weight: bold;
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
        }
        
        .btn-secondary {
            background: transparent;
            color: #667eea;
            border-color: #667eea;
        }
        
        .btn-secondary:hover {
            background: #667eea;
            color: white;
        }
        
        .status {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background: #d4edda;
            color: #155724;
            border-radius: 20px;
            font-size: 0.9rem;
            margin-top: 20px;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            background: #28a745;
            border-radius: 50%;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        
        .footer {
            margin-top: 40px;
            color: #666;
            font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
            .card { padding: 40px 20px; }
            h1 { font-size: 2rem; }
            .buttons { flex-direction: column; align-items: center; }
            .btn { width: 100%; max-width: 300px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="logo">🚀</div>
            <h1>Zip MyL Backend API</h1>
            <p class="subtitle">Anonymous Device-Based Authentication & Zero-Knowledge Architecture</p>
            
            <div class="features">
                <div class="feature">
                    <div class="feature-icon">🔐</div>
                    <h3>Anonymous Auth</h3>
                    <p>Device-based authentication without personal data collection</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🛡️</div>
                    <h3>Zero-Knowledge</h3>
                    <p>Client-side encryption with server-side zero-knowledge</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">⚡</div>
                    <h3>High Performance</h3>
                    <p>Built for scale with rate limiting and monitoring</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🔍</div>
                    <h3>Audit Ready</h3>
                    <p>Comprehensive logging and security monitoring</p>
                </div>
            </div>
            
            <div class="buttons">
                <a href="/docs" class="btn btn-primary">📚 View Documentation</a>
                <a href="/api/docs/swagger" class="btn btn-secondary">🔧 API Explorer</a>
                <a href="/health" class="btn btn-secondary">🏥 Health Check</a>
            </div>
            
            <div class="status">
                <div class="status-dot"></div>
                <span>Service Operational</span>
            </div>
            
            <div class="footer">
                <p>API Version 1.0.0 | Built with Node.js & Google Cloud Run</p>
                <p>Uptime: ${Math.floor(process.uptime())} seconds</p>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
});

// API info endpoint for programmatic access
router.get('/api/info', (req, res) => {
  res.json({
    name: 'Zip MyL Backend API',
    version: '1.0.0',
    description: 'Anonymous Device-Based Authentication & Zero-Knowledge Architecture',
    status: 'operational',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    endpoints: {
      docs: '/docs',
      openapi: '/api/docs/openapi.json',
      swagger: '/api/docs/swagger',
      health: '/health',
    },
  });
});

module.exports = router;
