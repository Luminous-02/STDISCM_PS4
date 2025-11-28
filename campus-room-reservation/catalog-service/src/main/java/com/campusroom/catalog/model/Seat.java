package com.campusroom.catalog.model;

import jakarta.persistence.*;

@Entity
@Table(name = "seats", schema = "catalog")
public class Seat {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "seat_number", nullable = false)
    private String seatNumber;
    
    @Column(name = "position_description")
    private String positionDescription; // "front", "back", "near_outlets", etc.
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;
    
    @Column(nullable = false)
    private Boolean available = true;
    
    // Constructors
    public Seat() {}
    
    public Seat(String seatNumber, Room room, String positionDescription) {
        this.seatNumber = seatNumber;
        this.room = room;
        this.positionDescription = positionDescription;
    }
    
    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getSeatNumber() { return seatNumber; }
    public void setSeatNumber(String seatNumber) { this.seatNumber = seatNumber; }
    
    public String getPositionDescription() { return positionDescription; }
    public void setPositionDescription(String positionDescription) { this.positionDescription = positionDescription; }
    
    public Room getRoom() { return room; }
    public void setRoom(Room room) { this.room = room; }
    
    public Boolean getAvailable() { return available; }
    public void setAvailable(Boolean available) { this.available = available; }
}
