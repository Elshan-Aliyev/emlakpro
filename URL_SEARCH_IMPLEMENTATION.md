# URL-Driven Search Implementation

## Overview
The search page now uses the URL as the single source of truth for all filters and map position. This enables:
- Shareable search URLs
- Browser back/forward navigation
- Bookmarkable searches
- Saved searches with full state restoration

## Features Implemented

### 1. URL-Based Filters
All filters are stored in URL parameters:
- `listingStatus` - for-sale or for-rent
- `purpose` - residential, commercial, agricultural
- `propertyType` - house, apartment, villa, etc.
- `bedrooms`, `bathrooms` - minimum bed/bath count
- `priceMin`, `priceMax` - price range
- `areaMin`, `areaMax` - area range in sqm
- `sortBy` - newest, price-low, price-high, etc.
- `view` - list or map view mode

### 2. Map Position Tracking
Map position is now tracked in URL:
- `lng` - longitude (4 decimal places)
- `lat` - latitude (4 decimal places)
- `zoom` - zoom level (2 decimal places)

**Implementation Details:**
- Map movements are debounced (1000ms) to avoid excessive URL updates
- URL updates use `replace: true` to avoid cluttering browser history
- Map position initializes from URL on page load
- Pan and zoom operations update URL automatically

**Files Modified:**
- `Search/index.js` - Added handleMapMove callback, updateMapPositionInURL function
- `PropertyMap.js` - Added onMapMove prop, calls callback on moveend event

### 3. Save Search Functionality
Users can save their current search with one click.

**Storage:**
- Saved to localStorage under key `savedSearches`
- Stores: search URL, property count, timestamp, auto-generated name
- Keeps last 10 searches (FIFO queue)

**UI:**
- "🔖 Save Search" button in listings-info header
- Available in both list and map view modes
- Styled with hover effects and responsive sizing

**Usage:**
```javascript
const savedSearches = JSON.parse(localStorage.getItem('savedSearches') || '[]');
// Each search object:
{
  id: 1234567890,
  name: "Search - 42 properties",
  url: "http://localhost:3000/search?lng=49.8671&lat=40.4093&...",
  timestamp: "2025-01-15T10:30:00.000Z",
  propertyCount: 42
}
```

## Technical Architecture

### URL State Flow
```
User Action → Update URL Params → useEffect Detects Change → Update Component State → Render Update
```

### Map Position Flow
```
User Pans/Zooms Map → moveend Event → onMapMove Callback → handleMapMove (debounced) → updateMapPositionInURL → URL Updated
```

### Filter State Flow
```
FilterBar Change → Update URL → Search Page Reads URL → Filters Properties → Updates Map Pins
```

## Files Modified

### Search/index.js (545 lines)
- Lines 24-27: Initialize mapCenter and mapZoom from URL params
- Lines 54-64: useEffect to sync map state from URL
- Lines 66-72: updateMapPositionInURL function (debounced URL update)
- Lines 320-340: saveSearch function (localStorage)
- Lines 352-360: handleMapMove callback (map movement handler)
- Lines 381-386, 450-455: Save search buttons in UI
- Line 525: onMapMove prop passed to PropertyMap

### PropertyMap.js (902 lines)
- Line 18: onMapMove prop parameter added
- Lines 145-150: moveend event calls onMapMove callback

### Search.css (496 lines)
- Lines 196-224: .save-search-btn styles (button, hover, active states)
- Lines 472-475: Mobile responsive save button styling

## Testing Checklist

- [ ] Change filters → URL updates
- [ ] Pan map → lng/lat in URL updates (after 1s)
- [ ] Zoom map → zoom in URL updates (after 1s)
- [ ] Copy/paste URL → filters and map position restore
- [ ] Browser back/forward → state changes correctly
- [ ] Click save search → localStorage entry created
- [ ] Save 11+ searches → oldest removed (10 max)
- [ ] Mobile view → save button visible and functional

## Next Steps (Optional)

1. **Saved Searches UI**
   - Create AccountSavedSearches page
   - Display saved searches with name, date, property count
   - Add "Load" and "Delete" actions
   - Consider moving to database for cross-device sync

2. **Enhanced Save**
   - Allow custom search names
   - Add search notes/description
   - Email saved search alerts when new properties match

3. **Analytics**
   - Track popular searches
   - Suggest searches based on history
   - Auto-save recent searches

## API Endpoints (Future)
If moving saved searches to database:
- `POST /api/users/saved-searches` - Create saved search
- `GET /api/users/saved-searches` - Get user's saved searches
- `DELETE /api/users/saved-searches/:id` - Delete saved search
- `PUT /api/users/saved-searches/:id` - Update search name/notes

## Example URLs

**Basic search:**
```
/search?listingStatus=for-sale&propertyType=apartment&priceMin=100000&priceMax=500000
```

**With location:**
```
/search?lng=49.8671&lat=40.4093&zoom=12.00&listingStatus=for-rent
```

**Full search:**
```
/search?listingStatus=for-sale&purpose=residential&propertyType=house&bedrooms=3&bathrooms=2&priceMin=200000&priceMax=800000&lng=49.8671&lat=40.4093&zoom=12.00&view=map&sortBy=price-low
```
