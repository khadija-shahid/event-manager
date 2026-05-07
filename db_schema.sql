
-- This makes sure that foreign_key constraints are observed and that errors will be thrown for violations
PRAGMA foreign_keys=ON;

BEGIN TRANSACTION;

-- Create your tables with SQL commands here (watch out for slight syntactical differences with SQLite vs MySQL)

CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    site_name TEXT NOT NULL,
    site_description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_title TEXT NOT NULL,
    event_description TEXT NOT NULL,
    event_date TEXT NOT NULL,
    full_price_ticket_quantity INTEGER NOT NULL CHECK (full_price_ticket_quantity >= 0),
    full_price_ticket_price REAL NOT NULL CHECK (full_price_ticket_price >= 0),
    concession_ticket_quantity INTEGER NOT NULL CHECK (concession_ticket_quantity >= 0),
    concession_ticket_price REAL NOT NULL CHECK (concession_ticket_price >= 0),
    event_status TEXT NOT NULL CHECK (event_status IN ('draft', 'published')),
    created_at TEXT NOT NULL,
    modified_at TEXT NOT NULL,
    published_at TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
    booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    attendee_name TEXT NOT NULL,
    full_price_ticket_quantity INTEGER NOT NULL,
    concession_ticket_quantity INTEGER NOT NULL,
    booking_creation_time TEXT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE RESTRICT
);

-- Insert default data (if necessary here)

-- Insert default site settings (only one row allowed)
INSERT OR IGNORE INTO site_settings (id, site_name, site_description) VALUES (1, 'My Website', 'A website for managing content and users'); 

COMMIT;

