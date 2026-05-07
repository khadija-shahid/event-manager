# Event Manager Web Application

A full stack event management web application built using Node.js, Express.js, EJS, and SQLite. The application allows users to browse events, book tickets, and manage event information through a database driven system.

This project was developed as part of a university coursework assignment and demonstrates server side rendering, routing, database integration, and application tier architecture.

---

# Features

* Browse available events
* View detailed event information
* Ticket booking system
* Organiser dashboard
* Event analytics and reporting
* SQLite database integration
* Server side rendering using EJS
* Form handling and validation
* Dynamic event management

---

# Technologies Used

* Node.js
* Express.js
* EJS
* SQLite3
* HTML5
* CSS3
* JavaScript

---

# Project Structure

```bash
event-manager/
│
├── public/                 # Static assets
├── routes/                 # Application routes
├── views/                  # EJS templates
├── database.db             # SQLite database
├── db_schema.sql           # Database schema
├── index.js                # Main server file
├── package.json            # Project configuration
└── README.md               # Project documentation
```

---

# Installation

## 1. Clone the Repository

```bash
git clone https://github.com/your-username/event-manager.git
```

## 2. Navigate into the Project Folder

```bash
cd event-manager
```

## 3. Install Dependencies

```bash
npm install
```

## 4. Build the Database

### macOS/Linux

```bash
npm run build-db
```

### Windows

```bash
npm run build-db-win
```

---

# Running the Application

Start the development server:

```bash
npm start
```

The application will run on:

```bash
http://localhost:3000
```

---

# Application Functionality

The system allows users to:

* Browse upcoming events
* Book tickets for events
* View event details
* Manage events through organiser routes
* Track ticket availability and analytics

The application follows a three tier architecture:

1. Presentation Layer
2. Application Layer
3. Data Layer

---

# Database

The project uses SQLite for data storage.

The database schema is defined in:

```bash
db_schema.sql
```

The database stores:

* Events
* Bookings
* Organiser information
* Ticket data

---

# Concepts Demonstrated

This project demonstrates:

* Server side web development
* Express.js routing
* SQLite database integration
* CRUD operations
* Dynamic page rendering with EJS
* MVC inspired project structure
* Form validation and data handling
* Analytics queries using SQL

---

# Future Improvements

Potential future improvements include:

* User authentication system
* Payment gateway integration
* Responsive mobile interface
* Email notifications
* Admin dashboard
* Search and filtering system
* Event image uploads
* Calendar integration

---

# License

This project is intended for educational and portfolio purposes.
