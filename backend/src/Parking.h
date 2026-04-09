#ifndef PARKING_H
#define PARKING_H

#include <string>
#include <vector>
#include <nlohmann/json.hpp>
#include "Database.h"

using json = nlohmann::json;

class Parking {
private:
    Database* db;
    
    double calculateDistance(double lat1, double lon1, double lat2, double lon2);
    
public:
    Parking(Database* database);
    json addParking(const std::string& body);
    json getNearbyParking(double lat, double lng, double radius = 5.0);
    json getParkingById(int id);
    bool updateAvailability(int parkingId, bool available);
};

#endif