import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, ImagePlus, Check, X as XIcon } from 'lucide-react';
import { createProperty } from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { track, captureError } from '../services/analytics';
import AddressAutocomplete from '../components/AddressAutocomplete';
import LocationPicker from '../components/LocationPicker';
import './CreateProperty.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const BAKU_METRO_STATIONS = [
  { name: 'İçərişəhər', lat: 40.3660, lng: 49.8360 },
  { name: 'Sahil', lat: 40.3717, lng: 49.8449 },
  { name: '28 May', lat: 40.3789, lng: 49.8533 },
  { name: 'Gənclik', lat: 40.3892, lng: 49.8554 },
  { name: 'Nəriman Nərimanov', lat: 40.3989, lng: 49.8567 },
  { name: 'Bakmil', lat: 40.4122, lng: 49.8578 },
  { name: 'Ulduz', lat: 40.4233, lng: 49.8592 },
  { name: 'Koroğlu', lat: 40.4311, lng: 49.8658 },
  { name: 'Qara Qarayev', lat: 40.4197, lng: 49.9022 },
  { name: 'Neftçilər', lat: 40.4164, lng: 49.9258 },
  { name: 'Xalqlar Dostluğu', lat: 40.4119, lng: 49.9478 },
  { name: 'Əhmədli', lat: 40.4028, lng: 49.9672 },
  { name: 'Hövsan', lat: 40.3900, lng: 49.9867 },
  { name: 'Dərnəgül', lat: 40.4308, lng: 49.8286 },
  { name: 'Azadlıq Prospekti', lat: 40.4233, lng: 49.8356 },
  { name: 'Nəsimi', lat: 40.4111, lng: 49.8389 },
  { name: 'Memar Əcəmi', lat: 40.4056, lng: 49.8367 },
  { name: '20 Yanvar', lat: 40.3903, lng: 49.8356 },
  { name: 'Həzi Aslanov', lat: 40.3764, lng: 49.8333 },
  { name: 'Avtovağzal', lat: 40.4100, lng: 49.8189 },
  { name: 'İnşaatçılar', lat: 40.4033, lng: 49.8267 },
  { name: 'Əliağa Vahid', lat: 40.3944, lng: 49.8367 },
];

const findNearestMetro = (lat, lng) => {
  if (!lat || !lng) return '';
  let nearest = null, minDist = Infinity;
  for (const s of BAKU_METRO_STATIONS) {
    const d = Math.pow(s.lat - lat, 2) + Math.pow(s.lng - lng, 2);
    if (d < minDist) { minDist = d; nearest = s.name; }
  }
  return nearest || '';
};

const normalizeCity = s => s.toLowerCase()
  .replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/ə/g, 'e').replace(/Ə/g, 'e')
  .replace(/ğ/g, 'g').replace(/Ğ/g, 'g').replace(/ş/g, 's').replace(/Ş/g, 's')
  .replace(/ç/g, 'c').replace(/Ç/g, 'c').replace(/ö/g, 'o').replace(/Ö/g, 'o')
  .replace(/ü/g, 'u').replace(/Ü/g, 'u').replace(/â/g, 'a').replace(/î/g, 'i')
  .normalize('NFD').replace(/[̀-ͯ]/g, '');

const AZERBAIJAN_CITIES = [
  'Baku', 'Ganja', 'Sumqayit', 'Mingachevir', 'Nakhchivan', 'Lankaran',
  'Shirvan', 'Shaki', 'Yevlakh', 'Shamkir', 'Neftchala', 'Barda',
  'Beylagan', 'Bilasuvar', 'Dashkasan', 'Fuzuli', 'Gabala', 'Gakh',
  'Goranboy', 'Goychay', 'Hajigabul', 'Imishli', 'Ismayilli', 'Jalilabad',
  'Kurdamir', 'Lerik', 'Masalli', 'Agdam', 'Agdash', 'Aghjabadi', 'Agstafa',
  'Astara', 'Balakan', 'Khachmaz', 'Khizi', 'Lachin', 'Oguz', 'Qazakh',
  'Quba', 'Qubadli', 'Qusar', 'Saatli', 'Sabirabad', 'Salyan', 'Shamakhi',
  'Sharur', 'Shusha', 'Tartar', 'Tovuz', 'Ujar', 'Zaqatala', 'Zardab',
];

const BAKU_DISTRICTS = [
  'Abşeron r.', 'Binəqədi r.', 'Nizami r.', 'Nərimanov r.', 'Nəsimi r.',
  'Pirallahı', 'Qaradağ r.', 'Sabunçu r.', 'Suraxanı r.', 'Səbail r.',
  'Xətai r.', 'Xəzər r.', 'Yasamal r.',
];

const STEPS = [
  { id: 1, label: 'Listing' },
  { id: 2, label: 'Details' },
  { id: 3, label: 'Photos'  },
  { id: 4, label: 'Trust'   },
  { id: 5, label: 'Publish' },
];

// ─── Component ────────────────────────────────────────────────────────────────

