package com.campusroom.catalog.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "rooms", schema = "catalog")
public class Room {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String building;
    
    @Column(nullable = false)
    private Integer floor;
    
    @Column(name = "room_number", nullable = false, unique = true)
    private String roomNumber;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoomType type;
    
    @ElementCollection
    @CollectionTable(name = "room_facilities", schema = "catalog", 
                     joinColumns = @JoinColumn(name = "room_id"))
    @Column(name = "facility")
    private List<String> facilities = new ArrayList<>();
    
    @Column(name = "total_seats")
    private Integer totalSeats;
    
    // Constructors
    public Room() {}
    
    public Room(String building, Integer floor, String roomNumber, RoomType type, Integer totalSeats) {
        this.building = building;
        this.floor = floor;
        this.roomNumber = roomNumber;
        this.type = type;
        this.totalSeats = totalSeats;
    }
    
    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getBuilding() { return building; }
    public void setBuilding(String building) { this.building = building; }
    
    public Integer getFloor() { return floor; }
    public void setFloor(Integer floor) { this.floor = floor; }
    
    public String getRoomNumber() { return roomNumber; }
    public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }
    
    public RoomType getType() { return type; }
    public void setType(RoomType type) { this.type = type; }
    
    public List<String> getFacilities() { return facilities; }
    public void setFacilities(List<String> facilities) { this.facilities = facilities; }
    
    public Integer getTotalSeats() { return totalSeats; }
    public void setTotalSeats(Integer totalSeats) { this.totalSeats = totalSeats; }
}

enum RoomType {
    QUIET_ROOM, DISCUSSION_ROOM, LABORATORY_ROOM
}
