#include "Auth.h"
#include <openssl/sha.h>
#include <iomanip>
#include <sstream>
#include <regex>

Auth::Auth(Database* database) : db(database) {}

std::string Auth::hashPassword(const std::string& password) {
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256_CTX sha256;
    SHA256_Init(&sha256);
    SHA256_Update(&sha256, password.c_str(), password.size());
    SHA256_Final(hash, &sha256);
    
    std::stringstream ss;
    for(int i = 0; i < SHA256_DIGEST_LENGTH; i++) {
        ss << std::hex << std::setw(2) << std::setfill('0') << (int)hash[i];
    }
    return ss.str();
}

bool Auth::validateEmail(const std::string& email) {
    const std::regex pattern("(\\w+)(\\.|_)?(\\w*)@(\\w+)(\\.(\\w+))+");
    return std::regex_match(email, pattern);
}

json Auth::registerUser(const std::string& body) {
    json request = json::parse(body);
    json response;
    
    // Validate required fields
    if (!request.contains("name") || !request.contains("email") || 
        !request.contains("password") || !request.contains("role")) {
        response["success"] = false;
        response["message"] = "Missing required fields";
        return response;
    }
    
    std::string name = request["name"];
    std::string email = request["email"];
    std::string password = request["password"];
    std::string role = request["role"];
    
    // Validate email
    if (!validateEmail(email)) {
        response["success"] = false;
        response["message"] = "Invalid email format";
        return response;
    }
    
    // Check if user exists
    std::string checkQuery = "SELECT id FROM users WHERE email = '" + email + "'";
    auto results = db->executeSelect(checkQuery);
    
    if (!results.empty()) {
        response["success"] = false;
        response["message"] = "User already exists";
        return response;
    }
    
    // Hash password and insert user
    std::string hashedPassword = hashPassword(password);
    std::string insertQuery = "INSERT INTO users (name, email, password, role) VALUES ('" +
                              name + "', '" + email + "', '" + hashedPassword + "', '" + role + "')";
    
    if (db->executeQuery(insertQuery)) {
        response["success"] = true;
        response["message"] = "Registration successful";
        response["user_id"] = db->getLastInsertId();
        response["role"] = role;
    } else {
        response["success"] = false;
        response["message"] = "Registration failed";
    }
    
    return response;
}

json Auth::loginUser(const std::string& body) {
    json request = json::parse(body);
    json response;
    
    if (!request.contains("email") || !request.contains("password")) {
        response["success"] = false;
        response["message"] = "Missing email or password";
        return response;
    }
    
    std::string email = request["email"];
    std::string password = request["password"];
    std::string hashedPassword = hashPassword(password);
    
    std::string query = "SELECT id, name, email, role FROM users WHERE email = '" +
                        email + "' AND password = '" + hashedPassword + "'";
    
    auto results = db->executeSelect(query);
    
    if (!results.empty()) {
        auto& row = results[0];
        response["success"] = true;
        response["message"] = "Login successful";
        response["user_id"] = std::stoi(row[0]);
        response["name"] = row[1];
        response["email"] = row[2];
        response["role"] = row[3];
    } else {
        response["success"] = false;
        response["message"] = "Invalid credentials";
    }
    
    return response;
}