const db = require('../config/db');

// --- CORE PROFILE OPERATIONS ---

// Get a profile by User ID
const getProfileByUserId = async (userId) => {
    const [rows] = await db.query('SELECT * FROM profiles WHERE user_id = ?', [userId]);
    return rows[0];
};

// Create or Update the main profile (Biography, LinkedIn, Image)
const upsertProfile = async (userId, name, biography, linkedinUrl, profileImageUrl) => {
    // uses INSERT ... ON DUPLICATE KEY UPDATE to handle both creation and editing seamlessly
    const query = `
        INSERT INTO profiles (user_id, name, biography, linkedin_url, profile_image_url) 
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
        biography = VALUES(biography), 
        linkedin_url = VALUES(linkedin_url), 
        profile_image_url = IFNULL(VALUES(profile_image_url), profile_image_url)
    `;
    await db.query(query, [userId, name, biography, linkedinUrl, profileImageUrl]);
};

// --- DEGREE OPERATIONS (1:N Relationship) ---

// Add a degree
const addDegree = async (profileId, degreeName, universityUrl, completionDate) => {
    const query = `
        INSERT INTO degrees (profile_id, degree_name, university_url, completion_date) 
        VALUES (?, ?, ?, ?)
    `;
    await db.query(query, [profileId, degreeName, universityUrl, completionDate]);
};
// Get all degrees for a profile
const getDegreesByProfileId = async (profileId) => {
    const [rows] = await db.query('SELECT * FROM degrees WHERE profile_id = ?', [profileId]);
    return rows;
};


// --- CERTIFICATION OPERATIONS ---
const addCertification = async (profileId, certificationName, courseUrl, completionDate) => {
    const query = 'INSERT INTO certifications (profile_id, certification_name, course_url, completion_date) VALUES (?, ?, ?, ?)';
    await db.query(query, [profileId, certificationName, courseUrl, completionDate]);
};
const getCertificationsByProfileId = async (profileId) => {
    const [rows] = await db.query('SELECT * FROM certifications WHERE profile_id = ?', [profileId]);
    return rows;
};

// --- LICENCE OPERATIONS ---
const addLicence = async (profileId, licenceName, awardingBodyUrl, completionDate) => {
    const query = 'INSERT INTO licences (profile_id, licence_name, awarding_body_url, completion_date) VALUES (?, ?, ?, ?)';
    await db.query(query, [profileId, licenceName, awardingBodyUrl, completionDate]);
};
const getLicencesByProfileId = async (profileId) => {
    const [rows] = await db.query('SELECT * FROM licences WHERE profile_id = ?', [profileId]);
    return rows;
};

// --- SHORT COURSE OPERATIONS ---
const addShortCourse = async (profileId, courseName, courseUrl, completionDate) => {
    const query = 'INSERT INTO short_courses (profile_id, course_name, course_url, completion_date) VALUES (?, ?, ?, ?)';
    await db.query(query, [profileId, courseName, courseUrl, completionDate]);
};
const getShortCoursesByProfileId = async (profileId) => {
    const [rows] = await db.query('SELECT * FROM short_courses WHERE profile_id = ?', [profileId]);
    return rows;
};

// --- EMPLOYMENT HISTORY OPERATIONS ---
const addEmployment = async (profileId, jobTitle, companyName, startDate, endDate) => {
    const query = 'INSERT INTO employment_history (profile_id, job_title, company_name, start_date, end_date) VALUES (?, ?, ?, ?, ?)';
    // endDate can be null if it is a current job
    await db.query(query, [profileId, jobTitle, companyName, startDate, endDate || null]);
};
const getEmploymentByProfileId = async (profileId) => {
    const [rows] = await db.query('SELECT * FROM employment_history WHERE profile_id = ?', [profileId]);
    return rows;
};

// --- UPDATE OPERATIONS ---

const updateDegree = async (degreeId, profileId, degreeName, universityUrl, completionDate) => {
    const query = `UPDATE degrees SET degree_name = ?, university_url = ?, completion_date = ? WHERE id = ? AND profile_id = ?`;
    await db.query(query, [degreeName, universityUrl, completionDate, degreeId, profileId]);
};

const updateCertification = async (certId, profileId, certificationName, courseUrl, completionDate) => {
    const query = `UPDATE certifications SET certification_name = ?, course_url = ?, completion_date = ? WHERE id = ? AND profile_id = ?`;
    await db.query(query, [certificationName, courseUrl, completionDate, certId, profileId]);
};

const updateLicence = async (licenceId, profileId, licenceName, awardingBodyUrl, completionDate) => {
    const query = `UPDATE licences SET licence_name = ?, awarding_body_url = ?, completion_date = ? WHERE id = ? AND profile_id = ?`;
    await db.query(query, [licenceName, awardingBodyUrl, completionDate, licenceId, profileId]);
};

const updateShortCourse = async (courseId, profileId, courseName, courseUrl, completionDate) => {
    const query = `UPDATE short_courses SET course_name = ?, course_url = ?, completion_date = ? WHERE id = ? AND profile_id = ?`;
    await db.query(query, [courseName, courseUrl, completionDate, courseId, profileId]);
};

const updateEmployment = async (empId, profileId, jobTitle, companyName, startDate, endDate) => {
    const query = `UPDATE employment_history SET job_title = ?, company_name = ?, start_date = ?, end_date = ? WHERE id = ? AND profile_id = ?`;
    await db.query(query, [jobTitle, companyName, startDate, endDate || null, empId, profileId]);
};

// --- DELETE OPERATIONS ---

const deleteDegree = async (degreeId, profileId) => {
    await db.query('DELETE FROM degrees WHERE id = ? AND profile_id = ?', [degreeId, profileId]);
};

const deleteCertification = async (certId, profileId) => {
    await db.query('DELETE FROM certifications WHERE id = ? AND profile_id = ?', [certId, profileId]);
};

const deleteLicence = async (licenceId, profileId) => {
    await db.query('DELETE FROM licences WHERE id = ? AND profile_id = ?', [licenceId, profileId]);
};

const deleteShortCourse = async (courseId, profileId) => {
    await db.query('DELETE FROM short_courses WHERE id = ? AND profile_id = ?', [courseId, profileId]);
};

const deleteEmployment = async (empId, profileId) => {
    await db.query('DELETE FROM employment_history WHERE id = ? AND profile_id = ?', [empId, profileId]);
};

module.exports = {
    getProfileByUserId,
    upsertProfile,
    addDegree,
    getDegreesByProfileId,
    updateDegree,
    deleteDegree,
    addCertification,
    getCertificationsByProfileId,
    updateCertification,
    deleteCertification,
    addLicence,
    getLicencesByProfileId,
    updateLicence,
    deleteLicence,
    addShortCourse,
    getShortCoursesByProfileId,
    updateShortCourse,
    deleteShortCourse,
    addEmployment,
    getEmploymentByProfileId,
    updateEmployment,
    deleteEmployment
};