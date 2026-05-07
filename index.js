/**
* index.js
* This is your main app entry point
*/

// Set up express, bodyparser and EJS
const express = require('express');
const app = express();
const port = 3000;
var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs'); // set the app to use ejs for rendering
app.use(express.static(__dirname + '/public')); // set location of static files

// Set up SQLite
// Items in the global namespace are accessible throught out the node application
const sqlite3 = require('sqlite3').verbose();
global.db = new sqlite3.Database('./database.db',function(err){
    if(err){
        console.error(err);
        process.exit(1); // bail out we can't connect to the DB
    } else {
        console.log("Database connected");
        global.db.run("PRAGMA foreign_keys=ON"); // tell SQLite to pay attention to foreign key constraints
    }
});

// Handle requests to the home page 
app.get('/', (req, res) => {
    res.render('index');
});

// Handle requests to the organiser page
app.get('/organiser', (req, res, next) => {
    // Query site name and site description
    const siteSettingsQuery = "SELECT site_name, site_description FROM site_settings WHERE id = 1";
    
    // Always explicitly set warningMessage and affectedEventId, even when null
    // This ensures the organiser template always has access to these variables
    const warningMessage = (req.query.warning && req.query.warning.trim() !== '') ? decodeURIComponent(req.query.warning) : null;
    const affectedEventId = (req.query.eventId && req.query.eventId.trim() !== '') ? parseInt(req.query.eventId, 10) : null;
    
    global.db.get(siteSettingsQuery, function (err, siteSettings) {
        if (err) {
            next(err);
        } else {
            // Query draft events
            const draftEventsQuery = "SELECT * FROM events WHERE event_status = 'draft' ORDER BY created_at DESC";
            
            global.db.all(draftEventsQuery, function (err, draftEvents) {
                if (err) {
                    next(err);
                } else {
                    // Query published events
                    const publishedEventsQuery = "SELECT * FROM events WHERE event_status = 'published' ORDER BY created_at DESC";
                    
                    global.db.all(publishedEventsQuery, function (err, publishedEvents) {
                        if (err) {
                            next(err);
                        } else {
                            // Always explicitly pass all variables to the template
                            // warningMessage and affectedEventId are always included, even if null
                            res.render('organiser', { 
                                siteName: siteSettings ? siteSettings.site_name : null,
                                siteDescription: siteSettings ? siteSettings.site_description : null,
                                draftEvents: draftEvents || [],
                                publishedEvents: publishedEvents || [],
                                warningMessage: warningMessage,
                                affectedEventId: affectedEventId
                            });
                        }
                    });
                }
            });
        }
    });
});

// Handle requests to the attendee page
app.get('/attendee', (req, res, next) => {
    // Query site name and site description
    const siteSettingsQuery = "SELECT site_name, site_description FROM site_settings WHERE id = 1";
    
    global.db.get(siteSettingsQuery, function (err, siteSettings) {
        if (err) {
            next(err);
        } else {
            // Query only published events, ordered by event date (soonest first)
            const publishedEventsQuery = "SELECT * FROM events WHERE event_status = 'published' ORDER BY event_date ASC";
            
            global.db.all(publishedEventsQuery, function (err, publishedEvents) {
                if (err) {
                    next(err);
                } else {
                    res.render('attendee', { 
                        siteName: siteSettings ? siteSettings.site_name : null,
                        siteDescription: siteSettings ? siteSettings.site_description : null,
                        publishedEvents: publishedEvents || []
                    });
                }
            });
        }
    });
});

// Handle GET request for a single event page
app.get('/attendee/event/:id', (req, res, next) => {
    const eventId = req.params.id;
    const errorMessage = req.query.error || null;
    const eventQuery = "SELECT * FROM events WHERE event_id = ? AND event_status = 'published'";
    
    global.db.get(eventQuery, [eventId], function (err, event) {
        if (err) {
            next(err);
        } else if (!event) {
            // Event not found or not published
            res.status(404).send('Event not found or not available');
        } else {
            // Query all bookings related to this event
            const bookingsQuery = `
                SELECT 
                    COALESCE(SUM(full_price_ticket_quantity), 0) as total_full_price_booked,
                    COALESCE(SUM(concession_ticket_quantity), 0) as total_concession_booked
                FROM bookings
                WHERE event_id = ?
            `;
            
            global.db.get(bookingsQuery, [eventId], function (err, bookingTotals) {
                if (err) {
                    next(err);
                } else {
                    // Calculate remaining tickets
                    const totalFullPriceBooked = bookingTotals ? bookingTotals.total_full_price_booked : 0;
                    const totalConcessionBooked = bookingTotals ? bookingTotals.total_concession_booked : 0;
                    
                    const remainingFullPrice = event.full_price_ticket_quantity - totalFullPriceBooked;
                    const remainingConcession = event.concession_ticket_quantity - totalConcessionBooked;
                    
                    res.render('event-detail', { 
                        event: event,
                        totalFullPriceBooked: totalFullPriceBooked,
                        totalConcessionBooked: totalConcessionBooked,
                        remainingFullPrice: remainingFullPrice,
                        remainingConcession: remainingConcession,
                        errorMessage: errorMessage
                    });
                }
            });
        }
    });
});

