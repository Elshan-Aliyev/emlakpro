# Assets Organization Guide

## Directory Structure

```
client/public/assets/
├── icons/          - Custom PNG/SVG icons for services, features, etc.
├── images/         - Background images, hero images, banners
├── ads/            - Advertisement images and promotional graphics
└── logo/           - Company logos and branding materials
```

## How to Use Assets

### 1. Icons (PNG/SVG)
**Location**: `client/public/assets/icons/`

**Usage in components**:
```javascript
<img src="/assets/icons/contract-icon.png" alt="Contract" />
```

**Recommended naming**:
- `contract-icon.png` - For contract preparation service
- `photoshoot-icon.png` - For photoshoot booking
- `staging-icon.png` - For digital staging
- `str-icon.png` - For short-term rental services
- `list-property-icon.png` - For property listing service

**Specifications**:
- Size: 64x64px to 256x256px
- Format: PNG with transparency or SVG
- Color: Can be full color or monochrome (CSS filters can be applied)

### 2. Background Images
**Location**: `client/public/assets/images/`

**Usage**:
```javascript
<div style={{ backgroundImage: 'url(/assets/images/hero-bg.jpg)' }}>
```

Or in CSS:
```css
.hero-section {
  background-image: url('/assets/images/hero-bg.jpg');
}
```

**Recommended naming**:
- `hero-bg.jpg` - Homepage hero background
- `services-bg.jpg` - Services section background
- `about-bg.jpg` - About page background

**Specifications**:
- Format: JPG for photos, PNG for graphics
- Size: Optimized for web (max 500KB)
- Dimensions: 1920x1080px or higher for full-width backgrounds

### 3. Advertisement Images
**Location**: `client/public/assets/ads/`

**Usage**:
```javascript
<img src="/assets/ads/premium-banner.jpg" alt="Premium Package" />
```

**Recommended naming**:
- `premium-banner.jpg`
- `featured-listing-ad.jpg`
- `str-promo.jpg`

### 4. Logos
**Location**: `client/public/assets/logo/`

Already contains company logos. Add partner logos or service badges here.

## Best Practices

1. **Optimize images** before uploading (use tools like TinyPNG, ImageOptim)
2. **Use descriptive names** with lowercase and hyphens
3. **Include alt text** in all image tags for accessibility
4. **Use WebP format** where possible for better compression
5. **Provide multiple sizes** for responsive images (@1x, @2x, @3x)

## Service-Specific Icon Requirements

For the new services being added:

1. **Prepare Contract** - Legal/document icon
2. **Book Photoshoot** - Camera icon
3. **Digital Staging** - Interior design/furniture icon
4. **List My Property** - House with plus sign
5. **STR Packages** - Calendar/bed icon

Place your custom PNG icons in `client/public/assets/icons/` and update the ServicesBox.js component to use them.

## Accessing Assets from Code

### In JSX (React components):
```javascript
// Absolute path from public folder
<img src="/assets/icons/my-icon.png" alt="My Icon" />
```

### In CSS:
```css
/* Absolute path from public folder */
background-image: url('/assets/images/my-bg.jpg');
```

### Dynamic imports in React:
```javascript
const iconPath = `/assets/icons/${serviceName}-icon.png`;
<img src={iconPath} alt={serviceName} />
```
