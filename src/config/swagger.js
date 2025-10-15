const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./config');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CA Management System API',
      version: '1.0.0',
      description: 'Comprehensive API for managing companies, CAs, and users with role-based authentication',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer {token}',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
            },
            name: {
              type: 'string',
              description: 'User full name',
            },
            role: {
              type: 'string',
              enum: ['SUPER_ADMIN', 'CA', 'COMPANY_ADMIN', 'COMPANY_USER'],
              description: 'User role',
            },
            company: {
              type: 'string',
              description: 'Company ID (for company-level users)',
            },
            invitedCompanies: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'List of company IDs CA is invited to',
            },
            isActive: {
              type: 'boolean',
              description: 'Account active status',
            },
            emailVerified: {
              type: 'boolean',
              description: 'Email verification status',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Company: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Company ID',
            },
            name: {
              type: 'string',
              description: 'Company name',
            },
            description: {
              type: 'string',
              description: 'Company description',
            },
            registrationNumber: {
              type: 'string',
              description: 'Company registration number',
            },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                zipCode: { type: 'string' },
                country: { type: 'string' },
              },
            },
            contactInfo: {
              type: 'object',
              properties: {
                phone: { type: 'string' },
                email: { type: 'string' },
                website: { type: 'string' },
              },
            },
            representative: {
              type: 'string',
              description: 'Representative user ID',
            },
            companyAdmins: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of company admin user IDs',
            },
            invitedCAs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  ca: { type: 'string' },
                  invitedAt: { type: 'string', format: 'date-time' },
                  invitedBy: { type: 'string' },
                },
              },
            },
            isActive: {
              type: 'boolean',
            },
            createdBy: {
              type: 'string',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
