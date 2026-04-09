#include "Database.h"
#include <iostream>
#include <fstream>

Database::Database() {
    db = nullptr;
    dbPath = "parking_system.db";
}

Database::~Database() {
    disconnect();
}

bool Database::connect() {
    int rc = sqlite3_open(dbPath.c_str(), &db);
    if (rc) {
        std::cerr << "Can't open database: " << sqlite3_errmsg(db) << std::endl;
        return false;
    }
    std::cout << "Database connected successfully" << std::endl;
    return true;
}

void Database::disconnect() {
    if (db) {
        sqlite3_close(db);
        db = nullptr;
    }
}

bool Database::executeQuery(const std::string& query) {
    char* errMsg = nullptr;
    int rc = sqlite3_exec(db, query.c_str(), nullptr, nullptr, &errMsg);
    if (rc != SQLITE_OK) {
        std::cerr << "Query failed: " << errMsg << std::endl;
        sqlite3_free(errMsg);
        return false;
    }
    return true;
}

std::vector<std::vector<std::string>> Database::executeSelect(const std::string& query) {
    std::vector<std::vector<std::string>> results;
    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2(db, query.c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        std::cerr << "Prepare failed: " << sqlite3_errmsg(db) << std::endl;
        return results;
    }
    
    int cols = sqlite3_column_count(stmt);
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        std::vector<std::string> row;
        for (int i = 0; i < cols; i++) {
            const char* text = reinterpret_cast<const char*>(sqlite3_column_text(stmt, i));
            row.push_back(text ? text : "");
        }
        results.push_back(row);
    }
    
    sqlite3_finalize(stmt);
    return results;
}

long long Database::getLastInsertId() {
    return sqlite3_last_insert_rowid(db);
}

bool Database::initSchema(const std::string& schemaPath) {
    std::ifstream file(schemaPath);
    if (!file.is_open()) {
        std::cerr << "Cannot open schema file: " << schemaPath << std::endl;
        return false;
    }
    
    std::string schema((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
    file.close();
    
    return executeQuery(schema);
}