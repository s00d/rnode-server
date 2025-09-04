import swaggerJSDoc from 'swagger-jsdoc';

export interface OpenAPIConfig {
  title?: string;
  version?: string;
  description?: string;
  contact?: {
    name?: string;
    email?: string;
  };
  servers?: Array<{
    url: string;
    description: string;
  }>;
  apis?: string[];
}

export class OpenAPIGenerator {
  private config: OpenAPIConfig;
  private spec: any;

  constructor(config: OpenAPIConfig = {}) {
    this.config = {
      title: 'RNode Server API',
      version: '1.0.0',
      description: 'High-performance API built with RNode Server',
      contact: {
        name: 'API Support',
        email: 'support@rnode-server.com'
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Development server'
        }
      ],
      apis: ['./src/**/*.ts'],
      ...config
    };
  }

  generateSpec(): any {
    const swaggerOptions = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: this.config.title || 'RNode Server API',
          version: this.config.version || '1.0.0',
          description: this.config.description || 'High-performance API built with RNode Server',
          contact: this.config.contact || {
            name: 'API Support',
            email: 'support@rnode-server.com'
          },
          license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT'
          }
        },
        servers: this.config.servers,
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'User unique identifier'
                },
                name: {
                  type: 'string',
                  description: 'User full name'
                },
                email: {
                  type: 'string',
                  format: 'email',
                  description: 'User email address'
                },
                createdAt: {
                  type: 'string',
                  format: 'date-time',
                  description: 'User creation timestamp'
                }
              },
              required: ['id', 'name', 'email']
            },
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
                }
              }
            },
            SuccessResponse: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: true
                },
                message: {
                  type: 'string',
                  description: 'Success message'
                },
                data: {
                  type: 'object',
                  description: 'Response data'
                }
              }
            },
            PaginatedResponse: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: true
                },
                data: {
                  type: 'array',
                  items: {
                    type: 'object'
                  }
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: {
                      type: 'integer',
                      description: 'Current page number'
                    },
                    limit: {
                      type: 'integer',
                      description: 'Items per page'
                    },
                    total: {
                      type: 'integer',
                      description: 'Total number of items'
                    },
                    pages: {
                      type: 'integer',
                      description: 'Total number of pages'
                    }
                  }
                }
              }
            }
          },
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            },
            apiKey: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key'
            },
            basicAuth: {
              type: 'http',
              scheme: 'basic'
            }
          }
        },
        security: [
          {
            bearerAuth: []
          }
        ]
      },
      apis: this.config.apis
    };

    this.spec = swaggerJSDoc(swaggerOptions);
    return this.spec;
  }

  getSpec(): any {
    if (!this.spec) {
      this.generateSpec();
    }
    return this.spec;
  }

  generateSwaggerUI(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.config.title} - API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
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
        .swagger-ui .topbar {
            background-color: #2c3e50;
        }
        .swagger-ui .topbar .download-url-wrapper .select-label {
            color: #fff;
        }
        .swagger-ui .info .title {
            color: #2c3e50;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '/api/openapi.json',
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
                validatorUrl: null,
                docExpansion: "list",
                filter: true,
                showRequestHeaders: true,
                showCommonExtensions: true
            });
        };
    </script>
</body>
</html>`;
  }

  generateReDoc(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.config.title} - API Documentation (ReDoc)</title>
    <link rel="stylesheet" type="text/css" href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700">
    <style>
        body {
            margin: 0;
            padding: 0;
        }
    </style>
</head>
<body>
    <redoc spec-url="/api/openapi.json"></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js"></script>
</body>
</html>`;
  }
}

export function createOpenAPIGenerator(config?: OpenAPIConfig): OpenAPIGenerator {
  return new OpenAPIGenerator(config);
}
