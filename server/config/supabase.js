const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'property-images';

// Ensure bucket exists (run once at startup — non-fatal if Supabase is unreachable)
const initBucket = async () => {
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.warn('[Supabase] Storage unavailable at startup — image uploads may fail until the project is reachable.');
    return;
  }
  const exists = buckets && buckets.some(b => b.name === BUCKET);
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
    if (error) console.warn(`[Supabase] Could not create bucket "${BUCKET}": ${error.message}`);
  }
};
initBucket().catch(() => {
  console.warn('[Supabase] Storage check failed — server will continue without storage validation.');
});

// All uploads use memory storage — file buffers are available as req.file.buffer
const memoryStorage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
  if (allowedMimes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type "${file.mimetype}". Only JPEG, PNG, WEBP, and HEIC images are allowed.`), false);
  }
};

const uploadPropertyImages = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const uploadThumbnail = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const uploadAvatar = multer({
  storage: memoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Upload a buffer to Supabase Storage and return public URL + storage path
const uploadToStorage = async (buffer, storagePath, mimetype) => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: mimetype, upsert: true });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(data.path);

  return { publicUrl, path: data.path };
};

// Extract the Supabase storage path from a public URL
const pathFromUrl = (url) => {
  const prefix = `${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
};

const deleteImage = async (storagePath) => {
  if (!storagePath) return;
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) throw new Error(`Supabase delete failed: ${error.message}`);
};

const deleteMultipleImages = async (storagePaths) => {
  const valid = storagePaths.filter(Boolean);
  if (!valid.length) return;
  const { error } = await supabase.storage.from(BUCKET).remove(valid);
  if (error) throw new Error(`Supabase bulk delete failed: ${error.message}`);
};

module.exports = {
  supabase,
  BUCKET,
  uploadPropertyImages,
  uploadThumbnail,
  uploadAvatar,
  uploadToStorage,
  pathFromUrl,
  deleteImage,
  deleteMultipleImages
};
