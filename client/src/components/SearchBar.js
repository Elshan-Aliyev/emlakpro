import React, { useState } from 'react';
import Button from './Button';
import Input from './Input';
import './SearchBar.css';

const SearchBar = ({
  onSearch,
  showFilters = false,
  filters = {},
  onFilterChange,
  mode = 'buy', // 'buy' or 'rent'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.({ query: searchQuery, ...filters });
  };

  const handleFilterChange = (key, value) => {
    onFilterChange?.({ ...filters, [key]: value });
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <div className="search-bar-main">
        <div className="search-input-wrapper">
          <Input
            placeholder="Search by location, city, or property name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<span>🔍</span>}
          />
        </div>

        <Button type="submit" size="lg">
          Search
        </Button>

        {showFilters && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Hide' : 'Show'} Filters
          </Button>
        )}
      </div>

      {showFilters && showAdvanced && (
        <div className="search-bar-filters">
          <div className="filter-grid">
            <div className="filter-item">
              <label className="filter-label">Property Type</label>
              <select
                className="filter-select"
                value={filters.propertyType || ''}
                onChange={(e) => handleFilterChange('propertyType', e.target.value)}
              >
                <option value="">All Types</option>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="villa">Villa</option>
                <option value="office">Office</option>
                <option value="land">Land</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            <div className="filter-item">
              <label className="filter-label">Min Price</label>
              <input
                type="number"
                className="filter-input"
                placeholder="Min"
                value={filters.priceMin || ''}
                onChange={(e) => handleFilterChange('priceMin', e.target.value)}
              />
            </div>

            <div className="filter-item">
              <label className="filter-label">Max Price</label>
              <input
                type="number"
                className="filter-input"
                placeholder="Max"
                value={filters.priceMax || ''}
                onChange={(e) => handleFilterChange('priceMax', e.target.value)}
              />
            </div>

            <div className="filter-item">
              <label className="filter-label">Bedrooms</label>
              <select
                className="filter-select"
                value={filters.bedrooms || ''}
                onChange={(e) => handleFilterChange('bedrooms', e.target.value)}
              >
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
                <option value="5">5+</option>
              </select>
            </div>

            <div className="filter-item">
              <label className="filter-label">Bathrooms</label>
              <select
                className="filter-select"
                value={filters.bathrooms || ''}
                onChange={(e) => handleFilterChange('bathrooms', e.target.value)}
              >
                <option value="">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
            </div>

            <div className="filter-item">
              <label className="filter-label">Area (m²)</label>
              <input
                type="number"
                className="filter-input"
                placeholder="Min area"
                value={filters.minArea || ''}
                onChange={(e) => handleFilterChange('minArea', e.target.value)}
              />
            </div>

            {mode === 'rent' && (
              <>
                <div className="filter-item">
                  <label className="filter-label">Furnished</label>
                  <select
                    className="filter-select"
                    value={filters.furnished || ''}
                    onChange={(e) => handleFilterChange('furnished', e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="yes">Furnished</option>
                    <option value="no">Unfurnished</option>
                  </select>
                </div>

                <div className="filter-item">
                  <label className="filter-label">Available From</label>
                  <input
                    type="date"
                    className="filter-input"
                    value={filters.availableFrom || ''}
                    onChange={(e) => handleFilterChange('availableFrom', e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="filter-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setSearchQuery('');
                onFilterChange?.({});
              }}
            >
              Clear All
            </Button>
          </div>
        </div>
      )}
    </form>
  );
};

export default SearchBar;
