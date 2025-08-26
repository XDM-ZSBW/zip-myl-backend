const express = require('express');
const router = express.Router();

// OpenAPI 3.0 Specification
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Zip MyL Backend API',
    description: 'Anonymous Device-Based Authentication & Zero-Knowledge Architecture API',
    version: '1.0.0',
    contact: {
      name: 'API Support',
      url: 'https://api.myl.zip/docs'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'https://api.myl.zip',
      description: 'Production server'
    },
    {
      url: 'https://api.myl.zip',
      description: 'Cloud Run service'
    }
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'Anonymous device-based authentication endpoints'
    },
    {
      name: 'Device Management',
      description: 'Device information and management'
    },
    {
      name: 'Admin',
      description: 'Administrative functions and API key management'
    },
    {
      name: 'Health',
      description: 'Health checks and monitoring'
    }
  ],
  paths: {
    '/api/v1/auth/device/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register new anonymous device',
        description: 'Register a new anonymous device for authentication',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['deviceId', 'deviceFingerprint'],
                properties: {
                  deviceId: {
                    type: 'string',
                    format: 'uuid',
                    description: 'Unique device identifier'
                  },
                  deviceFingerprint: {
                    type: 'string',
                    description: 'Device fingerprint for security'
                  },
                  userAgent: {
                    type: 'string',
                    description: 'Browser user agent string'
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Device registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    deviceId: { type: 'string' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Bad request - invalid input',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '429': {
            description: 'Rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login with device credentials',
        description: 'Authenticate using device ID and fingerprint',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['deviceId', 'deviceFingerprint'],
                properties: {
                  deviceId: {
                    type: 'string',
                    format: 'uuid'
                  },
                  deviceFingerprint: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                    expiresIn: { type: 'integer' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Authentication failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh access token',
        description: 'Get new access token using refresh token',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Token refreshed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    accessToken: { type: 'string' },
                    expiresIn: { type: 'integer' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Invalid refresh token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout and invalidate session',
        description: 'Logout current device and invalidate tokens',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Logout successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/v1/device/info': {
      get: {
        tags: ['Device Management'],
        summary: 'Get device information',
        description: 'Retrieve current device information',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Device information retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    deviceId: { type: 'string' },
                    createdAt: { type: 'string', format: 'date-time' },
                    lastActive: { type: 'string', format: 'date-time' },
                    userAgent: { type: 'string' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/v1/admin/keys/create': {
      post: {
        tags: ['Admin'],
        summary: 'Create new API key',
        description: 'Create a new API key for service access',
        security: [{ apiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'type'],
                properties: {
                  name: {
                    type: 'string',
                    description: 'API key name/description'
                  },
                  type: {
                    type: 'string',
                    enum: ['service', 'admin'],
                    description: 'API key type'
                  },
                  permissions: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of permissions'
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'API key created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    apiKey: { type: 'string' },
                    keyId: { type: 'string' }
                  }
                }
              }
            }
          },
          '403': {
            description: 'Forbidden - admin access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Basic health check',
        description: 'Simple health check endpoint',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ok', 'error'] },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptime: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/health/detailed': {
      get: {
        tags: ['Health'],
        summary: 'Detailed health check',
        description: 'Comprehensive health check with dependencies',
        responses: {
          '200': {
            description: 'Detailed health status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptime: { type: 'number' },
                    dependencies: {
                      type: 'object',
                      properties: {
                        database: { type: 'string' },
                        redis: { type: 'string' },
                        secrets: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/metrics': {
      get: {
        tags: ['Health'],
        summary: 'Prometheus metrics',
        description: 'Prometheus-formatted metrics for monitoring',
        responses: {
          '200': {
            description: 'Metrics in Prometheus format',
            content: {
              'text/plain': {
                schema: {
                  type: 'string'
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'string',
            description: 'Error message'
          },
          code: {
            type: 'string',
            description: 'Error code'
          },
          timestamp: {
            type: 'string',
            format: 'date-time'
          }
        }
      }
    }
  }
};

// Serve OpenAPI spec as JSON
router.get('/openapi.json', (req, res) => {
  res.json(openApiSpec);
});

// Serve Swagger UI
router.get('/swagger', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Documentation - Swagger UI</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
    <style>
        html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }
        *, *:before, *:after {
            box-sizing: inherit;
        }
        body {
            margin:0;
            background: #fafafa;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '/api/docs/openapi.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                tryItOutEnabled: true,
                requestInterceptor: (request) => {
                    // Add API key if available
                    const apiKey = localStorage.getItem('apiKey');
                    if (apiKey) {
                        request.headers['X-API-Key'] = apiKey;
                    }
                    return request;
                }
            });
        };
    </script>
</body>
</html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

module.exports = router;
