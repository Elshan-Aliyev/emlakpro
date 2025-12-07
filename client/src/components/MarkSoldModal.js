import React, { useState } from 'react';
import { markPropertySold } from '../services/api';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import { useToast } from './Toast';
import './MarkSoldModal.css';

const MarkSoldModal = ({ property, onClose, onSuccess }) => {
  const { success: showSuccess, error: showError } = useToast();
  const [formData, setFormData] = useState({
    buyerFirstName: '',
    buyerLastName: '',
    buyerEmail: '',
    buyerId: '',
    soldPrice: property?.price || '',
    transactionType: property?.listingStatus === 'for-rent' ? 'rent' : 'sale'
  });
  const [loading, setLoading] = useState(false);
  const [userFound, setUserFound] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmailBlur = async () => {
    // This would ideally call an API to check if user exists
    // For now, we'll just show a message
    if (formData.buyerEmail && formData.buyerEmail.includes('@')) {
      // Placeholder - in real app, check via API
      setUserFound(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.buyerFirstName || !formData.buyerLastName) {
      showError('Please provide buyer first and last name');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await markPropertySold(property._id, formData, token);
      
      showSuccess(
        `Property marked as ${formData.transactionType === 'sale' ? 'sold' : 'rented'}!`
      );
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error marking property as sold:', err);
      showError(
        err.response?.data?.message || 'Failed to mark property as sold'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Mark Property as Sold/Rented">
      <form onSubmit={handleSubmit} className="mark-sold-form">
        <div className="form-section">
          <h3>Transaction Type</h3>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name="transactionType"
                value="sale"
                checked={formData.transactionType === 'sale'}
                onChange={handleChange}
              />
              <span>Sale</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="transactionType"
                value="rent"
                checked={formData.transactionType === 'rent'}
                onChange={handleChange}
              />
              <span>Rent</span>
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>Buyer/Tenant Information</h3>
          
          <div className="form-row">
            <Input
              label="First Name *"
              type="text"
              name="buyerFirstName"
              value={formData.buyerFirstName}
              onChange={handleChange}
              required
            />
            
            <Input
              label="Last Name *"
              type="text"
              name="buyerLastName"
              value={formData.buyerLastName}
              onChange={handleChange}
              required
            />
          </div>

          <Input
            label="Email (Optional)"
            type="email"
            name="buyerEmail"
            value={formData.buyerEmail}
            onChange={handleChange}
            onBlur={handleEmailBlur}
            placeholder="Will auto-fill User ID if registered"
          />
          
          {userFound && (
            <div className="user-found-notice">
              ✓ Registered user found: {userFound.name}
            </div>
          )}

          <Input
            label="User ID (Optional)"
            type="text"
            name="buyerId"
            value={formData.buyerId}
            onChange={handleChange}
            placeholder="If registered user"
            disabled={!!userFound}
          />
        </div>

        <div className="form-section">
          <h3>Transaction Details</h3>
          
          <Input
            label={`${formData.transactionType === 'sale' ? 'Sale' : 'Rental'} Price`}
            type="number"
            name="soldPrice"
            value={formData.soldPrice}
            onChange={handleChange}
            placeholder="Leave blank to use listing price"
          />
          
          {formData.soldPrice && (
            <div className="price-comparison">
              <div className="price-item">
                <span className="price-label">Original Price:</span>
                <span className="price-value">{property?.price?.toLocaleString()} AZN</span>
              </div>
              <div className="price-item">
                <span className="price-label">Sold Price:</span>
                <span className="price-value">{Number(formData.soldPrice).toLocaleString()} AZN</span>
              </div>
              <div className="price-item difference">
                <span className="price-label">Difference:</span>
                <span className={`price-value ${formData.soldPrice > property?.price ? 'positive' : 'negative'}`}>
                  {formData.soldPrice > property?.price ? '+' : ''}
                  {(formData.soldPrice - property?.price).toLocaleString()} AZN
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="warning-notice">
          ⚠️ This will mark the property as {formData.transactionType === 'sale' ? 'sold' : 'rented'} and remove it from active listings.
        </div>

        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Processing...' : `Mark as ${formData.transactionType === 'sale' ? 'Sold' : 'Rented'}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default MarkSoldModal;
