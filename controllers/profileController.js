const Profile = require('../models/profileModel');

// Helper function for URL Validation
const isValidUrl = (string) => {
    try {
        new URL(string);
        return true;
    } catch (err) {
        return false;
    }
};

// Update Core Profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId; // Comes from the authenticateToken middleware

        // Extract name from the request body
        const { name, biography, linkedinUrl } = req.body;
        
        // Handle image path if a file was uploaded via multer
        const profileImageUrl = req.file ? req.file.path : null;

        //linkedin URL Validation Requirement
        const linkedinRegex = /^https:\/\/(www\.)?linkedin\.com\/.*$/;
        if (linkedinUrl && !linkedinRegex.test(linkedinUrl)) {
            return res.status(400).json({ error: 'Must be a valid LinkedIn URL.' });
        }
        //pass data to the model
        await Profile.upsertProfile(userId, name, biography, linkedinUrl, profileImageUrl);
        res.status(200).json({ message: 'Profile updated successfully.' });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Get Full Profile
const getMyProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const profile = await Profile.getProfileByUserId(userId);
        
        if (!profile) {
            return res.status(404).json({ error: 'Profile not found.' });
        }

        // Fetch ALL related data
        const degrees = await Profile.getDegreesByProfileId(profile.id);
        const certifications = await Profile.getCertificationsByProfileId(profile.id);
        const licences = await Profile.getLicencesByProfileId(profile.id);
        const shortCourses = await Profile.getShortCoursesByProfileId(profile.id);
        const employment = await Profile.getEmploymentByProfileId(profile.id);
        
        // Calculate Profile Completion Status
        let completionScore = 0;
        let missingFields = [];

        // Base profile fields (35%)
        if (profile.name) completionScore += 10; else missingFields.push('Name');
        if (profile.biography) completionScore += 10; else missingFields.push('Biography');
        if (profile.profile_image_url) completionScore += 5; else missingFields.push('Profile Image');
        if (profile.linkedin_url) completionScore += 10; else missingFields.push('LinkedIn URL');

        // Relational tables (65%)
        if (degrees && degrees.length > 0) completionScore += 15; else missingFields.push('Degrees');
        if (employment && employment.length > 0) completionScore += 15; else missingFields.push('Employment History');
        if (certifications && certifications.length > 0) completionScore += 15; else missingFields.push('Certifications');
        if (licences && licences.length > 0) completionScore += 10; else missingFields.push('Licences');
        if (shortCourses && shortCourses.length > 0) completionScore += 10; else missingFields.push('Short Courses');

        res.status(200).json({
            profileCompletion: {
                percentage: `${completionScore}%`,
                isComplete: completionScore === 100,
                missingFields
            },
            data: {
                ...profile,
                degrees,
                certifications,
                licences,
                shortCourses,
                employment
            }
        });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Add a Degree
