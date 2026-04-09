#include "Utils.h"
#include <regex>
#include <random>
#include <chrono>
#include <fstream>
#include <iostream>

// String utilities
std::string Utils::trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\n\r\f\v");
    if (first == std::string::npos) return "";
    size_t last = str.find_last_not_of(" \t\n\r\f\v");
    return str.substr(first, last - first + 1);
}

std::string Utils::toLowerCase(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(), ::tolower);
    return result;
}

std::string Utils::toUpperCase(const std::string& str) {
    std::string result = str;
    std::transform(result.begin(), result.end(), result.begin(), ::toupper);
    return result;
}

std::vector<std::string> Utils::split(const std::string& str, char delimiter) {
    std::vector<std::string> tokens;
    std::stringstream ss(str);
    std::string token;
    
    while (std::getline(ss, token, delimiter)) {
        if (!token.empty()) {
            tokens.push_back(token);
        }
    }
    
    return tokens;
}

// Date/Time utilities
std::string Utils::getCurrentTimestamp() {
    auto now = std::chrono::system_clock::now();
    auto in_time_t = std::chrono::system_clock::to_time_t(now);
    
    std::stringstream ss;
    ss << std::put_time(std::localtime(&in_time_t), "%Y-%m-%d %H:%M:%S");
    return ss.str();
}

std::string Utils::formatDateTime(const std::string& dateTime) {
    // Expected format: YYYY-MM-DD HH:MM:SS
    if (dateTime.length() < 19) return dateTime;
    
    std::string formatted = dateTime.substr(0, 19);
    return formatted;
}

bool Utils::validateDateTime(const std::string& dateTime) {
    // Check if date time format is valid
    // Expected: YYYY-MM-DD HH:MM:SS
    if (dateTime.length() < 19) return false;
    
    // Check for valid characters
    for (size_t i = 0; i < 19; i++) {
        if (i == 4 || i == 7) {
            if (dateTime[i] != '-') return false;
        } else if (i == 10) {
            if (dateTime[i] != ' ') return false;
        } else if (i == 13 || i == 16) {
            if (dateTime[i] != ':') return false;
        } else {
            if (!isdigit(dateTime[i])) return false;
        }
    }
    
    return true;
}

bool Utils::isTimeOverlap(const std::string& start1, const std::string& end1,
                         const std::string& start2, const std::string& end2) {
    // Simple string comparison works for ISO datetime format
    return !(end1 <= start2 || end2 <= start1);
}

// Validation utilities
bool Utils::isValidEmail(const std::string& email) {
    const std::regex pattern(
        R"(^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$)"
    );
    return std::regex_match(email, pattern);
}

bool Utils::isValidPhone(const std::string& phone) {
    // Accepts: +1234567890, 1234567890, 123-456-7890
    const std::regex pattern(
        R"(^(\+?\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}$)"
    );
    return std::regex_match(phone, pattern);
}

bool Utils::isValidPrice(double price) {
    return price > 0 && price < 10000; // Reasonable price range
}

bool Utils::isValidCoordinates(double lat, double lng) {
    return (lat >= -90 && lat <= 90) && (lng >= -180 && lng <= 180);
}

// JSON utilities
std::string Utils::createErrorResponse(const std::string& message) {
    return R"({"success":false,"message":")" + message + R"("})";
}

std::string Utils::createSuccessResponse(const std::string& message) {
    return R"({"success":true,"message":")" + message + R"("})";
}

// File utilities
bool Utils::fileExists(const std::string& path) {
    std::ifstream file(path);
    return file.good();
}

std::string Utils::getFileExtension(const std::string& filename) {
    size_t dotPos = filename.find_last_of('.');
    if (dotPos != std::string::npos) {
        return filename.substr(dotPos);
    }
    return "";
}

std::string Utils::generateUniqueFilename(const std::string& originalName) {
    auto now = std::chrono::system_clock::now();
    auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()
    ).count();
    
    std::string extension = getFileExtension(originalName);
    return "parking_" + std::to_string(timestamp) + extension;
}

// Security utilities
std::string Utils::generateToken(int userId) {
    // Simple token generation (in production, use JWT or similar)
    auto now = std::chrono::system_clock::now();
    auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()
    ).count();
    
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(100000, 999999);
    
    std::stringstream ss;
    ss << userId << "_" << timestamp << "_" << dis(gen);
    
    return ss.str();
}

bool Utils::validateToken(const std::string& token, int& userId) {
    // Simple validation (in production, implement proper JWT validation)
    auto parts = split(token, '_');
    if (parts.size() != 3) return false;
    
    try {
        userId = std::stoi(parts[0]);
        return true;
    } catch (...) {
        return false;
    }
}

// Distance utilities (additional helpers)
double Utils::degToRad(double degrees) {
    return degrees * M_PI / 180.0;
}

double Utils::radToDeg(double radians) {
    return radians * 180.0 / M_PI;
}