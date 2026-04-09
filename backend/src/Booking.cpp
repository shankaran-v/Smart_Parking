#include "Booking.h"
#include <ctime>
#include <sstream>

Booking::Booking(Database* database) : db(database) {}

bool Booking::checkAvailability(int parkingId) {
    std::string query = "SELECT available_slots FROM parking_spaces WHERE id = " + std::to_string(parkingId);
    auto results = db->executeSelect(query);
    
    if (!results.empty()) {
        int available = std::stoi(results[0][0]);
        return available > 0;
    }
    
    return false;
}

bool Booking::decrementSlots(int parkingId) {
    std::string query = "UPDATE parking_spaces SET available_slots = available_slots - 1 "
                        "WHERE id = " + std::to_string(parkingId) + " AND available_slots > 0";
    return db->executeQuery(query);
}

bool Booking::incrementSlots(int parkingId) {
    std::string query = "UPDATE parking_spaces SET available_slots = available_slots + 1 "
                        "WHERE id = " + std::to_string(parkingId);
    return db->executeQuery(query);
}

json Booking::createBooking(const std::string& body) {
    json request = json::parse(body);
    json response;
    
    if (!request.contains("user_id") || !request.contains("parking_id") || 
        !request.contains("start_time") || !request.contains("end_time")) {
        response["success"] = false;
        response["message"] = "Missing required fields";
        return response;
    }
    
    int userId = request["user_id"];
    int parkingId = request["parking_id"];
    
    // Check availability
    if (!checkAvailability(parkingId)) {
        response["success"] = false;
        response["message"] = "Parking space not available";
        return response;
    }
    
    // Create booking
    std::stringstream query;
    query << "INSERT INTO bookings (user_id, parking_id, start_time, end_time, status) VALUES ("
          << userId << ", " << parkingId << ", '"
          << request["start_time"] << "', '"
          << request["end_time"] << "', 'pending')";
    
    if (db->executeQuery(query.str())) {
        int bookingId = db->getLastInsertId();
        
        // Decrement available slots
        decrementSlots(parkingId);
        
        response["success"] = true;
        response["message"] = "Booking request created";
        response["booking_id"] = bookingId;
        response["status"] = "pending";
    } else {
        response["success"] = false;
        response["message"] = "Failed to create booking";
    }
    
    return response;
}

json Booking::confirmBooking(int bookingId, const std::string& body) {
    json request = json::parse(body);
    json response;
    
    std::string status = request["status"];
    
    if (status != "confirmed" && status != "rejected") {
        response["success"] = false;
        response["message"] = "Invalid status";
        return response;
    }
    
    // Get parking_id before updating
    std::string getQuery = "SELECT parking_id FROM bookings WHERE id = " + std::to_string(bookingId);
    auto results = db->executeSelect(getQuery);
    
    if (results.empty()) {
        response["success"] = false;
        response["message"] = "Booking not found";
        return response;
    }
    
    int parkingId = std::stoi(results[0][0]);
    
    // Update booking status
    std::string query = "UPDATE bookings SET status = '" + status + "' WHERE id = " + std::to_string(bookingId);
    
    if (db->executeQuery(query)) {
        // If rejected, increment slots back
        if (status == "rejected") {
            incrementSlots(parkingId);
        }
        
        response["success"] = true;
        response["message"] = "Booking " + status;
        response["status"] = status;
    } else {
        response["success"] = false;
        response["message"] = "Failed to update booking";
    }
    
    return response;
}

json Booking::getUserBookings(int userId) {
    json response;
    json bookings = json::array();
    
    std::string query = "SELECT b.id, b.parking_id, b.start_time, b.end_time, b.status, "
                        "b.created_at, p.address, p.price, p.phone "
                        "FROM bookings b "
                        "JOIN parking_spaces p ON b.parking_id = p.id "
                        "WHERE b.user_id = " + std::to_string(userId) +
                        " ORDER BY b.created_at DESC";
    
    auto results = db->executeSelect(query);
    
    for (const auto& row : results) {
        json booking;
        booking["id"] = std::stoi(row[0]);
        booking["parking_id"] = std::stoi(row[1]);
        booking["start_time"] = row[2];
        booking["end_time"] = row[3];
        booking["status"] = row[4];
        booking["created_at"] = row[5];
        booking["address"] = row[6];
        booking["price"] = std::stod(row[7]);
        booking["owner_phone"] = row[8];
        
        bookings.push_back(booking);
    }
    
    response["success"] = true;
    response["bookings"] = bookings;
    response["count"] = bookings.size();
    
    return response;
}

json Booking::getOwnerBookings(int ownerId) {
    json response;
    json bookings = json::array();
    
    std::string query = "SELECT b.id, b.user_id, b.parking_id, b.start_time, b.end_time, "
                        "b.status, b.created_at, p.address, u.name as user_name, u.email, u.phone "
                        "FROM bookings b "
                        "JOIN parking_spaces p ON b.parking_id = p.id "
                        "JOIN users u ON b.user_id = u.id "
                        "WHERE p.owner_id = " + std::to_string(ownerId) +
                        " ORDER BY b.created_at DESC";
    
    auto results = db->executeSelect(query);
    
    for (const auto& row : results) {
        json booking;
        booking["id"] = std::stoi(row[0]);
        booking["user_id"] = std::stoi(row[1]);
        booking["parking_id"] = std::stoi(row[2]);
        booking["start_time"] = row[3];
        booking["end_time"] = row[4];
        booking["status"] = row[5];
        booking["created_at"] = row[6];
        booking["address"] = row[7];
        booking["user_name"] = row[8];
        booking["user_email"] = row[9];
        booking["user_phone"] = row[10].empty() ? "Not provided" : row[10];
        
        bookings.push_back(booking);
    }
    
    response["success"] = true;
    response["bookings"] = bookings;
    
    return response;
}