const CreateProperty = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const photoInputRef = useRef(null);

  // ── Step state ──────────────────────────────────────────────────────────────
  const [currentStep,      setCurrentStep]      = useState(1);
  const [showMoreDetails,  setShowMoreDetails]  = useState(false);
  const [submitting,       setSubmitting]       = useState(false);
  const [submitError,      setSubmitError]      = useState('');
  const [uploadError,      setUploadError]      = useState('');
  const [uploadStatusMsg,  setUploadStatusMsg]  = useState('');

  // ── Basic info ──────────────────────────────────────────────────────────────
  const [title,           setTitle]           = useState('');
  const [description,     setDescription]     = useState('');
  const [propertyType,    setPropertyType]    = useState('old-building');
  const [listingStatus,   setListingStatus]   = useState('for-sale');
  const [occupancy,       setOccupancy]       = useState('vacant');
  const [furnishing,      setFurnishing]      = useState('unfurnished');
  const [purpose,         setPurpose]         = useState('residential');
  const [purposeManuallySet, setPurposeManuallySet] = useState(false);
  const [subCategory,     setSubCategory]     = useState('long-term');

  useEffect(() => {
    track('listing_started', {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (purposeManuallySet) return;
    const commercial = ['commercial-retail', 'commercial-unit', 'office', 'industrial', 'warehouse', 'shop', 'restaurant'];
    setPurpose(commercial.includes(propertyType) ? 'commercial' : 'residential');
  }, [propertyType, purposeManuallySet]);

  useEffect(() => {
    if (listingStatus !== 'for-rent') setSubCategory('');
  }, [listingStatus]);

  useEffect(() => {
    if (purpose === 'commercial' && subCategory === 'short-term') setSubCategory('long-term');
  }, [purpose, subCategory]);

  const handlePurposeChange = (val) => {
    setPurpose(val);
    setPurposeManuallySet(true);
    if (val === 'commercial') {
      setPropertyType('office');
      if (subCategory === 'short-term') setSubCategory('long-term');
    } else {
      setPropertyType('old-building');
    }
  };

  const getPropertyTypes = () => {
    const residential = [
      { value: 'old-building', label: 'Old Building' },
      { value: 'new-building', label: 'New Building' },
      { value: 'house',        label: 'House'                       },
      { value: 'villa',        label: 'Villa'                       },
      { value: 'penthouse',    label: 'Penthouse'                   },
      { value: 'duplex',       label: 'Duplex'                      },
    ];
    const shortTerm = [
      { value: 'apartment',   label: 'Apartment'    },
      { value: 'house',       label: 'House'        },
      { value: 'villa',       label: 'Villa'        },
      { value: 'cabin',       label: 'Cabin'        },
      { value: 'cottage',     label: 'Cottage'      },
      { value: 'loft',        label: 'Loft'         },
      { value: 'room',        label: 'Private Room' },
      { value: 'shared-room', label: 'Shared Room'  },
    ];
    const commercial = [
      { value: 'office',            label: 'Office'          },
      { value: 'commercial-retail', label: 'Retail Space'    },
      { value: 'commercial-unit',   label: 'Commercial Unit' },
      { value: 'shop',              label: 'Shop'            },
      { value: 'restaurant',        label: 'Restaurant'      },
      { value: 'warehouse',         label: 'Warehouse'       },
      { value: 'industrial',        label: 'Industrial'      },
    ];
    const land = [
      { value: 'land', label: 'Land / Plot' },
      { value: 'farm', label: 'Farm'        },
    ];
    if (purpose === 'commercial') return commercial;
    if (listingStatus === 'for-rent' && subCategory === 'short-term') return shortTerm;
    if (listingStatus === 'for-sale' || listingStatus === 'new-project') return [...residential, ...land];
    return residential;
  };

  // ── Location ────────────────────────────────────────────────────────────────
  const [location,          setLocation]          = useState('');
  const [fullAddress,       setFullAddress]       = useState('');
  const [city,              setCity]              = useState('');
  const [district,          setDistrict]          = useState('');
  const [street,            setStreet]            = useState('');
  const [streetNumber,      setStreetNumber]      = useState('');
  const [nearestMetro,      setNearestMetro]      = useState('');
  const [buildingName,      setBuildingName]      = useState('');
  const [floorNumber,       setFloorNumber]       = useState('');
  const [unitNumber,        setUnitNumber]        = useState('');
  const [coordinates,       setCoordinates]       = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // ── Pricing ─────────────────────────────────────────────────────────────────
  const [price,            setPrice]            = useState('');
  const [negotiable,       setNegotiable]       = useState(false);
  const [currency,         setCurrency]         = useState('AZN');
  const [monthlyRent,      setMonthlyRent]      = useState('');
  const [depositAmount,    setDepositAmount]    = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState('monthly');
  const [utilitiesIncluded, setUtilitiesIncluded] = useState(false);
  const [minContractPeriod, setMinContractPeriod] = useState('');

  // ── Size ────────────────────────────────────────────────────────────────────
  const [builtUpArea,            setBuiltUpArea]            = useState('');
  const [landArea,               setLandArea]               = useState('');
  const [yearBuilt,              setYearBuilt]              = useState('');
  const [renovationYear,         setRenovationYear]         = useState('');
  const [constructionStatus,     setConstructionStatus]     = useState('ready');
  const [totalFloorsInBuilding,  setTotalFloorsInBuilding]  = useState('');

  // ── Rooms ───────────────────────────────────────────────────────────────────
  const [bedrooms,       setBedrooms]       = useState('');
  const [bathrooms,      setBathrooms]      = useState('');
  const [bedroomsCustom, setBedroomsCustom] = useState('');
  const [bathroomsCustom, setBathroomsCustom] = useState('');
  const [balconies,      setBalconies]      = useState(0);
  const [maidsRoom,      setMaidsRoom]      = useState(false);
  const [storageRoom,    setStorageRoom]    = useState(false);
  const [laundryRoom,    setLaundryRoom]    = useState(false);
  const [openLayoutKitchen, setOpenLayoutKitchen] = useState(false);

  // ── Interior ────────────────────────────────────────────────────────────────
  const [flooringType,      setFlooringType]      = useState('');
  const [heating,           setHeating]           = useState('');
  const [cooling,           setCooling]           = useState(false);
  const [hotWater,          setHotWater]          = useState('');
  const [kitchenAppliances, setKitchenAppliances] = useState(false);
  const [smartHome,         setSmartHome]         = useState(false);
  const [internetAvailable, setInternetAvailable] = useState(false);
  const [builtInWardrobes,  setBuiltInWardrobes]  = useState(false);
  const [walkInCloset,      setWalkInCloset]      = useState(false);

  // ── Exterior ────────────────────────────────────────────────────────────────
  const [parkingSpaces, setParkingSpaces] = useState(0);
  const [garage,        setGarage]        = useState(false);
  const [garden,        setGarden]        = useState(false);
  const [swimmingPool,  setSwimmingPool]  = useState(false);
  const [viewType,      setViewType]      = useState('');
  const [roofAccess,    setRoofAccess]    = useState(false);
  const [fenced,        setFenced]        = useState(false);

  // ── Building ────────────────────────────────────────────────────────────────
  const [elevator,            setElevator]            = useState(false);
  const [security,            setSecurity]            = useState(false);
  const [cctv,                setCctv]                = useState(false);
  const [gym,                 setGym]                 = useState(false);
  const [sharedPool,          setSharedPool]          = useState(false);
  const [visitorParking,      setVisitorParking]      = useState(false);
  const [wheelchairAccessible, setWheelchairAccessible] = useState(false);
  const [petsAllowed,         setPetsAllowed]         = useState(false);

  // ── Nearby ──────────────────────────────────────────────────────────────────
  const [nearbySchools,  setNearbySchools]  = useState(false);
  const [nearbyHospital, setNearbyHospital] = useState(false);
  const [nearbyMetro,    setNearbyMetro]    = useState(false);
  const [nearbyMall,     setNearbyMall]     = useState(false);
  const [nearbyPark,     setNearbyPark]     = useState(false);
  const [nearbyAirport,  setNearbyAirport]  = useState(false);

  // ── Legal ───────────────────────────────────────────────────────────────────
  const [hoaFees,       setHoaFees]       = useState('');
  const [ownershipType, setOwnershipType] = useState('');
  const [hasMortgage,   setHasMortgage]   = useState(false);
  const [developerName, setDeveloperName] = useState('');
  const [projectName,   setProjectName]   = useState('');

  // ── Images ──────────────────────────────────────────────────────────────────
  const [selectedFiles,   setSelectedFiles]   = useState([]);
  const [imagePreview,    setImagePreview]    = useState([]);
  const [uploadedImages,  setUploadedImages]  = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [dragOver,          setDragOver]          = useState(false);
  const [draftSaving,       setDraftSaving]       = useState(false);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isCondoType = ['old-building', 'new-building'].includes(propertyType);

  const isStep1Complete = city && street.trim() && streetNumber.trim() &&
    (listingStatus === 'for-rent' ? monthlyRent : price);

  const isStep2Complete = bedrooms !== '' && bathrooms !== '' && builtUpArea;

  // Whether each past step passes its required-field check.
  // Steps 3–5 have no hard-required fields so they never show an error state.
  const stepComplete = [
    !!isStep1Complete,
    !!isStep2Complete,
    true,
    true,
    true,
  ];

  const isPublishReady = isStep1Complete && isStep2Complete &&
    (!isCondoType || (unitNumber !== '' && floorNumber !== '')) &&
    (city !== 'Baku' || district);

  const listingScore = (() => {
    let n = 0;
    if (isStep1Complete)                           n += 25;
    if (isStep2Complete)                           n += 20;
    if ((description || '').length >= 300)         n += 15;
    if (uploadedImages.length >= 8)                n += 25;
    else if (uploadedImages.length >= 3)           n += 12;
    else if (uploadedImages.length >= 1)           n += 5;
    if (currentUser?.phoneVerified)                n += 10;
    if (currentUser?.verified)                     n += 5;
    return Math.min(n, 100);
  })();

  const derivedTitle = title.trim() || [
    bedrooms === 'studio' ? 'Studio'
      : bedrooms === 'custom' ? `${bedroomsCustom}-bedroom`
      : bedrooms ? `${bedrooms}-bedroom` : '',
    (getPropertyTypes().find(t => t.value === propertyType)?.label || propertyType).toLowerCase(),
    city ? `in ${city}` : '',
    district ? `, ${district}` : '',
  ].filter(Boolean).join(' ');

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goNext = () => setCurrentStep(s => Math.min(s + 1, 5));
  const goBack = () => setCurrentStep(s => Math.max(s - 1, 1));

  // ── Image handlers ──────────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const maxSize = 10 * 1024 * 1024;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    const rejected = [];
    const valid = files.filter(f => {
      if (f.size > maxSize) { rejected.push(`${f.name} is too large (max 10MB)`); return false; }
      if (!allowed.includes(f.type.toLowerCase())) { rejected.push(`${f.name} has an unsupported format`); return false; }
      return true;
    });
    if (rejected.length) setUploadError(rejected.join('. '));
    if (valid.length) {
      setSelectedFiles(prev => [...prev, ...valid]);
      setImagePreview(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
      await uploadFilesToCloudinary(valid);
    }
    e.target.value = '';
  };

  const uploadFilesToCloudinary = async (files) => {
    setUploadingImages(true);
    setUploadError('');
    setUploadStatusMsg('');
    const formData = new FormData();
    files.forEach(f => formData.append('images', f));
    try {
      const token = localStorage.getItem('token');
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const res = await fetch(`${apiBase}/properties/upload-images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Upload failed');
      }
      const data = await res.json();
      setUploadedImages(prev => {
        const existing = (prev || []).map(i => i.publicId);
        const merged = [...(prev || []), ...data.images.filter(i => !existing.includes(i.publicId))];
        track('photo_uploaded', {
          photo_count:   merged.length,
          batch_size:    data.count,
          listing_type:  listingStatus,
        });
        return merged;
      });
      setUploadStatusMsg(`${data.count} photo${data.count !== 1 ? 's' : ''} uploaded.`);
    } catch (err) {
      captureError(err, { context: 'photo_upload' });
      setUploadError(err.message || 'Failed to upload photos. Please try again.');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (i) => {
    if (imagePreview[i]) URL.revokeObjectURL(imagePreview[i]);
    setImagePreview(prev => prev.filter((_, idx) => idx !== i));
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== i));
    setUploadedImages(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleDragStart = (e, i) => { e.dataTransfer.setData('text/plain', i); e.currentTarget.style.opacity = '0.4'; };
  const handleDragEnd   = (e)    => { e.currentTarget.style.opacity = '1'; };
  const handleDragOver  = (e)    => { e.preventDefault(); };
  const handleDrop      = (e, dropIdx) => {
    e.preventDefault();
    const dragIdx = parseInt(e.dataTransfer.getData('text/plain'));
    if (dragIdx === dropIdx) return;
    const reorder = arr => { const a = [...arr]; const [item] = a.splice(dragIdx, 1); a.splice(dropIdx, 0, item); return a; };
    setSelectedFiles(reorder);
    setImagePreview(reorder);
    setUploadedImages(reorder);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setSubmitting(true);
    setSubmitError('');
    track('publish_attempted', {
      listing_type:       listingStatus,
      property_type:      propertyType,
      photo_count:        uploadedImages.length,
      completion_pct:     listingScore,
    });
    const token = localStorage.getItem('token');
    const propertyData = {
      title: derivedTitle,
      description,
      propertyType,
      listingStatus,
      occupancy:    occupancy    || undefined,
      furnishing:   furnishing   || undefined,
      purpose,
      subCategory:  subCategory  || undefined,
      location:     location     || `${street}, ${district}, ${city}`.trim(),
      fullAddress,
      city, district, street, streetNumber, nearestMetro, buildingName,
      floorNumber:  floorNumber  ? Number(floorNumber)  : undefined,
      unitNumber,
      coordinates:  coordinates  || undefined,
      price:        Number(price),
      negotiable, currency,
      monthlyRent:    monthlyRent    ? Number(monthlyRent)    : undefined,
      depositAmount:  depositAmount  ? Number(depositAmount)  : undefined,
      paymentFrequency: paymentFrequency || undefined,
      utilitiesIncluded,
      minContractPeriod: minContractPeriod ? Number(minContractPeriod) : undefined,
      builtUpArea:  builtUpArea  ? Number(builtUpArea)  : undefined,
      landArea:     landArea     ? Number(landArea)     : undefined,
      yearBuilt:    yearBuilt    ? Number(yearBuilt)    : undefined,
      renovationYear: renovationYear ? Number(renovationYear) : undefined,
      constructionStatus: constructionStatus || undefined,
      totalFloorsInBuilding: totalFloorsInBuilding ? Number(totalFloorsInBuilding) : undefined,
      bedrooms:  bedrooms  === 'studio' ? 0 : bedrooms  === 'custom' ? Number(bedroomsCustom)  : Number(bedrooms),
      bathrooms: bathrooms === 'custom' ? Number(bathroomsCustom) : Number(bathrooms),
      balconies: Number(balconies),
      maidsRoom, storageRoom, laundryRoom, openLayoutKitchen,
      flooringType: flooringType || undefined,
      heating:      heating      || undefined,
      cooling, hotWater: hotWater || undefined,
      kitchenAppliances, smartHome, internetAvailable, builtInWardrobes, walkInCloset,
      parkingSpaces: Number(parkingSpaces),
      garage, garden, swimmingPool,
      viewType: viewType || undefined,
      roofAccess, fenced, elevator, security, cctv, gym, sharedPool,
      visitorParking, wheelchairAccessible, petsAllowed,
      nearby: {
        schools: nearbySchools, hospital: nearbyHospital, metro: nearbyMetro,
        shoppingMall: nearbyMall, park: nearbyPark, airport: nearbyAirport,
      },
      hoaFees:       hoaFees       ? Number(hoaFees) : undefined,
      ownershipType: ownershipType || undefined,
      hasMortgage, developerName, projectName,
      images:       uploadedImages,
      featuredImage: uploadedImages[0] || null,
      type: ['apartment','old-building','new-building','house'].includes(propertyType) ? 'ev'
          : propertyType === 'land' ? 'torpaq'
          : ['commercial-retail','commercial-unit','office'].includes(propertyType) ? 'obyekt'
          : 'biznes',
    };
    try {
      await createProperty(propertyData, token);
      track('publish_completed', {
        listing_type:   listingStatus,
        property_type:  propertyType,
        photo_count:    uploadedImages.length,
        completion_pct: listingScore,
      });
      navigate('/properties');
    } catch (err) {
      captureError(err, { context: 'create_property' });
      track('publish_failed', {
        listing_type:  listingStatus,
        property_type: propertyType,
        error:         err.response?.data?.message || 'unknown',
      });
      setSubmitError(err.response?.data?.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setDraftSaving(true);
    track('draft_saved', {
      listing_type:  listingStatus,
      property_type: propertyType,
      photo_count:   uploadedImages.length,
      current_step:  currentStep,
    });
    const token = localStorage.getItem('token');
    if (!token) { setDraftSaving(false); return; }
    try {
      await createProperty({
        title: derivedTitle || 'Untitled draft',
        description, propertyType, listingStatus, status: 'draft', purpose,
        subCategory: subCategory || undefined,
        location: location || derivedTitle || 'Draft',
        fullAddress, city, district, street, streetNumber, nearestMetro, buildingName,
        floorNumber: floorNumber ? Number(floorNumber) : undefined, unitNumber,
        coordinates: coordinates || undefined,
        price: price ? Number(price) : 0, negotiable, currency,
        builtUpArea: builtUpArea ? Number(builtUpArea) : undefined,
        bedrooms:  bedrooms  === 'studio' ? 0 : bedrooms  === 'custom' ? Number(bedroomsCustom)  : (bedrooms  ? Number(bedrooms)  : 0),
        bathrooms: bathrooms === 'custom' ? Number(bathroomsCustom) : (bathrooms ? Number(bathrooms) : 0),
        images: uploadedImages, featuredImage: uploadedImages[0] || null,
      }, token);
      navigate('/account/listings');
    } catch (err) {
      setDraftSaving(false);
      setSubmitError(err.response?.data?.message || 'Could not save draft.');
    }
  };

  // ── Step renders ─────────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="cp-step-body">
      {/* Review notice */}
      <div className="cp-review-notice">
        <ShieldCheck size={16} strokeWidth={1.75} aria-hidden="true" style={{ flexShrink: 0 }} />
        Our team reviews every listing within 24 hours before it goes live — keeping the marketplace trustworthy for everyone.
      </div>

      {/* Listing type */}
      <div className="cp-field-group">
        <label className="cp-label">What are you listing?</label>
        <div className="cp-pill-row">
          {[
            { value: 'for-sale',    label: 'For Sale'        },
            { value: 'for-rent',    label: 'For Rent'        },
            { value: 'new-project', label: 'New Project'     },
          ].map(o => (
            <button
              key={o.value}
              type="button"
              className={`cp-pill ${listingStatus === o.value ? 'cp-pill--active' : ''}`}
              onClick={() => setListingStatus(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rental category */}
      {listingStatus === 'for-rent' && purpose !== 'commercial' && (
        <div className="cp-field-group">
          <label className="cp-label">Rental type</label>
          <div className="cp-pill-row">
            <button type="button" className={`cp-pill ${subCategory === 'long-term' ? 'cp-pill--active' : ''}`} onClick={() => setSubCategory('long-term')}>Long-term</button>
            <button type="button" className={`cp-pill ${subCategory === 'short-term' ? 'cp-pill--active' : ''}`} onClick={() => setSubCategory('short-term')}>Short-term / Vacation</button>
          </div>
        </div>
      )}

      {/* Purpose */}
      <div className="cp-field-group">
        <label className="cp-label">Property use</label>
        <div className="cp-pill-row">
          <button type="button" className={`cp-pill ${purpose === 'residential' ? 'cp-pill--active' : ''}`} onClick={() => handlePurposeChange('residential')}>Residential</button>
          <button type="button" className={`cp-pill ${purpose === 'commercial'  ? 'cp-pill--active' : ''}`} onClick={() => handlePurposeChange('commercial')}>Commercial</button>
        </div>
      </div>

      {/* Property type */}
      <div className="cp-field-group">
        <label className="cp-label">Property type</label>
        <select className="cp-select" value={propertyType} onChange={e => setPropertyType(e.target.value)}>
          {getPropertyTypes().map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Address */}
      <div className="cp-field-group">
        <label className="cp-label">Address</label>
        <AddressAutocomplete
          value={location}
          onChange={setLocation}
          onSelectAddress={(data) => {
            setLocation(data.address);
            const coords = { lat: parseFloat(data.lat), lng: parseFloat(data.lng), latitude: parseFloat(data.lat), longitude: parseFloat(data.lng) };
            setCoordinates(coords);
            if (data.city) {
              const norm = normalizeCity(data.city);
              const match = AZERBAIJAN_CITIES.find(c => normalizeCity(c) === norm);
              setCity(match || 'Baku');
            }
            if (data.postalCode) { /* noop — stored in fullAddress */ }
            if (data.streetName)   setStreet(data.streetName);
            if (data.streetNumber) setStreetNumber(data.streetNumber);
            const metro = findNearestMetro(data.lat, data.lng);
            if (metro) setNearestMetro(metro);
            if (data.district) {
              const m = BAKU_DISTRICTS.find(d =>
                d.toLowerCase().includes(data.district.toLowerCase()) ||
                data.district.toLowerCase().includes(d.replace(' r.', '').toLowerCase())
              );
              if (m) setDistrict(m);
            }
            setShowLocationPicker(true);
          }}
          placeholder="Start typing an address…"
        />
        <p className="cp-field-hint">Type at least 3 characters to see suggestions</p>
      </div>

      {showLocationPicker && (
        <div className="cp-field-group">
          <label className="cp-label">Confirm pin location</label>
          <LocationPicker
            initialCoords={coordinates}
            onLocationChange={setCoordinates}
            height="260px"
          />
        </div>
      )}

      <div className="cp-row">
        <div className="cp-field-group cp-field-group--flex">
          <label className="cp-label">City <span className="cp-required">*</span></label>
          <select className="cp-select" value={city} onChange={e => setCity(e.target.value)} required>
            <option value="">Select city</option>
            {AZERBAIJAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {city === 'Baku' && (
          <div className="cp-field-group cp-field-group--flex">
            <label className="cp-label">District <span className="cp-required">*</span></label>
            <select className="cp-select" value={district} onChange={e => setDistrict(e.target.value)} required>
              <option value="">Select district</option>
              {BAKU_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="cp-row">
        <div className="cp-field-group cp-field-group--flex">
          <label className="cp-label">Street <span className="cp-required">*</span></label>
          <input className="cp-input" type="text" value={street} onChange={e => setStreet(e.target.value)} placeholder="e.g. Fatali Khan Khoyski" />
        </div>
        <div className="cp-field-group cp-field-group--narrow">
          <label className="cp-label">No. <span className="cp-required">*</span></label>
          <input className="cp-input" type="text" value={streetNumber} onChange={e => setStreetNumber(e.target.value)} placeholder="24" />
        </div>
      </div>

      {/* Price */}
      <div className="cp-field-group">
        <label className="cp-label">
          {listingStatus === 'for-rent' ? 'Rent price' : 'Sale price'} <span className="cp-required">*</span>
        </label>
        <div className="cp-price-row">
          <select className="cp-select cp-select--currency" value={currency} onChange={e => setCurrency(e.target.value)}>
            <option>AZN</option><option>USD</option><option>EUR</option>
          </select>
          {listingStatus === 'for-rent' ? (
            <input className="cp-input cp-input--price" type="number" value={monthlyRent}
              onChange={e => { setMonthlyRent(e.target.value); setPrice(e.target.value); }}
              placeholder="0" required />
          ) : (
            <input className="cp-input cp-input--price" type="number" value={price}
              onChange={e => setPrice(e.target.value)} placeholder="0" required />
          )}
          {listingStatus === 'for-rent' && (
            <span className="cp-price-unit">/ month</span>
          )}
        </div>
        <label className="cp-checkbox-label">
          <input type="checkbox" checked={negotiable} onChange={e => setNegotiable(e.target.checked)} />
          Negotiable
        </label>
      </div>

      {!isStep1Complete && (
        <p className="cp-step-warn">Please fill in city, street, street number, and price to continue.</p>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="cp-step-body">
      <p className="cp-step-intro">Tell buyers about the property's key specifications.</p>

      {/* Bedrooms */}
      <div className="cp-field-group">
        <label className="cp-label">Bedrooms <span className="cp-required">*</span></label>
        <div className="cp-pill-row">
          {['studio', '1', '2', '3', '4', '5', '6'].map(v => (
            <button key={v} type="button"
              className={`cp-pill ${bedrooms === v ? 'cp-pill--active' : ''}`}
              onClick={() => setBedrooms(v)}
            >
              {v === 'studio' ? 'Studio' : v === '6' ? '6+' : v}
            </button>
          ))}
          <button type="button" className={`cp-pill ${bedrooms === 'custom' ? 'cp-pill--active' : ''}`}
            onClick={() => setBedrooms('custom')}>
            Custom
          </button>
        </div>
        {bedrooms === 'custom' && (
          <input className="cp-input cp-input--inline" type="number" min="0"
            value={bedroomsCustom} onChange={e => setBedroomsCustom(e.target.value)}
            placeholder="Enter number" />
        )}
      </div>

      {/* Bathrooms */}
      <div className="cp-field-group">
        <label className="cp-label">Bathrooms <span className="cp-required">*</span></label>
        <div className="cp-pill-row">
          {['0', '1', '2', '3', '4'].map(v => (
            <button key={v} type="button"
              className={`cp-pill ${bathrooms === v ? 'cp-pill--active' : ''}`}
              onClick={() => setBathrooms(v)}
            >
              {v === '4' ? '4+' : v}
            </button>
          ))}
          <button type="button" className={`cp-pill ${bathrooms === 'custom' ? 'cp-pill--active' : ''}`}
            onClick={() => setBathrooms('custom')}>
            Custom
          </button>
        </div>
        {bathrooms === 'custom' && (
          <input className="cp-input cp-input--inline" type="number" min="0"
            value={bathroomsCustom} onChange={e => setBathroomsCustom(e.target.value)}
            placeholder="Enter number" />
        )}
      </div>

      {/* Size fields */}
      <div className="cp-row">
        <div className="cp-field-group cp-field-group--flex">
          <label className="cp-label">Area (m²) <span className="cp-required">*</span></label>
          <input className="cp-input" type="number" value={builtUpArea}
            onChange={e => setBuiltUpArea(e.target.value)} placeholder="0" />
        </div>
        <div className="cp-field-group cp-field-group--flex">
          <label className="cp-label">Floor {isCondoType && <span className="cp-required">*</span>}</label>
          <input className="cp-input" type="number" value={floorNumber}
            onChange={e => setFloorNumber(e.target.value)} placeholder="—" />
        </div>
        <div className="cp-field-group cp-field-group--flex">
          <label className="cp-label">Total floors</label>
          <input className="cp-input" type="number" value={totalFloorsInBuilding}
            onChange={e => setTotalFloorsInBuilding(e.target.value)} placeholder="—" />
        </div>
      </div>

      {isCondoType && (
        <div className="cp-field-group">
          <label className="cp-label">Unit number <span className="cp-required">*</span></label>
          <input className="cp-input cp-input--short" type="text" value={unitNumber}
            onChange={e => setUnitNumber(e.target.value)} placeholder="e.g. 12A" />
        </div>
      )}

      {/* Description */}
      <div className="cp-field-group">
        <label className="cp-label">Description</label>
        <p className="cp-field-hint">A detailed description helps buyers understand what makes this property worth visiting.</p>
        <textarea
          className="cp-textarea"
          rows={5}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Describe the property's condition, layout, surroundings, and anything that would help a buyer or tenant picture it…"
          maxLength={3000}
        />
        <p className="cp-char-count">{description.length} characters
          {description.length < 100 && description.length > 0 && ' — a bit short'}
          {description.length >= 100 && description.length < 300 && ' — good start'}
          {description.length >= 300 && ' — great detail'}
        </p>
        {description.length < 50 && (
          <div className="cp-ai-hint">
            <p className="cp-ai-hint-label">What buyers want to know:</p>
            <ul className="cp-ai-hint-list">
              <li>Natural light and which rooms face south or east</li>
              <li>The neighbourhood feel and what's within walking distance</li>
              <li>Condition of finishes and any recent renovations</li>
              <li>Transport links and typical commute times</li>
              <li>Anything that photos alone can't show</li>
            </ul>
          </div>
        )}
      </div>

      {/* Occupancy & Furnishing */}
      <div className="cp-row">
        <div className="cp-field-group cp-field-group--flex">
          <label className="cp-label">Occupancy</label>
          <select className="cp-select" value={occupancy} onChange={e => setOccupancy(e.target.value)}>
            <option value="vacant">Vacant</option>
            <option value="owner-occupied">Owner occupied</option>
            <option value="tenanted">Tenanted</option>
          </select>
        </div>
        <div className="cp-field-group cp-field-group--flex">
          <label className="cp-label">Furnishing</label>
          <select className="cp-select" value={furnishing} onChange={e => setFurnishing(e.target.value)}>
            <option value="unfurnished">Unfurnished</option>
            <option value="furnished">Furnished</option>
            <option value="semi-furnished">Semi-furnished</option>
          </select>
        </div>
      </div>

      {/* Expandable extra details */}
      <button type="button" className="cp-expand-btn" onClick={() => setShowMoreDetails(v => !v)}>
        {showMoreDetails ? '− Less details' : '+ Add amenities, features & legal info'}
      </button>

      {showMoreDetails && (
        <div className="cp-expanded">
          {/* Rental terms */}
          {listingStatus === 'for-rent' && (
            <div className="cp-expanded-section">
              <p className="cp-expanded-label">Rental terms</p>
              <div className="cp-row">
                <div className="cp-field-group cp-field-group--flex">
                  <label className="cp-label">Deposit ({currency})</label>
                  <input className="cp-input" type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="0" />
                </div>
                <div className="cp-field-group cp-field-group--flex">
                  <label className="cp-label">Payment frequency</label>
                  <select className="cp-select" value={paymentFrequency} onChange={e => setPaymentFrequency(e.target.value)}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semi-annual">Semi-annual</option>
                    <option value="annual">Annual</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                  </select>
                </div>
                <div className="cp-field-group cp-field-group--flex">
                  <label className="cp-label">Min. contract (months)</label>
                  <input className="cp-input" type="number" value={minContractPeriod} onChange={e => setMinContractPeriod(e.target.value)} placeholder="—" />
                </div>
              </div>
              <label className="cp-checkbox-label">
                <input type="checkbox" checked={utilitiesIncluded} onChange={e => setUtilitiesIncluded(e.target.checked)} />
                Utilities included in rent
              </label>
            </div>
          )}

          {/* Property specifics */}
          <div className="cp-expanded-section">
            <p className="cp-expanded-label">Property details</p>
            <div className="cp-row">
              <div className="cp-field-group cp-field-group--flex">
                <label className="cp-label">Year built</label>
                <input className="cp-input" type="number" value={yearBuilt} onChange={e => setYearBuilt(e.target.value)} placeholder="—" />
              </div>
              <div className="cp-field-group cp-field-group--flex">
                <label className="cp-label">Renovation year</label>
                <input className="cp-input" type="number" value={renovationYear} onChange={e => setRenovationYear(e.target.value)} placeholder="—" />
              </div>
              <div className="cp-field-group cp-field-group--flex">
                <label className="cp-label">Land area (m²)</label>
                <input className="cp-input" type="number" value={landArea} onChange={e => setLandArea(e.target.value)} placeholder="—" />
              </div>
            </div>
            <div className="cp-row">
              <div className="cp-field-group cp-field-group--flex">
                <label className="cp-label">Construction status</label>
                <select className="cp-select" value={constructionStatus} onChange={e => setConstructionStatus(e.target.value)}>
                  <option value="ready">Ready</option>
                  <option value="under-construction">Under construction</option>
                  <option value="off-plan">Off-plan</option>
                </select>
              </div>
              <div className="cp-field-group cp-field-group--flex">
                <label className="cp-label">Balconies</label>
                <input className="cp-input" type="number" min="0" value={balconies} onChange={e => setBalconies(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Interior */}
          <div className="cp-expanded-section">
            <p className="cp-expanded-label">Interior features</p>
            <div className="cp-row">
              <div className="cp-field-group cp-field-group--flex">
                <label className="cp-label">Flooring</label>
                <select className="cp-select" value={flooringType} onChange={e => setFlooringType(e.target.value)}>
                  <option value="">Not specified</option>
                  <option value="tile">Tile</option><option value="hardwood">Hardwood</option>
                  <option value="laminate">Laminate</option><option value="carpet">Carpet</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="cp-field-group cp-field-group--flex">
                <label className="cp-label">Heating</label>
                <select className="cp-select" value={heating} onChange={e => setHeating(e.target.value)}>
                  <option value="">None</option>
                  <option value="heated-air">Heated air</option>
                  <option value="private-combi">Private combi boiler</option>
                  <option value="central-radiator">Central radiator</option>
                </select>
              </div>
              <div className="cp-field-group cp-field-group--flex">
                <label className="cp-label">Hot water</label>
                <select className="cp-select" value={hotWater} onChange={e => setHotWater(e.target.value)}>
                  <option value="">None</option>
                  <option value="combi-boiler">Combi boiler</option>
                  <option value="tankless-heater">Tankless heater</option>
                </select>
              </div>
            </div>
            <div className="cp-check-grid">
              {[
                [cooling,           setCooling,           'Air conditioning'],
                [kitchenAppliances, setKitchenAppliances, 'Kitchen appliances'],
                [smartHome,         setSmartHome,         'Smart home'],
                [internetAvailable, setInternetAvailable, 'Internet'],
                [builtInWardrobes,  setBuiltInWardrobes,  'Built-in wardrobes'],
                [walkInCloset,      setWalkInCloset,      'Walk-in closet'],
                [maidsRoom,         setMaidsRoom,         "Maid's room"],
                [storageRoom,       setStorageRoom,       'Storage room'],
                [laundryRoom,       setLaundryRoom,       'Laundry room'],
                [openLayoutKitchen, setOpenLayoutKitchen, 'Open kitchen'],
              ].map(([val, fn, label]) => (
                <label key={label} className="cp-checkbox-label">
                  <input type="checkbox" checked={val} onChange={e => fn(e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Exterior & Building */}
          <div className="cp-expanded-section">
            <p className="cp-expanded-label">Exterior & building</p>
            <div className="cp-row">
              <div className="cp-field-group cp-field-group--flex">
                <label className="cp-label">Parking spaces</label>
                <input className="cp-input" type="number" min="0" value={parkingSpaces} onChange={e => setParkingSpaces(e.target.value)} />
              </div>
              <div className="cp-field-group cp-field-group--flex">
                <label className="cp-label">View</label>
                <select className="cp-select" value={viewType} onChange={e => setViewType(e.target.value)}>
                  <option value="">Not specified</option>
                  <option value="city">City</option><option value="sea">Sea</option>
                  <option value="mountain">Mountain</option><option value="park">Park</option>
                  <option value="street">Street</option><option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="cp-check-grid">
              {[
                [garage,             setGarage,             'Garage'],
                [garden,             setGarden,             'Garden'],
                [swimmingPool,       setSwimmingPool,       'Swimming pool'],
                [roofAccess,         setRoofAccess,         'Roof access'],
                [fenced,             setFenced,             'Fenced'],
                [elevator,           setElevator,           'Elevator'],
                [security,           setSecurity,           'Security / concierge'],
                [cctv,               setCctv,               'CCTV'],
                [gym,                setGym,                'Gym'],
                [sharedPool,         setSharedPool,         'Shared pool'],
                [visitorParking,     setVisitorParking,     'Visitor parking'],
                [wheelchairAccessible, setWheelchairAccessible, 'Wheelchair accessible'],
                [petsAllowed,        setPetsAllowed,        'Pets allowed'],
              ].map(([val, fn, label]) => (
                <label key={label} className="cp-checkbox-label">
                  <input type="checkbox" checked={val} onChange={e => fn(e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Nearby */}
          <div className="cp-expanded-section">
            <p className="cp-expanded-label">Nearby amenities</p>
            <div className="cp-check-grid">
              {[
                [nearbySchools, setNearbySchools, 'Schools'],
                [nearbyHospital, setNearbyHospital, 'Hospital'],
                [nearbyMetro, setNearbyMetro, 'Metro / public transport'],
                [nearbyMall, setNearbyMall, 'Shopping mall'],
                [nearbyPark, setNearbyPark, 'Park'],
                [nearbyAirport, setNearbyAirport, 'Airport'],
              ].map(([val, fn, label]) => (
                <label key={label} className="cp-checkbox-label">
                  <input type="checkbox" checked={val} onChange={e => fn(e.target.checked)} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div className="cp-expanded-section">
            <p className="cp-expanded-label">Legal & ownership</p>
            <div className="cp-row">
              <div className="cp-field-group cp-field-group--flex">
                <label className="cp-label">Ownership documents</label>
                <select className="cp-select" value={ownershipType} onChange={e => setOwnershipType(e.target.value)}>
                  <option value="">Not specified</option>
                  <option value="ownership-certificate">Ownership certificate</option>
                  <option value="contract">Contract</option>
                  <option value="none">None</option>
                </select>
              </div>
              <div className="cp-field-group cp-field-group--flex">
                <label className="cp-label">HOA / condo fees</label>
                <input className="cp-input" type="number" value={hoaFees} onChange={e => setHoaFees(e.target.value)} placeholder="—" />
              </div>
            </div>
            <div className="cp-row">
              <div className="cp-field-group cp-field-group--flex">
                <label className="cp-label">Developer name</label>
                <input className="cp-input" type="text" value={developerName} onChange={e => setDeveloperName(e.target.value)} />
              </div>
              <div className="cp-field-group cp-field-group--flex">
                <label className="cp-label">Project name</label>
                <input className="cp-input" type="text" value={projectName} onChange={e => setProjectName(e.target.value)} />
              </div>
            </div>
            <label className="cp-checkbox-label">
              <input type="checkbox" checked={hasMortgage} onChange={e => setHasMortgage(e.target.checked)} />
              Property has mortgage
            </label>
          </div>
        </div>
      )}

      {!isStep2Complete && (
        <p className="cp-step-warn">Please select bedrooms, bathrooms, and enter the area to continue.</p>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="cp-step-body">
      <p className="cp-step-intro">
        Great photos are the single best way to attract serious enquiries.
        Aim for 8 or more — well-lit, tidy rooms shot from corner angles.
      </p>

      {/* Upload zone */}
      <div
        className={`cp-photo-zone ${uploadingImages ? 'cp-photo-zone--busy' : ''} ${dragOver ? 'cp-photo-zone--dragover' : ''}`}
        onClick={() => !uploadingImages && photoInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); if (!dragOver) setDragOver(true); }}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false); }}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && !uploadingImages && photoInputRef.current?.click()}
        aria-label="Add photos"
      >
        {uploadingImages ? (
          <>
            <div className="cp-photo-spinner" />
            <p className="cp-photo-zone-text">Uploading…</p>
          </>
        ) : (
          <>
            <ImagePlus size={26} strokeWidth={1.5} className="cp-photo-zone-icon" aria-hidden="true" />
            <p className="cp-photo-zone-text">{dragOver ? 'Drop to add' : imagePreview.length > 0 ? 'Add more photos' : 'Add photos'}</p>
            <p className="cp-photo-zone-sub">Drag & drop or click · JPEG, PNG, WEBP · max 10 MB</p>
          </>
        )}
      </div>

      <input
        ref={photoInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={uploadingImages}
      />

      {uploadError && <p className="cp-upload-error">{uploadError}</p>}
      {uploadStatusMsg && !uploadingImages && (
        <p className="cp-upload-success">{uploadStatusMsg}</p>
      )}

      {/* Preview grid */}
      {imagePreview.length > 0 && (
        <>
          {imagePreview.length < 8 && (
            <div className="cp-photo-progress">
              <div className="cp-photo-progress-bar">
                <div className="cp-photo-progress-fill" style={{ width: `${Math.min((imagePreview.length / 8) * 100, 100)}%` }} />
              </div>
              <p className="cp-photo-progress-label">{imagePreview.length} of 8 recommended</p>
            </div>
          )}
          {imagePreview.length >= 8 && (
            <p className="cp-photo-count">
              {uploadedImages.length} photo{uploadedImages.length !== 1 ? 's' : ''} — great coverage
              {uploadedImages.length === imagePreview.length && (
                <Check size={13} strokeWidth={3} style={{ display: 'inline', marginLeft: 5, color: '#0F766E', verticalAlign: 'middle' }} />
              )}
            </p>
          )}
          <div className="cp-photo-grid">
            {imagePreview.map((src, i) => (
              <div
                key={i}
                className="cp-photo-item"
                draggable
                onDragStart={e => handleDragStart(e, i)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, i)}
              >
                {i === 0 && <span className="cp-photo-cover-badge">Main photo</span>}
                <img src={src} alt="" className="cp-photo-thumb" />
                <button type="button" className="cp-photo-remove" onClick={() => removeImage(i)} aria-label="Remove photo">✕</button>
              </div>
            ))}
          </div>
          <p className="cp-field-hint">Drag to reorder · first photo becomes the listing cover.</p>
        </>
      )}

      {/* Photo tips */}
      <div className="cp-photo-tips">
        <p className="cp-photo-tips-head">Tips for better photos</p>
        <ul className="cp-photo-tips-list">
          <li>Take photos in natural daylight — avoid flash where possible</li>
          <li>Include every main room: living room, kitchen, bedroom, bathroom</li>
          <li>Show the building exterior and entrance</li>
          <li>Declutter and tidy the space before shooting</li>
          <li>Aim for at least 8 photos — listings with more photos receive more inquiries</li>
        </ul>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="cp-step-body">
      <p className="cp-step-intro">
        These steps are optional, but they help buyers feel confident in your listing.
      </p>

      {/* Phone verification card */}
      <div className="cp-trust-card">
        <div className="cp-trust-card-header">
          <span className={`cp-trust-status ${currentUser?.phoneVerified ? 'cp-trust-status--done' : 'cp-trust-status--pending'}`}>
            {currentUser?.phoneVerified ? '✓' : '○'}
          </span>
          <div>
            <p className="cp-trust-card-title">Phone verification</p>
            <p className="cp-trust-card-sub">
              {currentUser?.phoneVerified
                ? 'Your phone number is verified.'
                : 'Verifying your phone increases buyer confidence in your listing.'}
            </p>
          </div>
        </div>
        {!currentUser?.phoneVerified && (
          <Link to="/account/settings" className="cp-trust-link">
            Verify phone in Account Settings →
          </Link>
        )}
      </div>

      {/* Ownership verification card */}
      <div className="cp-trust-card">
        <div className="cp-trust-card-header">
          <span className="cp-trust-status cp-trust-status--info">○</span>
          <div>
            <p className="cp-trust-card-title">Ownership documents</p>
            <p className="cp-trust-card-sub">
              Listings with reviewed ownership documents receive a visible trust indicator
              that shows buyers the property has been verified.
            </p>
          </div>
        </div>
        <p className="cp-trust-note">
          You can submit ownership documents from your listings page after publishing.
          This does not affect your listing going live.
        </p>
      </div>

      {/* Account note */}
      {currentUser?.verified && (
        <div className="cp-trust-card cp-trust-card--positive">
          <div className="cp-trust-card-header">
            <span className="cp-trust-status cp-trust-status--done">✓</span>
            <div>
              <p className="cp-trust-card-title">Verified account</p>
              <p className="cp-trust-card-sub">Your account is verified. This is visible on your listing.</p>
            </div>
          </div>
        </div>
      )}

      <p className="cp-trust-footer">
        None of these affect your ability to publish. They simply help buyers feel more confident when contacting you.
      </p>
    </div>
  );

  const renderStep5 = () => {
    const typeLabel = getPropertyTypes().find(t => t.value === propertyType)?.label || propertyType;
    const priceDisplay = listingStatus === 'for-rent'
      ? `${currency} ${Number(monthlyRent || 0).toLocaleString()} / month`
      : `${currency} ${Number(price || 0).toLocaleString()}`;
    const bedroomDisplay = bedrooms === 'studio' ? 'Studio'
      : bedrooms === 'custom' ? `${bedroomsCustom} bedrooms`
      : bedrooms ? `${bedrooms} bedroom${bedrooms !== '1' ? 's' : ''}` : '—';
    const bathroomDisplay = bathrooms === 'custom' ? `${bathroomsCustom} bathrooms`
      : bathrooms ? `${bathrooms} bathroom${bathrooms !== '1' ? 's' : ''}` : '—';

    const trustItems = [
      { ok: currentUser?.phoneVerified,             label: 'Phone number verified'       },
      { ok: currentUser?.verified,                  label: 'Verified account'             },
      { ok: (description?.length || 0) >= 300,      label: 'Detailed description'         },
      { ok: uploadedImages.length >= 8,             label: '8 or more photos'             },
      { ok: uploadedImages.length >= 1 && uploadedImages.length < 8, label: `${uploadedImages.length} photo${uploadedImages.length !== 1 ? 's' : ''} added` },
    ].filter(i => i.ok !== false && !(i.ok === undefined));

    const scoreColor = listingScore >= 80 ? '#0F766E'
      : listingScore >= 60 ? '#2563EB'
      : listingScore >= 40 ? '#D97706'
      : '#DC2626';
    const scoreLabel = listingScore >= 80 ? 'Excellent listing'
      : listingScore >= 60 ? 'Good listing'
      : listingScore >= 40 ? 'Fair listing'
      : 'Needs a few more details';

    return (
      <div className="cp-step-body">
        {/* Listing quality score */}
        <div className="cp-score">
          <div className="cp-score-track">
            <div className="cp-score-fill" style={{ width: `${listingScore}%`, background: scoreColor }} />
          </div>
          <div className="cp-score-meta">
            <span className="cp-score-label" style={{ color: scoreColor }}>{scoreLabel}</span>
            <span className="cp-score-pct">{listingScore}%</span>
          </div>
        </div>

        {/* Listing title */}
        <div className="cp-field-group">
          <label className="cp-label">Listing headline</label>
          <input
            className="cp-input"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={derivedTitle || 'Your listing headline'}
          />
          {!title && derivedTitle && (
            <div className="cp-ai-hint cp-ai-hint--inline">
              <span className="cp-ai-hint-label">Suggested:</span>
              <button type="button" className="cp-title-suggest" onClick={() => setTitle(derivedTitle)}>
                "{derivedTitle}"
              </button>
            </div>
          )}
        </div>

        {/* Summary card */}
        <div className="cp-review-card">
          <div className="cp-review-row">
            <span className="cp-review-key">Type</span>
            <span className="cp-review-val">{typeLabel}</span>
          </div>
          <div className="cp-review-row">
            <span className="cp-review-key">Location</span>
            <span className="cp-review-val">{[district, city].filter(Boolean).join(', ') || '—'}</span>
          </div>
          <div className="cp-review-row">
            <span className="cp-review-key">Price</span>
            <span className="cp-review-val">{priceDisplay}</span>
          </div>
          <div className="cp-review-row">
            <span className="cp-review-key">Bedrooms</span>
            <span className="cp-review-val">{bedroomDisplay}</span>
          </div>
          <div className="cp-review-row">
            <span className="cp-review-key">Bathrooms</span>
            <span className="cp-review-val">{bathroomDisplay}</span>
          </div>
          {builtUpArea && (
            <div className="cp-review-row">
              <span className="cp-review-key">Area</span>
              <span className="cp-review-val">{builtUpArea} m²</span>
            </div>
          )}
          <div className="cp-review-row">
            <span className="cp-review-key">Photos</span>
            <span className="cp-review-val">
              {uploadedImages.length > 0 ? `${uploadedImages.length} photo${uploadedImages.length !== 1 ? 's' : ''}` : 'None added'}
            </span>
          </div>
        </div>

        {/* Trust indicators */}
        {trustItems.length > 0 && (
          <div className="cp-review-trust">
            <p className="cp-review-trust-head">Your listing's trust indicators</p>
            {trustItems.map(item => (
              <div key={item.label} className="cp-review-trust-item">
                <span className="cp-review-trust-check">✓</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Moderation notice */}
        <div className="cp-moderation-notice">
          <p className="cp-moderation-icon">☑</p>
          <div>
            <p className="cp-moderation-title">Reviewed before going live</p>
            <p className="cp-moderation-body">
              All listings are reviewed by our team before publication. This helps keep
              the marketplace trustworthy and free of misleading listings — for everyone's benefit.
            </p>
          </div>
        </div>

        {submitError && <p className="cp-submit-error">{submitError}</p>}

        {!isPublishReady && (
          <p className="cp-step-warn">
            Please go back and complete the required fields (city, street, price, bedrooms, bathrooms, area).
          </p>
        )}
      </div>
    );
  };

  // ── Main render ──────────────────────────────────────────────────────────────

  const stepContent = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5];

  return (
    <div className="cp-container">
      {/* Step indicator — sticky on mobile */}
      <header className="cp-progress-bar">
        <div className="cp-progress-inner">
          {STEPS.map((s, i) => {
            const isPast   = currentStep > s.id;
            const isDone   = isPast && stepComplete[s.id - 1];
            const hasError = isPast && !stepComplete[s.id - 1];
            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  className={[
                    'cp-step-dot',
                    currentStep === s.id ? 'cp-step-dot--active' : '',
                    isDone    ? 'cp-step-dot--done'  : '',
                    hasError  ? 'cp-step-dot--error' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setCurrentStep(s.id)}
                  aria-label={`Step ${s.id}: ${s.label}${hasError ? ' — incomplete' : ''}`}
                >
                  <span className="cp-step-num">
                    {isDone   ? <Check  size={13} strokeWidth={2.5} aria-hidden="true" /> :
                     hasError ? <XIcon  size={13} strokeWidth={2.5} aria-hidden="true" /> :
                     s.id}
                  </span>
                  <span className="cp-step-label">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={[
                    'cp-step-line',
                    isDone   ? 'cp-step-line--done'  : '',
                    hasError ? 'cp-step-line--error' : '',
                  ].filter(Boolean).join(' ')} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <p className="cp-progress-mobile">Step {currentStep} of {STEPS.length} · {STEPS[currentStep - 1].label}</p>
      </header>

      {/* Step heading */}
      <div className="cp-step-heading">
        <h1 className="cp-step-title">
          {currentStep === 1 && 'What are you listing?'}
          {currentStep === 2 && 'Tell the story'}
          {currentStep === 3 && 'Bring it to life'}
          {currentStep === 4 && 'Build trust'}
          {currentStep === 5 && 'Ready to publish'}
        </h1>
        <p className="cp-step-subtitle">
          {currentStep === 1 && 'Location, listing type, and asking price.'}
          {currentStep === 2 && 'Rooms, size, and what makes it special.'}
          {currentStep === 3 && 'Photos attract 3× more enquiries.'}
          {currentStep === 4 && 'Optional signals that help buyers feel confident.'}
          {currentStep === 5 && 'A final review before our team checks it.'}
        </p>
      </div>

      {/* Step content — wrapped in form to prevent accidental enter-submit */}
      <form onSubmit={e => e.preventDefault()} className="cp-form">
        {stepContent[currentStep - 1]()}

        {/* Navigation */}
        <div className="cp-nav">
          {currentStep > 1 && (
            <button type="button" className="cp-nav-back" onClick={goBack}>
              ← Back
            </button>
          )}

          <div className="cp-nav-right">
            <button type="button" className="cp-nav-draft" onClick={handleSaveDraft} disabled={draftSaving}>
              {draftSaving ? 'Saving…' : 'Save draft'}
            </button>

            {currentStep < 5 ? (
              <button
                type="button"
                className="cp-nav-next"
                onClick={goNext}
                disabled={currentStep === 1 && !isStep1Complete || currentStep === 2 && !isStep2Complete}
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                className={`cp-nav-publish ${!isPublishReady || submitting ? 'cp-nav-publish--disabled' : ''}`}
                onClick={handleCreate}
                disabled={!isPublishReady || submitting}
              >
                {submitting ? 'Publishing…' : 'Publish Listing'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateProperty;
