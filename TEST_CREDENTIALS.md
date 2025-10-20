# Test Credentials

This document contains all test user credentials for the CA Management System.

## Password for All Accounts
**All test accounts use the same password:** `password123`

---

## Super Admin Account

**Role:** Super Admin (Full system access)
- **Email:** `admin@bixssca.com`
- **Password:** `password123`
- **Capabilities:**
  - Full access to all system features
  - Can create and manage companies
  - Can manage all users
  - Can change user roles
  - Access to system settings and audit logs

---

## CA (Chartered Accountant) Account

**Role:** CA Professional
- **Email:** `ca@bixssca.com`
- **Password:** `password123`
- **Capabilities:**
  - Access to multiple client companies
  - Can view and manage documents for assigned companies
  - Can perform analysis and generate reports
  - Access to 3 companies:
    1. Tech Solutions Inc
    2. Global Enterprises Ltd
    3. Innovation Corp

---

## Company Admin Accounts

### Tech Solutions Inc
**Role:** Company Administrator
- **Email:** `john@techsolutions.com`
- **Password:** `password123`
- **Company:** Tech Solutions Inc
- **Registration Number:** REG-001-2024
- **Capabilities:**
  - Full company administration
  - Can invite CAs to the company
  - Can manage company users
  - Can view all company documents and reports

### Global Enterprises Ltd
**Role:** Company Administrator
- **Email:** `michael@globalenterprises.com`
- **Password:** `password123`
- **Company:** Global Enterprises Ltd
- **Registration Number:** REG-002-2024
- **Capabilities:**
  - Full company administration
  - Can invite CAs to the company
  - Can manage company users
  - Can view all company documents and reports

### Innovation Corp
**Role:** Company Administrator
- **Email:** `sarah@innovationcorp.com`
- **Password:** `password123`
- **Company:** Innovation Corp
- **Registration Number:** REG-003-2024
- **Capabilities:**
  - Full company administration
  - Can invite CAs to the company
  - Can manage company users
  - Can view all company documents and reports

---

## Company User Account

### Tech Solutions Inc - Regular User
**Role:** Company User
- **Email:** `jane@techsolutions.com`
- **Password:** `password123`
- **Company:** Tech Solutions Inc
- **Capabilities:**
  - Limited company access
  - Can view company documents
  - Cannot manage users or invite CAs
  - Standard user permissions

---

## Quick Reference Table

| Role | Email | Password | Company |
|------|-------|----------|---------|
| Super Admin | admin@bixssca.com | password123 | N/A |
| CA Professional | ca@bixssca.com | password123 | All (3 companies) |
| Company Admin | john@techsolutions.com | password123 | Tech Solutions Inc |
| Company User | jane@techsolutions.com | password123 | Tech Solutions Inc |
| Company Admin | michael@globalenterprises.com | password123 | Global Enterprises Ltd |
| Company Admin | sarah@innovationcorp.com | password123 | Innovation Corp |

---

## How to Generate New Test Data

To reset the database and regenerate test credentials, run:

```bash
npm run seed
```

This will:
1. Clear all existing data from the database
2. Create new test companies
3. Create test users with the credentials listed above
4. Link CAs to their assigned companies
5. Set up proper relationships between users and companies

---

## Security Notes

⚠️ **IMPORTANT:** These are test credentials for development only!

- **Never use these credentials in production**
- **Change all passwords before deploying to production**
- **Use strong, unique passwords for production accounts**
- **Enable two-factor authentication for production systems**
- **Regularly rotate credentials in production environments**

---

## Database Information

- **Database Name:** ca_management
- **MongoDB URI:** mongodb://admin:admin123@localhost:27017/ca_management?authSource=admin
- **Collections:**
  - `users` - User accounts and authentication
  - `companies` - Company information and relationships

---

## Testing Different Roles

### To Test Super Admin Features:
1. Login with `admin@bixssca.com`
2. Access: User Management, System Settings, All Companies

### To Test CA Features:
1. Login with `ca@bixssca.com`
2. Access: Multiple Companies, Document Management, Analysis Tools
3. Test company switching functionality

### To Test Company Admin Features:
1. Login with `john@techsolutions.com` (or other company admin)
2. Access: Company Management, User Management (within company), CA Invitations

### To Test Company User Features:
1. Login with `jane@techsolutions.com`
2. Access: Limited to viewing company data, no administrative functions
