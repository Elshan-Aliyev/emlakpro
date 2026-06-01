# System Audit — Real Estate App
**Date:** 2026-04-25  
**Scope:** Architecture, state management, data flow  
**Status:** Read-only audit. No changes made.

---

# 1. Project Structure

```
realestate-app/
├── client/                          # React SPA (Create React App)
│   ├── public/
│   └── src/
│       ├── App.js                   # Route definitions (React Router v6)
│       ├── index.js                 # Entry point, wraps with AuthProvider + ThemeProvider
│       ├── components/
│       │   ├── FilterBar.js         # ★ All inline filter controls (URL state)
│       │   ├── FilterModal.js       # ★ Extended filter modal (read-only, callback-driven)
│       │   ├── PropertyMap.js       # ★ Mapbox GL JS map with Supercluster clustering
│       │   ├── Navbar.js            # Top navigation, Buy/Rent theme switch
│       │   ├── Card.js              # Property card component
│       │   ├── AddressAutocomplete.js # Nominatim address input
│       │   ├── FavoriteButton.js    # Save/unsave toggle
│       │   ├── PropertyModal.js     # Quick-view modal from map pin click
│       │   ├── Badge.js             # Listing type badge
│       │   ├── Modal.js             # Generic modal wrapper
│       │   └── ProtectedRoute.js    # Auth guard
│       ├── context/
│       │   ├── AuthContext.js       # ★ JWT auth state (global)
│       │   └── ThemeContext.js      # ★ Buy/Rent theme switcher (overrides CSS vars)
│       ├── layouts/
│       │   ├── MainLayout.js        # Navbar + Footer wrapper
│       │   └── Footer.js
│       ├── pages/
│       │   ├── Search/
│       │   │   └── index.js         # ★ Main search/results page
│       │   ├── HomeNew.js           # ★ Homepage with hero search form
│       │   ├── PropertyDetail.js    # Single listing detail view
│       │   ├── CreateProperty.js    # Full property creation form
│       │   ├── CreatePropertySimple.js  # Simplified creation form
│       │   ├── UpdateProperty.js    # Property edit form
│       │   ├── AccountDashboard.js  # User dashboard hub
│       │   ├── AccountListings.js   # User's own listings
│       │   ├── AccountSaved.js      # User's saved properties
│       │   ├── AccountSettings.js   # Profile/password settings
│       │   ├── AdminDashboard.js    # Admin overview
│       │   ├── AdminListings.js     # Admin listing management
│       │   ├── AdminUsers.js        # Admin user management
│       │   ├── AdminSettings.js     # Admin site settings
│       │   └── [15 other static/service pages]
│       ├── services/
│       │   ├── api.js               # ★ Axios wrapper — all HTTP calls
│       │   └── geocoding.js         # ★ Nominatim geocoding (forward/reverse/autocomplete)
│       ├── styles/
│       │   └── globals.css          # ★ Design system CSS variables
│       └── utils/
│           └── imageUtils.js
│
└── server/                          # Node.js / Express API
    ├── server.js                    # ★ Express app, route mounting, port config
    ├── config/
    │   ├── db.js                    # MongoDB connection (Mongoose)
    │   ├── supabase.js              # Supabase Storage client + multer config
    │   └── cloudinary.js            # Legacy — no longer imported
    ├── controllers/
    │   ├── propertyController.js    # ★ CRUD + search filtering + image management
    │   ├── authController.js        # Register, login, JWT issue
    │   ├── userController.js        # User profile, saved properties, searches
    │   ├── imageController.js       # Image metadata CRUD
    │   ├── messageController.js     # Messaging system
    │   ├── articleController.js     # Blog/resource articles
    │   ├── reviewController.js      # Realtor reviews
    │   ├── settingsController.js    # Site-wide settings
    │   └── verificationController.js # Seller/realtor verification
    ├── middleware/
    │   ├── authMiddleware.js        # JWT Bearer token verification
    │   ├── roleMiddleware.js        # Role-based access control
    │   └── imageMiddleware.js       # Multer file upload config
    ├── models/
    │   ├── Property.js              # ★ ~70-field Mongoose schema
    │   ├── User.js                  # User schema with roles, saved items
    │   ├── Message.js
    │   ├── Article.js
    │   ├── Review.js
    │   ├── Image.js
    │   └── Settings.js
    └── routes/
        ├── propertyRoutes.js        # ★ /api/properties/*
        ├── authRoutes.js            # /api/auth/*
        ├── userRoutes.js            # /api/users/*
        ├── adminRoutes.js           # /api/admin/*
        ├── imageRoutes.js           # /api/images/*
        ├── messageRoutes.js         # /api/messages/*
        ├── articleRoutes.js         # /api/articles/*
        ├── settingsRoutes.js        # /api/settings/*
        ├── reviewRoutes.js          # /api/reviews/*
        └── verificationRoutes.js    # /api/verification/*
```

