const express = require('express');
const router = express.Router();
const multer = require('multer');
const profileController = require('../controllers/profileController');
const authenticateToken = require('../middleware/authMiddleware'); 

// --- 1. SECURE MULTER CONFIGURATION ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); 
    },
    filename: function (req, file, cb) {
        // Create a unique filename to prevent overwriting and path traversal attacks
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

// Enforce strict file types and size limits (30MB) for security
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 30 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/webp') {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP are allowed.'), false);
        }
    }
});

// --- 2. GLOBAL AUTHENTICATION MIDDLEWARE ---
// Apply authentication middleware to ALL routes below to secure the endpoints
router.use(authenticateToken);

// --- 3. CORE PROFILE ROUTES ---
// Retrieve the complete profile, associated records, and completion status
router.get('/', profileController.getMyProfile);

// Update name, biography, LinkedIn URL, and handle profile image uploads
router.post('/update', upload.single('profileImage'), profileController.updateProfile);


// --- 4. CREATE (ADD) ROUTES ---
router.post('/degrees', profileController.addDegree);
router.post('/certifications', profileController.addCertification);
router.post('/licences', profileController.addLicence);
router.post('/short-courses', profileController.addShortCourse);
router.post('/employment', profileController.addEmployment);


// --- 5. UPDATE (EDIT) ROUTES ---
// The ':id' parameter represents the specific ID of the record being edited
router.put('/degrees/:id', profileController.editDegree);
router.put('/certifications/:id', profileController.editCertification);
router.put('/licences/:id', profileController.editLicence);
router.put('/short-courses/:id', profileController.editShortCourse);
router.put('/employment/:id', profileController.editEmployment);


// --- 6. DELETE (REMOVE) ROUTES ---
// The ':id' parameter represents the specific ID of the record being deleted
router.delete('/degrees/:id', profileController.removeDegree);
router.delete('/certifications/:id', profileController.removeCertification);
router.delete('/licences/:id', profileController.removeLicence);
router.delete('/short-courses/:id', profileController.removeShortCourse);
router.delete('/employment/:id', profileController.removeEmployment);


module.exports = router;