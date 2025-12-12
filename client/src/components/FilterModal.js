import React from 'react';
import Modal from './Modal';
import './FilterBar.css';

const FilterModal = ({ isOpen, onClose, filters, onFilterChange, onApply, onReset }) => {
  const handleApply = () => {
    onApply();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="All Filters" size="xl">
      <div className="filter-modal-content">
        {/* Listing Status */}
        <div className="filter-modal-section">
          <label className="filter-modal-label">Listing Status</label>
          <div className="filter-modal-radio-group">
            <label className="filter-modal-radio">
              <input
                type="radio"
                name="listingStatus"
                value=""
                checked={!filters.listingStatus}
                onChange={(e) => onFilterChange('listingStatus', '')}
              />
              <span>All</span>
            </label>
            <label className="filter-modal-radio">
              <input
                type="radio"
                name="listingStatus"
                value="for-sale"
                checked={filters.listingStatus === 'for-sale'}
                onChange={(e) => onFilterChange('listingStatus', 'for-sale')}
              />
              <span>For Sale</span>
            </label>
            <label className="filter-modal-radio">
              <input
                type="radio"
                name="listingStatus"
                value="for-rent"
                checked={filters.listingStatus === 'for-rent'}
                onChange={(e) => onFilterChange('listingStatus', 'for-rent')}
              />
              <span>For Rent</span>
            </label>
          </div>
        </div>

        {/* Purpose */}
        <div className="filter-modal-section">
          <label className="filter-modal-label">Purpose</label>
          <select
            className="filter-modal-select"
            value={filters.purpose || ''}
            onChange={(e) => {
              onFilterChange('purpose', e.target.value);
              // Reset rental term if not residential
              if (e.target.value !== 'residential') {
                onFilterChange('rentalTerm', '');
              }
            }}
          >
            <option value="">All</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>

        {/* Rental Term - Show only for rent + residential */}
        {filters.listingStatus === 'for-rent' && filters.purpose === 'residential' && (
          <div className="filter-modal-section">
            <label className="filter-modal-label">Rental Term</label>
            <select
              className="filter-modal-select"
              value={filters.rentalTerm || ''}
              onChange={(e) => onFilterChange('rentalTerm', e.target.value)}
            >
              <option value="">All Terms</option>
              <option value="long-term">Long Term</option>
              <option value="short-term">Short Term</option>
            </select>
          </div>
        )}

        {/* Property Type */}
        <div className="filter-modal-section">
          <label className="filter-modal-label">Property Type</label>
          <select
            className="filter-modal-select"
            value={filters.propertyType || ''}
            onChange={(e) => onFilterChange('propertyType', e.target.value)}
          >
            <option value="">All Types</option>
            {/* Residential */}
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="townhouse">Townhouse</option>
            <option value="villa">Villa</option>
            <option value="penthouse">Penthouse</option>
            <option value="studio">Studio</option>
            <option value="duplex">Duplex</option>
            {/* Commercial */}
            <option value="commercial-retail">Commercial Retail</option>
            <option value="commercial-unit">Commercial Unit</option>
            <option value="office">Office</option>
            <option value="industrial">Industrial</option>
            <option value="warehouse">Warehouse</option>
            <option value="shop">Shop</option>
            <option value="restaurant">Restaurant</option>
            {/* Land */}
            <option value="land">Land</option>
            <option value="farm">Farm</option>
            {/* Short-term / Unique */}
            <option value="cabin">Cabin</option>
            <option value="cottage">Cottage</option>
            <option value="bungalow">Bungalow</option>
            <option value="chalet">Chalet</option>
            <option value="loft">Loft</option>
            <option value="tiny-house">Tiny House</option>
            <option value="mobile-home">Mobile Home</option>
            <option value="rv">RV</option>
            <option value="camper-van">Camper Van</option>
            <option value="boat">Boat</option>
            <option value="treehouse">Treehouse</option>
            <option value="dome">Dome</option>
            <option value="a-frame">A-Frame</option>
            <option value="barn">Barn</option>
            <option value="castle">Castle</option>
            <option value="cave">Cave</option>
            <option value="windmill">Windmill</option>
            <option value="lighthouse">Lighthouse</option>
            <option value="room">Room</option>
            <option value="shared-room">Shared Room</option>
            <option value="entire-place">Entire Place</option>
          </select>
        </div>

        {/* Price Range */}
        <div className="filter-modal-section">
          <label className="filter-modal-label">Price Range (₼)</label>
          <div className="filter-modal-row">
            <div className="filter-modal-row-item">
              <input
                type="number"
                className="filter-modal-input"
                placeholder="Min Price"
                value={filters.minPrice || ''}
                onChange={(e) => onFilterChange('minPrice', e.target.value)}
              />
            </div>
            <div className="filter-modal-row-item">
              <input
                type="number"
                className="filter-modal-input"
                placeholder="Max Price"
                value={filters.maxPrice || ''}
                onChange={(e) => onFilterChange('maxPrice', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Area Range */}
        <div className="filter-modal-section">
          <label className="filter-modal-label">Area (m²)</label>
          <div className="filter-modal-row">
            <div className="filter-modal-row-item">
              <input
                type="number"
                className="filter-modal-input"
                placeholder="Min Area"
                value={filters.minArea || ''}
                onChange={(e) => onFilterChange('minArea', e.target.value)}
              />
            </div>
            <div className="filter-modal-row-item">
              <input
                type="number"
                className="filter-modal-input"
                placeholder="Max Area"
                value={filters.maxArea || ''}
                onChange={(e) => onFilterChange('maxArea', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Bedrooms */}
        <div className="filter-modal-section">
          <label className="filter-modal-label">Bedrooms</label>
          <div className="filter-modal-btn-group">
            {['Any', '1', '2', '3', '4', '5+'].map((beds) => (
              <button
                key={beds}
                className={`filter-modal-btn-option ${
                  filters.bedrooms === (beds === 'Any' ? '' : beds === '5+' ? '5' : beds)
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  onFilterChange('bedrooms', beds === 'Any' ? '' : beds === '5+' ? '5' : beds)
                }
              >
                {beds}
              </button>
            ))}
          </div>
        </div>

        {/* Bathrooms */}
        <div className="filter-modal-section">
          <label className="filter-modal-label">Bathrooms</label>
          <div className="filter-modal-btn-group">
            {['Any', '1', '2', '3', '4+'].map((baths) => (
              <button
                key={baths}
                className={`filter-modal-btn-option ${
                  filters.bathrooms === (baths === 'Any' ? '' : baths === '4+' ? '4' : baths)
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  onFilterChange('bathrooms', baths === 'Any' ? '' : baths === '4+' ? '4' : baths)
                }
              >
                {baths}
              </button>
            ))}
          </div>
        </div>

        {/* Amenities */}
        <div className="filter-modal-section">
          <label className="filter-modal-label">Amenities</label>
          <div className="filter-modal-checkbox-grid">
            {[
              { value: 'parking', label: 'Parking' },
              { value: 'balcony', label: 'Balcony' },
              { value: 'elevator', label: 'Elevator' },
              { value: 'gym', label: 'Gym' },
              { value: 'pool', label: 'Swimming Pool' },
              { value: 'security', label: '24/7 Security' },
            ].map((amenity) => (
              <label key={amenity.value} className="filter-modal-checkbox">
                <input
                  type="checkbox"
                  checked={filters.amenities?.includes(amenity.value)}
                  onChange={(e) => {
                    const current = filters.amenities || [];
                    const updated = e.target.checked
                      ? [...current, amenity.value]
                      : current.filter((a) => a !== amenity.value);
                    onFilterChange('amenities', updated);
                  }}
                />
                <span>{amenity.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Year Built */}
        <div className="filter-modal-section">
          <label className="filter-modal-label">Year Built</label>
          <div className="filter-modal-row">
            <div className="filter-modal-row-item">
              <input
                type="number"
                className="filter-modal-input"
                placeholder="From Year"
                value={filters.yearBuiltMin || ''}
                onChange={(e) => onFilterChange('yearBuiltMin', e.target.value)}
              />
            </div>
            <div className="filter-modal-row-item">
              <input
                type="number"
                className="filter-modal-input"
                placeholder="To Year"
                value={filters.yearBuiltMax || ''}
                onChange={(e) => onFilterChange('yearBuiltMax', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Number of Stories */}
        <div className="filter-modal-section">
          <label className="filter-modal-label">Number of Stories</label>
          <select
            className="filter-modal-select"
            value={filters.stories || ''}
            onChange={(e) => onFilterChange('stories', e.target.value)}
          >
            <option value="">Any</option>
            <option value="1">1 Story</option>
            <option value="2">2 Stories</option>
            <option value="3">3 Stories</option>
            <option value="4">4 Stories</option>
            <option value="5">5+ Stories</option>
          </select>
        </div>

        {/* View */}
        <div className="filter-modal-section">
          <label className="filter-modal-label">View</label>
          <select
            className="filter-modal-select"
            value={filters.view || ''}
            onChange={(e) => onFilterChange('view', e.target.value)}
          >
            <option value="">Any View</option>
            <option value="city">City View</option>
            <option value="sea">Sea View</option>
            <option value="mountain">Mountain View</option>
            <option value="park">Park View</option>
            <option value="street">Street View</option>
            <option value="other">Other View</option>
          </select>
        </div>

        {/* Parking Spots */}
        <div className="filter-modal-section">
          <label className="filter-modal-label">Parking Spots</label>
          <select
            className="filter-modal-select"
            value={filters.parkingSpots || ''}
            onChange={(e) => onFilterChange('parkingSpots', e.target.value)}
          >
            <option value="">Any</option>
            <option value="0">No Parking</option>
            <option value="1">1 Spot</option>
            <option value="2">2 Spots</option>
            <option value="3">3 Spots</option>
            <option value="4">4+ Spots</option>
          </select>
        </div>

        {/* Listed Since */}
        <div className="filter-modal-section">
          <label className="filter-modal-label">Listed Since</label>
          <select
            className="filter-modal-select"
            value={filters.listedSince || ''}
            onChange={(e) => onFilterChange('listedSince', e.target.value)}
          >
            <option value="">Any Time</option>
            <option value="1">Last 24 Hours</option>
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 3 Months</option>
            <option value="180">Last 6 Months</option>
          </select>
        </div>

        {/* Keywords */}
        <div className="filter-modal-section">
          <label className="filter-modal-label">Keywords</label>
          <input
            type="text"
            className="filter-modal-input"
            placeholder="Enter keywords (e.g., renovated, furnished, luxury)"
            value={filters.keywords || ''}
            onChange={(e) => onFilterChange('keywords', e.target.value)}
          />
        </div>
        <div className="filter-modal-section">
          <label className="filter-modal-label">Sort By</label>
          <select
            className="filter-modal-select"
            value={filters.sortBy || 'newest'}
            onChange={(e) => onFilterChange('sortBy', e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="area-asc">Area: Small to Large</option>
            <option value="area-desc">Area: Large to Small</option>
          </select>
        </div>

        {/* Show Sold */}
        <div className="filter-modal-section">
          <label className="filter-modal-checkbox">
            <input
              type="checkbox"
              checked={filters.showSold || false}
              onChange={(e) => onFilterChange('showSold', e.target.checked)}
            />
            <span>Show Sold Properties</span>
          </label>
        </div>
      </div>

      {/* Modal Footer with Reset and Apply Buttons */}
      <div className="filter-modal-actions">
        <button className="filter-modal-btn-reset" onClick={onReset}>
          Reset Filters
        </button>
        <button className="filter-modal-btn-search" onClick={handleApply}>
          Apply Filters
        </button>
      </div>
    </Modal>
  );
};

export default FilterModal;
