package com.campusroom.catalog.repository;

import com.campusroom.catalog.model.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {
    
    List<Seat> findByRoomId(Long roomId);
    
    @Query("SELECT s FROM Seat s WHERE s.room.id = :roomId AND s.available = true")
    List<Seat> findAvailableSeatsByRoomId(@Param("roomId") Long roomId);
    
    Seat findByRoomIdAndSeatNumber(Long roomId, String seatNumber);
}
