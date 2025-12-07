import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminArticles, deleteArticle, createArticle, updateArticle, uploadArticleImage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import './AdminArticles.css';

const AdminArticles = () => {
  const { token } = useAuth();
  const { success, error: showError } = useToast();
  const navigate = useNavigate();
  
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [heading, setHeading] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState('draft');
  const [featuredImage, setFeaturedImage] = useState(null);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  const categories = [
    'buying-guide',
    'selling-tips',
    'market-news',
    'investment',
    'legal',
    'maintenance',
    'lifestyle',
    'technology',
    'general'
  ];

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const res = await getAdminArticles(token, { limit: 100 });
      setArticles(res.data.articles);
    } catch (err) {
      console.error('Error fetching articles:', err);
      showError('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (article = null) => {
    if (article) {
      setEditingArticle(article);
      setTitle(article.title);
      setHeading(article.heading);
      setExcerpt(article.excerpt);
      setContent(article.content);
      setCategory(article.category);
      setTags(article.tags?.join(', ') || '');
      setStatus(article.status);
      setFeaturedImage(article.featuredImage);
      setMetaTitle(article.metaTitle || '');
      setMetaDescription(article.metaDescription || '');
      setIsFeatured(article.isFeatured || false);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingArticle(null);
    setTitle('');
    setHeading('');
    setExcerpt('');
    setContent('');
    setCategory('general');
    setTags('');
    setStatus('draft');
    setFeaturedImage(null);
    setMetaTitle('');
    setMetaDescription('');
    setIsFeatured(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);

      const res = await uploadArticleImage(formData, token);
      setFeaturedImage(res.data.image);
      success('Image uploaded successfully');
    } catch (err) {
      console.error('Error uploading image:', err);
      showError('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !heading || !excerpt || !content) {
      showError('Please fill in all required fields');
      return;
    }

    try {
      const articleData = {
        title,
        heading,
        excerpt,
        content,
        category,
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        status,
        featuredImage,
        metaTitle,
        metaDescription,
        isFeatured
      };

      if (editingArticle) {
        await updateArticle(editingArticle._id, articleData, token);
        success('Article updated successfully');
      } else {
        await createArticle(articleData, token);
        success('Article created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchArticles();
    } catch (err) {
      console.error('Error saving article:', err);
      showError(err.response?.data?.message || 'Failed to save article');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this article?')) return;

    try {
      await deleteArticle(id, token);
      success('Article deleted successfully');
      fetchArticles();
    } catch (err) {
      console.error('Error deleting article:', err);
      showError('Failed to delete article');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published': return '#10b981';
      case 'draft': return '#f59e0b';
      case 'archived': return '#6b7280';
      default: return '#6b7280';
    }
  };

  return (
    <div className="admin-articles-page">
      <div className="admin-articles-container">
        <div className="admin-articles-header">
          <div>
            <h1>Manage Articles</h1>
            <p>Create and manage blog posts and resources</p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            ✏️ New Article
          </Button>
        </div>

        {loading ? (
          <div className="loading-state">Loading articles...</div>
        ) : (
          <div className="articles-table-container">
            <table className="articles-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Views</th>
                  <th>Likes</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles.map(article => (
                  <tr key={article._id}>
                    <td>
                      <div className="article-cell-title">
                        {article.isFeatured && <span className="featured-badge">⭐</span>}
                        <strong>{article.title}</strong>
                        <small>{article.heading}</small>
                      </div>
                    </td>
                    <td>{article.category}</td>
                    <td>
                      <span 
                        className="status-badge"
                        style={{ background: getStatusColor(article.status) }}
                      >
                        {article.status}
                      </span>
                    </td>
                    <td>{article.views || 0}</td>
                    <td>{article.likes || 0}</td>
                    <td>
                      {new Date(article.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="article-actions">
                        <button 
                          className="action-btn edit"
                          onClick={() => handleOpenModal(article)}
                        >
                          ✏️
                        </button>
                        <button 
                          className="action-btn delete"
                          onClick={() => handleDelete(article._id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {articles.length === 0 && (
              <div className="empty-state">
                <p>No articles yet. Create your first one!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingArticle ? 'Edit Article' : 'Create New Article'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="article-form">
          <Input
            label="Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Article title"
          />

          <Input
            label="Heading *"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            required
            placeholder="Short subheading"
          />

          <div className="form-group">
            <label>Excerpt * <small>(Max 300 characters)</small></label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              required
              maxLength={300}
              rows={3}
              placeholder="Brief summary for article list"
            />
            <small>{excerpt.length}/300</small>
          </div>

          <div className="form-group">
            <label>Content * <small>(Supports HTML)</small></label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={12}
              placeholder="Full article content (HTML allowed)"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.replace('-', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <Input
            label="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="real estate, buying, investment"
          />

          <div className="form-group">
            <label>Featured Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImage}
            />
            {uploadingImage && <small>Uploading...</small>}
            {featuredImage && (
              <div className="image-preview">
                <img src={featuredImage.thumbnail || featuredImage.medium} alt="Preview" />
              </div>
            )}
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
              />
              <span style={{ marginLeft: '8px' }}>Feature this article</span>
            </label>
          </div>

          <details className="seo-section">
            <summary>SEO Settings (Optional)</summary>
            <Input
              label="Meta Title"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              placeholder="SEO title (leave blank to use article title)"
            />
            <Input
              label="Meta Description"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="SEO description"
            />
          </details>

          <div className="modal-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingArticle ? 'Update Article' : 'Create Article'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminArticles;