---

# 2. Filter System

## Where Filter State Is Stored

**Single source of truth: URL search params (`useSearchParams` from React Router).**

Every filter value in `FilterBar.js` is read directly from `searchParams.get(key)`. There is no `useState` for any filter field. Writes go through `setSearchParams()` with `{ replace: true }`.

`FilterModal.js` is a **controlled, stateless component**. It receives `filters` as a prop (derived from URL) and calls `onFilterChange` callbacks. It holds no internal state.

## Complete Filter Field Inventory

| URL Param      | Type    | FilterBar Control           | Server Field           | Notes |
|----------------|---------|------------------------------|------------------------|-------|
| `listingStatus`| string  | Navbar toggle / FilterModal  | `listingStatus`        | for-sale, for-rent, new-project |
| `purpose`      | string  | select (conditional)         | `purpose`              | residential, commercial |
| `rentalTerm`   | string  | select (conditional)         | `subCategory`          | long-term, short-term |
| `propertyType` | string  | select                       | `propertyType`         | 30+ values |
| `bedrooms`     | string  | select (1–5)                 | `bedrooms $gte`        | |
| `bathrooms`    | string  | select (1–4)                 | `bathrooms $gte`       | |
| `priceMin`     | string  | select (preset values)       | `price.$gte`           | |
| `priceMax`     | string  | select (preset values)       | `price.$lte`           | |
| `areaMin`      | string  | FilterModal only             | `builtUpArea.$gte`     | |
| `areaMax`      | string  | FilterModal only             | `builtUpArea.$lte`     | |
| `parking`      | boolean | FilterModal checkbox         | `parkingSpaces.$gt:0`  | |
| `balcony`      | boolean | FilterModal checkbox         | `balconies.$gt:0`      | |
| `elevator`     | boolean | FilterModal checkbox         | `elevator:true`        | |
| `gym`          | boolean | FilterModal checkbox         | `gym:true`             | |
| `pool`         | boolean | FilterModal checkbox         | `$or:[swimmingPool,sharedPool]` | uses `$and` |
| `security`     | boolean | FilterModal checkbox         | `security:true`        | |
| `yearBuiltMin` | string  | FilterModal only             | `yearBuilt.$gte`       | |
| `yearBuiltMax` | string  | FilterModal only             | `yearBuilt.$lte`       | |
| `stories`      | string  | FilterModal only             | `totalFloorsInBuilding`| |
| `parkingSpots` | string  | FilterModal only             | `parkingSpaces`        | |
| `viewType`     | string  | FilterModal only             | `viewType`             | |
| `listedSince`  | string  | FilterModal only             | `createdAt.$gte`       | days back |
| `keywords`     | string  | FilterModal only             | `$or:[title,description,location,city]` | |
| `sortBy`       | string  | FilterBar select             | sort object            | **MISMATCH — see Issues** |
| `showSold`     | boolean | FilterModal checkbox         | `status:$ne:sold`      | |
| `city`         | string  | (set by homepage navigation) | `city:RegExp`          | |
| `view`         | string  | view-toggle buttons          | (UI only, skipped)     | map \| list |
| `lng`          | string  | written by map moveend       | (UI only, skipped)     | |
| `lat`          | string  | written by map moveend       | (UI only, skipped)     | |
| `zoom`         | string  | written by map moveend       | (UI only, skipped)     | |
| `ownerId`      | string  | (set by account pages)       | `ownerId`              | |

## Filter Flow

### Homepage → Search Page

`HomeNew.js` maintains **its own local useState** for all search form fields:

```
searchQuery, priceMin, priceMax, bedrooms, bathrooms,
buildingSize, maxGuests, propertyType, areaMin, startDate, endDate
```

