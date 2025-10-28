# Admin Password Reset Tool

This script allows you to reset the admin account password for Rancher Hub.

## Usage

```bash
cd apps/backend
node reset-admin-password.js
```

## Features

- **Environment Aware**: Automatically reads database configuration from `.env` file
- **Secure Password Input**: Hides password characters during input
- **Password Confirmation**: Requires password confirmation to prevent typos
- **2FA Reset**: Automatically disables 2FA (can be re-enabled after login)
- **Database Support**: 
  - SQLite (fully supported)
  - PostgreSQL (manual instructions provided)

## What It Does

1. Reads database configuration from `.env` file
2. Connects to the database
3. Prompts for new admin password (minimum 8 characters)
4. Hashes the password using bcrypt with salt rounds 12
5. Updates the admin user record:
   - Sets new password
   - Disables 2FA
   - Clears 2FA secret
   - Sets first login flag
6. Provides confirmation and next steps

## Requirements

- Node.js installed
- Backend dependencies installed (`npm install`)
- Database created (run backend at least once)
- `.env` file present with database configuration

## Security Notes

- Password is hashed using bcrypt with 12 salt rounds (same as application)
- 2FA is automatically disabled for security reasons
- User will be prompted to change password on first login
- Consider re-enabling 2FA after password reset

## Troubleshooting

### Database Not Found
```
❌ SQLite database not found at: /path/to/rancher-hub.db
```
**Solution**: Run the backend application at least once to create the database.

### Admin User Not Found
```
❌ Admin user not found in database.
```
**Solution**: Ensure the backend has been started and the default admin user was created.

### PostgreSQL
For PostgreSQL databases, use standard database tools:

```sql
-- Connect to PostgreSQL
psql -h localhost -U rancher_hub -d rancher_hub

-- Reset admin password (replace 'new_hashed_password' with bcrypt hash)
UPDATE users 
SET password = '$2a$12$your_bcrypt_hashed_password_here',
    "twoFactorEnabled" = false,
    "twoFactorSecret" = null,
    "isFirstLogin" = true,
    "updatedAt" = NOW()
WHERE username = 'admin';
```

## Example Output

```
🔧 Rancher Hub - Admin Password Reset Tool
==========================================

📁 Reading configuration from .env file...
🔗 Connecting to database...

🔑 Please enter the new admin password:
Enter new admin password: ********
Confirm new admin password: ********

🔐 Hashing password...
💾 Updating admin password in database...
✅ Found admin user with ID: 123e4567-e89b-12d3-a456-426614174000

✅ Admin password has been successfully reset!
📋 Summary of changes:
   - Password updated
   - 2FA disabled (can be re-enabled after login)
   - First login flag set (user will be prompted to change password)

💡 You can now login with:
   Username: admin
   Password: [the password you just set]

⚠️  Remember to enable 2FA after logging in for better security!
```