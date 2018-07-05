# Walk through subdirectories
add_subdirectory(helper)

# rawrtc-terminal
add_executable(rawrtc-terminal
        rawrtc-terminal.c)
target_link_libraries(rawrtc-terminal
        ${rawrtc_terminal_DEP_LIBRARIES}
        rawrtc-helper)
install(TARGETS rawrtc-terminal
        DESTINATION bin)

# rawrtc-terminal
add_executable(rawrtc-sensor
        rawrtc-sensor.c gyropi.cpp)
target_link_libraries(rawrtc-sensor
        ${rawrtc_terminal_DEP_LIBRARIES}
        rawrtc-helper)
install(TARGETS rawrtc-sensor
        DESTINATION bin)
