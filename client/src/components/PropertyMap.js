import React, { useRef, useEffect, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Supercluster from 'supercluster';
import { MapPin } from 'lucide-react';
import { toggleSaveProperty } from '../services/api';
import './PropertyMap.css';

mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatMarkerPrice = (price) => {
  if (!price) return '—';
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000)     return `${Math.round(price / 1_000)}K`;
  return price.toLocaleString();
};

const getLocationString = (property) => {
  if (typeof property.location === 'string') return property.location;
  if (typeof property.city    === 'string') return property.city;
  if (typeof property.address === 'string') return property.address;
  if (property.location?.city) return property.location.city;
  if (property.address?.city)  return property.address.city;
  return '';
};

// ─────────────────────────────────────────────────────────────────────────────

const PropertyMap = ({
  properties = [],
  center = [49.8671, 40.4093],
  zoom = 12,
  height = '400px',
  onMarkerClick,
  showPopups = true,
  singleProperty = null,
  onPropertySelect = null,
  onMapMove = null,
  flyTo = null,
  highlightedPropertyId = null,
  onSearchArea = null,
  onPinHover = null,
}) => {
  const mapContainer = useRef(null);
  const map          = useRef(null);
  const markers      = useRef([]);
  const markerEls    = useRef({});
  const [mapLoaded,  setMapLoaded]  = useState(false);
  const [mapError,   setMapError]   = useState(false);
  const clusterIndex         = useRef(null);
  const pinnedPopupRef       = useRef(null);
  const activePopupRef       = useRef(null);
  const allPropertiesRef     = useRef([]);
  const prevPropsSignatureRef = useRef(null);

  // ── Viewport ownership — user interaction resets auto-fit authority ─────────
  // Once the user drags or pinches, the viewport belongs to them.
  // It is only released when an explicit flyTo/fitBounds is programmatically issued.
  const userOwnsViewport = useRef(false);
  const [showSearchArea, setShowSearchArea] = useState(false);

  // Keep a stable ref to the callback so the map event handler (created once)
  // always calls the latest version without being recreated.
  const onSearchAreaRef = useRef(onSearchArea);
  useEffect(() => { onSearchAreaRef.current = onSearchArea; }, [onSearchArea]);

  const onPinHoverRef = useRef(onPinHover);
  useEffect(() => { onPinHoverRef.current = onPinHover; }, [onPinHover]);

  // ── Highlight sync — updates pin classes without rebuilding markers ─────────
  useEffect(() => {
    Object.values(markerEls.current).forEach(el => {
      el.classList.remove('mp-pin--active');
      el.style.zIndex = '';
    });
    if (highlightedPropertyId && markerEls.current[highlightedPropertyId]) {
      const el = markerEls.current[highlightedPropertyId];
      el.classList.add('mp-pin--active');
      el.style.zIndex = '100';
    }
  }, [highlightedPropertyId]);

  // ── Favorite toggle ───────────────────────────────────────────────────────
  const handleFavoriteClick = async (propertyId, buttonElement) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const isFav = buttonElement.classList.contains('favorited');
      await toggleSaveProperty(propertyId, token);
      buttonElement.classList.toggle('favorited', !isFav);
      const path = buttonElement.querySelector('path');
      if (path) path.setAttribute('fill', isFav ? 'none' : 'currentColor');
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  // ── Popup anchor ──────────────────────────────────────────────────────────
  const calculateOptimalAnchor = (markerLngLat, popupWidth = 300, popupHeight = 260) => {
    const markerPoint = map.current.project(markerLngLat);
    const mapEl       = map.current.getContainer();
    const mapRect     = mapEl.getBoundingClientRect();
    const margin      = 24;
    const markerSize  = 36;

    const spaceAbove = markerPoint.y - margin;
    const spaceBelow = mapRect.height - markerPoint.y - markerSize - margin;
    const spaceLeft  = markerPoint.x - margin;
    const spaceRight = mapRect.width  - markerPoint.x - margin;

    const fitsAbove = spaceAbove >= popupHeight + markerSize;
    const fitsBelow = spaceBelow >= popupHeight + markerSize;

    let verticalAnchor, verticalOffset;
    if      (fitsAbove && !fitsBelow)  { verticalAnchor = 'bottom'; verticalOffset = -markerSize; }
    else if (fitsBelow && !fitsAbove)  { verticalAnchor = 'top';    verticalOffset =  markerSize; }
    else if (fitsAbove && fitsBelow)   { verticalAnchor = 'top';    verticalOffset =  markerSize; }
    else {
      verticalAnchor = spaceAbove > spaceBelow ? 'bottom' : 'top';
      verticalOffset = spaceAbove > spaceBelow ? -markerSize : markerSize;
    }

    const half = popupWidth / 2;
    let horizontalAnchor, horizontalOffset;
    if      (spaceLeft  < half) { horizontalAnchor = 'left';   horizontalOffset =  10; }
    else if (spaceRight < half) { horizontalAnchor = 'right';  horizontalOffset = -10; }
    else                        { horizontalAnchor = 'center'; horizontalOffset =  0;  }

    return {
      anchor: horizontalAnchor === 'center'
        ? verticalAnchor
        : `${verticalAnchor}-${horizontalAnchor}`,
      offset: [horizontalOffset, verticalOffset],
    };
  };

  // ── Single-property popup HTML ────────────────────────────────────────────
  const createSinglePropertyPopup = (property) => {
    const popupEl  = document.createElement('div');
    const imageUrl = property.thumbnail || property.medium || property.image || '';
    const specs    = [
      property.bedrooms  > 0                     ? `${property.bedrooms} bd`                     : null,
      property.bathrooms > 0                     ? `${property.bathrooms} ba`                    : null,
      (property.builtUpArea || property.area)    ? `${property.builtUpArea || property.area} m²` : null,
    ].filter(Boolean).join(' · ');
    const locStr = getLocationString(property);

    popupEl.innerHTML = `
      <div class="mp-popup">
        <div class="mp-popup-img-wrap">
          ${imageUrl
            ? `<img src="${imageUrl}" alt="" class="mp-popup-img" />`
            : `<div class="mp-popup-img-empty">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                   <rect x="3" y="3" width="18" height="18" rx="2"/>
                   <circle cx="8.5" cy="8.5" r="1.5"/>
                   <path d="m21 15-5-5L5 21"/>
                 </svg>
               </div>`
          }
          <button class="mp-popup-fav favorite-btn-map" data-property-id="${property._id}" aria-label="Save property">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
        <div class="mp-popup-body">
          <div class="mp-popup-price">${property.currency || 'AZN'} ${property.price?.toLocaleString()}</div>
          <div class="mp-popup-title">${property.title || ''}</div>
          ${specs    ? `<div class="mp-popup-specs">${specs}</div>`    : ''}
          ${locStr   ? `<div class="mp-popup-loc">${locStr}</div>`      : ''}
        </div>
      </div>
    `;

    popupEl.querySelector('.favorite-btn-map')?.addEventListener('click', (e) => {
      e.stopPropagation();
      handleFavoriteClick(property._id, e.currentTarget);
    });

    popupEl.addEventListener('click', (e) => {
      if (e.target.closest('.favorite-btn-map')) return;
      if (onPropertySelect) onPropertySelect(property);
      else window.location.href = `/properties/${property._id}`;
    });

    return popupEl;
  };

  // ── Multi-property popup HTML ─────────────────────────────────────────────
  const createMultiPropertyPopup = (properties) => {
    const popupEl      = document.createElement('div');
    const ITEMS_PER_PAGE = 2;
    let   currentPage  = 0;
    const totalPages   = Math.ceil(properties.length / ITEMS_PER_PAGE);

    popupEl.className = 'mp-popup-multi popup-card-content';

    const renderList = (page) => {
      const start = page * ITEMS_PER_PAGE;
      const slice = properties.slice(start, start + ITEMS_PER_PAGE);

      return `
        <div class="mp-multi-list">
          ${slice.map((prop, idx) => {
            if (!prop) return '';
            const imgUrl = prop.thumbnail || prop.medium || prop.image || '';
            const specs  = [
              prop.bedrooms  > 0                   ? `${prop.bedrooms} bd`                   : null,
              prop.bathrooms > 0                   ? `${prop.bathrooms} ba`                  : null,
              (prop.builtUpArea || prop.area)      ? `${prop.builtUpArea || prop.area} m²`   : null,
            ].filter(Boolean).join(' · ');
            return `
              <div class="mp-multi-item" data-property-id="${prop._id}" data-index="${start + idx}">
                ${imgUrl
                  ? `<img src="${imgUrl}" alt="" class="mp-multi-thumb" />`
                  : `<div class="mp-multi-thumb-empty">
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                         <rect x="3" y="3" width="18" height="18" rx="2"/>
                         <circle cx="8.5" cy="8.5" r="1.5"/>
                         <path d="m21 15-5-5L5 21"/>
                       </svg>
                     </div>`
                }
                <div class="mp-multi-info">
                  <div class="mp-multi-price">${prop.currency || 'AZN'} ${prop.price?.toLocaleString()}</div>
                  <div class="mp-multi-title">${prop.title || ''}</div>
                  ${specs ? `<div class="mp-multi-specs">${specs}</div>` : ''}
                </div>
                <button class="mp-multi-fav favorite-btn-map" data-property-id="${prop._id}" aria-label="Save">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </button>
              </div>
            `;
          }).join('')}
        </div>
        ${totalPages > 1
          ? `<div class="mp-multi-footer">
               <button class="mp-page-btn mp-prev" ${page === 0 ? 'disabled' : ''}>
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>
               </button>
               <span class="mp-page-label">${page + 1} / ${totalPages}</span>
               <button class="mp-page-btn mp-next" ${page === totalPages - 1 ? 'disabled' : ''}>
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg>
               </button>
             </div>`
          : `<div class="mp-multi-footer-count">${properties.length} ${properties.length === 1 ? 'property' : 'properties'} here</div>`
        }
      `;
    };

    const updateContent = () => {
      popupEl.innerHTML = renderList(currentPage);

      popupEl.querySelector('.mp-prev')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentPage > 0) { currentPage--; updateContent(); }
      });
      popupEl.querySelector('.mp-next')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentPage < totalPages - 1) { currentPage++; updateContent(); }
      });

      popupEl.querySelectorAll('.mp-multi-item').forEach(item => {
        const property = properties[parseInt(item.dataset.index)];

        item.querySelector('.favorite-btn-map')?.addEventListener('click', (e) => {
          e.stopPropagation();
          handleFavoriteClick(property._id, e.currentTarget);
        });

        item.addEventListener('click', (e) => {
          if (e.target.closest('.favorite-btn-map')) return;
          if (onPropertySelect)   onPropertySelect(property);
          else if (onMarkerClick) onMarkerClick(property);
          else window.location.href = `/properties/${property._id}`;
        });
      });
    };

    updateContent();
    return popupEl;
  };

  // ── Render markers for current viewport ──────────────────────────────────
  const updateMarkers = () => {
    if (!map.current || !clusterIndex.current) return;
    if (!map.current.isStyleLoaded()) return;

    markers.current.forEach(m => m.remove());
    markers.current = [];
    markerEls.current = {};

    const bounds   = map.current.getBounds();
    const clusters = clusterIndex.current.getClusters(
      [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      Math.floor(map.current.getZoom())
    );

    clusters.forEach(cluster => {
      const [lng, lat] = cluster.geometry.coordinates;

      if (cluster.properties.cluster) {
        // ── Cluster bubble ────────────────────────────────────────────────
        const count     = cluster.properties.point_count;
        const sizeClass = count > 10 ? 'large' : count > 5 ? 'medium' : 'small';

        const el = document.createElement('div');
        el.className = 'mp-cluster-wrap';
        el.innerHTML = `<div class="mp-cluster mp-cluster--${sizeClass}">${count}</div>`;

        if (showPopups) {
          const clusterProperties = clusterIndex.current.getLeaves(cluster.id, Infinity);
          const popupEl    = createMultiPropertyPopup(clusterProperties.map(leaf => leaf.properties));
          const popupConfig = calculateOptimalAnchor([lng, lat], 320, 260);

          const popup = new mapboxgl.Popup({
            offset: popupConfig.offset,
            closeButton: true,
            closeOnClick: false,
            className: 'property-hover-popup cluster-popup',
            maxWidth: '320px',
            anchor: popupConfig.anchor,
          }).setDOMContent(popupEl);

          let hoverCluster = false, hoverPopup = false, hoverTimeout;

          const closeIfIdle = () => {
            hoverTimeout = setTimeout(() => {
              if (!hoverCluster && !hoverPopup &&
                  activePopupRef.current === popup && pinnedPopupRef.current !== popup) {
                popup.remove();
                activePopupRef.current = null;
              }
            }, 1000);
          };

          el.addEventListener('mouseenter', () => {
            clearTimeout(hoverTimeout);
            hoverCluster = true;
            if (activePopupRef.current && activePopupRef.current !== pinnedPopupRef.current) {
              activePopupRef.current.remove();
            }
            if (pinnedPopupRef.current !== popup) {
              popup.setLngLat([lng, lat]).addTo(map.current);
              const pEl = popup.getElement();
              if (pEl) { pEl.style.zIndex = '9999'; pEl.style.pointerEvents = 'auto'; }
              activePopupRef.current = popup;
            }
          }, true);

          el.addEventListener('mouseleave', () => {
            hoverCluster = false; closeIfIdle();
          }, true);

          popup.on('open', () => {
            const pEl = popup.getElement();
            if (!pEl) return;
            pEl.addEventListener('mouseenter', () => { clearTimeout(hoverTimeout); hoverPopup = true; }, true);
            pEl.addEventListener('mouseleave', () => {
              hoverPopup = false;
              if (!hoverCluster) closeIfIdle();
            }, true);
          });
        }

        el.addEventListener('click', () => {
          const expansionZoom = clusterIndex.current.getClusterExpansionZoom(cluster.id);
          map.current.easeTo({ center: [lng, lat], zoom: expansionZoom + 0.5 });
        });

        markers.current.push(
          new mapboxgl.Marker({ element: el, anchor: 'center' })
            .setLngLat([lng, lat])
            .addTo(map.current)
        );

      } else {
        // ── Individual price-bubble marker ────────────────────────────────
        const property    = cluster.properties;
        const hasExactGroup = property.exactGroupSize > 1;
        const priceStr    = formatMarkerPrice(property.price);

        const el = document.createElement('div');
        el.className = 'mp-marker-wrap';
        el.dataset.propertyId = property._id || property.title;

        const isSpotlightPin = property.promotionTier === 'SPOTLIGHT' && property.isPromoted;
        const pinEl = document.createElement('div');
        pinEl.className = [
          'mp-pin',
          hasExactGroup  ? 'mp-pin--grouped'   : '',
          isSpotlightPin ? 'mp-pin--spotlight' : '',
        ].filter(Boolean).join(' ');
        pinEl.innerHTML = `
          <span class="mp-pin-price">${priceStr}</span>
          ${hasExactGroup ? `<span class="mp-pin-count">${property.exactGroupSize}</span>` : ''}
        `;
        el.appendChild(pinEl);

        if (property._id) markerEls.current[property._id] = pinEl;

        if (showPopups) {
          const propertiesAtLocation = hasExactGroup
            ? allPropertiesRef.current.filter(p => {
                if (!p.coordinates) return false;
                const pLat = p.coordinates.lat || p.coordinates.latitude;
                const pLng = p.coordinates.lng || p.coordinates.longitude;
                if (!pLat || !pLng) return false;
                return `${pLat.toFixed(4)},${pLng.toFixed(4)}` === property.exactGroupKey;
              })
            : [property];

          if (propertiesAtLocation.length === 0) propertiesAtLocation.push(property);

          const isSingle    = propertiesAtLocation.length === 1;
          const popupEl     = isSingle
            ? createSinglePropertyPopup(propertiesAtLocation[0])
            : createMultiPropertyPopup(propertiesAtLocation);
          const popupConfig = calculateOptimalAnchor([lng, lat], isSingle ? 280 : 320, isSingle ? 290 : 260);

          const popup = new mapboxgl.Popup({
            offset: popupConfig.offset,
            closeButton: true,
            closeOnClick: false,
            className: 'property-hover-popup',
            maxWidth: isSingle ? '280px' : '320px',
            anchor: popupConfig.anchor,
          }).setDOMContent(popupEl);

          let hoverMarker = false, hoverPopup = false, hoverTimeout;

          const closeIfIdle = () => {
            hoverTimeout = setTimeout(() => {
              if (!hoverMarker && !hoverPopup &&
                  activePopupRef.current === popup && pinnedPopupRef.current !== popup) {
                popup.remove();
                activePopupRef.current = null;
              }
            }, 1000);
          };

          el.addEventListener('mouseenter', () => {
            clearTimeout(hoverTimeout);
            hoverMarker = true;
            if (activePopupRef.current && activePopupRef.current !== pinnedPopupRef.current) {
              activePopupRef.current.remove();
            }
            if (pinnedPopupRef.current !== popup) {
              popup.setLngLat([lng, lat]).addTo(map.current);
              const pEl = popup.getElement();
              if (pEl) { pEl.style.zIndex = '9999'; pEl.style.pointerEvents = 'auto'; }
              activePopupRef.current = popup;
            }
          });

          el.addEventListener('mouseleave', () => {
            hoverMarker = false; closeIfIdle();
          });

          popup.on('open', () => {
            const pEl = popup.getElement();
            if (!pEl) return;
            pEl.addEventListener('mouseenter', () => { clearTimeout(hoverTimeout); hoverPopup = true; }, true);
            pEl.addEventListener('mouseleave', () => {
              hoverPopup = false;
              if (!hoverMarker) closeIfIdle();
            }, true);
          });

          el.addEventListener('mouseenter', () => {
            if (property._id) onPinHoverRef.current?.(property._id);
          });
          el.addEventListener('mouseleave', () => {
            onPinHoverRef.current?.(null);
          });

          el.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
            if (pinnedPopupRef.current && pinnedPopupRef.current !== popup) {
              pinnedPopupRef.current.remove();
            }
            pinnedPopupRef.current = popup;
            activePopupRef.current = popup;
            if (!popup.isOpen()) popup.setLngLat([lng, lat]).addTo(map.current);
          }, { capture: true });

          popup.on('close', () => {
            if (pinnedPopupRef.current === popup) pinnedPopupRef.current = null;
            if (activePopupRef.current === popup) activePopupRef.current = null;
          });
        }

        markers.current.push(
          new mapboxgl.Marker({ element: el, anchor: 'center', offset: [0, 0] })
            .setLngLat([lng, lat])
            .addTo(map.current)
        );
      }
    });

    if (highlightedPropertyId && markerEls.current[highlightedPropertyId]) {
      markerEls.current[highlightedPropertyId].classList.add('mp-pin--active');
      markerEls.current[highlightedPropertyId].style.zIndex = '100';
    }
  };

  // ── Map initialization (runs once) ───────────────────────────────────────
  useEffect(() => {
    if (map.current) return;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center,
        zoom,
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        'top-right'
      );

      map.current.on('load', () => setMapLoaded(true));

      // ── Viewport ownership detection ───────────────────────────────────
      // Any direct user drag gesture transfers viewport ownership.
      map.current.on('dragstart', () => {
        userOwnsViewport.current = true;
      });

      // User zoom via scroll wheel, pinch, or +/- buttons carries an
      // originalEvent. Programmatic easeTo/flyTo/fitBounds does not.
      map.current.on('zoomstart', (e) => {
        if (e.originalEvent) {
          userOwnsViewport.current = true;
        }
      });

      let moveEndTimeout;
      map.current.on('moveend', () => {
        clearTimeout(moveEndTimeout);
        moveEndTimeout = setTimeout(() => {
          if (clusterIndex.current) updateMarkers();
          if (onMapMove) {
            const c = map.current.getCenter();
            onMapMove([c.lng, c.lat], map.current.getZoom());
          }
          // Surface the "Search this area" CTA whenever the user owns the viewport.
          if (userOwnsViewport.current && onSearchAreaRef.current) {
            setShowSearchArea(true);
          }
        }, 100);
      });

      map.current.on('zoomend', () => {
        if (clusterIndex.current) updateMarkers();
      });

      map.current.on('error', (e) => {
        console.error('Map error:', e);
        if (e.error?.status === 401 || e.error?.message?.includes('access token')) {
          setMapError(true);
        }
      });
    } catch (error) {
      console.error('Error creating map:', error);
      setMapError(true);
    }

    return () => {
      pinnedPopupRef.current?.remove();
      activePopupRef.current?.remove();
      markers.current.forEach(m => m.remove());
      markers.current = [];
      markerEls.current = {};
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fly to on explicit request ────────────────────────────────────────────
  // Explicit navigation always resets user ownership so the map is free to
  // auto-position again (e.g. after a location search or mode change).
  useEffect(() => {
    if (!map.current || !mapLoaded || !flyTo) return;
    userOwnsViewport.current = false;
    setShowSearchArea(false);
    if (flyTo.bounds) {
      map.current.fitBounds(flyTo.bounds, {
        padding: flyTo.padding ?? 80,
        maxZoom: 14,
        duration: 600,
        essential: true,
      });
    } else {
      map.current.flyTo({ center: flyTo.center, zoom: flyTo.zoom ?? 12, essential: true, duration: 600 });
    }
  }, [flyTo, mapLoaded]);

  // ── Rebuild cluster index when properties change ──────────────────────────
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    pinnedPopupRef.current?.remove(); pinnedPopupRef.current = null;
    activePopupRef.current?.remove(); activePopupRef.current = null;
    markers.current.forEach(m => m.remove());
    markers.current = [];
    markerEls.current = {};

    // Single-property detail view
    if (singleProperty?.coordinates) {
      const coords = singleProperty.coordinates;
      const el = document.createElement('div');
      el.className = 'mp-marker-wrap';
      const pinEl = document.createElement('div');
      pinEl.className = 'mp-pin mp-pin--single-detail';
      pinEl.innerHTML = `<span class="mp-pin-price">${formatMarkerPrice(singleProperty.price)}</span>`;
      el.appendChild(pinEl);

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([coords.lng || coords.longitude, coords.lat || coords.latitude])
        .addTo(map.current);

      if (showPopups) {
        marker.setPopup(
          new mapboxgl.Popup({ offset: 16, closeButton: false }).setHTML(`
            <div class="mp-detail-popup">
              <div class="mp-detail-price">${singleProperty.currency || 'AZN'} ${singleProperty.price?.toLocaleString()}</div>
              <div class="mp-detail-title">${singleProperty.title}</div>
            </div>
          `)
        );
      }

      markers.current.push(marker);

      if (map.current.getZoom() === zoom) {
        map.current.flyTo({
          center: [coords.lng || coords.longitude, coords.lat || coords.latitude],
          zoom: 16,
          essential: true,
        });
      }
      return;
    }

    // Multi-property clustering
    const propertiesWithCoords = properties.filter(
      p => p.coordinates && (p.coordinates.lat || p.coordinates.latitude)
    );
    if (propertiesWithCoords.length === 0) { clusterIndex.current = null; return; }

    allPropertiesRef.current = propertiesWithCoords;

    const signature = propertiesWithCoords.map(p => p._id).join(',');
    if (signature !== prevPropsSignatureRef.current) {
      prevPropsSignatureRef.current = signature;

      const exactGroups = {};
      propertiesWithCoords.forEach(p => {
        const lat = p.coordinates.lat || p.coordinates.latitude;
        const lng = p.coordinates.lng || p.coordinates.longitude;
        const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        exactGroups[key] = (exactGroups[key] || 0) + 1;
      });

      clusterIndex.current = new Supercluster({ radius: 40, maxZoom: 18, minZoom: 0, minPoints: 2 });

      const points = propertiesWithCoords.map(p => {
        const lat      = p.coordinates.lat || p.coordinates.latitude;
        const lng      = p.coordinates.lng || p.coordinates.longitude;
        const exactKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        return {
          type: 'Feature',
          properties: {
            ...p,
            thumbnail:     p.images?.[0]?.thumbnail || p.images?.[0]?.medium || p.images?.[0] || '',
            medium:        p.images?.[0]?.medium    || p.images?.[0] || '',
            image:         p.images?.[0] || '',
            exactGroupSize: exactGroups[exactKey],
            exactGroupKey:  exactKey,
          },
          geometry: { type: 'Point', coordinates: [lng, lat] },
        };
      });

      clusterIndex.current.load(points);

      // Only auto-fit when the user has not yet taken viewport ownership.
      // If the user has dragged or zoomed, we preserve their position.
      if (!userOwnsViewport.current) {
        if (propertiesWithCoords.length > 1) {
          const bounds = new mapboxgl.LngLatBounds();
          propertiesWithCoords.forEach(p => {
            bounds.extend([
              p.coordinates.lng || p.coordinates.longitude,
              p.coordinates.lat || p.coordinates.latitude,
            ]);
          });
          map.current.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 600 });
        } else {
          const coords = propertiesWithCoords[0].coordinates;
          map.current.flyTo({
            center: [coords.lng || coords.longitude, coords.lat || coords.latitude],
            zoom: 14, essential: true,
          });
        }
      }
    }

    if (map.current.isStyleLoaded()) {
      updateMarkers();
    } else {
      map.current.once('style.load', updateMarkers);
    }
  }, [properties, singleProperty, showPopups, onMarkerClick, mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Search this area handler ──────────────────────────────────────────────
  const handleSearchAreaClick = useCallback(() => {
    if (!map.current || !onSearchAreaRef.current) return;
    const b = map.current.getBounds();
    onSearchAreaRef.current({
      west:  b.getWest(),
      south: b.getSouth(),
      east:  b.getEast(),
      north: b.getNorth(),
    });
    setShowSearchArea(false);
  }, []);

  if (mapError) {
    return (
      <div style={{
        width: '100%', height,
        background: '#f5f5f4',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        color: '#9ca3af',
        fontFamily: "'Inter Tight', Inter, sans-serif",
        fontSize: '0.875rem',
      }}>
        <MapPin size={24} strokeWidth={1.5} aria-hidden="true" />
        Map unavailable
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      {showSearchArea && onSearchArea && (
        <div className="mp-search-area-wrap">
          <button className="mp-search-area-btn" onClick={handleSearchAreaClick}>
            <span className="mp-search-area-dot" />
            Search this area
          </button>
        </div>
      )}
    </div>
  );
};

export default PropertyMap;
