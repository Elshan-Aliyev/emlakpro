import React, { useState, useEffect } from 'react';
import { createProperty } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { geocodeAddress } from '../services/geocoding';
import AddressAutocomplete from '../components/AddressAutocomplete';
import LocationPicker from '../components/LocationPicker';
import './CreateProperty.css';

const CreateProperty = () => {
  const navigate = useNavigate();
  
  // 1. BASIC INFORMATION
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyType, setPropertyType] = useState('apartment');
  const [listingStatus, setListingStatus] = useState('for-sale');
  const [occupancy, setOccupancy] = useState('vacant');
  const [furnishing, setFurnishing] = useState('unfurnished');
  const [purpose, setPurpose] = useState('residential');
  const [purposeManuallySet, setPurposeManuallySet] = useState(false);

  // Auto-set purpose based on property type (only if not manually set)
  useEffect(() => {
    if (purposeManuallySet) return;
    
    const commercialTypes = ['commercial-retail', 'commercial-unit', 'office', 'industrial', 'warehouse', 'shop', 'restaurant'];
    if (commercialTypes.includes(propertyType)) {
      setPurpose('commercial');
    } else {
      setPurpose('residential');
    }
  }, [propertyType, purposeManuallySet]);

  // Handle manual purpose change
  const handlePurposeChange = (newPurpose) => {
    setPurpose(newPurpose);
    setPurposeManuallySet(true);
    
    // Reset to default property type for the selected purpose
    if (newPurpose === 'commercial') {
      setPropertyType('office');
      // Commercial can't be short-term
      if (subCategory === 'short-term') {
        setSubCategory('long-term');
      }
    } else {
      setPropertyType('apartment');
    }
  };

  // Auto-update subCategory based on listing status
  const [subCategory, setSubCategory] = useState('long-term');
  useEffect(() => {
    if (listingStatus === 'for-rent') {
      // Keep current subCategory or default to long-term
    } else {
      setSubCategory(''); // Clear for non-rental
    }
  }, [listingStatus]);

  // Reset subCategory to long-term if commercial is selected
  useEffect(() => {
    if (purpose === 'commercial' && subCategory === 'short-term') {
      setSubCategory('long-term');
    }
  }, [purpose, subCategory]);

  // Get available property types based on purpose, listing status, and subcategory
  const getPropertyTypes = () => {
    const residentialLongTerm = [
      { value: 'apartment', label: 'Apartment / Condo' },
      { value: 'house', label: 'House' },
      { value: 'villa', label: 'Villa' },
      { value: 'townhouse', label: 'Townhouse' },
      { value: 'penthouse', label: 'Penthouse' },
      { value: 'studio', label: 'Studio' },
      { value: 'duplex', label: 'Duplex' }
    ];

    const residentialShortTerm = [
      { value: 'apartment', label: 'Apartment' },
      { value: 'house', label: 'House' },
      { value: 'villa', label: 'Villa' },
      { value: 'cabin', label: 'Cabin' },
      { value: 'cottage', label: 'Cottage' },
      { value: 'bungalow', label: 'Bungalow' },
      { value: 'chalet', label: 'Chalet' },
      { value: 'loft', label: 'Loft' },
      { value: 'tiny-house', label: 'Tiny House' },
      { value: 'mobile-home', label: 'Mobile Home' },
      { value: 'rv', label: 'RV' },
      { value: 'camper-van', label: 'Camper/Van' },
      { value: 'boat', label: 'Boat' },
      { value: 'treehouse', label: 'Treehouse' },
      { value: 'dome', label: 'Dome' },
      { value: 'a-frame', label: 'A-Frame' },
      { value: 'barn', label: 'Barn' },
      { value: 'castle', label: 'Castle' },
      { value: 'cave', label: 'Cave' },
      { value: 'windmill', label: 'Windmill' },
      { value: 'lighthouse', label: 'Lighthouse' },
      { value: 'room', label: 'Private Room' },
      { value: 'shared-room', label: 'Shared Room' }
    ];

    const commercial = [
      { value: 'office', label: 'Office' },
      { value: 'commercial-retail', label: 'Retail Space' },
      { value: 'commercial-unit', label: 'Commercial Unit' },
      { value: 'shop', label: 'Shop' },
      { value: 'restaurant', label: 'Restaurant' },
      { value: 'warehouse', label: 'Warehouse' },
      { value: 'industrial', label: 'Industrial' }
    ];

    const land = [
      { value: 'land', label: 'Land / Plot' },
      { value: 'farm', label: 'Farm' }
    ];

    // If commercial purpose is selected, only show commercial types
    if (purpose === 'commercial') {
      return commercial;
    }

    // For residential - check listing type and subcategory
    if (listingStatus === 'for-rent' && subCategory === 'short-term') {
      return residentialShortTerm;
    }

    // Default: residential long-term + land (for sale/new projects)
    if (listingStatus === 'for-sale' || listingStatus === 'new-project') {
      return [...residentialLongTerm, ...land];
    }

    // For rent long-term
    return residentialLongTerm;
  };

  // 2. LOCATION
  const [location, setLocation] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [street, setStreet] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [floorNumber, setFloorNumber] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [coordinates, setCoordinates] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // 3. PRICING
  const [price, setPrice] = useState('');
  const [negotiable, setNegotiable] = useState(false);
  const [currency, setCurrency] = useState('AZN');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState('monthly');
  const [utilitiesIncluded, setUtilitiesIncluded] = useState(false);
  const [minContractPeriod, setMinContractPeriod] = useState('');

  // 4. SIZE & SPECIFICATIONS
  const [builtUpArea, setBuiltUpArea] = useState('');
  const [landArea, setLandArea] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');
  const [renovationYear, setRenovationYear] = useState('');
  const [constructionStatus, setConstructionStatus] = useState('ready');
  const [totalFloorsInBuilding, setTotalFloorsInBuilding] = useState('');

  // 5. ROOMS
  const [bedrooms, setBedrooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [balconies, setBalconies] = useState(0);
  const [maidsRoom, setMaidsRoom] = useState(false);
  const [storageRoom, setStorageRoom] = useState(false);
  const [laundryRoom, setLaundryRoom] = useState(false);
  const [openLayoutKitchen, setOpenLayoutKitchen] = useState(false);

  // 6. INTERIOR FEATURES
  const [flooringType, setFlooringType] = useState('tile');
  const [heating, setHeating] = useState(false);
  const [cooling, setCooling] = useState('');
  const [kitchenAppliances, setKitchenAppliances] = useState(false);
  const [waterHeater, setWaterHeater] = useState(false);
  const [smartHome, setSmartHome] = useState(false);
  const [internetAvailable, setInternetAvailable] = useState(false);
  const [builtInWardrobes, setBuiltInWardrobes] = useState(false);
  const [walkInCloset, setWalkInCloset] = useState(false);

  // 7. EXTERIOR FEATURES
  const [parkingSpaces, setParkingSpaces] = useState(0);
  const [garage, setGarage] = useState(false);
  const [garden, setGarden] = useState(false);
  const [swimmingPool, setSwimmingPool] = useState(false);
  const [viewType, setViewType] = useState('');
  const [roofAccess, setRoofAccess] = useState(false);
  const [fenced, setFenced] = useState(false);

  // 8. BUILDING FEATURES
  const [elevator, setElevator] = useState(false);
  const [security, setSecurity] = useState(false);
  const [cctv, setCctv] = useState(false);
  const [gym, setGym] = useState(false);
  const [sharedPool, setSharedPool] = useState(false);
  const [visitorParking, setVisitorParking] = useState(false);
  const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
  const [petsAllowed, setPetsAllowed] = useState(false);

  // 9. NEARBY
  const [nearbySchools, setNearbySchools] = useState(false);
  const [nearbyHospital, setNearbyHospital] = useState(false);
  const [nearbyMetro, setNearbyMetro] = useState(false);
  const [nearbyMall, setNearbyMall] = useState(false);
  const [nearbyPark, setNearbyPark] = useState(false);
  const [nearbyAirport, setNearbyAirport] = useState(false);

  // 10. UTILITIES
  const [gasAvailable, setGasAvailable] = useState(false);
  const [hoaFees, setHoaFees] = useState('');

  // 11. LEGAL
  const [ownershipType, setOwnershipType] = useState('freehold');
  const [titleDeedAvailable, setTitleDeedAvailable] = useState(false);
  const [mortgageAllowed, setMortgageAllowed] = useState(false);
  const [developerName, setDeveloperName] = useState('');
  const [projectName, setProjectName] = useState('');
  
  // 12. IMAGES
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    console.log('📸 Files selected, starting validation and upload...');
    
    // Validate files
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    const errors = [];
    const validFiles = [];
    
    files.forEach((file, index) => {
      // Check file size
      if (file.size > maxSize) {
        errors.push(`❌ "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Max size is 10MB.`);
        return;
      }
      
      // Check file format
      if (!allowedFormats.includes(file.type.toLowerCase())) {
        errors.push(`❌ "${file.name}" has invalid format (${file.type}). Allowed: JPEG, PNG, WEBP, HEIC.`);
        return;
      }
      
      validFiles.push(file);
    });
    
    // Show errors if any
    if (errors.length > 0) {
      alert('Some files were rejected:\n\n' + errors.join('\n'));
    }
    
    // Only proceed with valid files
    if (validFiles.length > 0) {
      // Append to existing files instead of replacing
      const existingFiles = selectedFiles || [];
      const existingPreviews = imagePreview || [];
      
      setSelectedFiles([...existingFiles, ...validFiles]);
      const newPreviews = validFiles.map(file => URL.createObjectURL(file));
      setImagePreview([...existingPreviews, ...newPreviews]);
      console.log(`✅ ${validFiles.length} valid files selected, starting upload...`);
      
      // Automatically start upload (only upload new files)
      await uploadFilesToCloudinary(validFiles);
    } else if (errors.length > 0) {
      // Don't clear existing files if only new files were rejected
      alert('No valid files to upload from this selection');
    }
    
    // Reset file input to allow selecting same files again
    e.target.value = '';
  };

  const uploadFilesToCloudinary = async (files) => {
    if (!files || files.length === 0) {
      alert('No files to upload');
      return;
    }

    console.log('=== Starting Cloudinary Upload ===');
    console.log('Number of files:', files.length);
    
    setUploadingImages(true);
    const formData = new FormData();
    
    files.forEach((file, index) => {
      console.log(`📎 File ${index + 1}:`, file.name, file.type, `${(file.size / 1024).toFixed(2)}KB`);
      formData.append('images', file);
    });

    try {
      const token = localStorage.getItem('token');
      console.log('🔑 Token exists:', !!token);
      
      console.log('📤 Sending upload request...');
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
      console.log('📸 Image data with multiple sizes:', data.images);
      
      // Append to existing uploaded images to avoid duplicates
      setUploadedImages(prev => {
        const existingPublicIds = (prev || []).map(img => img.publicId);
        const newImages = data.images.filter(img => !existingPublicIds.includes(img.publicId));
        return [...(prev || []), ...newImages];
      });
      alert(`✅ ${data.count} image(s) uploaded successfully to cloud storage with multiple sizes!`);
      return data.images;
    } catch (error) {
      console.error('❌ Upload error:', error);
      
      let errorMessage = 'Failed to upload images';
      
      if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        errorMessage = '🔌 Network Error: Cannot connect to server. Please check if the server is running on port 5000.';
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = '🔒 Authentication Error: Please log in again.';
      } else if (error.message.includes('File too large') || error.message.includes('size')) {
        errorMessage = '📦 File Size Error: One or more files exceed the 10MB limit.';
      } else if (error.message.includes('Invalid file type') || error.message.includes('format')) {
        errorMessage = '🖼️ Format Error: Only JPEG, PNG, WEBP, and HEIC images are allowed.';
      } else if (error.message.includes('Cloudinary') || error.message.includes('cloud storage')) {
        errorMessage = '☁️ Cloud Storage Error: Problem with image storage service. Please contact support.';
      } else {
        errorMessage = `⚠️ Upload Error: ${error.message}`;
      }
      
      alert(errorMessage);
      
      // Don't clear all files on error, keep existing ones
    } finally {
      setUploadingImages(false);
    }
  };

  const handleImageUpload = async () => {
    await uploadFilesToCloudinary(selectedFiles);
  };

  const removeImage = (index) => {
    // Revoke the preview URL to free memory
    if (imagePreview[index]) {
      URL.revokeObjectURL(imagePreview[index]);
    }
    
    setImagePreview(prev => prev.filter((_, i) => i !== index));
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleReorderImages = (dragIndex, dropIndex) => {
    // Reorder selectedFiles
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      const [draggedFile] = newFiles.splice(dragIndex, 1);
      newFiles.splice(dropIndex, 0, draggedFile);
      return newFiles;
    });

    // Reorder imagePreview
    setImagePreview(prev => {
      const newPreviews = [...prev];
      const [draggedPreview] = newPreviews.splice(dragIndex, 1);
      newPreviews.splice(dropIndex, 0, draggedPreview);
      return newPreviews;
    });

    // Reorder uploadedImages
    setUploadedImages(prev => {
      const newUploaded = [...prev];
      const [draggedImage] = newUploaded.splice(dragIndex, 1);
      newUploaded.splice(dropIndex, 0, draggedImage);
      return newUploaded;
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
      handleReorderImages(dragIndex, dropIndex);
    }
  };


  const handleCreate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    const propertyData = {
      // Basic
      title,
      description,
      propertyType,
      listingStatus,
      occupancy: occupancy || undefined,
      furnishing: furnishing || undefined,
      purpose,
      subCategory: subCategory || undefined,
      
      // Location
      location: location || `${street}, ${district}, ${city}`.trim(),
      fullAddress,
      city,
      district,
      street,
      buildingName,
      floorNumber: floorNumber ? Number(floorNumber) : undefined,
      unitNumber,
      coordinates: coordinates || undefined,
      
      // Pricing
      price: Number(price),
      negotiable,
      currency,
      monthlyRent: monthlyRent ? Number(monthlyRent) : undefined,
      depositAmount: depositAmount ? Number(depositAmount) : undefined,
      paymentFrequency: paymentFrequency || undefined,
      utilitiesIncluded,
      minContractPeriod: minContractPeriod ? Number(minContractPeriod) : undefined,
      
      // Size
      builtUpArea: builtUpArea ? Number(builtUpArea) : undefined,
      landArea: landArea ? Number(landArea) : undefined,
      yearBuilt: yearBuilt ? Number(yearBuilt) : undefined,
      renovationYear: renovationYear ? Number(renovationYear) : undefined,
      constructionStatus: constructionStatus || undefined,
      totalFloorsInBuilding: totalFloorsInBuilding ? Number(totalFloorsInBuilding) : undefined,
      
      // Rooms
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      balconies: Number(balconies),
      maidsRoom,
      storageRoom,
      laundryRoom,
      openLayoutKitchen,
      
      // Interior
      flooringType: flooringType || undefined,
      heating,
      cooling,
      kitchenAppliances,
      waterHeater,
      smartHome,
      internetAvailable,
      builtInWardrobes,
      walkInCloset,
      
      // Exterior
      parkingSpaces: Number(parkingSpaces),
      garage,
      garden,
      swimmingPool,
      viewType: viewType || undefined,
      roofAccess,
      fenced,
      
      // Building
      elevator,
      security,
      cctv,
      gym,
      sharedPool,
      visitorParking,
      wheelchairAccessible,
      petsAllowed,
      
      // Nearby
      nearby: {
        schools: nearbySchools,
        hospital: nearbyHospital,
        metro: nearbyMetro,
        shoppingMall: nearbyMall,
        park: nearbyPark,
        airport: nearbyAirport
      },
      
      // Utilities
      gasAvailable,
      hoaFees: hoaFees ? Number(hoaFees) : undefined,
      
      // Legal
      ownershipType: ownershipType || undefined,
      titleDeedAvailable,
      mortgageAllowed,
      developerName,
      projectName,
      
      // Images
      images: uploadedImages,
      featuredImage: uploadedImages[0] || null,
      
      // Legacy compatibility
      type: propertyType === 'apartment' || propertyType === 'house' ? 'ev' : 
            propertyType === 'land' ? 'torpaq' : 
            propertyType === 'commercial-retail' || propertyType === 'commercial-unit' || propertyType === 'office' ? 'obyekt' : 'biznes'
    };

    try {
      await createProperty(propertyData, token);
      alert('Property created successfully!');
      navigate('/properties');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error creating property');
    }
  };

  return (
    <div className="create-property-container">
      <h2>Create New Property</h2>
      <form onSubmit={handleCreate} className="create-property-form">
        
        {/* 1. BASIC INFORMATION */}
        <section className="form-section">
          <h3>Basic Information</h3>
          
          <div className="form-group">
            <label>Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows="4"></textarea>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Listing Status *</label>
              <select value={listingStatus} onChange={e => setListingStatus(e.target.value)} required>
                <option value="for-sale">For Sale</option>
                <option value="for-rent">For Rent</option>
                <option value="new-project">New Project / Off-plan</option>
              </select>
            </div>

            <div className="form-group">
              <label>Purpose *</label>
              <select value={purpose} onChange={e => handlePurposeChange(e.target.value)} required>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            {listingStatus === 'for-rent' && purpose !== 'commercial' && (
              <div className="form-group">
                <label>Rental Category *</label>
                <select value={subCategory} onChange={e => setSubCategory(e.target.value)} required>
                  <option value="long-term">Long-term Rental</option>
                  <option value="short-term">Short-term / Vacation Rental</option>
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Property Type *</label>
              <select value={propertyType} onChange={e => setPropertyType(e.target.value)} required>
                {getPropertyTypes().map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Occupancy</label>
              <select value={occupancy} onChange={e => setOccupancy(e.target.value)}>
                <option value="owner-occupied">Owner Occupied</option>
                <option value="vacant">Vacant</option>
                <option value="tenanted">Tenanted</option>
              </select>
            </div>

            <div className="form-group">
              <label>Furnishing</label>
              <select value={furnishing} onChange={e => setFurnishing(e.target.value)}>
                <option value="furnished">Furnished</option>
                <option value="semi-furnished">Semi-furnished</option>
                <option value="unfurnished">Unfurnished</option>
              </select>
            </div>
          </div>
        </section>

        {/* 2. LOCATION */}
        <section className="form-section">
          <h3>Location Details</h3>
          
          <div className="form-group">
            <label>Search Address *</label>
            <AddressAutocomplete
              value={location}
              onChange={setLocation}
              onSelectAddress={(data) => {
                console.log('Address selected:', data);
                setLocation(data.address);
                const newCoords = {
                  lat: parseFloat(data.lat),
                  lng: parseFloat(data.lng),
                  latitude: parseFloat(data.lat),
                  longitude: parseFloat(data.lng)
                };
                console.log('Setting coordinates:', newCoords);
                setCoordinates(newCoords);
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
            <div className="form-group" style={{marginTop: '20px'}}>
              <label>Adjust Pin Location (Optional)</label>
              <p style={{fontSize: '12px', color: '#666', marginBottom: '8px'}}>
                Current: {coordinates?.lat?.toFixed(6)}, {coordinates?.lng?.toFixed(6)}
              </p>
              <LocationPicker
                initialCoords={coordinates}
                onLocationChange={(newCoords) => {
                  console.log('Location changed:', newCoords);
                  setCoordinates(newCoords);
                }}
                height="350px"
              />
            </div>
          )}

          <div className="form-group">
            <label>City *</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)} required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>District</label>
              <input type="text" value={district} onChange={e => setDistrict(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Street</label>
              <input type="text" value={street} onChange={e => setStreet(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Full Address</label>
            <input type="text" value={fullAddress} onChange={e => setFullAddress(e.target.value)} />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Building Name</label>
              <input type="text" value={buildingName} onChange={e => setBuildingName(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Floor Number</label>
              <input type="number" value={floorNumber} onChange={e => setFloorNumber(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Unit Number</label>
              <input type="text" value={unitNumber} onChange={e => setUnitNumber(e.target.value)} />
            </div>
          </div>
        </section>

        {/* 3. PRICING */}
        <section className="form-section">
          <h3>Pricing Details</h3>
          
          {listingStatus === 'for-sale' ? (
            // For Sale - Show Price
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Sale Price *</label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}>
                    <option value="AZN">AZN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input type="checkbox" checked={negotiable} onChange={e => setNegotiable(e.target.checked)} />
                    Negotiable
                  </label>
                </div>
              </div>
            </>
          ) : (
            // For Rent - Show Rental Details
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Rental Price *</label>
                  <input 
                    type="number" 
                    value={monthlyRent} 
                    onChange={e => {
                      setMonthlyRent(e.target.value);
                      setPrice(e.target.value); // Sync with price field
                    }} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Payment Frequency</label>
                  <select value={paymentFrequency} onChange={e => setPaymentFrequency(e.target.value)}>
                    <option value="">Select Frequency</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi-annual">Semi-annual</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}>
                    <option value="AZN">AZN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Deposit Amount</label>
                  <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
                </div>

                <div className="form-group">
                  <label>Min Contract Period (months)</label>
                  <input type="number" value={minContractPeriod} onChange={e => setMinContractPeriod(e.target.value)} />
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input type="checkbox" checked={negotiable} onChange={e => setNegotiable(e.target.checked)} />
                    Negotiable
                  </label>
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label>
                  <input type="checkbox" checked={utilitiesIncluded} onChange={e => setUtilitiesIncluded(e.target.checked)} />
                  Utilities Included
                </label>
              </div>
            </>
          )}
        </section>

        {/* 4. SIZE & SPECIFICATIONS */}
        <section className="form-section">
          <h3>Size & Specifications</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Built-up Area (m²)</label>
              <input type="number" value={builtUpArea} onChange={e => setBuiltUpArea(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Land Area (m²)</label>
              <input type="number" value={landArea} onChange={e => setLandArea(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Year Built</label>
              <input type="number" value={yearBuilt} onChange={e => setYearBuilt(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Renovation Year</label>
              <input type="number" value={renovationYear} onChange={e => setRenovationYear(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Construction Status</label>
              <select value={constructionStatus} onChange={e => setConstructionStatus(e.target.value)}>
                <option value="ready">Ready</option>
                <option value="under-construction">Under Construction</option>
                <option value="off-plan">Off-plan</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Total Floors in Building</label>
            <input type="number" value={totalFloorsInBuilding} onChange={e => setTotalFloorsInBuilding(e.target.value)} />
          </div>
        </section>

        {/* 5. ROOM DETAILS */}
        <section className="form-section">
          <h3>Room Details</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Bedrooms</label>
              <input type="number" min="0" value={bedrooms} onChange={e => setBedrooms(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Bathrooms</label>
              <input type="number" min="0" value={bathrooms} onChange={e => setBathrooms(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Balconies</label>
              <input type="number" min="0" value={balconies} onChange={e => setBalconies(e.target.value)} />
            </div>
          </div>

          <div className="checkbox-grid">
            <label><input type="checkbox" checked={maidsRoom} onChange={e => setMaidsRoom(e.target.checked)} /> Maid's Room</label>
            <label><input type="checkbox" checked={storageRoom} onChange={e => setStorageRoom(e.target.checked)} /> Storage Room</label>
            <label><input type="checkbox" checked={laundryRoom} onChange={e => setLaundryRoom(e.target.checked)} /> Laundry Room</label>
            <label><input type="checkbox" checked={openLayoutKitchen} onChange={e => setOpenLayoutKitchen(e.target.checked)} /> Open Layout Kitchen</label>
          </div>
        </section>

        {/* 6. INTERIOR FEATURES */}
        <section className="form-section">
          <h3>Interior Features</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Flooring Type</label>
              <select value={flooringType} onChange={e => setFlooringType(e.target.value)}>
                <option value="tile">Tile</option>
                <option value="hardwood">Hardwood</option>
                <option value="laminate">Laminate</option>
                <option value="carpet">Carpet</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Cooling/AC Type</label>
              <input type="text" value={cooling} onChange={e => setCooling(e.target.value)} />
            </div>
          </div>

          <div className="checkbox-grid">
            <label><input type="checkbox" checked={heating} onChange={e => setHeating(e.target.checked)} /> Heating</label>
            <label><input type="checkbox" checked={kitchenAppliances} onChange={e => setKitchenAppliances(e.target.checked)} /> Kitchen Appliances</label>
            <label><input type="checkbox" checked={waterHeater} onChange={e => setWaterHeater(e.target.checked)} /> Water Heater</label>
            <label><input type="checkbox" checked={smartHome} onChange={e => setSmartHome(e.target.checked)} /> Smart Home</label>
            <label><input type="checkbox" checked={internetAvailable} onChange={e => setInternetAvailable(e.target.checked)} /> Internet Available</label>
            <label><input type="checkbox" checked={builtInWardrobes} onChange={e => setBuiltInWardrobes(e.target.checked)} /> Built-in Wardrobes</label>
            <label><input type="checkbox" checked={walkInCloset} onChange={e => setWalkInCloset(e.target.checked)} /> Walk-in Closet</label>
          </div>
        </section>

        {/* 7. EXTERIOR FEATURES */}
        <section className="form-section">
          <h3>Exterior Features</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Parking Spaces</label>
              <input type="number" min="0" value={parkingSpaces} onChange={e => setParkingSpaces(e.target.value)} />
            </div>

            <div className="form-group">
              <label>View Type</label>
              <select value={viewType} onChange={e => setViewType(e.target.value)}>
                <option value="">-- Select --</option>
                <option value="city">City</option>
                <option value="sea">Sea</option>
                <option value="mountain">Mountain</option>
                <option value="park">Park</option>
                <option value="street">Street</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="checkbox-grid">
            <label><input type="checkbox" checked={garage} onChange={e => setGarage(e.target.checked)} /> Garage</label>
            <label><input type="checkbox" checked={garden} onChange={e => setGarden(e.target.checked)} /> Garden</label>
            <label><input type="checkbox" checked={swimmingPool} onChange={e => setSwimmingPool(e.target.checked)} /> Swimming Pool</label>
            <label><input type="checkbox" checked={roofAccess} onChange={e => setRoofAccess(e.target.checked)} /> Roof Access</label>
            <label><input type="checkbox" checked={fenced} onChange={e => setFenced(e.target.checked)} /> Fenced</label>
          </div>
        </section>

        {/* 8. BUILDING FEATURES */}
        <section className="form-section">
          <h3>Building Features</h3>
          
          <div className="checkbox-grid">
            <label><input type="checkbox" checked={elevator} onChange={e => setElevator(e.target.checked)} /> Elevator</label>
            <label><input type="checkbox" checked={security} onChange={e => setSecurity(e.target.checked)} /> Security/Concierge</label>
            <label><input type="checkbox" checked={cctv} onChange={e => setCctv(e.target.checked)} /> CCTV</label>
            <label><input type="checkbox" checked={gym} onChange={e => setGym(e.target.checked)} /> Gym</label>
            <label><input type="checkbox" checked={sharedPool} onChange={e => setSharedPool(e.target.checked)} /> Shared Pool</label>
            <label><input type="checkbox" checked={visitorParking} onChange={e => setVisitorParking(e.target.checked)} /> Visitor Parking</label>
            <label><input type="checkbox" checked={wheelchairAccessible} onChange={e => setWheelchairAccessible(e.target.checked)} /> Wheelchair Accessible</label>
            <label><input type="checkbox" checked={petsAllowed} onChange={e => setPetsAllowed(e.target.checked)} /> Pets Allowed</label>
          </div>
        </section>

        {/* 9. NEARBY */}
        <section className="form-section">
          <h3>Nearby Amenities</h3>
          
          <div className="checkbox-grid">
            <label><input type="checkbox" checked={nearbySchools} onChange={e => setNearbySchools(e.target.checked)} /> Schools</label>
            <label><input type="checkbox" checked={nearbyHospital} onChange={e => setNearbyHospital(e.target.checked)} /> Hospital</label>
            <label><input type="checkbox" checked={nearbyMetro} onChange={e => setNearbyMetro(e.target.checked)} /> Metro/Public Transport</label>
            <label><input type="checkbox" checked={nearbyMall} onChange={e => setNearbyMall(e.target.checked)} /> Shopping Mall</label>
            <label><input type="checkbox" checked={nearbyPark} onChange={e => setNearbyPark(e.target.checked)} /> Park</label>
            <label><input type="checkbox" checked={nearbyAirport} onChange={e => setNearbyAirport(e.target.checked)} /> Airport</label>
          </div>
        </section>

        {/* 10. UTILITIES */}
        <section className="form-section">
          <h3>Utilities & Maintenance</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>HOA/Condo Fees</label>
              <input type="number" value={hoaFees} onChange={e => setHoaFees(e.target.value)} />
            </div>

            <div className="form-group checkbox-group">
              <label>
                <input type="checkbox" checked={gasAvailable} onChange={e => setGasAvailable(e.target.checked)} />
                Gas Available
              </label>
            </div>
          </div>
        </section>

        {/* 11. LEGAL */}
        <section className="form-section">
          <h3>Legal & Financial</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Ownership Type</label>
              <select value={ownershipType} onChange={e => setOwnershipType(e.target.value)}>
                <option value="freehold">Freehold</option>
                <option value="leasehold">Leasehold</option>
              </select>
            </div>

            <div className="form-group">
              <label>Developer Name</label>
              <input type="text" value={developerName} onChange={e => setDeveloperName(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Project Name</label>
              <input type="text" value={projectName} onChange={e => setProjectName(e.target.value)} />
            </div>
          </div>

          <div className="checkbox-grid">
            <label><input type="checkbox" checked={titleDeedAvailable} onChange={e => setTitleDeedAvailable(e.target.checked)} /> Title Deed Available</label>
            <label><input type="checkbox" checked={mortgageAllowed} onChange={e => setMortgageAllowed(e.target.checked)} /> Mortgage Allowed</label>
          </div>
        </section>

        {/* 12. IMAGES */}
        <section className="form-section">
          <h3>Property Images</h3>
          
          <div className="form-group">
            <label>Upload Images (up to 20 images, 10MB max per image)</label>
            <input 
              type="file" 
              multiple 
              accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
              onChange={handleFileSelect}
              className="file-input"
              disabled={uploadingImages}
            />
            {uploadingImages && (
              <div style={{ 
                marginTop: '10px', 
                padding: '10px', 
                background: '#e3f2fd', 
                borderRadius: '8px',
                color: '#1976d2',
                fontWeight: '600'
              }}>
                ☁️ Uploading images to cloud storage... Please wait
              </div>
            )}
          </div>

          {imagePreview.length > 0 && !uploadingImages && (
            <div className="image-preview-container">
              <div className="image-count" style={{ 
                padding: '10px', 
                background: '#e8f5e9', 
                borderRadius: '8px',
                color: '#2e7d32',
                fontWeight: '600',
                marginBottom: '15px'
              }}>
                ✅ {uploadedImages.length} image(s) uploaded successfully! You can now create the property.
              </div>

              <div className="image-preview-grid">
                {imagePreview.map((preview, index) => (
                  <div 
                    key={index} 
                    className="preview-item"
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    style={{ cursor: 'move' }}
                    title="Drag to reorder images"
                  >
                    <div className="drag-handle" style={{
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
                    <img src={preview} alt={`Preview ${index + 1}`} />
                    <button 
                      type="button" 
                      onClick={() => removeImage(index)}
                      className="remove-btn"
                      title="Remove this image"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploadedImages.length > 0 && (
            <div className="uploaded-images-info">
              <p className="success-message">✓ {uploadedImages.length} images uploaded successfully!</p>
              <small>These images will be attached to your property listing.</small>
            </div>
          )}
        </section>

        <button type="submit" className="submit-btn">Create Property</button>
      </form>
    </div>
  );
};

export default CreateProperty;
