package com.campusroom.catalog.controller;

import com.campusroom.catalog.model.Room;
import com.campusroom.catalog.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/rooms")
public class RoomController {
    
    @Autowired
    private RoomService roomService;
    
    @GetMapping
    public ResponseEntity<List<Room>> getAllRooms(
            @RequestParam(required = false) String building,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String facility) {
        
        List<Room> rooms = roomService.getRoomsWithFilters(building, type, facility);
        return ResponseEntity.ok(rooms);
    }
    
    @GetMapping("/{roomId}")
    public ResponseEntity<Room> getRoomById(@PathVariable Long roomId) {
        Room room = roomService.getRoomById(roomId);
        if (room == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(room);
    }
    
    @PostMapping
    public ResponseEntity<Room> createRoom(@RequestBody Room room) {
        Room savedRoom = roomService.saveRoom(room);
        return ResponseEntity.ok(savedRoom);
    }
    
    @DeleteMapping("/{roomId}")
    public ResponseEntity<Void> deleteRoom(@PathVariable Long roomId) {
        roomService.deleteRoom(roomId);
        return ResponseEntity.ok().build();
    }
}
