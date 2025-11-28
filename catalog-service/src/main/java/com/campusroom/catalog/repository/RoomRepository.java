package com.campusroom.catalog.repository;

import com.campusroom.catalog.model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    
    List<Room> findByBuilding(String building);
    
    List<Room> findByType(String type);
    
    @Query("SELECT r FROM Room r WHERE :facility MEMBER OF r.facilities")
    List<Room> findByFacility(@Param("facility") String facility);
    
    Room findByRoomNumber(String roomNumber);
}