// Handle POST request to create a booking
app.post('/attendee/event/:id/book', (req, res, next) => {
    const eventId = req.params.id;
    const attendeeName = req.body.attendee_name;
    const requestedFullPrice = parseInt(req.body.full_price_ticket_quantity) || 0;
    const requestedConcession = parseInt(req.body.concession_ticket_quantity) || 0;
    
    // Query the event to get total ticket quantities
    const eventQuery = "SELECT * FROM events WHERE event_id = ? AND event_status = 'published'";
    
    global.db.get(eventQuery, [eventId], function (err, event) {
        if (err) {
            next(err);
        } else if (!event) {
            res.status(404).send('Event not found or not available');
        } else {
            // Query all bookings for this event to calculate already booked tickets
            const bookingsQuery = `
                SELECT 
                    COALESCE(SUM(full_price_ticket_quantity), 0) as total_full_price_booked,
                    COALESCE(SUM(concession_ticket_quantity), 0) as total_concession_booked
                FROM bookings
                WHERE event_id = ?
            `;
            
            global.db.get(bookingsQuery, [eventId], function (err, bookingTotals) {
                if (err) {
                    next(err);
                } else {
                    // Recalculate remaining ticket availability
                    const totalFullPriceBooked = bookingTotals ? bookingTotals.total_full_price_booked : 0;
                    const totalConcessionBooked = bookingTotals ? bookingTotals.total_concession_booked : 0;
                    
                    const remainingFullPrice = event.full_price_ticket_quantity - totalFullPriceBooked;
                    const remainingConcession = event.concession_ticket_quantity - totalConcessionBooked;
                    
                    // Reject the booking if no attendee name provided
                    if (!attendeeName || attendeeName.trim() === '') {
                        const errorMsg = encodeURIComponent('Please provide an attendee name.');
                        res.redirect('/attendee/event/' + eventId + '?error=' + errorMsg);
                    } else if (requestedFullPrice === 0 && requestedConcession === 0) {
                        // Reject the booking if zero tickets are selected
                        const errorMsg = encodeURIComponent('Please select at least one ticket.');
                        res.redirect('/attendee/event/' + eventId + '?error=' + errorMsg);
                    } else if (requestedFullPrice > remainingFullPrice || requestedConcession > remainingConcession) {
                        // Reject the booking if requested tickets exceed availability
                        const errorMsg = encodeURIComponent('Requested tickets exceed availability. Please check remaining tickets.');
                        res.redirect('/attendee/event/' + eventId + '?error=' + errorMsg);
                    } else {
                        // If valid, insert booking into the database
                        const bookingTimestamp = new Date().toISOString();
                        const insertBookingQuery = `
                            INSERT INTO bookings (
                                event_id,
                                attendee_name,
                                full_price_ticket_quantity,
                                concession_ticket_quantity,
                                booking_creation_time
                            ) VALUES (?, ?, ?, ?, ?)
                        `;
                        
                        global.db.run(insertBookingQuery, [
                            eventId,
                            attendeeName,
                            requestedFullPrice,
                            requestedConcession,
                            bookingTimestamp
                        ], function(err) {
                            if (err) {
                                next(err);
                            } else {
                                res.redirect('/attendee/event/' + eventId);
                            }
                        });
                    }
                }
            });
        }
    });
});

// Handle GET request for site settings page
app.get('/organiser/site-settings', (req, res, next) => {
    // Query database for current site settings
    const siteSettingsQuery = "SELECT site_name, site_description FROM site_settings WHERE id = 1";
    const errorMessage = req.query.error || null;
    
    global.db.get(siteSettingsQuery, function (err, siteSettings) {
        if (err) {
            next(err);
        } else {
            res.render('site-settings', {
                siteName: siteSettings ? siteSettings.site_name : null,
                siteDescription: siteSettings ? siteSettings.site_description : null,
                errorMessage: errorMessage
            });
        }
    });
});

