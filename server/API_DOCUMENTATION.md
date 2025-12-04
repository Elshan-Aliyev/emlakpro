# Real Estate App - Complete API Documentation

## Base URL
```
http://localhost:5000/api
```

---

## 📋 TABLE OF CONTENTS
1. [Authentication](#authentication)
2. [Users](#users)
3. [Listings/Properties](#listings)
4. [Images](#images)
5. [Settings](#settings)
6. [Admin](#admin)

---

## 🔐 AUTHENTICATION

### Register User
```
POST /api/auth/register
Content-Type: application/json

Body:
{
  "name": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "registered" // optional: guest, registered, realtor, corporate
}

Response: 201
{
  "success": true,
  "token": "jwt_token_here",
  "user": { ... }
}
```

### Login User
```
POST /api/auth/login
Content-Type: application/json

Body:
{
  "email": "john@example.com",
  "password": "password123"
}

Response: 200
{
  "success": true,
  "token": "jwt_token_here",
  "user": { ... }
}
```

---

## 👥 USERS

### Get All Users (Admin Only)
```
GET /api/users
Authorization: Bearer {token}

Query Parameters:
- role: Filter by role (guest, registered, realtor, corporate, admin, superadmin)
- status: Filter by status (active, inactive)
- search: Search by name or email

Response: 200
{
  "success": true,
  "count": 10,
  "data": [ ... ]
}
```

### Get User Profile
```
GET /api/users/:id
Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": { ... }
}
```

### Update User (Admin or Self)
```
PATCH /api/users/:id
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "name": "John Updated",
  "role": "realtor", // admin only
  "status": "inactive", // admin only
  "phone": "+123456789",
  "bio": "Real estate professional"
}

Response: 200
{
  "success": true,
  "message": "User updated successfully",
  "data": { ... }
}
```

### Delete/Deactivate User (Admin Only)
```
DELETE /api/users/:id
Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "User deactivated successfully"
}
```

---

## 🏠 LISTINGS/PROPERTIES

### Create Listing
```
POST /api/properties
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "title": "Beautiful 3BR Apartment",
  "description": "Modern apartment in city center",
  "type": "buy", // buy or rent
  "category": "residential", // residential or commercial
  "subCategory": "long-term", // for rent only: long-term or short-term
  "price": 250000,
  "currency": "$",
  "address": {
    "street": "123 Main St",
    "city": "Baku",
    "province": "Baku",
    "postalCode": "1000",
    "country": "Azerbaijan"
  },
  "coordinates": {
    "lat": 40.4093,
    "lng": 49.8671
  },
  "bedrooms": 3,
  "bathrooms": 2,
  "builtUpArea": 150,
  "images": [
    { "url": "https://...", "altText": "Living room" }
  ],
  "status": "active", // active, sold, pending, rented
  "isFSBO": true,
  "isCorporate": false
}

Response: 201
{
  "success": true,
  "message": "Listing created successfully",
  "data": { ... }
}
```

### Get All Listings
```
GET /api/properties

Query Parameters:
- type: buy or rent
- category: residential or commercial
- status: active, sold, pending, rented
- city: Filter by city
- minPrice: Minimum price
- maxPrice: Maximum price
- bedrooms: Number of bedrooms
- sortBy: price, createdAt, views
- order: asc or desc
- page: Page number
- limit: Items per page

Response: 200
{
  "success": true,
  "count": 50,
  "data": [ ... ],
  "pagination": { ... }
}
```

### Get Single Listing
```
GET /api/properties/:id

Response: 200
{
  "success": true,
  "data": { ... }
}
```

### Update Listing (Owner or Admin)
```
PATCH /api/properties/:id
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "title": "Updated Title",
  "price": 260000,
  "status": "sold"
}

Response: 200
{
  "success": true,
  "message": "Listing updated successfully",
  "data": { ... }
}
```

### Delete Listing (Admin Only)
```
DELETE /api/properties/:id
Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "Listing deleted successfully"
}
```

---

## 🖼️ IMAGES

### Upload Image
```
POST /api/images
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body (FormData):
- image: File (required)
- type: listing, hero, background, profile, general (required)
- relatedId: ObjectId (optional - for listing or user reference)
- relatedModel: Property or User (optional)
- altText: Alt text for image (optional)
- title: Image title (optional)
- description: Image description (optional)
- heroCategory: buy_residential, buy_commercial, rent_longterm, rent_shortterm (optional)

Response: 201
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "_id": "...",
    "type": "listing",
    "url": "https://cloudinary.../image.jpg",
    "publicId": "...",
    "uploadedBy": "...",
    ...
  }
}
```

### Get All Images
```
GET /api/images
Authorization: Bearer {token}

Query Parameters:
- type: listing, hero, background, profile, general
- relatedId: Filter by related property/user ID
- heroCategory: buy_residential, buy_commercial, rent_longterm, rent_shortterm
- isActive: true or false

Response: 200
{
  "success": true,
  "count": 20,
  "data": [ ... ]
}
```

### Get Single Image
```
GET /api/images/:id

Response: 200
{
  "success": true,
  "data": { ... }
}
```

### Update Image Metadata
```
PATCH /api/images/:id
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "altText": "Updated alt text",
  "title": "New title",
  "heroCategory": "buy_residential"
}

Response: 200
{
  "success": true,
  "message": "Image updated successfully",
  "data": { ... }
}
```

### Delete Image
```
DELETE /api/images/:id
Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "Image deleted successfully"
}
```

### Bulk Delete Images (Admin Only)
```
POST /api/images/bulk-delete
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "imageIds": ["id1", "id2", "id3"]
}

Response: 200
{
  "success": true,
  "message": "3 images deleted successfully",
  "deletedCount": 3
}
```

---

## ⚙️ SETTINGS

### Get All Settings
```
GET /api/settings

Query Parameters:
- category: general, email, currency, images, hero, notifications, security
- key: Specific setting key

Response: 200
{
  "success": true,
  "count": 10,
  "data": [
    {
      "key": "defaultCurrency",
      "value": "$",
      "label": "Default Currency",
      "category": "currency",
      "isPublic": true
    },
    ...
  ]
}
```

### Get Single Setting
```
GET /api/settings/:key

Example: GET /api/settings/defaultCurrency

Response: 200
{
  "success": true,
  "data": {
    "key": "defaultCurrency",
    "value": "$",
    "label": "Default Currency",
    "category": "currency"
  }
}
```

### Update Setting (Admin Only)
```
PATCH /api/settings/:key
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "value": "€",
  "label": "Default Currency",
  "description": "Currency used throughout the site",
  "category": "currency",
  "isPublic": true
}

Response: 200
{
  "success": true,
  "message": "Setting updated successfully",
  "data": { ... }
}
```

### Bulk Update Settings (Admin Only)
```
POST /api/settings/bulk-update
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "settings": [
    { "key": "defaultCurrency", "value": "€" },
    { "key": "maxImageSize", "value": 10 },
    { "key": "siteName", "value": "My Real Estate" }
  ]
}

Response: 200
{
  "success": true,
  "message": "Bulk update completed",
  "data": {
    "updated": ["defaultCurrency", "maxImageSize"],
    "created": ["siteName"],
    "errors": []
  }
}
```

### Initialize Default Settings (Superadmin Only)
```
POST /api/settings/initialize
Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "Default settings initialized",
  "data": {
    "created": ["defaultCurrency", "siteName", ...],
    "skipped": []
  }
}
```

### Delete Setting (Superadmin Only)
```
DELETE /api/settings/:key
Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "Setting deleted successfully"
}
```

---

## 🛡️ ADMIN

### Get Admin Stats
```
GET /api/admin/stats
Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "totalListings": 320,
    "activeListings": 280,
    "soldListings": 30,
    "newUsers": 12,
    "newListings": 25,
    "usersByRole": [ ... ]
  }
}
```

### Get All Listings (Admin)
```
GET /api/admin/listings
Authorization: Bearer {token}

Query Parameters:
- search: Search term
- status: active, sold, pending, rented
- type: buy, rent
- category: residential, commercial
- sortBy: createdAt, price, views
- order: asc, desc

Response: 200
{
  "success": true,
  "count": 50,
  "data": [ ... ]
}
```

### Approve Listing
```
PUT /api/admin/properties/:id/approve
Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "Property approved successfully"
}
```

### Reject Listing
```
PUT /api/admin/properties/:id/reject
Authorization: Bearer {token}

Response: 200
{
  "success": true,
  "message": "Property rejected successfully"
}
```

### Bulk Approve Listings
```
POST /api/admin/properties/bulk-approve
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "propertyIds": ["id1", "id2", "id3"]
}

Response: 200
{
  "success": true,
  "message": "3 properties approved successfully"
}
```

### Bulk Delete Listings
```
POST /api/admin/properties/bulk-delete
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "propertyIds": ["id1", "id2", "id3"]
}

Response: 200
{
  "success": true,
  "message": "3 properties deleted successfully"
}
```

---

## 🔑 Authorization Levels

| Endpoint | Guest | Registered | Realtor | Corporate | Admin | Superadmin |
|----------|-------|------------|---------|-----------|-------|------------|
| POST /auth/register | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST /auth/login | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET /users | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| PATCH /users/:id | ❌ | Own | Own | Own | ✅ | ✅ |
| POST /properties | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| GET /properties | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PATCH /properties/:id | ❌ | Own | Own | Own | ✅ | ✅ |
| DELETE /properties/:id | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| POST /images | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| DELETE /images/:id | ❌ | Own | Own | Own | ✅ | ✅ |
| GET /settings | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PATCH /settings/:key | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| DELETE /settings/:key | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| GET /admin/* | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 📝 Database Schemas

### User Schema
```javascript
{
  name: String (required),
  lastName: String,
  email: String (required, unique),
  password: String (required, hashed),
  role: Enum ['guest', 'registered', 'realtor', 'corporate', 'admin', 'superadmin'],
  status: Enum ['active', 'inactive'],
  phone: String,
  avatar: String (URL),
  profileImage: String (URL),
  bio: String,
  verified: Boolean,
  licenseId: String,
  brokerage: String,
  companyName: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Property Schema
```javascript
{
  title: String (required),
  description: String,
  type: Enum ['buy', 'rent'],
  category: Enum ['residential', 'commercial'],
  subCategory: Enum ['long-term', 'short-term'], // for rent
  price: Number (required),
  currency: String,
  address: {
    street: String,
    city: String,
    province: String,
    postalCode: String,
    country: String
  },
  coordinates: { lat: Number, lng: Number },
  status: Enum ['active', 'sold', 'pending', 'rented'],
  images: [{ url: String, altText: String }],
  ownerId: ObjectId (ref: User, required),
  isFSBO: Boolean,
  isCorporate: Boolean,
  isApproved: Boolean,
  bedrooms: Number,
  bathrooms: Number,
  builtUpArea: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Image Schema
```javascript
{
  type: Enum ['listing', 'hero', 'background', 'profile', 'general'],
  relatedId: ObjectId (optional),
  relatedModel: Enum ['Property', 'User'],
  url: String (required),
  publicId: String (Cloudinary),
  altText: String,
  title: String,
  heroCategory: Enum ['buy_residential', 'buy_commercial', 'rent_longterm', 'rent_shortterm'],
  uploadedBy: ObjectId (ref: User, required),
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Settings Schema
```javascript
{
  key: String (required, unique),
  value: Mixed (required),
  label: String,
  description: String,
  category: Enum ['general', 'email', 'currency', 'images', 'hero', 'notifications', 'security'],
  valueType: Enum ['string', 'number', 'boolean', 'object', 'array'],
  isPublic: Boolean,
  isEditable: Boolean,
  lastUpdatedBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🧪 Testing with VS Code REST Client

Create a file named `api.rest` in your project root:

```http
### Register User
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "John",
  "email": "john@test.com",
  "password": "password123"
}

### Login
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "john@test.com",
  "password": "password123"
}

### Get All Properties
GET http://localhost:5000/api/properties

### Create Property
POST http://localhost:5000/api/properties
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "title": "Modern Apartment",
  "type": "buy",
  "category": "residential",
  "price": 150000,
  "location": "Baku"
}

### Get Settings
GET http://localhost:5000/api/settings

### Initialize Default Settings (Superadmin)
POST http://localhost:5000/api/settings/initialize
Authorization: Bearer SUPERADMIN_TOKEN_HERE
```

---

## 🚀 Quick Start

1. Ensure MongoDB is running
2. Create `.env` file with required variables
3. Start server: `npm run dev`
4. Initialize default settings (superadmin): `POST /api/settings/initialize`
5. Test endpoints using Postman or VS Code REST Client

---

## 📚 Additional Notes

- All protected routes require `Authorization: Bearer {token}` header
- Passwords are automatically hashed before storage
- Images are stored on Cloudinary
- Settings can be public or private
- Listings require admin approval if `requireApproval` setting is true
- Superadmin has full access to all resources
- Admin can manage users and listings but not superadmin users
- Users can only edit their own resources unless they are admin/superadmin

