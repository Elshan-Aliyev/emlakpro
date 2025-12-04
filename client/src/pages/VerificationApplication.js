import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getVerificationPricing, 
  getMyApplicationStatus,
  submitVerificationApplication,
  uploadVerificationDocument,
  processVerificationPayment
} from '../services/api';
import './VerificationApplication.css';

const VerificationApplication = () => {
  const navigate = useNavigate();
  const [pricing, setPricing] = useState(null);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [step, setStep] = useState(1); // 1: Select Tier, 2: Fill Form, 3: Upload Docs, 4: Payment
  const [selectedTier, setSelectedTier] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  // Form data
  const [formData, setFormData] = useState({
    // Common fields
    fullName: '',
    phone: '',
    address: '',
    
    // Private seller fields
    idNumber: '',
    
    // Realtor fields
    licenseNumber: '',
    brokerageName: '',
    yearsExperience: '',
    
    // Corporate fields
    companyName: '',
    companyRegistrationNumber: '',
    taxIdNumber: '',
    companyAddress: '',
    authorizedPersonName: '',
    authorizedPersonTitle: ''
  });

  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      console.log('Fetching verification data...');
      
      // Fetch pricing first
      try {
        const pricingRes = await getVerificationPricing();
        console.log('Pricing response:', pricingRes);
        setPricing(pricingRes.data);
      } catch (pricingError) {
        console.error('❌ Pricing fetch failed:', pricingError);
        console.error('Error response:', pricingError.response);
        setError(`Failed to load pricing: ${pricingError.message}`);
        alert('Failed to load pricing data. Please check console and refresh the page.');
      }

      // Fetch status
      try {
        const statusRes = await getMyApplicationStatus(token);
        console.log('Status response:', statusRes);
        setCurrentStatus(statusRes.data);
        
        // If user has pending application, show status
        if (statusRes.data.application?.status === 'pending') {
          alert('You already have a pending application under review.');
          navigate('/account/settings');
          return;
        }
      } catch (statusError) {
        console.error('❌ Status fetch failed:', statusError);
        console.error('Error response:', statusError.response);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      console.error('Error details:', error.response);
      setLoading(false);
    }
  };

  const handleTierSelect = (tier) => {
    setSelectedTier(tier);
    setStep(2);
  };

  const handleFormChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const applicationData = { ...formData };

      await submitVerificationApplication({
        requestedTier: selectedTier,
        applicationData
      }, token);

      setStep(3);
    } catch (error) {
      console.error('Error submitting application:', error);
      alert(error.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDocumentUpload = async (e, documentType) => {
    const file = e.target.files[0];
    if (!file) return;

    // TODO: Upload to cloud storage (Cloudinary, S3, etc.)
    // For now, we'll use a placeholder
    const documentUrl = `https://placeholder.com/documents/${file.name}`;

    try {
      const token = localStorage.getItem('token');
      await uploadVerificationDocument({
        documentType,
        documentUrl
      }, token);

      setDocuments([...documents, { type: documentType, url: documentUrl }]);
      alert('Document uploaded successfully');
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Failed to upload document');
    }
  };

  const handlePayment = async () => {
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      
      // TODO: Integrate with real payment gateway
      // For now, simulate payment
      await processVerificationPayment({
        paymentMethod: 'mock',
        transactionId: `TXN-${Date.now()}`
      }, token);

      alert('Payment processed! Your application is under review.');
      navigate('/account/settings');
    } catch (error) {
      console.error('Error processing payment:', error);
      alert(error.response?.data?.message || 'Payment failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="verification-loading">Loading...</div>;
  }

  console.log('Render - step:', step, 'pricing:', pricing, 'selectedTier:', selectedTier);
  console.log('Pricing exists?', !!pricing);
  console.log('Step === 1?', step === 1);
  console.log('Should show pricing cards?', step === 1 && pricing);

  return (
    <div className="verification-application-page">
      <div className="verification-container">
        <h1>Account Verification Application</h1>
        <p className="subtitle">Upgrade your account to unlock features and build trust</p>

        {/* Debug Info */}
        {error && <div style={{color: 'white', padding: '20px', background: '#dc3545', marginBottom: '20px', borderRadius: '8px'}}>❌ Error: {error}</div>}
        {!pricing && !error && !loading && <div style={{color: 'white', padding: '20px', background: '#dc3545', marginBottom: '20px', borderRadius: '8px'}}>❌ Pricing data not loaded!</div>}
        {step !== 1 && <div style={{color: '#856404', padding: '20px', background: '#fff3cd', marginBottom: '20px', borderRadius: '8px'}}>⚠️ Not on step 1 (current step: {step})</div>}

        {/* Progress Steps */}
        <div className="progress-steps">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Choose Plan</span>
          </div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Application</span>
          </div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Documents</span>
          </div>
          <div className={`step ${step >= 4 ? 'active' : ''}`}>
            <span className="step-number">4</span>
            <span className="step-label">Payment</span>
          </div>
        </div>

        {/* Step 1: Select Tier */}
        {step === 1 && pricing && (
          <div className="tier-selection">
            <h2>Choose Your Verification Level</h2>
            <div className="pricing-cards">
              {Object.entries(pricing).map(([key, tier]) => (
                <div key={key} className="pricing-card">
                  <h3>{tier.name}</h3>
                  <div className="price">${tier.price}</div>
                  <div className="features">
                    <h4>Features:</h4>
                    <ul>
                      {tier.features.map((feature, idx) => (
                        <li key={idx}>✓ {feature}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="requirements">
                    <h4>Requirements:</h4>
                    <ul>
                      {tier.requirements.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                  <button 
                    className="select-tier-btn"
                    onClick={() => handleTierSelect(key)}
                  >
                    Select {tier.name}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Application Form */}
        {step === 2 && (
          <div className="application-form-section">
            <h2>Application Form</h2>
            <form onSubmit={handleFormSubmit}>
              {/* Common Fields */}
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Address *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleFormChange}
                  required
                />
              </div>

              {/* Verified User Fields */}
              {selectedTier === 'verified-user' && (
                <div className="form-group">
                  <label>ID Number *</label>
                  <input
                    type="text"
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleFormChange}
                    required
                  />
                </div>
              )}

              {/* Verified Seller Fields */}
              {selectedTier === 'verified-seller' && (
                <>
                  <div className="form-group">
                    <label>ID Number *</label>
                    <input
                      type="text"
                      name="idNumber"
                      value={formData.idNumber}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Proof of Address *</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleFormChange}
                      required
                      placeholder="Full residential address"
                    />
                  </div>
                </>
              )}

              {/* Realtor Fields */}
              {selectedTier === 'realtor' && (
                <>
                  <div className="form-group">
                    <label>License Number *</label>
                    <input
                      type="text"
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Brokerage Name *</label>
                    <input
                      type="text"
                      name="brokerageName"
                      value={formData.brokerageName}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Years of Experience *</label>
                    <input
                      type="number"
                      name="yearsExperience"
                      value={formData.yearsExperience}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                </>
              )}

              {/* Corporate Fields */}
              {selectedTier === 'corporate' && (
                <>
                  <div className="form-group">
                    <label>Company Name *</label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Company Registration Number *</label>
                    <input
                      type="text"
                      name="companyRegistrationNumber"
                      value={formData.companyRegistrationNumber}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Tax ID Number *</label>
                    <input
                      type="text"
                      name="taxIdNumber"
                      value={formData.taxIdNumber}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Company Address *</label>
                    <textarea
                      name="companyAddress"
                      value={formData.companyAddress}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Authorized Person Name *</label>
                    <input
                      type="text"
                      name="authorizedPersonName"
                      value={formData.authorizedPersonName}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Authorized Person Title *</label>
                    <input
                      type="text"
                      name="authorizedPersonTitle"
                      value={formData.authorizedPersonTitle}
                      onChange={handleFormChange}
                      required
                    />
                  </div>
                </>
              )}

              <div className="form-actions">
                <button type="button" onClick={() => setStep(1)} className="btn-secondary">
                  Back
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Continue'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Document Upload */}
        {step === 3 && (
          <div className="document-upload-section">
            <h2>Upload Required Documents</h2>
            <p>Please upload clear copies of the required documents</p>

            <div className="document-upload-list">
              <div className="upload-item">
                <label>Government-issued ID</label>
                <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={(e) => handleDocumentUpload(e, 'id')}
                />
              </div>

              {selectedTier === 'realtor' && (
                <div className="upload-item">
                  <label>Real Estate License</label>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={(e) => handleDocumentUpload(e, 'license')}
                  />
                </div>
              )}

              {selectedTier === 'corporate' && (
                <>
                  <div className="upload-item">
                    <label>Company Registration Documents</label>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={(e) => handleDocumentUpload(e, 'registration')}
                    />
                  </div>
                  <div className="upload-item">
                    <label>Tax ID Documentation</label>
                    <input 
                      type="file" 
                      accept="image/*,application/pdf"
                      onChange={(e) => handleDocumentUpload(e, 'tax-id')}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="uploaded-documents">
              <h3>Uploaded Documents ({documents.length})</h3>
              {documents.map((doc, idx) => (
                <div key={idx} className="document-item">
                  ✓ {doc.type}
                </div>
              ))}
            </div>

            <div className="form-actions">
              <button onClick={() => setStep(2)} className="btn-secondary">
                Back
              </button>
              <button 
                onClick={() => setStep(4)} 
                className="btn-primary"
                disabled={documents.length === 0}
              >
                Continue to Payment
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Payment */}
        {step === 4 && pricing && (
          <div className="payment-section">
            <h2>Payment</h2>
            <div className="payment-summary">
              <h3>Order Summary</h3>
              <div className="summary-item">
                <span>{pricing[selectedTier]?.name}</span>
                <span>${pricing[selectedTier]?.price}</span>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <span>${pricing[selectedTier]?.price}</span>
              </div>
            </div>

            <div className="payment-info">
              <p>⚠️ This is a demo. Payment integration will be added.</p>
              <p>Click "Complete Payment" to simulate successful payment.</p>
            </div>

            <div className="form-actions">
              <button onClick={() => setStep(3)} className="btn-secondary">
                Back
              </button>
              <button 
                onClick={handlePayment} 
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Processing...' : 'Complete Payment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificationApplication;