// Handle POST request to update site settings
app.post('/organiser/site-settings', (req, res, next) => {
    // Accept updated site name and site description
    const updatedSiteName = req.body.site_name ? req.body.site_name.trim() : '';
    const updatedSiteDescription = req.body.site_description ? req.body.site_description.trim() : '';
    
    // Reject invalid submissions server-side
    // Prevent empty site name submission
    if (!updatedSiteName || updatedSiteName === '') {
        const errorMsg = encodeURIComponent('Site name is required.');
        res.redirect('/organiser/site-settings?error=' + errorMsg);
        return;
    }
    
    // Prevent empty site description submission
    if (!updatedSiteDescription || updatedSiteDescription === '') {
        const errorMsg = encodeURIComponent('Site description is required.');
        res.redirect('/organiser/site-settings?error=' + errorMsg);
        return;
    }
    
    // Only update the existing record (do not insert new rows)
    // WHERE id = 1 ensures exactly one settings record exists
    const updateQuery = `
        UPDATE site_settings 
        SET site_name = ?, 
            site_description = ? 
        WHERE id = 1
    `;
    
    global.db.run(updateQuery, [updatedSiteName, updatedSiteDescription], function(err) {
        if (err) {
            next(err);
        } else {
            // Redirect back to the organiser home page
            res.redirect('/organiser');
        }
    });
});

// Handle GET request for analytics page (organisers only)
app.get('/organiser/analytics', (req, res, next) => {
    // For each published event: retrieve all related bookings and aggregate booking quantities
    // Use LEFT JOIN to ensure events with zero bookings are still included
    const analyticsQuery = `
        SELECT 
            e.event_id,
            e.event_title,
            e.event_date,
            e.full_price_ticket_quantity,
            e.full_price_ticket_price,
            e.concession_ticket_quantity,
            e.concession_ticket_price,
            COALESCE(SUM(b.full_price_ticket_quantity), 0) as total_full_price_sold,
            COALESCE(SUM(b.concession_ticket_quantity), 0) as total_concession_sold
        FROM events e
        LEFT JOIN bookings b ON e.event_id = b.event_id
        WHERE e.event_status = 'published'
        GROUP BY e.event_id
        ORDER BY e.event_date ASC
    `;
    
    global.db.all(analyticsQuery, [], function (err, eventsWithBookings) {
        if (err) {
            next(err);
        } else {
            // Process each event to calculate analytics dynamically (server-side logic)
            // Ensure values update correctly after each booking by recalculating from database
            const eventsWithAnalytics = (eventsWithBookings || []).map(function(row) {
                // Aggregate booking quantities (already done in SQL, but ensure numeric values)
                const totalFullPriceSold = parseInt(row.total_full_price_sold) || 0;
                const totalConcessionSold = parseInt(row.total_concession_sold) || 0;
                
                // Calculate total tickets sold
                const totalTicketsSold = totalFullPriceSold + totalConcessionSold;
                
                // Calculate remaining tickets for each ticket type
                const remainingFullPrice = row.full_price_ticket_quantity - totalFullPriceSold;
                const remainingConcession = row.concession_ticket_quantity - totalConcessionSold;
                
                // Calculate total revenue: (full tickets × full price) + (concession tickets × concession price)
                const fullPriceRevenue = totalFullPriceSold * row.full_price_ticket_price;
                const concessionRevenue = totalConcessionSold * row.concession_ticket_price;
                const totalRevenue = fullPriceRevenue + concessionRevenue;
                
                return {
                    event: {
                        event_id: row.event_id,
                        event_title: row.event_title,
                        event_date: row.event_date,
                        full_price_ticket_quantity: row.full_price_ticket_quantity,
                        full_price_ticket_price: row.full_price_ticket_price,
                        concession_ticket_quantity: row.concession_ticket_quantity,
                        concession_ticket_price: row.concession_ticket_price
                    },
                    totalFullPriceSold: totalFullPriceSold,
                    totalConcessionSold: totalConcessionSold,
                    totalTicketsSold: totalTicketsSold,
                    remainingFullPrice: remainingFullPrice >= 0 ? remainingFullPrice : 0,
                    remainingConcession: remainingConcession >= 0 ? remainingConcession : 0,
                    fullPriceRevenue: fullPriceRevenue,
                    concessionRevenue: concessionRevenue,
                    totalRevenue: totalRevenue
                };
            });
            
            // Calculate overall totals across all events
            const overallTotalRevenue = eventsWithAnalytics.reduce((sum, item) => sum + item.totalRevenue, 0);
            const overallTotalTicketsSold = eventsWithAnalytics.reduce((sum, item) => sum + item.totalTicketsSold, 0);
            
            res.render('analytics', { 
                eventsWithAnalytics: eventsWithAnalytics,
                totalRevenue: overallTotalRevenue,
                totalTicketsSold: overallTotalTicketsSold
            });
        }
    });
});

