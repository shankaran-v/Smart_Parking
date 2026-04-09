#ifndef AUTH_H
#define AUTH_H

#include <string>
#include <nlohmann/json.hpp>
#include "Database.h"

using json = nlohmann::json;

class Auth {
private:
    Database* db;
    
    std::string hashPassword(const std::string& password);
    bool validateEmail(const std::string& email);
    
public:
    Auth(Database* database);
    json registerUser(const std::string& body);
    json loginUser(const std::string& body);
};

#endif