On submit (`handleSearch`), it builds a `URLSearchParams` object and calls `navigate('/search?' + params)`.

**Params sent from HomeNew.js that the server does NOT recognize:**
- `q` (freetext query — server only handles `city`)
- `country` (not a server filter field)
- `buildingSize` (not a server filter field)
- `maxGuests` (not a server filter field)
- `startDate` / `endDate` (not server filter fields)
- `type` (legacy field — server uses `listingStatus`)

These params arrive in the URL, are passed to the server as query params, and are silently ignored.

### Page Load

`Search/index.js` runs a debounced `useEffect([searchParams])`:
1. Reads all URL params
2. Skips `view`, `lng`, `lat`, `zoom`
3. Sends all remaining params to `GET /api/properties`
4. Sets `filteredProperties` state from response

Initial map center/zoom are read **once** via `useRef` at mount — they are never re-read from URL after mount.

### Filter Change

1. User changes a control in `FilterBar`
2. `setParam()` or `setParams()` updates `searchParams` with `{ replace: true }` (no new history entry)
3. `searchParams` change triggers the debounced fetch effect (300ms delay)
4. Fetch fires → `setFilteredProperties` → React re-renders list
5. PropertyMap receives new `properties` prop → `useEffect([properties, ...])` runs → clears markers, re-clusters, fits bounds

### Clear Filters

`handleClearFilters` creates a new URLSearchParams preserving only `listingStatus`, `view`, `lng`, `lat`, `zoom`.

---

# 3. Routing & URL State

## Router

React Router v6. `<BrowserRouter>` wraps the app in `index.js`. All routes defined in `App.js` via `<Routes>/<Route>`.

## Search Routes

Three overlapping routes for the Search page:
```
/search
/search/:location
/search/:location/:propertyId
```

The `:location` path segment is read via `useParams()` in `Search/index.js` as `routeLocation`, used only to build a `defaultLocation` variable for card click navigation. It is NOT used as a filter. All filtering is driven by URL query params, not path segments.

## URL Param Parsing

All filter state is read via `useSearchParams()` from React Router. No manual `URLSearchParams` parsing. Both `FilterBar.js` and `Search/index.js` call `useSearchParams()` independently — they share the same underlying URL state (React Router ensures one instance).

## URL Param Updates

All writes use `setSearchParams(fn, { replace: true })`. This modifies the current history entry without pushing a new one. The exception is `handleMapMove`, which also uses `replace: true` so map panning does not pollute browser history.

---

# 4. Map System

## Library

**Mapbox GL JS** (`mapbox-gl` npm package)  
**Clustering:** `supercluster` npm package  
Token: `process.env.REACT_APP_MAPBOX_TOKEN`  
Style: `mapbox://styles/mapbox/streets-v12`

## Map Initialization

The map is created once in a `useEffect([], [])` (empty dep array). `map.current` is a `useRef`. It is never recreated. `mapLoaded` state is set to `true` on the Mapbox `load` event.

## Marker Generation

Markers are generated by `updateMarkers()`, called:
1. After property data is loaded into `clusterIndex.current` (on every `properties` prop change)
2. After `moveend` event (100ms debounce)
3. After `zoomend` event

Markers are DOM elements created imperatively, not React components. Each marker's HTML uses hardcoded inline color values (`#667eea`, `#2563eb`, `#ef4444`) — these bypass the CSS variable system entirely.

## Clustering Logic

Properties with coordinates are grouped by exact lat/lng (4 decimal places = ~11m tolerance) before being passed to Supercluster. Same-location properties form "grouped building" markers (orange `#ff6b00`). Supercluster handles zoom-level clustering separately (blue `#2563eb` cluster circles).

**Double `updateMarkers()` bug:** Lines 1003 and 1006 both call `updateMarkers()` back-to-back. This causes every marker to be created and immediately re-created on every property change.

## Map Update Triggers

| Trigger | Result |
|---------|--------|
| `properties` prop change | Clears all markers, re-clusters, fits bounds to new results |
| Map `moveend` | Re-runs `updateMarkers()` (re-clusters at new viewport bounds) |
| Map `zoomend` | Re-runs `updateMarkers()` (re-clusters at new zoom level) |
| `flyTo` prop change | `map.current.flyTo()` — programmatic navigation only |

