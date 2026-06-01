Everything is in place. Here's a summary of what was built:

Backend (5 files changed/created)

server/models/Property.js — added lastOwnerActivityAt, lastConfirmedAvailableAt, reconfirmationSentCount, previousPrice, priceChangedAt, priceDelta, priceHistory[], inquiryResponseRate

server/lib/staleDetection.js — new: computeStaleness (fresh/aging/stale/critical at 30/60/90d), computePhotoHygiene (0→100 score, advisory note), computePriceOutlier (suspicious-low < 35%, suspicious-high > 3.5×, sudden-drop ≥ 30%), computeVisibilityScore (quality − staleness penalty − moderation penalty)

server/controllers/listingHealthController.js — new: GET /my-health returns per-listing health objects + summary counts; POST /:id/confirm stamps lastConfirmedAvailableAt and lastOwnerActivityAt

server/routes/listingHealthRoutes.js — new, registered at /api/listing-health

server/controllers/propertyController.js — updateProperty now stamps lastOwnerActivityAt on every edit and snapshots previousPrice / priceChangedAt / priceDelta when price changes

Frontend (5 files changed)

client/src/services/api.js — getMyListingsHealth, confirmListingAvailability

client/src/pages/AccountListings.js — fetches health data in parallel with listings; each card shows a staleness badge (aging/stale/critical + day count), a left-border accent by level, a no-photos chip, an inline "Is this still available?" reconfirmation prompt, and a visibility score bar

client/src/pages/AccountDashboard.js — fetches health summary; shows a "Listing Health" section with attention count, stale/critical count, no-photos count, and a link to My Listings; section only renders when there are issues to surface

client/src/pages/AccountListings.css — health badge variants, card border accents, reconfirmation prompt, visibility bar

client/src/pages/Account.css — dashboard hygiene summary card styles
All checks pass. Here's a summary of every change made:

PropertyDetail.js — complete rewrite

Skeleton loading state — PropertyDetailSkeleton component renders a structural skeleton (gallery bar, price/address lines, content lines, contact card block) instead of a blank "Loading..." paragraph

Gallery — stable aspect ratio, no scale-zoom on hover (opacity transition only), photo count pill (e.g. "8 photos") overlaid bottom-right of main image, "see all" overlay replaced with "+N" count on last thumbnail

Information hierarchy — sections now in priority order: identity (price → address → key facts → trust strip) → overview numbers → description → listing details → location + map → rental terms → features & amenities → legal & financial → listing meta footer

Trust strip — inline green pill row under the address, showing only confirmed signals ("Listing reviewed", "Ownership verified", "Phone verified"); never shows negative signals or warnings

Description collapse — text > 500 chars is truncated with "Read more / Show less" toggle; max-width: 68ch for comfortable line length

Features consolidation — Interior / Exterior / Building / Nearby are now one "Features & amenities" section with unlabeled sub-groups, replacing 4 separate cards

Info rows — replaced the dense info-grid cards with clean inline key/value rows separated by hairlines; reads like a spec sheet

Removed — duplicate description section, alert() calls (3 removed), dailyViewsCount from contact card, scale hover animations, gradient feature tags

Share — replaced alert('Copied!') with a copied state that shows "Copied!" in-place for 2 seconds

Contact card — seller identity → ownership reviewed notice → confidence panel → inquiry button → phone reveal → response note → Save (FavoriteButton) + text links (Print · Share · Report); fixed initialFavorite → initialIsFavorite bug and the onToggle(pid, confirmed) arg order

Mobile mobile bar — replaced alert() with silent navigate('/login') for unauthenticated save

PropertyDetail.css — complete rewrite

Left column is one unified white card (border, border-radius) with sections separated by 1px hairlines — no stacked card-shadow repetition

Section headings are small uppercase labels in var(--gray-400), not red-underlined h2s

Feature tags are neutral bordered chips (gray-50 background, gray-200 border) — no gradient

Gallery uses opacity-only hover transition — no scale() transforms

All pd-* class names replace the legacy detail-section, property-two-column, image-grid-gallery, etc.

Lightbox and mobile sticky bar styles preserved exactly as before