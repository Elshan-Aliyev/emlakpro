import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getArticleBySlug, incrementArticleViews, toggleArticleLike } from '../services/api';
import Button from '../components/Button';
import './ArticleDetail.css';

const ArticleDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    fetchArticle();
  }, [slug]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const res = await getArticleBySlug(slug);
      setArticle(res.data);
      
      // Increment views (fire and forget)
      incrementArticleViews(res.data._id).catch(err => console.error('View increment failed:', err));
    } catch (err) {
      console.error('Error fetching article:', err);
      if (err.response?.status === 404) {
        navigate('/resources');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!article) return;
    
    try {
      const res = await toggleArticleLike(article._id);
      setArticle({ ...article, likes: res.data.likes });
      setLiked(true);
    } catch (err) {
      console.error('Error liking article:', err);
    }
  };

  const getImageUrl = (image) => {
    if (!image) return null;
    return image.large || image.full || image.medium;
  };

  if (loading) {
    return (
      <div className="article-detail-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading article...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="article-detail-page">
        <div className="empty-state">
          <p>Article not found</p>
          <Link to="/resources">
            <Button>← Back to Resources</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="article-detail-page">
      <div className="article-detail-container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/resources">Resources</Link>
          <span>/</span>
          <span>{article.title}</span>
        </div>

        {/* Article Header */}
        <header className="article-header">
          <div className="article-category-badge">{article.category}</div>
          <h1 className="article-title">{article.title}</h1>
          <h2 className="article-heading">{article.heading}</h2>
          
          <div className="article-meta">
            <div className="author-info">
              {article.author && (
                <>
                  <span className="author-name">
                    By {article.author.name} {article.author.lastName}
                  </span>
                  {article.author.accountType && (
                    <span className="author-role">• {article.author.accountType}</span>
                  )}
                </>
              )}
            </div>
            <div className="article-stats">
              <span>
                📅 {new Date(article.publishedAt || article.createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
              <span>• 👁️ {article.views || 0} views</span>
              <span>• ❤️ {article.likes || 0} likes</span>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {article.featuredImage && (
          <div className="featured-image">
            <img 
              src={getImageUrl(article.featuredImage)} 
              alt={article.featuredImage.altText || article.title}
            />
          </div>
        )}

        {/* Article Content */}
        <article className="article-body">
          <div 
            className="article-content"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </article>

        {/* Article Actions */}
        <div className="article-actions">
          <Button 
            variant={liked ? "primary" : "outline"}
            onClick={handleLike}
            disabled={liked}
          >
            ❤️ {liked ? 'Liked!' : 'Like this article'}
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            🖨️ Print
          </Button>
        </div>

        {/* Related Articles */}
        {article.relatedArticles && article.relatedArticles.length > 0 && (
          <div className="related-articles">
            <h3>Related Articles</h3>
            <div className="related-articles-grid">
              {article.relatedArticles.map(related => (
                <Link 
                  key={related._id}
                  to={`/resources/${related.slug}`}
                  className="related-article-card"
                >
                  {related.featuredImage && (
                    <img 
                      src={related.featuredImage.thumbnail || related.featuredImage.medium} 
                      alt={related.title}
                    />
                  )}
                  <div>
                    <h4>{related.title}</h4>
                    <p>{related.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back Button */}
        <div className="article-footer">
          <Link to="/resources">
            <Button variant="outline">← Back to All Articles</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ArticleDetail;