## Map Center/Zoom Control

**Initial center:** Read from URL `lng`/`lat` params once at mount via `useRef`. If not present: `[49.8671, 40.4093]` (Baku). Never updated after mount.

**Initial zoom:** Read from URL `zoom` once at mount. Default: 12. Never updated after mount.

**Programmatic navigation (`flyTo` prop):** Set by:
- `geocodeAddress(city)` result when city URL param changes without explicit lng/lat
- `handleLocationSelect` when user picks an address from autocomplete

**Bounds fitting:** When `filteredProperties` changes, `fitBounds` runs on all properties with coordinates. This happens on every filter change.

**User pan/zoom → URL:** `handleMapMove` writes `lng`/`lat`/`zoom` to URL after a 1000ms debounce. Since `initialCenter`/`initialZoom` are refs (not state), these URL writes do NOT trigger map re-initialization.

---

# 5. Listings Data Flow

## Frontend Request

```
getProperties(params) → GET http://localhost:5001/api/properties?{all URL filter params}
```

Function: `api.js:55`  
Axios instance base URL: `http://localhost:5001/api`  
No auth header required for listing search.

All URL params except `view`, `lng`, `lat`, `zoom` are forwarded as query params.

## Backend

**Route:** `GET /api/properties` → `propertyController.getProperties`

No authentication required. No rate limiting. No pagination.

## Filtering Logic Location

Entirely server-side in `propertyController.js:getProperties`. The query object is built from `req.query` directly:

```
1. Exact matches: ownerId, listingStatus, purpose, propertyType, viewType
2. subCategory ← rentalTerm param (field name mismatch)
3. city: RegExp(q.city, 'i')
4. status: excludes 'sold' unless showSold=true
5. Numeric ranges: price, bedrooms, bathrooms, builtUpArea, yearBuilt, totalFloorsInBuilding, parkingSpaces, createdAt
6. Boolean amenities: parkingSpaces.$gt:0, balconies.$gt:0, elevator, gym, security
7. $and array: pool ($or: swimmingPool/sharedPool), keywords ($or: title/description/location/city)
8. Sort: createdAt:-1 default, or price/bedrooms/builtUpArea
```

## Database

**MongoDB** via Mongoose.  
Connection URI: `process.env.MONGO_URI || 'mongodb://localhost:27017/temsilcim_app'`  
ORM: Mongoose 7.x

No indexes are declared in the Property schema for any query field. The query fields `listingStatus`, `price`, `city`, `status`, `createdAt`, `bedrooms`, `purpose`, `propertyType` are unindexed.

`Property.find(query).sort(sort).populate('ownerId', '...')` — full collection scan + population join on every request.

## Response Shape

An array of Property documents. Each document includes all ~70 schema fields plus populated `ownerId`:

```json
[
  {
    "_id": "...",
    "title": "string",
    "description": "string",
    "propertyType": "apartment",
    "listingStatus": "for-sale",
    "status": "active",
    "purpose": "residential",
    "subCategory": null,
    "location": "string",
    "city": "string",
    "coordinates": { "lat": number, "lng": number, "latitude": number, "longitude": number },
    "price": number,
    "currency": "AZN",
    "bedrooms": number,
    "bathrooms": number,
    "builtUpArea": number,
    "parkingSpaces": number,
    "balconies": number,
    "elevator": boolean,
    "gym": boolean,
    "security": boolean,
    "swimmingPool": boolean,
    "sharedPool": boolean,
    "viewType": "string",
    "images": [{ "thumbnail": "url", "medium": "url", "large": "url", "full": "url", "publicId": "path" }],
    "listingBadge": "for-sale-by-owner",
    "isSponsored": boolean,
    "views": number,
    "createdAt": "ISO date",
    "ownerId": {
      "_id": "...",
      "name": "string",
      "lastName": "string",
      "email": "string",
      "phone": "string",
      "avatar": "url",
      "role": "string",
      "accountType": "string",
      "verified": boolean,
      "licenseId": "string",
      "totalListings": number
    }
  }
]
```

## Response Wrapping

`api.js` returns the full axios response. Callers use `res.data` to get the array. In `Search/index.js`: `setFilteredProperties(res.data || [])`.

---

# 6. State Management

## useState