// Handle GET request to show add event form
app.get('/organiser/add-event', (req, res) => {
    res.render('add-event');
});

// Handle POST request to create a new draft event
app.post('/organiser/add-event', (req, res, next) => {
    const now = new Date().toISOString();
    
    const insertQuery = `
        INSERT INTO events (
            event_title, 
            event_description, 
            event_date, 
            full_price_ticket_quantity, 
            full_price_ticket_price, 
            concession_ticket_quantity, 
            concession_ticket_price, 
            event_status, 
            created_at, 
            modified_at, 
            published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, NULL)
    `;
    
    global.db.run(insertQuery, [
        req.body.event_title,
        req.body.event_description,
        req.body.event_date,
        req.body.full_price_ticket_quantity,
        req.body.full_price_ticket_price,
        req.body.concession_ticket_quantity,
        req.body.concession_ticket_price,
        now,
        now
    ], function(err) {
        if (err) {
            next(err);
        } else {
            res.redirect('/organiser');
        }
    });
});

// Handle GET request to show edit event form
app.get('/organiser/edit-event/:id', (req, res, next) => {
    const eventId = req.params.id;
    const query = "SELECT * FROM events WHERE event_id = ?";
    
    global.db.get(query, [eventId], function (err, event) {
        if (err) {
            next(err);
        } else if (!event) {
            res.status(404).send('Event not found');
        } else {
            res.render('edit-event', { event: event });
        }
    });
});

// Handle POST request to update an event
app.post('/organiser/edit-event/:id', (req, res, next) => {
    const eventId = req.params.id;
    const now = new Date().toISOString();
    
    const updateQuery = `
        UPDATE events 
        SET event_title = ?,
            event_description = ?,
            event_date = ?,
            full_price_ticket_quantity = ?,
            full_price_ticket_price = ?,
            concession_ticket_quantity = ?,
            concession_ticket_price = ?,
            event_status = 'draft',
            modified_at = ?
        WHERE event_id = ?
    `;
    
    global.db.run(updateQuery, [
        req.body.event_title,
        req.body.event_description,
        req.body.event_date,
        req.body.full_price_ticket_quantity,
        req.body.full_price_ticket_price,
        req.body.concession_ticket_quantity,
        req.body.concession_ticket_price,
        now,
        eventId
    ], function(err) {
        if (err) {
            next(err);
        } else {
            res.redirect('/organiser');
        }
    });
});

// Handle POST request to publish an event
app.post('/organiser/publish-event/:id', (req, res, next) => {
    const eventId = req.params.id;
    const now = new Date().toISOString();
    const updateQuery = `
        UPDATE events 
        SET event_status = 'published', 
            published_at = ?, 
            modified_at = ? 
        WHERE event_id = ? AND event_status = 'draft'
    `;
    
    global.db.run(updateQuery, [now, now, eventId], function(err) {
        if (err) {
            next(err);
        } else {
            res.redirect('/organiser');
        }
    });
});

// Handle POST request to delete an event
app.post('/organiser/delete-event/:id', (req, res, next) => {
    const eventId = req.params.id;
    
    // Before deletion: Query bookings table and count bookings for event
    const countBookingsQuery = "SELECT COUNT(*) as booking_count FROM bookings WHERE event_id = ?";
    
    global.db.get(countBookingsQuery, [eventId], function(err, result) {
        if (err) {
            next(err);
        } else {
            const bookingCount = result ? result.booking_count : 0;
            
            // If count > 0 → redirect with warning flag
            if (bookingCount > 0) {
                const warningMsg = encodeURIComponent(`Cannot delete event: This event has ${bookingCount} booking(s). Please remove all bookings before deleting the event.`);
                res.redirect('/organiser?warning=' + warningMsg + '&eventId=' + eventId);
            } else {
                // If count = 0 → proceed with deletion (database rule will still apply via foreign key constraint)
                const deleteQuery = "DELETE FROM events WHERE event_id = ?";
                
                global.db.run(deleteQuery, [eventId], function(err) {
                    if (err) {
                        // Database rule: Foreign key constraint prevents deletion if bookings exist
                        if (err.message && err.message.includes('FOREIGN KEY constraint')) {
                            const warningMsg = encodeURIComponent('Cannot delete event: This event has existing bookings. Please remove all bookings before deleting the event.');
                            res.redirect('/organiser?warning=' + warningMsg + '&eventId=' + eventId);
                        } else {
                            next(err);
                        }
                    } else {
                        res.redirect('/organiser');
                    }
                });
            }
        }
    });
});

// Add all the route handlers in usersRoutes to the app under the path /users
const usersRoutes = require('./routes/users');
app.use('/users', usersRoutes);


// Make the web application listen for HTTP requests
app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

