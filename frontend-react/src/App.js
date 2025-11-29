import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This will call our catalog-service via API gateway once it's set up
    axios.get('http://localhost:8080/api/rooms')
      .then(response => {
        setRooms(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching rooms:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading rooms...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Campus Room Reservation System</h1>
      <h2>Available Rooms</h2>
      {rooms.length === 0 ? (
        <p>No rooms available</p>
      ) : (
        <ul>
          {rooms.map(room => (
            <li key={room.id}>
              {room.name} - {room.type} - Capacity: {room.capacity}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;