| Component | State Variable | What It Controls |
|-----------|---------------|------------------|
| `Search/index.js` | `filteredProperties` | Current visible listing array |
| `Search/index.js` | `savedPropertyIds` | Set of saved property IDs for the current user |
| `Search/index.js` | `loading` | Loading spinner visibility |
| `Search/index.js` | `mapHidden` | Whether map panel is collapsed (mobile) |
| `Search/index.js` | `hoveredPropertyId` | Highlighted card/marker sync |
| `Search/index.js` | `selectedProperty` | Property shown in PropertyModal |
| `Search/index.js` | `flyToTarget` | Programmatic map navigation target |
| `FilterBar.js` | `showFilterModal` | FilterModal open/close |
| `FilterBar.js` | `isExpanded` | Mobile filter bar collapse |
| `PropertyMap.js` | `mapLoaded` | Whether Mapbox `load` event fired |
| `HomeNew.js` | `mode` | buy \| rent |
| `HomeNew.js` | `rentalType` | long \| short |
| `HomeNew.js` | `searchQuery` | Hero search text input |
| `HomeNew.js` | `priceMin/Max` | Hero price inputs |
| `HomeNew.js` | `bedrooms/bathrooms` | Hero bedroom/bath selects |
| `HomeNew.js` | `propertyType` | Hero property type select |
| `HomeNew.js` | `buildingSize` | Hero area input |
| `HomeNew.js` | `maxGuests` | Short-term guest count |
| `HomeNew.js` | `areaMin` | Hero area minimum |
| `HomeNew.js` | `startDate/endDate` | Short-term date range |
| `HomeNew.js` | `properties` | All properties fetched for homepage display |
| `HomeNew.js` | `savedPropertyIds` | Saved property IDs (duplicate of Search page) |
| `HomeNew.js` | `imageIndices` | Current image index per card (slider state) |
| `HomeNew.js` | `viewMode` | grid \| map |

## useRef

| Component | Ref | Purpose |
|-----------|-----|---------|
| `Search/index.js` | `initialCenter` | Map starting lng/lat (read once from URL, never updated) |
| `Search/index.js` | `initialZoom` | Map starting zoom (read once from URL, never updated) |
| `Search/index.js` | `prevCityRef` | Tracks previous city to prevent duplicate geocode calls |
| `Search/index.js` | `mapMoveTimeoutRef` | Debounce timeout handle for map move → URL write |
| `PropertyMap.js` | `mapContainer` | DOM ref for Mapbox mount |
| `PropertyMap.js` | `map` | Mapbox GL JS Map instance |
| `PropertyMap.js` | `markers` | Array of active Mapbox Marker objects |
| `PropertyMap.js` | `clusterIndex` | Supercluster index instance |
| `PropertyMap.js` | `pinnedPopupRef` | Currently pinned (click-locked) popup |
| `PropertyMap.js` | `activePopupRef` | Currently hover-visible popup |
| `PropertyMap.js` | `allPropertiesRef` | Full properties array for grouped-pin lookup |

## useContext

| Context | Provider Location | Consumers |
|---------|------------------|-----------|
| `AuthContext` | `index.js` (wraps entire app) | `HomeNew.js`, `Navbar.js`, `ProtectedRoute.js`, account pages, admin pages |
| `ThemeContext` | `index.js` (wraps entire app) | `HomeNew.js`, `Navbar.js`, `MainLayout.js` |

### AuthContext Internals

- `user` object (from `GET /api/auth/me`)
- `token` (from `localStorage`)
- `loading` boolean
- Methods: `login`, `register`, `logout`, `updateUser`, `hasRole`, `isAdmin`, `isSuperAdmin`
- On mount: reads `localStorage.token`, decodes JWT (expiry check), fetches full user from `/api/auth/me`

### ThemeContext Internals

- `currentTheme` object (buy or rent theme — full color/font/style config)
- `propertyCategory` ('residential' | 'commercial')
- `switchTheme(name)` — updates state AND calls `applyThemeToDocument()` which writes inline CSS vars to `document.documentElement`

---

# 7. Known Issues

## Issue 1: ThemeContext Overrides Globals.css Design Tokens at Runtime

**Root cause:** `ThemeContext.applyThemeToDocument()` calls `root.style.setProperty(...)` for CSS variables including `--theme-border-radius`, `--theme-card-border-radius`, `--theme-button-shadow`, and color vars. These inline style writes take precedence over `globals.css`.

