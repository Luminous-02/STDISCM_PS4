package com.campusroom.catalog.config;

import com.campusroom.catalog.model.Room;
import com.campusroom.catalog.model.RoomType;
import com.campusroom.catalog.model.Seat;
import com.campusroom.catalog.repository.RoomRepository;
import com.campusroom.catalog.repository.SeatRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private SeatRepository seatRepository;

    @Override
    public void run(String... args) throws Exception {
        // Only create sample data if no rooms exist
        if (roomRepository.count() == 0) {
            createSampleData();
        }
    }

    private void createSampleData() {
        // Room 1: Quiet Study Room
        Room quietRoom = new Room("Main Library", 2, "LIB-201", RoomType.QUIET_ROOM, 20);
        quietRoom.setFacilities(Arrays.asList("WiFi", "AC", "Power Outlets", "Reading Lamps"));
        roomRepository.save(quietRoom);

        // Add seats for quiet room
        for (int i = 1; i <= 20; i++) {
            String position = i <= 5 ? "Front Row" : i <= 10 ? "Middle Row" : "Back Row";
            Seat seat = new Seat("A" + i, quietRoom, position + " - Near Outlets");
            seatRepository.save(seat);
        }

        // Room 2: Discussion Room
        Room discussionRoom = new Room("Student Center", 1, "SC-101", RoomType.DISCUSSION_ROOM, 8);
        discussionRoom.setFacilities(Arrays.asList("WiFi", "AC", "Projector", "Whiteboard"));
        roomRepository.save(discussionRoom);

        // Add seats for discussion room
        String[] discussionPositions = {"Near Screen", "Center Table", "Window Side", "Door Side"};
        for (int i = 1; i <= 8; i++) {
            String position = discussionPositions[(i - 1) % 4];
            Seat seat = new Seat("D" + i, discussionRoom, position);
            seatRepository.save(seat);
        }

        // Room 3: Laboratory Room
        Room labRoom = new Room("Science Building", 3, "SCI-301", RoomType.LABORATORY_ROOM, 15);
        labRoom.setFacilities(Arrays.asList("WiFi", "AC", "Lab Equipment", "Chemical Hood", "Safety Equipment"));
        roomRepository.save(labRoom);

        // Add seats for lab room
        for (int i = 1; i <= 15; i++) {
            String position = i <= 5 ? "Lab Station " + i : "Computer Station " + (i - 5);
            Seat seat = new Seat("L" + i, labRoom, position);
            if (i > 12) {
                seat.setAvailable(false); // Mark some seats as unavailable
            }
            seatRepository.save(seat);
        }

        System.out.println("Sample data created successfully!");
    }
}
