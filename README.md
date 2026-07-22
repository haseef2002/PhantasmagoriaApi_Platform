# Phantasmagoria API | Alumni Influencers Platform

A secure, headless Node.js and Express REST API built using the Model-View-Controller (MVC) architectural pattern. Designed to serve data to client-agnostic applications while managing a secure, blind-bidding influencer marketplace and comprehensive profile lifecycle management.

---

##  Key Features

*   **MVC Architecture:** Clean separation of concerns with dedicated model and controller logic for profiles, degrees, certifications, and bids.
*   **Secure Authentication:** JWT-based session handling, password hashing, and strict email domain verification.
*   **Blind Bidding Marketplace:** Features an "increase-only" bidding system, blind status reporting (hiding maximum competitor bids), and automated monthly win-capping via `node-cron`.
*   **Profile Lifecycle Management:** Complete CRUD operations for academic degrees, certifications, licences, short courses, and employment history with calculated profile completion scoring.
*   **File Upload Security:** Secure image handling via `Multer` with strict MIME-type and size validation.
*   **API Security Stack:** Integrated with `Helmet`, `CORS`, and `express-rate-limit`.

---

##  Tech Stack

*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Database:** Maria DB (with transaction support)
*   **Documentation:** Swagger / OpenAPI 3.0
*   **Security:** JSON Web Tokens (JWT), Bcrypt, Helmet, Rate Limiting

---

##  Project Structure
```text
├── config/             # Database connection setup
├── controllers/        # Business logic handlers
├── models/             # Database query operations (MVC)
├── routes/             # API endpoint routing maps
├── middleware/         # Authentication & security middlewares
├── utilities/          # utilities (backround Services)
├── uploads/            # Secure local storage for profile photos
├── server.js           # App entry point & middleware stack
├── swagger.json        # OpenAPI 3.0 specification
└── profile-dashboard.html # Frontend client implementation for web forms
```
---

 ## Installation & Setup
*1.Clone the repository:
*Bash
*`git clone [https://github.com/your-username/phantasmagoria-api.git](https://github.com/your-username/phantasmagoria-api.git)`
*`cd phantasmagoria-api`


*2.Install dependencies:
*Bash
*`npm install`

*3.Configure environment variables:
*Create a .env file in the root directory and add your configurations:
*Code snippet
```
*PORT=3000
*DB_HOST=localhost
*DB_USER=root
*DB_PASSWORD=your_password
*DB_NAME=phantasmagoria_db
*JWT_SECRET=your_jwt_secret_key
```
*4.Run the server:
*Bash
*Development mode (with nodemon)
*`npm run dev`

*Production mode
*`npm start`

---

## 📖 API Documentation
Interactive API documentation is structured via OpenAPI 3.0. You can review the complete route specifications, parameters, and request schemas in the swagger.json file.