const addDegree = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { degreeName, universityUrl, completionDate } = req.body;

        if (!degreeName || !completionDate) {
            return res.status(400).json({ error: 'Degree name and completion date are required.' });
        }
        
        if (universityUrl && !isValidUrl(universityUrl)) {
            return res.status(400).json({ error: 'Invalid University URL format.' });
        }

        const profile = await Profile.getProfileByUserId(userId);
        if (!profile) return res.status(400).json({ error: 'Please create your main profile first.' });

        await Profile.addDegree(profile.id, degreeName, universityUrl, completionDate);
        res.status(201).json({ message: 'Degree added successfully.' });
    } catch (error) {
        console.error('Add Degree Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Add a Certification
const addCertification = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { certificationName, courseUrl, completionDate } = req.body;

        if (!certificationName || !completionDate) return res.status(400).json({ error: 'Missing required fields.' });
        if (courseUrl && !isValidUrl(courseUrl)) return res.status(400).json({ error: 'Invalid URL format.' });

        const profile = await Profile.getProfileByUserId(userId);
        await Profile.addCertification(profile.id, certificationName, courseUrl, completionDate);
        res.status(201).json({ message: 'Certification added successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Add a Licence
const addLicence = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { licenceName, awardingBodyUrl, completionDate } = req.body;

        if (!licenceName || !completionDate) return res.status(400).json({ error: 'Missing required fields.' });
        if (awardingBodyUrl && !isValidUrl(awardingBodyUrl)) return res.status(400).json({ error: 'Invalid URL format.' });

        const profile = await Profile.getProfileByUserId(userId);
        await Profile.addLicence(profile.id, licenceName, awardingBodyUrl, completionDate);
        res.status(201).json({ message: 'Licence added successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Add a Short Course
const addShortCourse = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { courseName, courseUrl, completionDate } = req.body;

        if (!courseName || !completionDate) return res.status(400).json({ error: 'Missing required fields.' });
        if (courseUrl && !isValidUrl(courseUrl)) return res.status(400).json({ error: 'Invalid URL format.' });

        const profile = await Profile.getProfileByUserId(userId);
        await Profile.addShortCourse(profile.id, courseName, courseUrl, completionDate);
        res.status(201).json({ message: 'Short course added successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Add Employment History
const addEmployment = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { jobTitle, companyName, startDate, endDate } = req.body;

        // Employment history requires start and end dates
        if (!jobTitle || !companyName || !startDate) {
            return res.status(400).json({ error: 'Job title, company, and start date are required.' });
        }

        const profile = await Profile.getProfileByUserId(userId);
        await Profile.addEmployment(profile.id, jobTitle, companyName, startDate, endDate);
        res.status(201).json({ message: 'Employment history added successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// --- EDIT (PUT) CONTROLLERS ---

const editDegree = async (req, res) => {
    try {
        const { degreeName, universityUrl, completionDate } = req.body;
        if (universityUrl && !isValidUrl(universityUrl)) return res.status(400).json({ error: 'Invalid URL format.' });

        const profile = await Profile.getProfileByUserId(req.user.userId);
        if (!profile) return res.status(404).json({ error: 'Profile not found.' });

        await Profile.updateDegree(req.params.id, profile.id, degreeName, universityUrl, completionDate);
        res.status(200).json({ message: 'Degree updated successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const editCertification = async (req, res) => {
    try {
        const { certificationName, courseUrl, completionDate } = req.body;
        if (courseUrl && !isValidUrl(courseUrl)) return res.status(400).json({ error: 'Invalid URL format.' });

        const profile = await Profile.getProfileByUserId(req.user.userId);
        if (!profile) return res.status(404).json({ error: 'Profile not found.' });

        await Profile.updateCertification(req.params.id, profile.id, certificationName, courseUrl, completionDate);
        res.status(200).json({ message: 'Certification updated successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const editLicence = async (req, res) => {
    try {
        const { licenceName, awardingBodyUrl, completionDate } = req.body;
        if (awardingBodyUrl && !isValidUrl(awardingBodyUrl)) return res.status(400).json({ error: 'Invalid URL format.' });

        const profile = await Profile.getProfileByUserId(req.user.userId);
        if (!profile) return res.status(404).json({ error: 'Profile not found.' });

        await Profile.updateLicence(req.params.id, profile.id, licenceName, awardingBodyUrl, completionDate);
        res.status(200).json({ message: 'Licence updated successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const editShortCourse = async (req, res) => {
    try {
        const { courseName, courseUrl, completionDate } = req.body;
        if (courseUrl && !isValidUrl(courseUrl)) return res.status(400).json({ error: 'Invalid URL format.' });

        const profile = await Profile.getProfileByUserId(req.user.userId);
        if (!profile) return res.status(404).json({ error: 'Profile not found.' });

        await Profile.updateShortCourse(req.params.id, profile.id, courseName, courseUrl, completionDate);
        res.status(200).json({ message: 'Short course updated successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const editEmployment = async (req, res) => {
    try {
        const { jobTitle, companyName, startDate, endDate } = req.body;

        const profile = await Profile.getProfileByUserId(req.user.userId);
        if (!profile) return res.status(404).json({ error: 'Profile not found.' });

        await Profile.updateEmployment(req.params.id, profile.id, jobTitle, companyName, startDate, endDate);
        res.status(200).json({ message: 'Employment history updated successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// --- DELETE CONTROLLERS ---

const removeDegree = async (req, res) => {
    try {
        const profile = await Profile.getProfileByUserId(req.user.userId);
        if (!profile) return res.status(404).json({ error: 'Profile not found.' });

        await Profile.deleteDegree(req.params.id, profile.id);
        res.status(200).json({ message: 'Degree deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const removeCertification = async (req, res) => {
    try {
        const profile = await Profile.getProfileByUserId(req.user.userId);
        if (!profile) return res.status(404).json({ error: 'Profile not found.' });

        await Profile.deleteCertification(req.params.id, profile.id);
        res.status(200).json({ message: 'Certification deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const removeLicence = async (req, res) => {
    try {
        const profile = await Profile.getProfileByUserId(req.user.userId);
        if (!profile) return res.status(404).json({ error: 'Profile not found.' });

        await Profile.deleteLicence(req.params.id, profile.id);
        res.status(200).json({ message: 'Licence deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const removeShortCourse = async (req, res) => {
    try {
        const profile = await Profile.getProfileByUserId(req.user.userId);
        if (!profile) return res.status(404).json({ error: 'Profile not found.' });

        await Profile.deleteShortCourse(req.params.id, profile.id);
        res.status(200).json({ message: 'Short course deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const removeEmployment = async (req, res) => {
    try {
        const profile = await Profile.getProfileByUserId(req.user.userId);
        if (!profile) return res.status(404).json({ error: 'Profile not found.' });

        await Profile.deleteEmployment(req.params.id, profile.id);
        res.status(200).json({ message: 'Employment history deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error.' });
    }
};

module.exports = { 
    updateProfile,
    getMyProfile,
    addDegree,
    addCertification,
    addLicence,
    addShortCourse,
    addEmployment,
    editDegree,
    editCertification,
    editLicence,
    editShortCourse,
    editEmployment,
    removeDegree,
    removeCertification,
    removeLicence,
    removeShortCourse,
    removeEmployment
};