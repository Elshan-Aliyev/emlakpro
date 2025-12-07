import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getArticles } from '../services/api';
import Button from '../components/Button';
import './Resources.css';

const Resources = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const categories = [
    { value: '', label: 'All Articles' },
    { value: 'buying-guide', label: 'Buying Guide' },
    { value: 'selling-tips', label: 'Selling Tips' },
    { value: 'market-news', label: 'Market News' },
    { value: 'investment', label: 'Investment' },
    { value: 'legal', label: 'Legal' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'lifestyle', label: 'Lifestyle' },
    { value: 'technology', label: 'Technology' }
  ];

  useEffect(() => {
    fetchArticles();
  }, [category, page]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 10 };
      if (category) params.category = category;
      
      const res = await getArticles(params);
      setArticles(res.data.articles);
      setTotalPages(res.data.pages);
    } catch (err) {
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    setPage(1);
  };

  const getImageUrl = (image) => {
    if (!image) return null;
    return image.medium || image.large || image.full || image.thumbnail;
  };

  return (
    <div className="resources-page">
      <div className="resources-container">
        {/* Header */}
        <div className="resources-header">
          <h1>Resources & Insights</h1>
          <p>Expert guides, tips, and market insights for buyers, sellers, and investors</p>
        </div>

        {/* Category Filter */}
        <div className="resources-filters">
          <div className="category-tabs">
            {categories.map(cat => (
              <button
                key={cat.value}
                className={`category-tab ${category === cat.value ? 'active' : ''}`}
                onClick={() => handleCategoryChange(cat.value)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Articles List */}
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading articles...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="empty-state">
            <p>📝 No articles found in this category</p>
          </div>
        ) : (
          <>
            <div className="articles-list">
              {articles.map((article) => (
                <article key={article._id} className="article-item">
                  <Link to={`/resources/${article.slug}`} className="article-link">
                    <div className="article-image">
                      {article.featuredImage ? (
                        <img 
                          src={getImageUrl(article.featuredImage)} 
                          alt={article.featuredImage.altText || article.title}
                        />
                      ) : (
                        <div className="article-image-placeholder">
                          📄
                        </div>
                      )}
                      <div className="article-category-badge">
                        {categories.find(c => c.value === article.category)?.label || article.category}
                      </div>
                    </div>

                    <div className="article-content">
                      <h2 className="article-title">{article.title}</h2>
                      <h3 className="article-heading">{article.heading}</h3>
                      <p className="article-excerpt">{article.excerpt}</p>
                      
                      <div className="article-meta">
                        <span className="article-date">
                          {new Date(article.publishedAt || article.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="article-stats">
                          👁️ {article.views || 0} views
                        </span>
                      </div>

                      <Button variant="outline" size="sm" className="read-more-btn">
                        Read More →
                      </Button>
                    </div>
                  </Link>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Previous
                </Button>
                <span className="page-info">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next →
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Resources;
