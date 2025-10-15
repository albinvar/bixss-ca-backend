# CA Management System

A comprehensive backend system for managing companies, Chartered Accountants (CAs), and users with role-based access control (RBAC).

## Features

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Four user roles: Super Admin, CA, Company Admin, and Company User
- Company management with representatives and multiple admins
- CA invitation system for companies
- Comprehensive user management
- Security best practices (helmet, rate limiting, CORS)
- Input validation using express-validator
- MongoDB database with Mongoose ODM
- Docker Compose for easy MongoDB setup
- Comprehensive test suite with Jest and Supertest

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator
- **Security**: helmet, cors, express-rate-limit
- **Testing**: Jest, Supertest, mongodb-memory-server
- **Development**: nodemon

## Project Structure

```
ca/
├── src/
│   ├── config/          # Configuration files
│   │   ├── config.js
│   │   └── database.js
│   ├── controllers/     # Request handlers
│   │   ├── auth.controller.js
│   │   ├── company.controller.js
│   │   └── user.controller.js
│   ├── middleware/      # Custom middleware
│   │   ├── auth.js
│   │   ├── rbac.js
│   │   ├── errorHandler.js
│   │   └── validate.js
│   ├── models/          # Database models
│   │   ├── User.js
│   │   └── Company.js
│   ├── routes/          # API routes
│   │   ├── auth.routes.js
│   │   ├── company.routes.js
│   │   └── user.routes.js
│   ├── utils/           # Utility functions
│   │   └── jwt.js
│   ├── validators/      # Input validators
│   │   ├── auth.validator.js
│   │   └── company.validator.js
│   └── server.js        # Main server file
├── tests/               # Test files
│   ├── setup.js
│   └── auth.test.js
├── docker-compose.yml
├── package.json
├── .env.example
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Docker and Docker Compose
- npm or yarn

### Installation

1. Clone the repository:
```bash
cd ca
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` file and update the following:
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://admin:admin123@localhost:27017/ca_management?authSource=admin
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
```

4. Start MongoDB using Docker Compose:
```bash
docker-compose up -d
```

5. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

### MongoDB Management

Access Mongo Express (MongoDB web interface) at `http://localhost:8081`

## User Roles

### 1. SUPER_ADMIN
- Full system access
- Create and manage companies
- Manage all users
- Assign roles
- Cannot be created via registration (needs existing super admin)

### 2. CA (Chartered Accountant)
- Can be invited to companies
- Access to invited companies' data
- Independent user, not tied to a specific company

### 3. COMPANY_ADMIN
- Admin access to their assigned company
- Manage company details
- Invite CAs to the company
- Manage company users
- Tied to a specific company

### 4. COMPANY_USER
- Basic access to their company
- View company information
- Tied to a specific company

## API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123",
  "name": "John Doe",
  "role": "CA"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123"
}
```

#### Get Profile
```http
GET /api/auth/profile
Authorization: Bearer {access_token}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "{refresh_token}"
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer {access_token}
```

#### Change Password
```http
PUT /api/auth/change-password
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123"
}
```

### Company Management

#### Create Company (Super Admin only)
```http
POST /api/companies
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "ABC Corporation",
  "representative": "{user_id}",
  "description": "Company description",
  "registrationNumber": "REG123456"
}
```

#### Get All Companies
```http
GET /api/companies?page=1&limit=10&search=ABC
Authorization: Bearer {access_token}
```

#### Get Company by ID
```http
GET /api/companies/{companyId}
Authorization: Bearer {access_token}
```

#### Update Company
```http
PUT /api/companies/{companyId}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "Updated Company Name",
  "description": "Updated description"
}
```

#### Delete Company (Super Admin only)
```http
DELETE /api/companies/{companyId}
Authorization: Bearer {access_token}
```

#### Invite CA to Company
```http
POST /api/companies/{companyId}/invite-ca
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "caId": "{ca_user_id}"
}
```

#### Remove CA from Company
```http
DELETE /api/companies/{companyId}/ca/{caId}
Authorization: Bearer {access_token}
```

#### Add Company Admin (Super Admin only)
```http
POST /api/companies/{companyId}/admins
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "userId": "{user_id}"
}
```

#### Remove Company Admin (Super Admin only)
```http
DELETE /api/companies/{companyId}/admins/{userId}
Authorization: Bearer {access_token}
```

### User Management

#### Get All Users
```http
GET /api/users?page=1&limit=10&role=CA&search=john
Authorization: Bearer {access_token}
```

#### Get User by ID
```http
GET /api/users/{userId}
Authorization: Bearer {access_token}
```

#### Update User
```http
PUT /api/users/{userId}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "updated@example.com"
}
```

#### Update User Role (Super Admin only)
```http
PUT /api/users/{userId}/role
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "role": "COMPANY_ADMIN"
}
```

#### Deactivate User
```http
PUT /api/users/{userId}/deactivate
Authorization: Bearer {access_token}
```

#### Activate User
```http
PUT /api/users/{userId}/activate
Authorization: Bearer {access_token}
```

#### Delete User (Super Admin only)
```http
DELETE /api/users/{userId}
Authorization: Bearer {access_token}
```

## Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Security Features

- JWT-based authentication with access and refresh tokens
- Password hashing using bcryptjs
- Helmet for setting security headers
- CORS configuration
- Rate limiting to prevent abuse
- Input validation and sanitization
- Role-based access control (RBAC)
- Protected routes with authentication middleware

## Development

Start the development server with auto-reload:
```bash
npm run dev
```

## Production

Build and run in production mode:
```bash
NODE_ENV=production npm start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment mode | development |
| PORT | Server port | 3000 |
| MONGODB_URI | MongoDB connection string | mongodb://admin:admin123@localhost:27017/ca_management?authSource=admin |
| JWT_SECRET | JWT secret key | - |
| JWT_EXPIRE | JWT expiration time | 7d |
| JWT_REFRESH_SECRET | Refresh token secret | - |
| JWT_REFRESH_EXPIRE | Refresh token expiration | 30d |
| BCRYPT_ROUNDS | Bcrypt salt rounds | 10 |
| RATE_LIMIT_WINDOW_MS | Rate limit window | 900000 (15 min) |
| RATE_LIMIT_MAX_REQUESTS | Max requests per window | 100 |
| CORS_ORIGIN | Allowed CORS origin | http://localhost:3001 |

## Docker Commands

Start MongoDB and Mongo Express:
```bash
docker-compose up -d
```

Stop services:
```bash
docker-compose down
```

View logs:
```bash
docker-compose logs -f
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

## License

ISC

## Support

For issues and questions, please open an issue on the repository.
