#ifndef UTILS_H
#define UTILS_H

#include <string>
#include <vector>
#include <ctime>
#include <sstream>
#include <iomanip>
#include <algorithm>
#include <cctype>

class Utils {
public:
    // String utilities
    static std::string trim(const std::string& str);
    static std::string toLowerCase(const std::string& str);
    static std::string toUpperCase(const std::string& str);
    static std::vector<std::string> split(const std::string& str, char delimiter);
    
    // Date/Time utilities
    static std::string getCurrentTimestamp();
    static std::string formatDateTime(const std::string& dateTime);
    static bool validateDateTime(const std::string& dateTime);
    static bool isTimeOverlap(const std::string& start1, const std::string& end1,
                             const std::string& start2, const std::string& end2);
    
    // Validation utilities
    static bool isValidEmail(const std::string& email);
    static bool isValidPhone(const std::string& phone);
    static bool isValidPrice(double price);
    static bool isValidCoordinates(double lat, double lng);
    
    // JSON utilities
    static std::string createErrorResponse(const std::string& message);
    static std::string createSuccessResponse(const std::string& message);
    
    // File utilities
    static bool fileExists(const std::string& path);
    static std::string getFileExtension(const std::string& filename);
    static std::string generateUniqueFilename(const std::string& originalName);
    
    // Security utilities
    static std::string generateToken(int userId);
    static bool validateToken(const std::string& token, int& userId);
    
    // Distance utilities (additional helpers)
    static double degToRad(double degrees);
    static double radToDeg(double radians);
};

#endif