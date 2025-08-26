const express = require('express');
const router = express.Router();

// API Documentation Landing Page
router.get('/', (req, res) => {
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
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
        }
        
        .header h1 {
            font-size: 3rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        .card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .endpoint {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 15px 0;
            border-radius: 0 8px 8px 0;
        }
        
        .method {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.8rem;
            margin-right: 10px;
        }
        
        .get { background: #28a745; color: white; }
        .post { background: #007bff; color: white; }
        .put { background: #ffc107; color: black; }
        .delete { background: #dc3545; color: white; }
        
        .status {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.7rem;
            font-weight: bold;
        }
        
        .status-200 { background: #d4edda; color: #155724; }
        .status-201 { background: #d1ecf1; color: #0c5460; }
        .status-400 { background: #f8d7da; color: #721c24; }
        .status-401 { background: #fff3cd; color: #856404; }
        .status-404 { background: #f8d7da; color: #721c24; }
        
        .code {
            background: #2d3748;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
            overflow-x: auto;
            margin: 10px 0;
        }
        
        .tabs {
            display: flex;
            border-bottom: 2px solid #e9ecef;
            margin-bottom: 20px;
        }
        
        .tab {
            padding: 10px 20px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.3s;
        }
        
        .tab.active {
            border-bottom-color: #667eea;
            color: #667eea;
            font-weight: bold;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .feature {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        
        .feature-icon {
            font-size: 2rem;
            margin-bottom: 10px;
        }
        
        .footer {
            text-align: center;
            color: white;
            margin-top: 40px;
            opacity: 0.8;
        }
        
        @media (max-width: 768px) {
            .header h1 { font-size: 2rem; }
            .container { padding: 10px; }
            .card { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Zip MyL Backend API</h1>
            <p>Anonymous Device-Based Authentication & Zero-Knowledge Architecture</p>
        </div>
        
        <div class="card">
            <h2>📋 API Overview</h2>
            <p>This API provides anonymous device-based authentication with zero-knowledge architecture. No personal data is collected, and all encryption happens client-side.</p>
            
            <div class="feature-grid">
                <div class="feature">
                    <div class="feature-icon">🔐</div>
                    <h3>Anonymous Auth</h3>
                    <p>Device-based authentication using UUIDs and JWT tokens</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🛡️</div>
                    <h3>Zero-Knowledge</h3>
                    <p>Client-side encryption, server cannot decrypt user data</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">⚡</div>
                    <h3>Rate Limited</h3>
                    <p>Built-in rate limiting and API key management</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🔍</div>
                    <h3>Audit Logging</h3>
                    <p>Comprehensive logging and monitoring</p>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="tabs">
                <div class="tab active" onclick="showTab('auth')">Authentication</div>
                <div class="tab" onclick="showTab('device')">Device Management</div>
                <div class="tab" onclick="showTab('admin')">Admin</div>
                <div class="tab" onclick="showTab('health')">Health & Status</div>
            </div>
            
            <div id="auth" class="tab-content active">
                <h3>🔐 Authentication Endpoints</h3>
                
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <strong>/api/v1/auth/device/register</strong>
                    <span class="status status-201">201</span>
                    <p>Register a new anonymous device</p>
                    <div class="code">
{
  "deviceId": "uuid-string",
  "deviceFingerprint": "browser-fingerprint",
  "userAgent": "browser-user-agent"
}
                    </div>
                </div>
                
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <strong>/api/v1/auth/login</strong>
                    <span class="status status-200">200</span>
                    <p>Login with device credentials</p>
                    <div class="code">
{
  "deviceId": "uuid-string",
  "deviceFingerprint": "browser-fingerprint"
}
                    </div>
                </div>
                
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <strong>/api/v1/auth/refresh</strong>
                    <span class="status status-200">200</span>
                    <p>Refresh JWT access token</p>
                </div>
                
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <strong>/api/v1/auth/logout</strong>
                    <span class="status status-200">200</span>
                    <p>Logout and invalidate session</p>
                </div>
            </div>
            
            <div id="device" class="tab-content">
                <h3>📱 Device Management</h3>
                
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <strong>/api/v1/device/info</strong>
                    <span class="status status-200">200</span>
                    <p>Get device information (requires auth)</p>
                </div>
                
                <div class="endpoint">
                    <span class="method put">PUT</span>
                    <strong>/api/v1/device/update</strong>
                    <span class="status status-200">200</span>
                    <p>Update device information</p>
                </div>
                
                <div class="endpoint">
                    <span class="method delete">DELETE</span>
                    <strong>/api/v1/device/revoke</strong>
                    <span class="status status-200">200</span>
                    <p>Revoke device access</p>
                </div>
            </div>
            
            <div id="admin" class="tab-content">
                <h3>👑 Admin Endpoints</h3>
                
                <div class="endpoint">
                    <span class="method post">POST</span>
                    <strong>/api/v1/admin/keys/create</strong>
                    <span class="status status-201">201</span>
                    <p>Create new API key (admin only)</p>
                </div>
                
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <strong>/api/v1/admin/keys/list</strong>
                    <span class="status status-200">200</span>
                    <p>List all API keys (admin only)</p>
                </div>
                
                <div class="endpoint">
                    <span class="method put">PUT</span>
                    <strong>/api/v1/admin/keys/update</strong>
                    <span class="status status-200">200</span>
                    <p>Update API key (admin only)</p>
                </div>
                
                <div class="endpoint">
                    <span class="method delete">DELETE</span>
                    <strong>/api/v1/admin/keys/revoke</strong>
                    <span class="status status-200">200</span>
                    <p>Revoke API key (admin only)</p>
                </div>
            </div>
            
            <div id="health" class="tab-content">
                <h3>🏥 Health & Status</h3>
                
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <strong>/health</strong>
                    <span class="status status-200">200</span>
                    <p>Basic health check</p>
                </div>
                
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <strong>/health/detailed</strong>
                    <span class="status status-200">200</span>
                    <p>Detailed health check with dependencies</p>
                </div>
                
                <div class="endpoint">
                    <span class="method get">GET</span>
                    <strong>/metrics</strong>
                    <span class="status status-200">200</span>
                    <p>Prometheus metrics endpoint</p>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h2>🤖 Bot-Friendly Features</h2>
            <ul>
                <li><strong>JSON Responses:</strong> All endpoints return structured JSON</li>
                <li><strong>HTTP Status Codes:</strong> Proper REST status codes for all responses</li>
                <li><strong>Rate Limiting Headers:</strong> X-RateLimit-* headers for bot awareness</li>
                <li><strong>OpenAPI Spec:</strong> Available at <code>/api/docs/openapi.json</code></li>
                <li><strong>Health Checks:</strong> Simple endpoints for monitoring</li>
                <li><strong>Error Handling:</strong> Consistent error response format</li>
            </ul>
        </div>
        
        <div class="card">
            <h2>🔧 Quick Start</h2>
            <div class="code">
# Register a new device
curl -X POST https://api.myl.zip/api/v1/auth/device/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "deviceId": "your-device-uuid",
    "deviceFingerprint": "your-fingerprint",
    "userAgent": "your-user-agent"
  }'

# Login
curl -X POST https://api.myl.zip/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "deviceId": "your-device-uuid",
    "deviceFingerprint": "your-fingerprint"
  }'

# Health check
curl https://api.myl.zip/health
            </div>
        </div>
        
        <div class="footer">
            <p>Built with ❤️ using Node.js, Express, and Google Cloud Run</p>
            <p>API Version: 1.0.0 | Last Updated: ${new Date().toISOString()}</p>
        </div>
    </div>
    
    <script>
        function showTab(tabName) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab content
            document.getElementById(tabName).classList.add('active');
            
            // Add active class to clicked tab
            event.target.classList.add('active');
        }
    </script>
</body>
</html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

module.exports = router;
