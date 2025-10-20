# Backend Configuration Guide

## Environment Setup

The backend requires environment variables to be configured. Follow these steps:

### 1. Environment Variables

Copy the `.env.example` file to create your environment file:

```bash
cp .env.example .env
```

### 2. Environment Variables Explanation

#### Server Configuration
- **NODE_ENV**: Environment mode (`development`, `production`)
- **PORT**: Server port (default: 3001)

#### Database Configuration
- **MONGODB_URI**: MongoDB connection string
  - Format: `mongodb://username:password@host:port/database?authSource=admin`
  - Default: `mongodb://admin:admin123@localhost:27017/ca_management?authSource=admin`

#### JWT Configuration
- **JWT_SECRET**: Secret key for signing access tokens (change in production!)
- **JWT_EXPIRE**: Access token expiration time (default: 7d)
- **JWT_REFRESH_SECRET**: Secret key for refresh tokens (change in production!)
- **JWT_REFRESH_EXPIRE**: Refresh token expiration time (default: 30d)

#### Security
- **BCRYPT_ROUNDS**: Number of bcrypt hashing rounds (default: 10)

#### Rate Limiting
- **RATE_LIMIT_WINDOW_MS**: Time window for rate limiting in milliseconds (default: 900000 = 15 minutes)
- **RATE_LIMIT_MAX_REQUESTS**: Maximum requests per window (default: 100)

#### CORS
- **CORS_ORIGIN**: Allowed origin for CORS (default: `http://localhost:3000`)
  - This should match your frontend URL

## Current Configuration

The backend is currently configured to run on:
- **Port**: 3001
- **Frontend CORS**: http://localhost:3000
- **Database**: MongoDB at localhost:27017

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `POST /refresh` - Refresh access token
- `POST /logout` - User logout (requires auth)
- `GET /profile` - Get user profile (requires auth)
- `PUT /change-password` - Change password (requires auth)

### Companies (`/api/companies`)
All routes require authentication.

- `GET /` - Get all companies (with pagination/search)
- `POST /` - Create company (Super Admin only)
- `GET /:companyId` - Get company by ID
- `PUT /:companyId` - Update company (Company Admin)
- `DELETE /:companyId` - Delete company (Super Admin only)
- `POST /:companyId/invite-ca` - Invite CA to company
- `DELETE /:companyId/ca/:caId` - Remove CA from company
- `POST /:companyId/admins` - Add company admin (Super Admin only)
- `DELETE /:companyId/admins/:userId` - Remove company admin (Super Admin only)

### Users (`/api/users`)
All routes require authentication.

- `GET /` - Get all users
- `GET /:userId` - Get user by ID
- `PUT /:userId` - Update user (Super Admin or Company Admin)
- `PUT /:userId/role` - Update user role (Super Admin only)
- `PUT /:userId/deactivate` - Deactivate user
- `PUT /:userId/activate` - Activate user
- `DELETE /:userId` - Delete user (Super Admin only)

## User Roles

The system supports the following roles:

1. **SUPER_ADMIN**: Full system access
2. **CA**: Chartered Accountant with access to multiple companies
3. **COMPANY_ADMIN**: Company administrator
4. **COMPANY_USER**: Regular company user

## Development

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (running on localhost:27017)

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```

The server will start with nodemon and auto-reload on file changes.

### API Documentation
Access Swagger documentation at: `http://localhost:3001/api-docs`

## Production Deployment

1. Set `NODE_ENV=production` in `.env`
2. Update JWT secrets to strong, unique values
3. Configure production MongoDB connection
4. Update CORS_ORIGIN to your production frontend URL
5. Run:
   ```bash
   npm start
   ```

## Security Notes

⚠️ **Important for Production**:
- Change all JWT secrets to strong, random values
- Use environment-specific MongoDB credentials
- Enable HTTPS
- Configure appropriate CORS origins
- Review and adjust rate limiting settings
- Ensure MongoDB is properly secured

## Troubleshooting

### Port Already in Use (EADDRINUSE)
If you see "address already in use" error:
```bash
# Find process using port 3001
lsof -ti:3001

# Kill the process
lsof -ti:3001 | xargs kill -9
```

Or change the PORT in `.env` file.

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod`
- Verify connection string in MONGODB_URI
- Check username/password and authSource

### Mongoose Duplicate Index Warnings
These warnings indicate schema indexes are declared multiple ways. This is usually harmless in development but should be reviewed for production.

### CORS Errors
- Ensure CORS_ORIGIN matches your frontend URL exactly
- Check that the frontend is running on the expected port