**Specific override values:**
- `buyTheme.styles.borderRadius = '8px'` — acceptable
- `buyTheme.styles.cardBorderRadius = '12px'` — **CONTRADICTS 8px max**
- `rentTheme.styles.borderRadius = '12px'` — **CONTRADICTS 8px max**
- `rentTheme.styles.cardBorderRadius = '16px'` — **CONTRADICTS 8px max**
- `buyTheme.colors.primary = '#1D4ED8'` (blue) — **CONTRADICTS red design system**
- `rentTheme.fonts.primary = "'Poppins', sans-serif"` — **CONTRADICTS Inter-only rule**
- `buyTheme.styles.buttonShadow = '0 2px 4px rgba(29,78,216,0.2)'` — **CONTRADICTS no-shadow rule**

Every time the user clicks the Buy/Rent toggle in the Navbar, `applyThemeToDocument` runs and partially reverts the CSS design system.

## Issue 2: PropertyMap.js — Hardcoded Colors in Popup Inline HTML

**Root cause:** All popup HTML is generated as template literal strings using hardcoded color values. CSS variables do not apply to inline `style=""` strings.

**Specific hardcoded values in JS:**
- `#667eea` (purple) — used for price text in popups
- `#2563eb` (blue) — used for cluster marker border/color
- `rgba(37, 99, 235, 0.4)` — cluster shadow
- `rgba(102, 126, 234, 0.4/0.6)` — cluster hover shadow
- `#ef4444` (red badge on grouped pins)

These never change when the design system changes.

## Issue 3: API Port Mismatch

**Root cause:**
- `api.js` has `baseURL: 'http://localhost:5001/api'`
- `server.js` uses `process.env.PORT || 5000`

Unless `PORT=5001` is set in the server's `.env`, all API calls from the frontend fail with a connection refused error. The default server port (5000) and the client's hardcoded API URL (5001) do not match.

## Issue 4: Double `updateMarkers()` Call

**Location:** `PropertyMap.js` lines 1003 and 1006  
**Root cause:** Both lines call `updateMarkers()` back-to-back with no condition between them. Every time `properties` changes, all markers are created twice, doubling DOM element creation.

## Issue 5: `sortBy` Value Mismatch Between FilterBar and FilterModal

**Root cause:** FilterBar's sort select uses values `price-low` / `price-high`. FilterModal's sort select uses values `price-asc` / `price-desc` / `area-asc` / `area-desc`. The server controller checks for `price-low` / `price-high` / `beds` / `area`. When sorting from FilterModal using `price-asc`, `price-desc`, or `area-asc`/`area-desc`, the server falls through to the default sort (`createdAt: -1`) because none of those strings match any branch.

## Issue 6: Homepage Search Params Ignored by Server

**Root cause:** `HomeNew.js` builds and sends the following params that have no corresponding server handler:
- `q` — the homepage's freetext search field. Server only handles `city`. If user types "Baku apartment near metro", that string is sent as `q`, ignored by the server, and the search returns all active properties.
- `country` — sent as fallback when no search query. Server ignores it.
- `buildingSize`, `maxGuests`, `startDate`, `endDate`, `type` — all ignored by server.

## Issue 7: No Pagination — Full Collection Returned on Every Request

**Root cause:** `Property.find(query).sort(sort).populate(...)` has no `.limit()` or `.skip()`. Every search returns all matching documents. As the database grows, this returns unbounded payloads — a collection of 10,000 listings returns all 10,000 on every keystroke (after the 300ms debounce).

## Issue 8: View Count Incremented on Every `getProperty` Call

**Root cause:** `propertyController.getProperty` (the single-property GET endpoint) increments `views` and `viewsCount` every time it is called. There is also a separate `incrementViews` endpoint (`POST /properties/:id/view`). The frontend calls both: `PropertyDetail.js` calls `getProperty` (which auto-increments) and then calls `incrementPropertyViews` separately. Every property detail page load increments views twice.

## Issue 9: `parkingSpots` and `parking` Filter Conflict

**Root cause:** In `getProperties`, when `q.parking === 'true'`, it sets `query.parkingSpaces = { $gt: 0 }`. Later in the same function, when `q.parkingSpots` is set (e.g., `'2'`), it overwrites with `query.parkingSpaces = 2` (exact match). If both params are active simultaneously, the last assignment wins and the amenity boolean filter is silently discarded.

