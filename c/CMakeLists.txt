# Project
cmake_minimum_required(VERSION 3.2)
project(rawrtc-terminal-demo
        VERSION 0.0.1)
set(PROJECT_DESCRIPTION
        "A browser terminal that punches through NATs using the force of RAWRTC")
set(PROJECT_URL
        "https://github.com/rawrtc/rawrtc-terminal-demo")

# Debug build type as default
if (NOT CMAKE_BUILD_TYPE)
    message(STATUS "No build type selected, using DEBUG")
    set(CMAKE_BUILD_TYPE "DEBUG")
endif()

# Enable verbose output in DEBUG mode
if (${CMAKE_BUILD_TYPE} MATCHES "DEBUG")
    message(STATUS "enabling verbose outout")
    set(CMAKE_VERBOSE_MAKEFILE on)
endif()

# Use pkg-config
find_package(PkgConfig REQUIRED)

# Dependency list
set(rawrtc_terminal_DEP_LIBRARIES)

# Dependency: libre
pkg_check_modules(LIB_RE REQUIRED "libre >= 0.5.0")
include_directories(${LIB_RE_STATIC_INCLUDE_DIRS} ${LIB_RE_STATIC_INCLUDEDIR})
link_directories(${LIB_RE_STATIC_LIBRARY_DIRS})
list(APPEND rawrtc_terminal_DEP_LIBRARIES ${LIB_RE_STATIC_LIBRARIES})

# Dependency: librawrtc
pkg_check_modules(LIB_RAWRTC REQUIRED "librawrtc >= 0.0.1")
include_directories(${LIB_RAWRTC_INCLUDE_DIRS} ${LIB_RAWRTC_STATIC_INCLUDEDIR})
link_directories(${LIB_RAWRTC_LIBRARY_DIRS})
list(APPEND rawrtc_terminal_DEP_LIBRARIES ${LIB_RAWRTC_LIBRARIES})

# Dependency: lutil (forkpty)
list(APPEND rawrtc_terminal_DEP_LIBRARIES "util")

# Walk through subdirectories
add_subdirectory(src)
