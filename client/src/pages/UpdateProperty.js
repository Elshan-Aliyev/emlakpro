import React, { useEffect, useState } from 'react';
import { getProperty, updateProperty } from '../services/api';
import { useParams, useNavigate } from 'react-router-dom';
import { geocodeAddress } from '../services/geocoding';
import AddressAutocomplete from '../components/AddressAutocomplete';
import LocationPicker from '../components/LocationPicker';

const UpdateProperty = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Basic Info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('$');
  
  // Type & Category
  const [listingStatus, setListingStatus] = useState('for-sale');
  const [category, setCategory] = useState('residential');
  const [subCategory, setSubCategory] = useState('');
  const [propertyType, setPropertyType] = useState('apartment');
  
  // Location
  const [location, setLocation] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Azerbaijan');
  const [coordinates, setCoordinates] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  
  // Details
  const [bedrooms, setBedrooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [builtUpArea, setBuiltUpArea] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  
  // Status
  const [status, setStatus] = useState('active');
  const [furnishing, setFurnishing] = useState('unfurnished');
  
  // Flags
  const [isFSBO, setIsFSBO] = useState(false);
  const [isCorporate, setIsCorporate] = useState(false);
  
  // Images
  const [currentImages, setCurrentImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  
  const [ownerId, setOwnerId] = useState(null);
  const [originalProperty, setOriginalProperty] = useState(null);

  const token = localStorage.getItem('token');
  let role = null;
  let currentUserId = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      role = payload.role;
      currentUserId = payload.id;
    } catch (e) {
      // ignore
    }
  }
  const isAdmin = role === 'admin' || role === 'superadmin';
  const isOwnerLocal = ownerId && currentUserId && ownerId === currentUserId;

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await getProperty(id);
        const property = res.data;
        setOriginalProperty(property);
        
        // Basic Info
        setTitle(property.title || '');
        setDescription(property.description || '');
        setPrice(property.price || '');
        setCurrency(property.currency || '$');
        
        // Type & Category
        setListingStatus(property.listingStatus || 'for-sale');
        setCategory(property.category || property.purpose || 'residential');
        setSubCategory(property.subCategory || '');
        setPropertyType(property.propertyType || 'apartment');
        
        // Location
        setLocation(property.location || '');
        setCoordinates(property.coordinates || null);
        setShowLocationPicker(!!property.coordinates);
        if (property.address) {
          setStreet(property.address.street || '');
          setCity(property.address.city || property.city || '');
          setProvince(property.address.province || '');
          setPostalCode(property.address.postalCode || '');
          setCountry(property.address.country || 'Azerbaijan');
        } else {
          setCity(property.city || '');
        }
        
        // Details
        setBedrooms(property.bedrooms ?? 0);
        setBathrooms(property.bathrooms ?? 0);
        setBuiltUpArea(property.builtUpArea || '');
        setYearBuilt(property.yearBuilt || '');
        
        // Status
        setStatus(property.status || 'active');
        setFurnishing(property.furnishing || 'unfurnished');
        
        // Flags
        setIsFSBO(property.isFSBO || false);
        setIsCorporate(property.isCorporate || false);
        
        // Images
        if (property.images && Array.isArray(property.images)) {
          setCurrentImages(property.images);
        }
        
        // Owner ID
        const ownerIdVal = property.ownerId?._id || property.ownerId;
        setOwnerId(ownerIdVal);
      } catch (err) {
        console.error(err);
        alert(err.response?.data?.message || 'Error fetching property');
      }
    };
    fetchProperty();
  }, [id]);

  const handleRemoveCurrentImage = (index) => {
    const imageToRemove = currentImages[index];
    setImagesToDelete([...imagesToDelete, imageToRemove]);
    setCurrentImages(currentImages.filter((_, i) => i !== index));
  };

  const handleAddNewImages = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    console.log('📸 Files selected for upload:', files.length);
    
    // Validate files
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    const errors = [];
    const validFiles = [];
    
    files.forEach((file) => {
      if (file.size > maxSize) {
        errors.push(`❌ "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max: 10MB.`);
        return;
      }
      if (!allowedFormats.includes(file.type.toLowerCase())) {
        errors.push(`❌ "${file.name}" invalid format (${file.type}). Allowed: JPEG, PNG, WEBP, HEIC.`);
        return;
      }
      validFiles.push(file);
    });
    
    if (errors.length > 0) {
      alert('Some files were rejected:\n\n' + errors.join('\n'));
    }
    
    if (validFiles.length === 0) {
      if (errors.length > 0) {
        alert('No valid files to upload from this selection');
      }
      e.target.value = ''; // Reset input
      return;
    }
    
    // Show previews immediately
    const newImagePreviews = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      isNew: true,
      uploading: true
    }));
    setNewImages([...newImages, ...newImagePreviews]);
    
    // Upload to Cloudinary
    await uploadNewImagesToCloudinary(validFiles);
    
    // Reset file input to allow selecting same files again
    e.target.value = '';
  };

  const handleRemoveNewImage = (index) => {
    const updatedImages = newImages.filter((_, i) => i !== index);
    // Revoke the URL to free memory
    URL.revokeObjectURL(newImages[index].preview);
    setNewImages(updatedImages);
  };

  const handleReorderNewImages = (dragIndex, dropIndex) => {
    setNewImages(prev => {
      const newArray = [...prev];
      const [draggedImage] = newArray.splice(dragIndex, 1);
      newArray.splice(dropIndex, 0, draggedImage);
      return newArray;
    });
  };

  const handleDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index);
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/html'));
    
    if (dragIndex !== dropIndex) {
      handleReorderNewImages(dragIndex, dropIndex);
    }
  };


  const uploadNewImagesToCloudinary = async (files) => {
    console.log('=== Starting Cloudinary Upload ===');
    console.log('Files to upload:', files.length);
    
    const formData = new FormData();
    files.forEach((file, index) => {
      console.log(`📎 File ${index + 1}:`, file.name, file.type, `${(file.size / 1024).toFixed(2)}KB`);
      formData.append('images', file);
    });

    try {
      const token = localStorage.getItem('token');
      console.log('🔑 Token exists:', !!token);
      
      console.log('📤 Uploading to Cloudinary...');
      const response = await fetch('http://localhost:5000/api/properties/upload-images', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Upload failed:', errorData);
        throw new Error(errorData.message || 'Upload failed');
      }

      const data = await response.json();
      console.log('✅ Upload successful:', data);
      console.log('📸 Cloudinary image data received:', data.images);
      
      // Update newImages with uploaded image objects (with all sizes)
      setNewImages(prev => {
        const startIndex = prev.length - files.length;
        const updated = prev.map((img, idx) => {
          // Only update the newly uploaded images (last N items)
          if (idx >= startIndex) {
            const cloudinaryImageData = data.images[idx - startIndex];
            console.log(`Mapping image ${idx}:`, cloudinaryImageData);
            return {
              ...img,
              ...cloudinaryImageData, // Includes thumbnail, medium, large, full, publicId
              uploading: false,
              uploaded: true
            };
          }
          return img;
        });
        console.log('📊 Updated newImages state:', updated);
        return updated;
      });
      
      alert(`✅ ${data.count} image(s) uploaded successfully to Cloudinary!`);
      return data.images;
    } catch (error) {
      console.error('❌ Upload error:', error);
      
      let errorMessage = 'Failed to upload images';
      if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        errorMessage = '🔌 Network Error: Cannot connect to server. Check if server is running on port 5000.';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = '🔒 Authentication Error: Please log in again.';
      } else if (error.message.includes('size')) {
        errorMessage = '📦 File Size Error: Files exceed 10MB limit.';
      } else if (error.message.includes('format') || error.message.includes('type')) {
        errorMessage = '🖼️ Format Error: Only JPEG, PNG, WEBP, HEIC allowed.';
      } else if (error.message.includes('Cloudinary') || error.message.includes('cloud')) {
        errorMessage = '☁️ Cloud Storage Error: Problem with image storage service.';
      } else {
        errorMessage = `⚠️ Upload Error: ${error.message}`;
      }
      
      alert(errorMessage);
      
      // Remove failed uploads from newImages
      setNewImages(prev => prev.filter(img => !img.uploading));
      return null;
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      const updateData = {
        title,
        description,
        price: Number(price),
        currency,
        listingStatus,
        category,
        propertyType,
        location,
        address: {
          street,
          city,
          province,
          postalCode,
          country
        },
        coordinates: coordinates || undefined,
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        builtUpArea: builtUpArea ? Number(builtUpArea) : undefined,
        yearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
        status,
        furnishing,
        isFSBO,
        isCorporate
      };
      
      // Add subCategory only if listing is for rent
      if (listingStatus === 'for-rent' && subCategory) {
        updateData.subCategory = subCategory;
      }
      
      // Keep remaining current images (exclude deleted ones)
      const remainingImages = currentImages.filter(img => 
        !imagesToDelete.includes(img)
      );
      
      // Add uploaded new images (only those with URLs from Cloudinary)
      const uploadedNewImages = newImages
        .filter(img => img.uploaded && (img.thumbnail || img.medium || img.large))
        .map(img => ({
          thumbnail: img.thumbnail,
          medium: img.medium,
          large: img.large,
          full: img.full,
          publicId: img.publicId,
          originalName: img.originalName,
          altText: ''
        }));
      
      console.log('🖼️ Current images (remaining):', remainingImages);
      console.log('🆕 New images (uploaded with sizes):', uploadedNewImages);
      
      updateData.images = [...remainingImages, ...uploadedNewImages];
      
      console.log('💾 Saving property with images:', updateData.images);
      console.log('📋 Total images to save:', updateData.images.length);
      
      await updateProperty(id, updateData, token);
      
      alert('Property updated successfully!');
      navigate(`/properties/${id}`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error updating property');
    }
  };

  const handleCancel = () => {
    navigate(`/properties/${id}`);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Edit Property</h2>
      <form onSubmit={handleSave}>
        {/* Basic Information */}
        <fieldset style={{ marginBottom: '24px', padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <legend style={{ fontWeight: 'bold', fontSize: '18px' }}>Basic Information</legend>
          
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '12px' }}>
            <label style={{ marginBottom: '4px', fontWeight: '500' }}>Title *</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              required 
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '12px' }}>
            <label style={{ marginBottom: '4px', fontWeight: '500' }}>Description</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows="4"
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: '4px', fontWeight: '500' }}>Price *</label>
              <input 
                type="number" 
                value={price} 
                onChange={(e) => setPrice(e.target.value)} 
                required 
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: '4px', fontWeight: '500' }}>Currency</label>
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="$">$ USD</option>
                <option value="€">€ EUR</option>
                <option value="₼">₼ AZN</option>
                <option value="£">£ GBP</option>
                <option value="₪">₪ ILS</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* Type & Category */}
        <fieldset style={{ marginBottom: '24px', padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <legend style={{ fontWeight: 'bold', fontSize: '18px' }}>Type & Category</legend>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: '4px', fontWeight: '500' }}>Listing Type</label>
              <select 
                value={listingStatus} 
                onChange={(e) => setListingStatus(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="for-sale">For Sale</option>
                <option value="for-rent">For Rent</option>
                <option value="new-project">New Project</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: '4px', fontWeight: '500' }}>Category</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
          </div>

          {listingStatus === 'for-rent' && (
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '12px' }}>
              <label style={{ marginBottom: '4px', fontWeight: '500' }}>Rental Period</label>
              <select 
                value={subCategory} 
                onChange={(e) => setSubCategory(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="">Select...</option>
                <option value="long-term">Long-term</option>
                <option value="short-term">Short-term</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '12px' }}>
            <label style={{ marginBottom: '4px', fontWeight: '500' }}>Property Type</label>
            <select 
              value={propertyType} 
              onChange={(e) => setPropertyType(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <optgroup label="Residential">
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="townhouse">Townhouse</option>
                <option value="villa">Villa</option>
                <option value="penthouse">Penthouse</option>
                <option value="studio">Studio</option>
                <option value="duplex">Duplex</option>
              </optgroup>
              <optgroup label="Commercial">
                <option value="commercial-retail">Commercial Retail</option>
                <option value="commercial-unit">Commercial Unit</option>
                <option value="office">Office</option>
                <option value="industrial">Industrial</option>
                <option value="warehouse">Warehouse</option>
                <option value="shop">Shop</option>
                <option value="restaurant">Restaurant</option>
              </optgroup>
              <optgroup label="Land">
                <option value="land">Land</option>
                <option value="farm">Farm</option>
              </optgroup>
              <optgroup label="Short-term / Unique">
                <option value="cabin">🏕️ Cabin</option>
                <option value="cottage">🏠 Cottage</option>
                <option value="bungalow">🏘️ Bungalow</option>
                <option value="chalet">🏔️ Chalet</option>
                <option value="loft">🏙️ Loft</option>
                <option value="tiny-house">🏠 Tiny House</option>
                <option value="mobile-home">🚐 Mobile Home</option>
                <option value="rv">🚐 RV</option>
                <option value="camper-van">🚐 Camper Van</option>
                <option value="boat">⛵ Boat</option>
                <option value="treehouse">🌳 Treehouse</option>
                <option value="dome">🏔️ Dome</option>
                <option value="a-frame">🏔️ A-Frame</option>
                <option value="barn">🏭 Barn</option>
                <option value="castle">🏰 Castle</option>
                <option value="cave">🕳️ Cave</option>
                <option value="windmill">🌾 Windmill</option>
                <option value="lighthouse">🏮 Lighthouse</option>
                <option value="room">🛏️ Room</option>
                <option value="shared-room">👥 Shared Room</option>
                <option value="entire-place">🏠 Entire Place</option>
              </optgroup>
            </select>
          </div>
        </fieldset>

        {/* Location */}
        <fieldset style={{ marginBottom: '24px', padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <legend style={{ fontWeight: 'bold', fontSize: '18px' }}>Location</legend>
          
          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '16px' }}>
            <label style={{ marginBottom: '4px', fontWeight: '500' }}>Search Address *</label>
            <AddressAutocomplete
              value={location}
              onChange={setLocation}
              onSelectAddress={(data) => {
                setLocation(data.address);
                setCoordinates({
                  lat: data.lat,
                  lng: data.lng,
                  latitude: data.lat,
                  longitude: data.lng
                });
                // Auto-fill city and postal code
                if (data.city) setCity(data.city);
                if (data.postalCode) setPostalCode(data.postalCode);
                setShowLocationPicker(true);
              }}
              placeholder="Start typing an address in Baku..."
            />
            <small style={{color: '#666', fontSize: '12px', marginTop: '4px', display: 'block'}}>
              Type at least 3 characters to see suggestions
            </small>
          </div>

          {showLocationPicker && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ marginBottom: '8px', fontWeight: '500', display: 'block' }}>Adjust Pin Location (Optional)</label>
              <LocationPicker
                initialCoords={coordinates}
                onLocationChange={setCoordinates}
                height="350px"
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '12px' }}>
            <label style={{ marginBottom: '4px', fontWeight: '500' }}>Street Address</label>
            <input 
              type="text" 
              value={street} 
              onChange={(e) => setStreet(e.target.value)} 
              placeholder="Street address"
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: '4px', fontWeight: '500' }}>City</label>
              <input 
                type="text" 
                value={city} 
                onChange={(e) => setCity(e.target.value)} 
                placeholder="City"
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: '4px', fontWeight: '500' }}>Province/State</label>
              <input 
                type="text" 
                value={province} 
                onChange={(e) => setProvince(e.target.value)} 
                placeholder="Province"
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: '4px', fontWeight: '500' }}>Postal Code</label>
              <input 
                type="text" 
                value={postalCode} 
                onChange={(e) => setPostalCode(e.target.value)} 
                placeholder="Postal code"
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: '4px', fontWeight: '500' }}>Country</label>
              <input 
                type="text" 
                value={country} 
                onChange={(e) => setCountry(e.target.value)} 
                placeholder="Country"
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
          </div>
        </fieldset>

        {/* Property Details */}
        <fieldset style={{ marginBottom: '24px', padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <legend style={{ fontWeight: 'bold', fontSize: '18px' }}>Property Details</legend>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: '4px', fontWeight: '500' }}>Bedrooms</label>
              <input 
                type="number" 
                min="0"
                value={bedrooms} 
                onChange={(e) => setBedrooms(e.target.value)} 
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: '4px', fontWeight: '500' }}>Bathrooms</label>
              <input 
                type="number" 
                min="0"
                value={bathrooms} 
                onChange={(e) => setBathrooms(e.target.value)} 
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: '4px', fontWeight: '500' }}>Built-up Area (sqm)</label>
              <input 
                type="number" 
                value={builtUpArea} 
                onChange={(e) => setBuiltUpArea(e.target.value)} 
                placeholder="Area in sqm"
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: '4px', fontWeight: '500' }}>Year Built</label>
              <input 
                type="number" 
                value={yearBuilt} 
                onChange={(e) => setYearBuilt(e.target.value)} 
                placeholder="e.g., 2020"
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: '4px', fontWeight: '500' }}>Status</label>
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                disabled={!isAdmin}
              >
                <option value="active">Active</option>
                <option value="sold">Sold</option>
                <option value="pending">Pending</option>
                <option value="rented">Rented</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ marginBottom: '4px', fontWeight: '500' }}>Furnishing</label>
              <select 
                value={furnishing} 
                onChange={(e) => setFurnishing(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="furnished">Furnished</option>
                <option value="semi-furnished">Semi-furnished</option>
                <option value="unfurnished">Unfurnished</option>
              </select>
            </div>
          </div>
        </fieldset>

        {/* Images Section */}
        <fieldset style={{ marginBottom: '24px', padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <legend style={{ fontWeight: 'bold', fontSize: '18px' }}>Property Images</legend>
          
          {/* Current Images */}
          {currentImages.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '12px', fontSize: '16px' }}>Current Images</h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                gap: '12px' 
              }}>
                {currentImages.map((img, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      position: 'relative', 
                      borderRadius: '8px', 
                      overflow: 'hidden',
                      border: '2px solid #e5e7eb',
                      aspectRatio: '1'
                    }}
                  >
                    <img 
                      src={img.url || img} 
                      alt={img.altText || `Property ${index + 1}`}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover' 
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCurrentImage(index)}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(220, 38, 38, 0.9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.9)'}
                      title="Remove image"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Images */}
          {newImages.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '12px', fontSize: '16px', color: '#10b981' }}>New Images (Not saved yet)</h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                gap: '12px' 
              }}>
                {newImages.map((img, index) => (
                  <div 
                    key={index} 
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    style={{ 
                      position: 'relative', 
                      borderRadius: '8px', 
                      overflow: 'hidden',
                      border: '2px solid #10b981',
                      aspectRatio: '1',
                      cursor: 'move'
                    }}
                    title="Drag to reorder images"
                  >
                    <div style={{
                      position: 'absolute',
                      top: '5px',
                      left: '5px',
                      background: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      zIndex: 2
                    }}>
                      {index + 1}
                    </div>
                    <img 
                      src={img.preview} 
                      alt={`New ${index + 1}`}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover' 
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveNewImage(index)}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        background: 'rgba(220, 38, 38, 0.9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.9)'}
                      title="Remove new image"
                    >
                      🗑️
                    </button>
                    <div style={{
                      position: 'absolute',
                      bottom: '0',
                      left: '0',
                      right: '0',
                      background: 'rgba(16, 185, 129, 0.9)',
                      color: 'white',
                      padding: '4px',
                      fontSize: '11px',
                      textAlign: 'center',
                      fontWeight: '600'
                    }}>
                      NEW
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Images Button */}
          <div>
            <label 
              htmlFor="add-images-input"
              style={{ 
                display: 'inline-block',
                padding: '12px 24px', 
                background: '#10b981', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
            >
              📤 Add New Images
            </label>
            <input 
              id="add-images-input"
              type="file" 
              multiple 
              accept="image/*"
              onChange={handleAddNewImages}
              style={{ display: 'none' }}
            />
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>
              You can select multiple images. Max 5MB per image.
            </p>
          </div>
        </fieldset>

        {/* Listing Flags */}
        <fieldset style={{ marginBottom: '24px', padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <legend style={{ fontWeight: 'bold', fontSize: '18px' }}>Listing Type</legend>
          
          <div style={{ display: 'flex', gap: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox" 
                checked={isFSBO} 
                onChange={(e) => setIsFSBO(e.target.checked)} 
              />
              <span>For Sale By Owner (FSBO)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input 
                type="checkbox" 
                checked={isCorporate} 
                onChange={(e) => setIsCorporate(e.target.checked)} 
              />
              <span>Corporate Listing</span>
            </label>
          </div>
        </fieldset>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button 
            type="submit"
            style={{ 
              padding: '12px 24px', 
              background: '#1e4e8c', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Save Changes
          </button>
          <button 
            type="button" 
            onClick={handleCancel}
            style={{ 
              padding: '12px 24px', 
              background: '#6b7280', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default UpdateProperty;
