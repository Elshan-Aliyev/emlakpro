import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getRealtors, getRealtorReviews } from '../services/api';
import { getAvatarUrl } from '../utils/imageUtils';
import Button from '../components/Button';
import Input from '../components/Input';
import './FindRealtor.css';

const FindRealtor = () => {
  const { user } = useAuth();
  const [realtors, setRealtors] = useState([]);
  const [filteredRealtors, setFilteredRealtors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    location: '',
    company: '',
    minSales: 0,
    minRating: 0,
    specialization: '',
    language: '',
    searchKeyword: ''
  });

  useEffect(() => {
    fetchRealtors();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, realtors]);

  const fetchRealtors = async () => {
    try {
      const res = await getRealtors();
      
      // Data already filtered on backend (realtors and corporate accounts only)
      const realtorUsers = res.data;

      // Fetch reviews for each realtor
      const realtorsWithReviews = await Promise.all(
        realtorUsers.map(async (realtor) => {
          try {
            const reviewRes = await getRealtorReviews(realtor._id, { status: 'approved' });
            return {
              ...realtor,
              reviewStats: reviewRes.data.stats || {
                averageRating: 0,
                totalReviews: 0
              }
            };
          } catch (err) {
            return {
              ...realtor,
              reviewStats: { averageRating: 0, totalReviews: 0 }
            };
          }
        })
      );

      setRealtors(realtorsWithReviews);
      setFilteredRealtors(realtorsWithReviews);
    } catch (err) {
      console.error('Error fetching realtors:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...realtors];

    // Location filter
    if (filters.location) {
      filtered = filtered.filter(r => 
        r.address?.city?.toLowerCase().includes(filters.location.toLowerCase()) ||
        r.address?.province?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Company filter
    if (filters.company) {
      filtered = filtered.filter(r =>
        r.companyName?.toLowerCase().includes(filters.company.toLowerCase()) ||
        r.brokerage?.toLowerCase().includes(filters.company.toLowerCase())
      );
    }

    // Min sales filter
    if (filters.minSales > 0) {
      filtered = filtered.filter(r => (r.totalSoldProperties || 0) >= filters.minSales);
    }

    // Min rating filter
    if (filters.minRating > 0) {
      filtered = filtered.filter(r => 
        (r.reviewStats?.averageRating || 0) >= filters.minRating
      );
    }

    // Specialization filter
    if (filters.specialization) {
      filtered = filtered.filter(r =>
        r.realtorStats?.specializations?.includes(filters.specialization)
      );
    }

    // Language filter
    if (filters.language) {
      filtered = filtered.filter(r =>
        r.realtorStats?.languages?.some(lang => 
          lang.toLowerCase().includes(filters.language.toLowerCase())
        )
      );
    }

    // Keyword search
    if (filters.searchKeyword) {
      const keyword = filters.searchKeyword.toLowerCase();
      filtered = filtered.filter(r =>
        r.name?.toLowerCase().includes(keyword) ||
        r.lastName?.toLowerCase().includes(keyword) ||
        r.bio?.toLowerCase().includes(keyword) ||
        r.companyName?.toLowerCase().includes(keyword)
      );
    }

    setFilteredRealtors(filtered);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      location: '',
      company: '',
      minSales: 0,
      minRating: 0,
      specialization: '',
      language: '',
      searchKeyword: ''
    });
  };

  if (loading) {
    return (
      <div className="find-realtor-page">
        <div className="loading-state">
          <div className="spinner">⏳</div>
          <p>Loading realtors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="find-realtor-page">
      <div className="find-realtor-container">
        {/* Header */}
        <div className="find-realtor-header">
          <h1>Find a Realtor</h1>
          <p>Connect with verified real estate professionals</p>
        </div>

        {/* Filters */}
        <div className="realtor-filters">
          <div className="filter-row">
            <Input
              type="text"
              placeholder="🔍 Search by name or company..."
              value={filters.searchKeyword}
              onChange={(e) => handleFilterChange('searchKeyword', e.target.value)}
            />
            
            <Input
              type="text"
              placeholder="📍 Location"
              value={filters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
            />
            
            <Input
              type="text"
              placeholder="🏢 Company"
              value={filters.company}
              onChange={(e) => handleFilterChange('company', e.target.value)}
            />
          </div>

          <div className="filter-row">
            <select
              value={filters.minSales}
              onChange={(e) => handleFilterChange('minSales', Number(e.target.value))}
              className="filter-select"
            >
              <option value={0}>Any Sales</option>
              <option value={5}>5+ Sales</option>
              <option value={10}>10+ Sales</option>
              <option value={25}>25+ Sales</option>
              <option value={50}>50+ Sales</option>
              <option value={100}>100+ Sales</option>
            </select>

            <select
              value={filters.minRating}
              onChange={(e) => handleFilterChange('minRating', Number(e.target.value))}
              className="filter-select"
            >
              <option value={0}>Any Rating</option>
              <option value={3}>3+ Stars</option>
              <option value={4}>4+ Stars</option>
              <option value={4.5}>4.5+ Stars</option>
            </select>

            <select
              value={filters.specialization}
              onChange={(e) => handleFilterChange('specialization', e.target.value)}
              className="filter-select"
            >
              <option value="">All Specializations</option>
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="luxury">Luxury</option>
              <option value="investment">Investment</option>
              <option value="rental">Rental</option>
            </select>

            <Input
              type="text"
              placeholder="🗣️ Language"
              value={filters.language}
              onChange={(e) => handleFilterChange('language', e.target.value)}
            />
          </div>

          <div className="filter-actions">
            <Button variant="secondary" onClick={clearFilters}>
              Clear Filters
            </Button>
            <span className="results-count">
              {filteredRealtors.length} realtor{filteredRealtors.length !== 1 ? 's' : ''} found
            </span>
          </div>
        </div>

        {/* Realtors Grid */}
        {filteredRealtors.length === 0 ? (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3>No Realtors Found</h3>
            <p>Try adjusting your filters to see more results</p>
            <Button onClick={clearFilters}>Clear All Filters</Button>
          </div>
        ) : (
          <div className="realtors-grid">
            {filteredRealtors.map((realtor) => (
              <div key={realtor._id} className="realtor-card">
                <div className="realtor-card-header">
                  <div className="realtor-avatar">
                    <img 
                      src={getAvatarUrl(realtor.profileImage || realtor.avatar)} 
                      alt={realtor.name}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="avatar-placeholder" style={{ display: 'none' }}>
                      {realtor.name?.charAt(0)}{realtor.lastName?.charAt(0)}
                    </div>
                  </div>
                  
                  <div className="realtor-badge">
                    {realtor.accountType === 'corporate' ? '🏢 Corporate' : '✓ Realtor'}
                  </div>
                </div>

                <div className="realtor-info">
                  <h3>{realtor.name} {realtor.lastName}</h3>
                  
                  {realtor.companyName && (
                    <p className="realtor-company">{realtor.companyName}</p>
                  )}
                  
                  {realtor.realtorStats?.yearsOfExperience > 0 && (
                    <p className="realtor-experience">
                      {realtor.realtorStats.yearsOfExperience} years experience
                    </p>
                  )}

                  {realtor.bio && (
                    <p className="realtor-bio">{realtor.bio.substring(0, 120)}...</p>
                  )}
                </div>

                <div className="realtor-stats">
                  <div className="stat">
                    <span className="stat-value">{realtor.totalSoldProperties || 0}</span>
                    <span className="stat-label">Sales</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">
                      {realtor.reviewStats?.averageRating?.toFixed(1) || 'N/A'}
                      {realtor.reviewStats?.averageRating > 0 && ' ⭐'}
                    </span>
                    <span className="stat-label">Rating</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{realtor.reviewStats?.totalReviews || 0}</span>
                    <span className="stat-label">Reviews</span>
                  </div>
                </div>

                {realtor.realtorStats?.specializations?.length > 0 && (
                  <div className="realtor-tags">
                    {realtor.realtorStats.specializations.slice(0, 3).map((spec, idx) => (
                      <span key={idx} className="tag">{spec}</span>
                    ))}
                  </div>
                )}

                <div className="realtor-actions">
                  <Link to={`/realtor/${realtor._id}`}>
                    <Button>View Profile</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FindRealtor;
