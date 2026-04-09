#ifndef BOOKING_H
#define BOOKING_H

#include <string>
#include <nlohmann/json.hpp>
#include "Database.h"

using json = nlohmann::json;

class Booking {
private:
    Database* db;
    
    bool checkAvailability(int parkingId);
    bool decrementSlots(int parkingId);
    bool incrementSlots(int parkingId);
    
public:
    Booking(Database* database);
    json createBooking(const std::string& body);
    json confirmBooking(int bookingId, const std::string& body);
    json getUserBookings(int userId);
    json getOwnerBookings(int ownerId);
};

#endif