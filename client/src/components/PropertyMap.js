import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Supercluster from 'supercluster';

// Set your Mapbox access token here
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

const PropertyMap = ({ 
  properties = [], 
  center = [-98.5795, 39.8283], // US center
  zoom = 4,
  height = '400px',
  onMarkerClick,
  showPopups = true,
  singleProperty = null,
  onPropertySelect = null
}) => {

  const mapContainer = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const clusterIndex = useRef(null);
  const pinnedPopupRef = useRef(null);
  const activePopupRef = useRef(null);
  
  // Store ALL properties for matching grouped properties (don't rely on filtered props)
  const allPropertiesRef = useRef([]);

  // Helper function to determine best popup anchor based on available space
  const calculateOptimalAnchor = (markerLngLat, popupWidth = 340, popupHeight = 280) => {
    const markerPoint = map.current.project(markerLngLat);
    
    // Get the actual map container bounds (not the full screen)
    const mapContainer = map.current.getContainer();
    const mapRect = mapContainer.getBoundingClientRect();
    
    const margin = 20;
    const markerSize = 50; // Marker height + some buffer
    
    // Calculate available space in each direction within the map container
    // markerPoint is relative to the map container's top-left
    const spaceAbove = markerPoint.y - margin;
    const spaceBelow = mapRect.height - markerPoint.y - markerSize - margin;
    const spaceLeft = markerPoint.x - margin;
    const spaceRight = mapRect.width - markerPoint.x - margin;
    
    // Determine vertical anchor - check if popup + marker fits
    let verticalAnchor;
    let verticalOffset;
    
    const spaceNeeded = popupHeight + markerSize;
    const fitsAbove = spaceAbove >= spaceNeeded;
    const fitsBelow = spaceBelow >= spaceNeeded;
    
    if (fitsAbove && !fitsBelow) {
      // Only fits above
      verticalAnchor = 'bottom';
      verticalOffset = -markerSize;
    } else if (fitsBelow && !fitsAbove) {
      // Only fits below
      verticalAnchor = 'top';
      verticalOffset = markerSize;
    } else if (fitsAbove && fitsBelow) {
      // Fits both ways - prefer below (top anchor)
      verticalAnchor = 'top';
      verticalOffset = markerSize;
    } else {
      // Doesn't fit either way - use side with more space
      if (spaceAbove > spaceBelow) {
        verticalAnchor = 'bottom';
        verticalOffset = -markerSize;
      } else {
        verticalAnchor = 'top';
        verticalOffset = markerSize;
      }
    }
    
    // Determine horizontal anchor
    let horizontalAnchor;
    let horizontalOffset;
    
    const halfPopupWidth = popupWidth / 2;
    
    if (spaceLeft < halfPopupWidth) {
      // Too close to left edge - align popup to left
      horizontalAnchor = 'left';
      horizontalOffset = 10;
    } else if (spaceRight < halfPopupWidth) {
      // Too close to right edge - align popup to right
      horizontalAnchor = 'right';
      horizontalOffset = -10;
    } else {
      // Center is fine
      horizontalAnchor = 'center';
      horizontalOffset = 0;
    }
    
    // Combine anchors
    let anchor;
    if (horizontalAnchor === 'center') {
      anchor = verticalAnchor;
    } else {
      anchor = `${verticalAnchor}-${horizontalAnchor}`;
    }
    
    
    return {
      anchor: anchor,
      offset: [horizontalOffset, verticalOffset]
    };
  };

  useEffect(() => {
    if (map.current) return; // Initialize map only once

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: center,
        zoom: zoom
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      
      map.current.on('load', () => {

        setMapLoaded(true);
      });

      // Update clusters when map moves or zooms
      // But debounce to avoid destroying popups while user is hovering
      let moveEndTimeout;
      map.current.on('moveend', () => {

        clearTimeout(moveEndTimeout);
        moveEndTimeout = setTimeout(() => {
          if (clusterIndex.current) {
            updateMarkers();
          }
        }, 100); // Small delay to batch rapid movements
      });

      map.current.on('zoomstart', () => {

      });

      map.current.on('zoomend', () => {

        if (clusterIndex.current) {
          updateMarkers();
        }
      });
      
      map.current.on('error', (e) => {
        console.error('❌ Map error:', e);
      });
      
    } catch (error) {
      console.error('❌ Error creating map:', error);
    }
  }, []);

  // Create simple card popup for single property (original behavior)
  const createSinglePropertyPopup = (property) => {
    const popupEl = document.createElement('div');
    const imageUrl = property.thumbnail || property.medium || property.image || '';
    
    popupEl.innerHTML = `
      <div style="
        background: white;
        border-radius: 8px;
        overflow: hidden;
        width: 280px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        cursor: pointer;
      ">
        ${imageUrl ? 
          `<img src="${imageUrl}" alt="${property.title}" style="width: 100%; height: 180px; object-fit: cover;" />` :
          `<div style="width: 100%; height: 180px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; font-size: 48px;">🏠</div>`
        }
        <div style="padding: 12px;">
          <div style="font-size: 16px; font-weight: 700; color: #667eea; margin-bottom: 6px;">
            ${property.currency || 'AZN'} ${property.price?.toLocaleString()}
          </div>
          <div style="font-size: 14px; color: #333; margin-bottom: 6px; font-weight: 500; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${property.title}
          </div>
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
            ${property.bedrooms || 0} bd • ${property.bathrooms || 0} ba • ${property.builtUpArea || property.area || 0} m²
          </div>
          <div style="font-size: 11px; color: #999;">
            ${property.address}
          </div>
        </div>
      </div>
    `;
    
    popupEl.addEventListener('click', () => {
      window.location.href = `/properties/${property._id}`;
    });
    
    return popupEl;
  };

  // Create popup with property cards and pagination (shared by clusters and grouped pins)
  const createMultiPropertyPopup = (properties) => {
    const popupEl = document.createElement('div');
    
    const ITEMS_PER_PAGE = 2; // Show 2 listings at once (realtor.ca pattern)
    let currentPage = 0;
    const totalPages = Math.ceil(properties.length / ITEMS_PER_PAGE);
    
    // Fixed dimensions for consistent popup size (2 listings visible + pagination footer)
    const POPUP_WIDTH = 340;
    const POPUP_HEIGHT = 280; // Height for exactly 2 listings + footer
    
    popupEl.style.cssText = `
      background: white; 
      border-radius: 8px; 
      box-shadow: 0 4px 20px rgba(0,0,0,0.3); 
      width: ${POPUP_WIDTH}px; 
      height: ${POPUP_HEIGHT}px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; 
      pointer-events: auto; 
      overflow: hidden; 
      display: flex; 
      flex-direction: column;
    `;
    popupEl.className = 'popup-card-content';
    
    const renderPropertyList = (page) => {
      const startIdx = page * ITEMS_PER_PAGE;
      const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, properties.length);
      const pageProperties = properties.slice(startIdx, endIdx);
      
      return `
        <div style="height: 230px; overflow-y: auto; overflow-x: hidden;">
          ${pageProperties.map((prop, idx) => {
            if (!prop) return '';
            const imageUrl = prop.thumbnail || prop.medium || prop.image || '';
            const globalIdx = startIdx + idx;
            return `
              <div class="property-list-item" data-property-id="${prop._id}" data-index="${globalIdx}" style="display: flex; gap: 10px; padding: 10px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s;">
                ${imageUrl ? 
                  `<img src="${imageUrl}" alt="${prop.title}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px; flex-shrink: 0;" />` : 
                  `<div style="width: 80px; height: 80px; background: #f0f0f0; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0;">🏠</div>`
                }
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 14px; font-weight: 700; color: #667eea; margin-bottom: 3px;">
                    ${prop.currency || 'AZN'} ${prop.price?.toLocaleString()}
                  </div>
                  <div style="font-size: 12px; color: #333; margin-bottom: 3px; font-weight: 500; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${prop.title}
                  </div>
                  <div style="font-size: 11px; color: #666;">
                    ${prop.bedrooms || 0} bd • ${prop.bathrooms || 0} ba • ${prop.builtUpArea || prop.area || 0} m²
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        ${totalPages > 1 ? `
          <div style="height: 50px; padding: 10px 12px; border-top: 2px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; flex-shrink: 0;">
            <button class="prev-page-btn" style="padding: 6px 12px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; color: #333; transition: all 0.2s;" ${page === 0 ? 'disabled' : ''}>← Prev</button>
            <span style="font-size: 12px; color: #666; font-weight: 500;">Page ${page + 1} / ${totalPages}</span>
            <button class="next-page-btn" style="padding: 6px 12px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; color: #333; transition: all 0.2s;" ${page === totalPages - 1 ? 'disabled' : ''}>Next →</button>
          </div>
        ` : `<div style="height: 50px; padding: 10px 12px; text-align: center; font-size: 12px; color: #666; background: #f8f9fa; border-top: 1px solid #eee; display: flex; align-items: center; justify-content: center;">${properties.length} ${properties.length === 1 ? 'property' : 'properties'}</div>`}
      `;
    };
    
    const updatePopupContent = () => {
      popupEl.innerHTML = renderPropertyList(currentPage);
      
      // Add pagination handlers
      const prevBtn = popupEl.querySelector('.prev-page-btn');
      const nextBtn = popupEl.querySelector('.next-page-btn');
      const listItems = popupEl.querySelectorAll('.property-list-item');
      
      if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (currentPage > 0) {
            currentPage--;
            updatePopupContent();
          }
        });
      }
      
      if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (currentPage < totalPages - 1) {
            currentPage++;
            updatePopupContent();
          }
        });
      }
      
      // Add click handlers and hover effects for list items
      listItems.forEach(item => {
        const propertyIndex = parseInt(item.dataset.index);
        const property = properties[propertyIndex];
        
        item.addEventListener('mouseenter', () => {
          item.style.background = '#f8f9fa';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = 'transparent';
        });
        item.addEventListener('click', (e) => {
          e.stopPropagation();

          // Navigate to property detail page
          window.location.href = `/properties/${property._id}`;
          
          if (onPropertySelect) {
            onPropertySelect(property);
          } else if (onMarkerClick) {
            onMarkerClick(property);
          }
        });
      });
    };
    
    updatePopupContent();
    return popupEl;
  };

  const updateMarkers = () => {
    if (!map.current || !clusterIndex.current) return;

    // Clear existing markers BUT preserve active/pinned popups
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    const bounds = map.current.getBounds();
    const zoom = map.current.getZoom();

    const clusters = clusterIndex.current.getClusters(
      [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      Math.floor(zoom)
    );

    clusters.forEach(cluster => {
      const [lng, lat] = cluster.geometry.coordinates;
      const isCluster = cluster.properties.cluster;

      if (isCluster) {
        // Create cluster marker (BLUE - multiple properties grouped by zoom level)
        const count = cluster.properties.point_count;
        const clusterSize = count > 10 ? 'large' : count > 5 ? 'medium' : 'small';
        const sizes = { small: 40, medium: 50, large: 60 };
        const size = sizes[clusterSize];

        const el = document.createElement('div');
        el.className = 'cluster-marker';
        el.dataset.markerType = 'cluster';
        el.innerHTML = `
          <div style="
            background: white;
            border: 3px solid #2563eb;
            border-radius: 50%;
            width: ${size}px;
            height: ${size}px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: ${count > 99 ? '14px' : '16px'};
            color: #2563eb;
            cursor: pointer;
            box-shadow: 0 2px 12px rgba(37, 99, 235, 0.4);
            transition: all 0.2s;
          ">${count}</div>
        `;

        el.addEventListener('mouseenter', () => {
          el.querySelector('div').style.transform = 'scale(1.1)';
          el.querySelector('div').style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.6)';
        });

        el.addEventListener('mouseleave', () => {
          el.querySelector('div').style.transform = 'scale(1)';
          el.querySelector('div').style.boxShadow = '0 2px 12px rgba(102, 126, 234, 0.4)';
        });

        // Add hover popup for cluster showing all properties inside
        if (showPopups) {
          // Get all properties in this cluster
          const clusterProperties = clusterIndex.current.getLeaves(cluster.id, Infinity);

          // Create popup for cluster with all properties
          const popupEl = createMultiPropertyPopup(clusterProperties.map(leaf => leaf.properties));
          
          // Calculate optimal anchor based on available space
          const popupConfig = calculateOptimalAnchor([lng, lat], 340, 280);
          
          const popup = new mapboxgl.Popup({ 
            offset: popupConfig.offset,
            closeButton: true,
            closeOnClick: false,
            className: 'property-hover-popup cluster-popup',
            maxWidth: '320px',
            anchor: popupConfig.anchor
          }).setDOMContent(popupEl);
          
          // Track hover state for cluster
          let isHoveringCluster = false;
          let isHoveringPopup = false;
          let hoverTimeout;

          const closePopupIfNotHovering = () => {
            hoverTimeout = setTimeout(() => {
              if (!isHoveringCluster && !isHoveringPopup && activePopupRef.current === popup && pinnedPopupRef.current !== popup) {
                popup.remove();
                activePopupRef.current = null;
              }
            }, 1000);
          };

          // Show popup on cluster hover
          el.addEventListener('mouseenter', (e) => {

            clearTimeout(hoverTimeout);
            isHoveringCluster = true;
            
            // Close any existing non-pinned popup
            if (activePopupRef.current && activePopupRef.current !== pinnedPopupRef.current) {
              activePopupRef.current.remove();
            }
            
            const isPinned = pinnedPopupRef.current === popup;
            if (!isPinned) {
              popup.setLngLat([lng, lat]).addTo(map.current);
              
              const popupDOMElement = popup.getElement();
              if (popupDOMElement) {
                popupDOMElement.style.zIndex = '9999';
                popupDOMElement.style.pointerEvents = 'auto';
              }
              
              activePopupRef.current = popup;
            }
          }, true); // Use capture

          el.addEventListener('mouseleave', () => {
            isHoveringCluster = false;
            closePopupIfNotHovering();
          }, true); // Use capture

          // Keep popup open when hovering it
          popup.on('open', () => {
            const popupElement = popup.getElement();
            if (popupElement) {
              popupElement.addEventListener('mouseenter', () => {
                clearTimeout(hoverTimeout);
                hoverTimeout = null;
                isHoveringPopup = true;
              }, true);
              
              popupElement.addEventListener('mouseleave', () => {
                isHoveringPopup = false;
                if (!isHoveringCluster) {
                  closePopupIfNotHovering();
                }
              }, true);
            }
          });
        }

        el.addEventListener('click', () => {
          const expansionZoom = clusterIndex.current.getClusterExpansionZoom(cluster.id);
          map.current.easeTo({
            center: [lng, lat],
            zoom: expansionZoom + 0.5
          });
        });

        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'center'
        })
          .setLngLat([lng, lat])
          .addTo(map.current);

        markers.current.push(marker);
      } else {
        // Create individual property marker
        const property = cluster.properties;
        const hasExactGroup = property.exactGroupSize > 1;
        
        // Color coding: Orange = Grouped in same building, Purple = Single property
        const pinColor = hasExactGroup ? '#ff6b00' : '#667eea';

        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.dataset.isGrouped = hasExactGroup ? 'true' : 'false';
        el.dataset.propertyId = property._id || property.title;
        el.dataset.markerType = hasExactGroup ? 'grouped-building' : 'single';
        el.innerHTML = `
          <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; pointer-events: none;">
            <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z" fill="${pinColor}"/>
            <circle cx="16" cy="16" r="6" fill="white"/>
          </svg>
          ${hasExactGroup ? `
            <div style="
              position: absolute;
              top: -8px;
              right: -8px;
              background: #ef4444;
              color: white;
              border-radius: 50%;
              width: 20px;
              height: 20px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: 700;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              pointer-events: none;
            ">${property.exactGroupSize}</div>
          ` : ''}
        `;
        el.style.cssText = `
          cursor: pointer;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
          transition: filter 0.2s;
          width: 32px;
          height: 40px;
          pointer-events: auto;
        `;

        // Add hover popup and click behavior if enabled
        if (showPopups) {
          if (hasExactGroup) {

          }
          
          // Find all properties at this exact location using the exactGroupKey
          // IMPORTANT: Use allPropertiesRef.current instead of properties prop
          const propertiesAtLocation = hasExactGroup ? 
            allPropertiesRef.current.filter(p => {
              if (!p.coordinates) {

                return false;
              }
              const pLat = p.coordinates.lat || p.coordinates.latitude;
              const pLng = p.coordinates.lng || p.coordinates.longitude;
              if (!pLat || !pLng) {

                return false;
              }
              
              // Use same key generation as clustering (lat,lng order to match)
              const pKey = `${pLat.toFixed(4)},${pLng.toFixed(4)}`;
              const match = pKey === property.exactGroupKey;

              return match;
            }) : [property];

          if (hasExactGroup) {

          }
          
          // Ensure we have at least the current property
          if (propertiesAtLocation.length === 0) {
            propertiesAtLocation.push(property);
          }
          
          // Use different popup style for single vs multiple properties
          const isSingleProperty = propertiesAtLocation.length === 1;
          let popupEl, popupConfig;
          
          if (isSingleProperty) {
            // Single property - use card-style popup (original behavior)
            popupEl = createSinglePropertyPopup(propertiesAtLocation[0]);
            popupConfig = calculateOptimalAnchor([lng, lat], 280, 320); // Original single property dimensions
          } else {
            // Multiple properties - use list-style popup with fixed rectangle
            popupEl = createMultiPropertyPopup(propertiesAtLocation);
            popupConfig = calculateOptimalAnchor([lng, lat], 340, 280); // Fixed rectangle for 2+ properties
          }

          const popup = new mapboxgl.Popup({ 
            offset: popupConfig.offset,
            closeButton: true,
            closeOnClick: false,
            className: 'property-hover-popup',
            maxWidth: isSingleProperty ? '280px' : '340px',
            anchor: popupConfig.anchor
          }).setDOMContent(popupEl);

          // Track hover state
          let isHoveringMarker = false;
          let isHoveringPopup = false;
          let hoverTimeout;

          const closePopupIfNotHovering = () => {
            hoverTimeout = setTimeout(() => {
              if (!isHoveringMarker && !isHoveringPopup && activePopupRef.current === popup && pinnedPopupRef.current !== popup) {
                popup.remove();
                activePopupRef.current = null;
              }
            }, 1000); // 1000ms delay to give time to move mouse to popup
          };

          // Show popup on marker hover
          el.addEventListener('mouseenter', (event) => {
            // Check if this will trigger any zoom
            const currentZoom = map.current.getZoom();
            const currentCenter = map.current.getCenter();
            setTimeout(() => {
              const newZoom = map.current.getZoom();
              const newCenter = map.current.getCenter();
              if (newZoom !== currentZoom) {

              }
              if (currentCenter.lng !== newCenter.lng || currentCenter.lat !== newCenter.lat) {

              }
            }, 100);
            
            clearTimeout(hoverTimeout);
            isHoveringMarker = true;
            
            // Close any existing non-pinned popup
            if (activePopupRef.current && activePopupRef.current !== pinnedPopupRef.current) {
              activePopupRef.current.remove();
            }
            
            // Check if this popup is pinned
            const isPinned = pinnedPopupRef.current === popup;
            if (!isPinned) {
              if (hasExactGroup) {

              }
              // Set popup coordinates and add to map
              popup.setLngLat([lng, lat]).addTo(map.current);
              
              // Force z-index inline immediately after adding
              const popupDOMElement = popup.getElement();
              if (popupDOMElement) {
                popupDOMElement.style.zIndex = '9999';
                popupDOMElement.style.pointerEvents = 'auto';
              }
              
              activePopupRef.current = popup;
            }
          });

          // Hide popup when leaving marker (with delay)
          el.addEventListener('mouseleave', () => {
            isHoveringMarker = false;
            closePopupIfNotHovering();
          });

          // Keep popup open when hovering it
          popup.on('open', () => {
            const popupElement = popup.getElement();
            if (popupElement) {
              // Use capturing phase to catch events before they bubble
              popupElement.addEventListener('mouseenter', () => {
                clearTimeout(hoverTimeout);
                hoverTimeout = null; // Ensure timeout is cleared
                isHoveringPopup = true;
              }, true); // Capture phase
              
              popupElement.addEventListener('mouseleave', () => {
                isHoveringPopup = false;
                // Only close if also not hovering marker
                if (!isHoveringMarker) {
                  closePopupIfNotHovering();
                }
              }, true); // Capture phase
            }
          });

          // Click pin to keep popup open (sticky)
          el.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            if (hasExactGroup) {

            } else {

            }
            
            // Remove previous pinned popup
            if (pinnedPopupRef.current && pinnedPopupRef.current !== popup) {
              pinnedPopupRef.current.remove();
            }
            
            // Pin this popup
            pinnedPopupRef.current = popup;
            activePopupRef.current = popup;
            
            // Ensure popup is added to map
            if (!popup.isOpen()) {
              popup.setLngLat([lng, lat]).addTo(map.current);
            }
          }, { capture: true });

          // Handle popup close button
          popup.on('close', () => {
            if (pinnedPopupRef.current === popup) {
              pinnedPopupRef.current = null;
            }
            if (activePopupRef.current === popup) {
              activePopupRef.current = null;
            }
          });
        } else {

        }

        // Create marker and add to map
        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'bottom',
          offset: [0, 0]
        })
          .setLngLat([lng, lat])
          .addTo(map.current);

        markers.current.push(marker);
      }
    });
  };

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // If single property view
    if (singleProperty && singleProperty.coordinates) {
      const coords = singleProperty.coordinates;
      
      // Create marker element with pin icon
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.innerHTML = `
        <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 24 16 24s16-12 16-24c0-8.837-7.163-16-16-16z" fill="#667eea"/>
          <circle cx="16" cy="16" r="6" fill="white"/>
        </svg>
      `;
      el.style.cssText = `
        cursor: pointer;
        filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
        width: 32px;
        height: 40px;
      `;

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom',
        offset: [0, 0]
      })
        .setLngLat([coords.lng || coords.longitude, coords.lat || coords.latitude])
        .addTo(map.current);

      if (showPopups) {
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div style="padding: 8px;">
              <h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 600;">${singleProperty.title}</h3>
              <p style="margin: 0; color: #667eea; font-weight: 600; font-size: 16px;">
                ${singleProperty.currency || 'AZN'} ${singleProperty.price?.toLocaleString()}
              </p>
            </div>
          `);
        marker.setPopup(popup);
      }

      markers.current.push(marker);
      
      // Center map on property only once
      if (map.current.getZoom() === zoom) {
        map.current.flyTo({
          center: [coords.lng || coords.longitude, coords.lat || coords.latitude],
          zoom: 16,
          essential: true
        });
      }

      return;
    }

    // Multiple properties view - use clustering
    const propertiesWithCoords = properties.filter(p => p.coordinates && (p.coordinates.lat || p.coordinates.latitude));

    if (propertiesWithCoords.length === 0) return;
    
    // Store ALL properties for later matching (crucial for grouped pins)
    allPropertiesRef.current = propertiesWithCoords;

    // Group properties by exact same coordinates (must always be grouped)
    // Using 4 decimal places = ~11 meters tolerance (good for same building/complex)
    const exactGroups = {};
    propertiesWithCoords.forEach(property => {
      const lat = property.coordinates.lat || property.coordinates.latitude;
      const lng = property.coordinates.lng || property.coordinates.longitude;
      const key = `${lat.toFixed(4)},${lng.toFixed(4)}`; // 4 decimals = same building
      
      if (!exactGroups[key]) {
        exactGroups[key] = [];
      }
      exactGroups[key].push(property);
    });

    // Initialize Supercluster
    clusterIndex.current = new Supercluster({
      radius: 40, // Reduced from 60 - less aggressive clustering
      maxZoom: 18, // Increased from 16 - clusters break apart later
      minZoom: 0,
      minPoints: 2 // Minimum 2 points to form a cluster
    });

    // Convert properties to GeoJSON features
    const points = propertiesWithCoords.map((property, index) => {
      const lat = property.coordinates.lat || property.coordinates.latitude;
      const lng = property.coordinates.lng || property.coordinates.longitude;
      const exactKey = `${lat.toFixed(4)},${lng.toFixed(4)}`; // Match grouping tolerance
      const exactGroupSize = exactGroups[exactKey].length;
      
      return {
      type: 'Feature',
      properties: {
        ...property,
        thumbnail: property.images?.[0]?.thumbnail || property.images?.[0]?.medium || property.images?.[0] || '',
        medium: property.images?.[0]?.medium || property.images?.[0] || '',
        image: property.images?.[0] || '',
        exactGroupSize,
        exactGroupKey: exactKey
      },
      geometry: {
        type: 'Point',
        coordinates: [
          property.coordinates.lng || property.coordinates.longitude,
          property.coordinates.lat || property.coordinates.latitude
        ]
      }
    };
    });

    clusterIndex.current.load(points);

    // Update markers initially
    updateMarkers();

    // Update markers initially
    updateMarkers();

    // Fit bounds to show all markers only on initial load
    if (propertiesWithCoords.length > 1 && map.current.getZoom() === zoom) {
      const bounds = new mapboxgl.LngLatBounds();
      propertiesWithCoords.forEach(p => {
        bounds.extend([p.coordinates.lng || p.coordinates.longitude, p.coordinates.lat || p.coordinates.latitude]);
      });
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
    } else if (propertiesWithCoords.length === 1 && map.current.getZoom() === zoom) {
      const coords = propertiesWithCoords[0].coordinates;
      map.current.flyTo({
        center: [coords.lng || coords.longitude, coords.lat || coords.latitude],
        zoom: 12,
        essential: true
      });
    }

  }, [properties, singleProperty, showPopups, onMarkerClick, mapLoaded]);

  return (
    <div 
      ref={mapContainer} 
      style={{ 
        width: '100%', 
        height: height,
        borderRadius: '12px',
        overflow: 'hidden'
      }} 
    />
  );
};

export default PropertyMap;

