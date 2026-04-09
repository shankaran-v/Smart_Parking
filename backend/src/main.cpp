#include <iostream>
#include <string>
#include <vector>
#include <nlohmann/json.hpp>
#include <httplib.h>
#include <mysql/mysql.h>
#include "Database.h"
#include "Auth.h"
#include "Parking.h"
#include "Booking.h"
#include "Utils.h"

using json = nlohmann::json;
using namespace httplib;

class ParkingAPI {
private:
    Database db;
    Auth auth;
    Parking parking;
    Booking booking;
    
public:
    ParkingAPI() : db(), auth(&db), parking(&db), booking(&db) {}
    
    bool initialize() {
        if (!db.connect()) return false;
        return db.initSchema("../database/schema.sql");
    }
    
    void setupRoutes(Server& svr) {
        // CORS middleware
        svr.set_pre_routing_handler([](const Request& req, Response& res) {
            res.set_header("Access-Control-Allow-Origin", "*");
            res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
            
            if (req.method == "OPTIONS") {
                res.status = 200;
                return Server::HandlerResponse::Handled;
            }
            return Server::HandlerResponse::Unhandled;
        });
        
        // Auth endpoints
        svr.Post("/api/register", [this](const Request& req, Response& res) {
            json result = auth.registerUser(req.body);
            res.set_content(result.dump(), "application/json");
        });
        
        svr.Post("/api/login", [this](const Request& req, Response& res) {
            json result = auth.loginUser(req.body);
            res.set_content(result.dump(), "application/json");
        });
        
        // Parking endpoints
        svr.Post("/api/add_parking", [this](const Request& req, Response& res) {
            json result = parking.addParking(req.body);
            res.set_content(result.dump(), "application/json");
        });
        
        svr.Get("/api/nearby_parking", [this](const Request& req, Response& res) {
            double lat = std::stod(req.get_param_value("lat"));
            double lng = std::stod(req.get_param_value("lng"));
            json result = parking.getNearbyParking(lat, lng);
            res.set_content(result.dump(), "application/json");
        });
        
        svr.Get("/api/parking/:id", [this](const Request& req, Response& res) {
            int id = std::stoi(req.path_params.at("id"));
            json result = parking.getParkingById(id);
            res.set_content(result.dump(), "application/json");
        });
        
        // Booking endpoints
        svr.Post("/api/book", [this](const Request& req, Response& res) {
            json result = booking.createBooking(req.body);
            res.set_content(result.dump(), "application/json");
        });
        
        svr.Put("/api/confirm_booking/:id", [this](const Request& req, Response& res) {
            int id = std::stoi(req.path_params.at("id"));
            json result = booking.confirmBooking(id, req.body);
            res.set_content(result.dump(), "application/json");
        });
        
        svr.Get("/api/my_bookings", [this](const Request& req, Response& res) {
            int userId = std::stoi(req.get_param_value("user_id"));
            json result = booking.getUserBookings(userId);
            res.set_content(result.dump(), "application/json");
        });
        
        svr.Get("/api/owner_bookings/:owner_id", [this](const Request& req, Response& res) {
            int ownerId = std::stoi(req.path_params.at("owner_id"));
            json result = booking.getOwnerBookings(ownerId);
            res.set_content(result.dump(), "application/json");
        });
        
        // Health check
        svr.Get("/api/health", [](const Request& req, Response& res) {
            json result = {{"status", "OK"}, {"message", "Server is running"}};
            res.set_content(result.dump(), "application/json");
        });
    }
};

int main() {
    ParkingAPI api;
    
    if (!api.initialize()) {
        std::cerr << "Failed to initialize database connection" << std::endl;
        return 1;
    }
    
    Server svr;
    api.setupRoutes(svr);
    
    std::cout << "Server starting on http://localhost:8080" << std::endl;
    svr.listen("localhost", 8080);
    
    return 0;
}