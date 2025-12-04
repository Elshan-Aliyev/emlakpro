# Superadmin vs Admin Role Separation

## Overview
The user role system has been updated to separate `superadmin` and `admin` roles with distinct permissions.

## Role Hierarchy

```
Superadmin (Top Level)
  └── Admin (Operations Level)
      └── Corporate
      └── Realtor
      └── User
      └── Guest
```

## Permissions Matrix

| Action | Superadmin | Admin | Corporate/Realtor | User | Guest |
|--------|-----------|-------|-------------------|------|-------|
| **User Management** |
| View all users | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage users (non-admin) | ✓ | ✓ | ✗ | Self only | ✗ |
| Manage admin accounts | ✓ | ✗ | ✗ | ✗ | ✗ |
| Manage superadmin accounts | ✓ | ✗ | ✗ | ✗ | ✗ |
| Assign roles (non-superadmin) | ✓ | ✓ | ✗ | ✗ | ✗ |
| Assign superadmin role | ✓ | ✗ | ✗ | ✗ | ✗ |
| Delete user accounts | ✓ | ✓ (non-admin) | ✗ | Self only | ✗ |
| Delete admin accounts | ✓ | Self only | ✗ | ✗ | ✗ |
| **Property Management** |
| View all properties | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create property | ✓ | ✓ | ✓ | ✓ (limited) | ✗ |
| Edit any property | ✓ | ✓ | Own only | Own only | ✗ |
| Delete any property | ✓ | ✓ | Own only | Own only | ✗ |
| Approve/Feature listings | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Site Management** |
| Site settings | ✓ | ✗ | ✗ | ✗ | ✗ |
| Payment settings | ✓ | ✗ | ✗ | ✗ | ✗ |
| Analytics dashboard | ✓ | ✓ (view) | Own stats | Own stats | ✗ |
| Moderate images | ✓ | ✓ | ✗ | ✗ | ✗ |

## Superadmin Capabilities

**Full System Control:**
- Manage all admin accounts (create, update, delete)
- Manage corporate, realtor, and user accounts
- Assign any role including `superadmin`
- Access site-wide settings
- Configure payment systems
- View complete analytics
- Override any permission

**Best Practices:**
- Limit to 1-2 accounts maximum
- Use for top-level security and configuration
- Enable 2FA (when implemented)
- Log all superadmin actions (future enhancement)

## Admin Capabilities

**Day-to-Day Operations:**
- Manage listings (approve, moderate, delete)
- Manage users (except admins and superadmins)
- Moderate images and content
- Assign roles: `guest`, `user`, `realtor`, `corporate`, `admin`
- View analytics (read-only)
- Handle user reports and disputes

**Restrictions:**
- Cannot modify superadmin accounts
- Cannot delete other admin accounts
- Cannot assign superadmin role
- Cannot access site settings
- Cannot modify payment settings

## Implementation Details

### Backend Changes

**1. User Model** (`server/models/User.js`)
```javascript
role: { 
  type: String, 
  enum: ['guest', 'user', 'realtor', 'corporate', 'admin', 'superadmin'], 
  default: 'user' 
}
```

**2. Role Middleware** (`server/middleware/roleMiddleware.js`)
```javascript
// New middleware function
const isSuperAdmin = (req, res, next) => {
  return checkRole('superadmin')(req, res, next);
};

// Updated to include superadmin
const isAdmin = (req, res, next) => {
  return checkRole('admin', 'superadmin')(req, res, next);
};
```

**3. User Controller** (`server/controllers/userController.js`)

Enhanced permission checks:
- `getUsers()` - Both admin and superadmin can view
- `updateUser()` - Superadmin can modify anyone; Admin cannot modify superadmin/admin accounts
- `deleteUser()` - Superadmin can delete anyone; Admin can only delete non-admin accounts

## Frontend Changes

**Badge Component** will need update to display superadmin badge:
```javascript
// Add to Badge.js
const badgeConfig = {
  // ... existing badges
  'superadmin': {
    label: 'Superadmin',
    color: '#d32f2f',
    icon: '👑'
  }
};
```

**Admin Panel** should show different menus for admin vs superadmin:
```javascript
{role === 'superadmin' && (
  <div className="superadmin-only">
    <Link to="/admin/settings">Site Settings</Link>
    <Link to="/admin/admins">Manage Admins</Link>
    <Link to="/admin/payments">Payment Config</Link>
  </div>
)}
```

## Creating the First Superadmin

**Option 1: MongoDB Direct Update**
```javascript
// In MongoDB Compass or shell
db.users.updateOne(
  { email: "admin@yourdomain.com" },
  { $set: { role: "superadmin" } }
)
```

**Option 2: Seed Script** (create `server/scripts/createSuperadmin.js`)
```javascript
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI);

async function createSuperadmin() {
  const email = 'superadmin@temsilcim.com';
  const existing = await User.findOne({ email });
  
  if (existing) {
    existing.role = 'superadmin';
    await existing.save();
    console.log('Updated existing user to superadmin');
  } else {
    await User.create({
      name: 'Super',
      lastName: 'Admin',
      email,
      password: 'CHANGE_THIS_PASSWORD',
      role: 'superadmin'
    });
    console.log('Created new superadmin account');
  }
  
  mongoose.disconnect();
}

createSuperadmin();
```

Run: `node server/scripts/createSuperadmin.js`

## Security Recommendations

1. **Limit Superadmin Accounts**: Maximum 1-2 accounts
2. **Strong Passwords**: Enforce complex passwords for admin roles
3. **Audit Logging**: Log all superadmin actions (future feature)
4. **2FA Required**: Implement two-factor auth for admin+ roles
5. **Session Timeout**: Shorter session duration for admin roles
6. **IP Whitelisting**: Restrict admin access by IP (optional)

## Migration Path

If you have existing `admin` accounts, decide:
- Keep as `admin` (operations level)
- Promote to `superadmin` (system level)

No automatic migration is provided to prevent accidental privilege escalation.

## Testing

**Test Admin Restrictions:**
1. Login as admin
2. Try to update a superadmin account → Should fail with 403
3. Try to delete another admin account → Should fail with 403
4. Try to assign superadmin role → Should fail with 403

**Test Superadmin Access:**
1. Login as superadmin
2. Should be able to manage all accounts
3. Should be able to assign any role
4. Should access all system features

## Next Steps

- [ ] Update frontend Badge component
- [ ] Create AdminPanel with role-based menus
- [ ] Implement audit logging for admin actions
- [ ] Add 2FA for admin+ accounts
- [ ] Create superadmin dashboard
- [ ] Add site settings page (superadmin only)
