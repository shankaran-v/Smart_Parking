cmake_minimum_required(VERSION 3.10)
project(ParkingSystem VERSION 1.0.0)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Set build type to Release if not specified
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE "Release" CACHE STRING "Build type" FORCE)
endif()

# Set output directories
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

# Find required packages
find_package(OpenSSL REQUIRED)
find_package(CURL REQUIRED)
find_package(PkgConfig REQUIRED)

# Find SQLite3
pkg_check_modules(SQLITE3 REQUIRED sqlite3)

# Find nlohmann_json
pkg_check_config(NLOHMANN_JSON REQUIRED nlohmann_json>=3.9.0)

# Include directories
include_directories(${CMAKE_SOURCE_DIR}/src)
include_directories(${OPENSSL_INCLUDE_DIR})
include_directories(${CURL_INCLUDE_DIRS})
include_directories(${SQLITE3_INCLUDE_DIRS})
include_directories(${NLOHMANN_JSON_INCLUDE_DIRS})

# Add httplib (header-only library)
include_directories(${CMAKE_SOURCE_DIR}/libs/cpp-httplib)

# Source files
set(SOURCES
    src/main.cpp
    src/Database.cpp
    src/Auth.cpp
    src/Parking.cpp
    src/Booking.cpp
    src/Utils.cpp
)

# Header files
set(HEADERS
    src/Database.h
    src/Auth.h
    src/Parking.h
    src/Booking.h
    src/Utils.h
)

# Create executable
add_executable(parking_server ${SOURCES} ${HEADERS})

# Set properties for macOS (optional)
if(APPLE)
    set_target_properties(parking_server PROPERTIES
        MACOSX_RPATH ON
        INSTALL_RPATH "@executable_path/../lib"
    )
endif()

# Link libraries
target_link_libraries(parking_server
    ${OPENSSL_LIBRARIES}
    ${CURL_LIBRARIES}
    ${SQLITE3_LIBRARIES}
    pthread
    dl
    ssl
    crypto
)

# For Linux, add rt library for clock_gettime
if(CMAKE_SYSTEM_NAME STREQUAL "Linux")
    target_link_libraries(parking_server rt)
endif()

# Compiler options
if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU" OR CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
    target_compile_options(parking_server PRIVATE 
        -Wall 
        -Wextra 
        -Wpedantic 
        -Werror 
        -O2
        -g
    )
endif()

# Enable AddressSanitizer for debugging (optional)
if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    target_compile_options(parking_server PRIVATE -fsanitize=address -fno-omit-frame-pointer)
    target_link_options(parking_server PRIVATE -fsanitize=address)
endif()

# Install rules
install(TARGETS parking_server DESTINATION bin)
install(FILES config.json DESTINATION .)

# Create a custom command to copy config.json to build directory
add_custom_command(TARGET parking_server POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_if_different
        ${CMAKE_SOURCE_DIR}/config.json
        ${CMAKE_RUNTIME_OUTPUT_DIRECTORY}/config.json
)

# Print configuration summary
message(STATUS "Build Configuration:")
message(STATUS "  C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "  Build Type: ${CMAKE_BUILD_TYPE}")
message(STATUS "  Install Prefix: ${CMAKE_INSTALL_PREFIX}")
message(STATUS "  OpenSSL: ${OPENSSL_INCLUDE_DIR}")
message(STATUS "  MySQL: ${MYSQL_INCLUDE_DIRS}")
message(STATUS "  CURL: ${CURL_INCLUDE_DIRS}")