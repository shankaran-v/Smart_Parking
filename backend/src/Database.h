#ifndef DATABASE_H
#define DATABASE_H

#include <sqlite3.h>
#include <string>
#include <vector>
#include <memory>

class Database {
private:
    sqlite3* db;
    std::string dbPath;
    
public:
    Database();
    ~Database();
    
    bool connect();
    void disconnect();
    sqlite3* getConnection() { return db; }
    
    bool executeQuery(const std::string& query);
    std::vector<std::vector<std::string>> executeSelect(const std::string& query);
    long long getLastInsertId();
    bool initSchema(const std::string& schemaPath);
};

#endif