package com.campusroom.catalog.service;

import com.campusroom.catalog.model.Room;
import com.campusroom.catalog.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RoomService {
    
    @Autowired
    private RoomRepository roomRepository;
    
    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }
    
    public List<Room> getRoomsWithFilters(String building, String type, String facility) {
        if (building != null) {
            return roomRepository.findByBuilding(building);
        } else if (type != null) {
            return roomRepository.findByType(type);
        } else if (facility != null) {
            return roomRepository.findByFacility(facility);
        } else {
            return roomRepository.findAll();
        }
    }
    
    public Room getRoomById(Long id) {
        return roomRepository.findById(id).orElse(null);
    }
    
    public Room saveRoom(Room room) {
        return roomRepository.save(room);
    }
    
    public void deleteRoom(Long id) {
        roomRepository.deleteById(id);
    }
}
