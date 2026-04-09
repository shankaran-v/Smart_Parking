#include "Parking.h"
#include <cmath>
#include <sstream>

Parking::Parking(Database* database) : db(database) {}

double Parking::calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    const double R = 6371; // Earth's radius in km
    
    double dLat = (lat2 - lat1) * M_PI / 180.0;
    double dLon = (lon2 - lon1) * M_PI / 180.0;
    
    double a = sin(dLat / 2) * sin(dLat / 2) +
               cos(lat1 * M_PI / 180.0) * cos(lat2 * M_PI / 180.0) *
               sin(dLon / 2) * sin(dLon / 2);
    
    double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return R * c;
}

json Parking::addParking(const std::string& body) {
    json request = json::parse(body);
    json response;
    
    // Validate required fields
    std::vector<std::string> required = {"owner_id", "latitude", "longitude", "address", 
                                         "price", "phone", "available_slots"};
    
    for (const auto& field : required) {
        if (!request.contains(field)) {
            response["success"] = false;
            response["message"] = "Missing field: " + field;
            return response;
        }
    }
    
    std::stringstream query;
    query << "INSERT INTO parking_spaces (owner_id, latitude, longitude, address, price, "
          << "phone, available_slots, total_slots, status) VALUES ("
          << request["owner_id"] << ", "
          << request["latitude"] << ", "
          << request["longitude"] << ", '"
          << request["address"] << "', "
          << request["price"] << ", '"
          << request["phone"] << "', "
          << request["available_slots"] << ", "
          << request["available_slots"] << ", 'active')";
    
    if (db->executeQuery(query.str())) {
        response["success"] = true;
        response["message"] = "Parking space added successfully";
        response["parking_id"] = db->getLastInsertId();
    } else {
        response["success"] = false;
        response["message"] = "Failed to add parking space";
    }
    
    return response;
}

json Parking::getNearbyParking(double lat, double lng, double radius) {
    json response;
    json parkingList = json::array();
    
    std::string query = "SELECT id, owner_id, latitude, longitude, address, price, phone, "
                        "available_slots, total_slots FROM parking_spaces "
                        "WHERE status = 'active' AND available_slots > 0";
    
    auto results = db->executeSelect(query);
    
    for (const auto& row : results) {
        double parkingLat = std::stod(row[2]);
        double parkingLng = std::stod(row[3]);
        double distance = calculateDistance(lat, lng, parkingLat, parkingLng);
        
        if (distance <= radius) {
            json parking;
            parking["id"] = std::stoi(row[0]);
            parking["owner_id"] = std::stoi(row[1]);
            parking["latitude"] = parkingLat;
            parking["longitude"] = parkingLng;
            parking["address"] = row[4];
            parking["price"] = std::stod(row[5]);
            parking["phone"] = row[6];
            parking["available_slots"] = std::stoi(row[7]);
            parking["total_slots"] = std::stoi(row[8]);
            parking["distance"] = distance;
            
            parkingList.push_back(parking);
        }
    }
    
    // Sort by distance
    std::sort(parkingList.begin(), parkingList.end(), [](const json& a, const json& b) {
        return a["distance"] < b["distance"];
    });
    
    response["success"] = true;
    response["parking_spaces"] = parkingList;
    response["count"] = parkingList.size();
    
    return response;
}

json Parking::getParkingById(int id) {
    json response;
    
    std::string query = "SELECT id, owner_id, latitude, longitude, address, price, phone, "
                        "available_slots, total_slots, status FROM parking_spaces WHERE id = " + std::to_string(id);
    
    auto results = db->executeSelect(query);
    
    if (!results.empty()) {
        auto& row = results[0];
        response["success"] = true;
        response["id"] = std::stoi(row[0]);
        response["owner_id"] = std::stoi(row[1]);
        response["latitude"] = std::stod(row[2]);
        response["longitude"] = std::stod(row[3]);
        response["address"] = row[4];
        response["price"] = std::stod(row[5]);
        response["phone"] = row[6];
        response["available_slots"] = std::stoi(row[7]);
        response["total_slots"] = std::stoi(row[8]);
        response["status"] = row[9];
    } else {
        response["success"] = false;
        response["message"] = "Parking space not found";
    }
    
    return response;
}

bool Parking::updateAvailability(int parkingId, bool available) {
    std::string query = "UPDATE parking_spaces SET available_slots = available_slots - 1 "
                        "WHERE id = " + std::to_string(parkingId) + " AND available_slots > 0";
    return db->executeQuery(query);
}