## Issue 10: `rentalTerm` → `subCategory` Field Name Mismatch in URL Parameter Name

**Root cause:** The URL param is named `rentalTerm`, but the server maps it to the `subCategory` model field (`query.subCategory = q.rentalTerm`). This works correctly, but the naming inconsistency makes the mapping non-obvious. The filter field says `rentalTerm`, the model says `subCategory`. If a developer tries to filter by `subCategory` directly from the URL, it won't work.

## Issue 11: `singleProperty` Re-center Condition Bug

**Location:** `PropertyMap.js` line 932  
**Root cause:** When rendering in `singleProperty` mode (PropertyDetail page), the map only flies to the property's location if `map.current.getZoom() === zoom`. `zoom` is the prop value passed in at render time. If the user has manually zoomed the map, `map.current.getZoom()` will differ from `zoom`, and the re-center will not fire even when a new property is loaded.

## Issue 12: Duplicate `savedProperties` and `favoriteListings` in User Model

**Root cause:** `User.js` has both `savedProperties` and `favoriteListings` arrays. `toggleSaveProperty` pushes/splices both arrays simultaneously on every save/unsave operation. They are always kept in sync manually. One of them is redundant, and any code path that only updates one will silently desync them.

## Issue 13: `homeNew.js` Makes a `getProperties()` Call with No Params

**Root cause:** Line 108: `const res = await getProperties()` — no params. This fetches all active, non-sold properties from the database on every homepage load, with no filtering, no pagination, no limit. The response is then filtered client-side with `.slice(0, 8)` to show the newest 8. The server returns the entire collection to extract 8 items.

---

# 8. API Structure

## Properties

| Method | Endpoint | Auth | Params / Body | Response |
|--------|----------|------|---------------|----------|
| GET | `/api/properties` | None | Query: all filter params (see §2) | Property[] |
| POST | `/api/properties` | Bearer | Body: property fields | Property |
| GET | `/api/properties/:id` | None | — | Property (also increments views) |
| PUT | `/api/properties/:id` | Bearer | Body: property fields | Property |
| DELETE | `/api/properties/:id` | Bearer | — | `{message}` |
| POST | `/api/properties/upload-images` | Bearer | multipart: images[] (max 20, 10MB each) | `{images: [{thumbnail,medium,large,full,publicId}]}` |
| POST | `/api/properties/:id/images` | Bearer | multipart: images[] | `{property, newImages}` |
| DELETE | `/api/properties/:id/images/:imageUrl` | Bearer | — | `{property}` |
| POST | `/api/properties/:id/save` | Bearer | — | `{message, saved: bool}` |
| GET | `/api/properties/saved/my-properties` | Bearer | — | Property[] |
| POST | `/api/properties/:id/view` | None | — | `{views, dailyViewsCount}` |
| POST | `/api/properties/:id/share` | None | — | `{sharesCount}` |

## Auth

| Method | Endpoint | Auth | Body | Response |
|--------|----------|------|------|----------|
| POST | `/api/auth/register` | None | `{name, email, password}` | `{token, user}` |
| POST | `/api/auth/login` | None | `{email, password}` | `{token, user}` |
| GET | `/api/auth/me` | Bearer | — | User |
| PUT | `/api/auth/me` | Bearer | User fields | User |
| PUT | `/api/auth/change-password` | Bearer | `{currentPassword, newPassword}` | `{message}` |

## Users

| Method | Endpoint | Auth | Params / Body | Response |
|--------|----------|------|---------------|----------|
| GET | `/api/users` | Bearer (admin) | — | User[] |
| GET | `/api/users/:id` | None | — | User |
| PUT | `/api/users/:id` | Bearer | User fields | User |
| DELETE | `/api/users/:id` | Bearer (admin) | — | `{message}` |
| POST | `/api/users/save-property` | Bearer | `{propertyId}` | `{message}` |
| DELETE | `/api/users/unsave-property/:id` | Bearer | — | `{message}` |
| GET | `/api/users/saved-properties` | Bearer | — | Property[] |
| GET | `/api/users/realtors` | None | Query params | User[] |

## Admin

| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/api/admin/stats` | Bearer (admin) | Dashboard stats |
| GET | `/api/admin/listings` | Bearer (admin) | All listings |
| PUT | `/api/admin/properties/:id/approve` | Bearer (admin) | Approve listing |
| POST | `/api/admin/properties/bulk-delete` | Bearer (admin) | `{ids[]}` |
| POST | `/api/admin/properties/bulk-approve` | Bearer (admin) | `{ids[]}` |

---

# 9. Performance Risks

## No Pagination on Property Search

`Property.find(query).sort(sort).populate(...)` returns every matching document. No `.limit()`, no `.skip()`, no cursor. A query matching 5,000 properties returns 5,000 full documents with populated owner objects. This is the highest severity performance risk. Every filter interaction (after 300ms debounce) fires this unbounded query.

## No Database Indexes

The Property schema declares no indexes. The following fields are queried on every search but have no index:
- `listingStatus` (every query)
- `status` (every query — `$ne: 'sold'`)
- `price` (range queries)
- `city` (regex query — regex queries cannot use B-tree indexes efficiently anyway)
- `createdAt` (range + sort)
- `bedrooms`, `bathrooms`, `builtUpArea` (range queries)
- `purpose`, `propertyType` (equality queries)

Without indexes, every query performs a full collection scan.

## `city` Filter Uses a Regex

`query.city = new RegExp(q.city, 'i')` — case-insensitive regex cannot use a standard B-tree index. Even if an index on `city` were added, a leading-wildcard regex pattern would not use it. This means every city filter results in a full collection scan of the `city` field.

## Double `updateMarkers()` Call

PropertyMap.js calls `updateMarkers()` twice consecutively every time `properties` changes. Each call clears and re-creates all DOM marker elements. With 100 properties visible, this creates 200 DOM elements instead of 100 on every filter change.

## Homepage Fetches All Properties

`HomeNew.js` calls `getProperties()` with no parameters on mount, receiving all properties in the database. Only 8 are displayed. The rest are held in the `properties` state array and the populated `ownerId` objects are kept in memory until the component unmounts.

## `getSavedProperties` Called Independently in Both HomeNew and Search

Both `HomeNew.js` and `Search/index.js` call `getSavedProperties(token)` independently on mount. If both pages are part of the same session flow, this fires two identical API requests with no shared cache.

## No Request Cancellation on Rapid Navigation

The debounced fetch in `Search/index.js` uses a `cancelled` flag to prevent state updates on stale requests. However, if the user navigates away from the search page before the 300ms debounce fires, the timeout is cleared by the cleanup function. This is handled correctly.

## Large `ownerId` Population on Every Request

Every property search populates the owner with 14 fields:
```
'name lastName email phone avatar role verified licenseId brokerage companyName companyLogo totalListings totalViews accountType'
```
This is a JOIN equivalent for every document in the result set. With no indexes on User, this is N additional lookups where N is the number of distinct owners in the result.

## Supercluster Rebuilt on Every Property Change

`clusterIndex.current = new Supercluster(...)` and `clusterIndex.current.load(points)` run inside the `useEffect([properties, ...])` block. The entire spatial index is rebuilt from scratch on every filter change. For 1,000 properties, this is relatively fast, but it happens synchronously on the main thread.

## `PropertyMap.js` Popup HTML Generated as Raw Template Strings

All popup HTML content is generated via `innerHTML = \`...\`` with direct data interpolation. There is no sanitization of `property.title`, `property.price`, etc. If any property field contains HTML characters (`<`, `>`, `"`, `&`), this could cause rendering artifacts. If property data is ever user-controlled and not sanitized server-side, this is an XSS vector.

## Token Stored in `localStorage`

`localStorage.getItem('token')` is used across many components directly (not just via AuthContext). JWTs in localStorage are accessible to any JavaScript on the page, which is the standard XSS risk. There is no HttpOnly cookie alternative in place.

## `updateProperty` Passes `req.body` Directly to `findByIdAndUpdate`

```js
await Property.findByIdAndUpdate(req.params.id, req.body, { new: true })
```

No field whitelist. Any field in the Property schema can be overwritten by a property owner, including `ownerId`, `isApproved`, `isSponsored`, `listingBadge`. A malicious owner could approve their own listing or mark it as sponsored by sending those fields in the update body.
