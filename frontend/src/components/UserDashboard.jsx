import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { AuthContext } from '../App';
import { getNearbyParking, createBooking, getUserBookings } from '../api';
import ParkingCard from './ParkingCard';
import BookingsList from './BookingsList';

const UserDashboard = () => {
  const { auth } = useContext(AuthContext);
  const [parkingSpaces, setParkingSpaces] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchRadius, setSearchRadius] = useState(5);
  const [activeTab, setActiveTab] = useState('search');
  const [bookingDuration, setBookingDuration] = useState(1); // hours
  const [selectedParking, setSelectedParking] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const selectedParkingData = selectedParking ? parkingSpaces.find((p) => p.id === selectedParking) : null;
  const pricePerHour = selectedParkingData?.price || 0;
  const estimatedTotal = (pricePerHour * bookingDuration).toFixed(2);

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      searchNearbyParking();
    }
    fetchBookings();
  }, [userLocation]);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          toast.success('Location detected!');
        },
        (error) => {
          toast.error('Unable to get location. Please enable GPS.');
          console.error(error);
          // Set default location (New York City)
          setUserLocation({ lat: 40.7128, lng: -74.0060 });
        }
      );
    } else {
      toast.error('Geolocation is not supported');
      setUserLocation({ lat: 40.7128, lng: -74.0060 });
    }
  };

  const searchNearbyParking = async () => {
    if (!userLocation) return;
    
    setLoading(true);
    try {
      const response = await getNearbyParking(userLocation.lat, userLocation.lng, Number(searchRadius));
      if (response.data.success) {
        setParkingSpaces(response.data.parking || []);
        if ((response.data.parking || []).length === 0) {
          toast.info('No parking spaces found nearby');
        }
      }
    } catch (error) {
      toast.error('Failed to fetch parking spaces');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await getUserBookings(auth.user.id);
      if (response.data.success) {
        setBookings(response.data.bookings || []);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleBooking = async (parkingId) => {
    setSelectedParking(parkingId);
  };

  const confirmBooking = async () => {
    if (!selectedParking) return;

    // Calculate start and end times
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + bookingDuration * 60 * 60 * 1000);

    try {
      const response = await createBooking({
        user_id: auth.user.id,
        parking_id: selectedParking,
        start_time: startTime.toISOString().slice(0, 19).replace('T', ' '),
        end_time: endTime.toISOString().slice(0, 19).replace('T', ' ')
      });

      if (response.data.success) {
        toast.success(`Booking confirmed! Total: $${response.data.total_price.toFixed(2)}`);
        fetchBookings();
        searchNearbyParking();
        setSelectedParking(null);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Failed to create booking');
      console.error(error);
    }
  };

  const handleContact = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  return (
    <div>
      <h1>User Dashboard</h1>
      <p>Welcome, {auth.user?.name}!</p>

      <div className="tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          className={`btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          Search Parking
        </button>
        <button 
          className={`btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          My Bookings
        </button>
      </div>

      {activeTab === 'search' && (
        <div>
          <div style={{ 
            background: 'white', 
            padding: '20px', 
            borderRadius: '10px', 
            marginBottom: '20px' 
          }}>
            <h3>Search Nearby Parking</h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Search Radius (km)</label>
                <input
                  type="number"
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(e.target.value)}
                  min="1"
                  max="20"
                  step="1"
                />
              </div>
              <button 
                onClick={searchNearbyParking} 
                className="btn" 
                style={{ marginTop: '20px' }}
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
              <button 
                onClick={getUserLocation} 
                className="btn" 
                style={{ marginTop: '20px', background: '#28a745' }}
              >
                Update Location
              </button>
            </div>
          </div>

          {userLocation && (
            <div style={{ 
              background: '#e3f2fd', 
              padding: '10px', 
              borderRadius: '5px', 
              marginBottom: '20px' 
            }}>
              📍 Your Location: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
            </div>
          )}

          <div className="parking-grid">
            {parkingSpaces.map((parking) => (
              <ParkingCard
                key={parking.id}
                parking={parking}
                onBook={() => handleBooking(parking.id)}
                onContact={() => handleContact(parking.phone)}
                isBooked={parking.available_slots === 0}
              />
            ))}
          </div>

          {!loading && parkingSpaces.length === 0 && (
            <div style={{ textAlign: 'center', padding: '50px' }}>
              <p>No parking spaces found nearby. Try adjusting your search radius or location.</p>
            </div>
          )}

          {/* Booking Confirmation Modal */}
          {selectedParking && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                background: 'white',
                padding: '30px',
                borderRadius: '10px',
                maxWidth: '400px',
                width: '90%'
              }}>
                <h3>Confirm Booking</h3>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '10px' }}>
                    Duration (hours):
                  </label>
                  <select
                    value={bookingDuration}
                    onChange={(e) => setBookingDuration(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  >
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                    <option value={3}>3 hours</option>
                    <option value={4}>4 hours</option>
                    <option value={6}>6 hours</option>
                    <option value={8}>8 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                  </select>
                </div>

                <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
                  <p><strong>Start:</strong> {new Date().toLocaleString()}</p>
                  <p><strong>End:</strong> {new Date(Date.now() + bookingDuration * 60 * 60 * 1000).toLocaleString()}</p>
                  <p><strong>Duration:</strong> {bookingDuration} hour{bookingDuration > 1 ? 's' : ''}</p>
                  <p><strong>Price per hour:</strong> ${pricePerHour.toFixed(2)}</p>
                  <p><strong>Estimated total:</strong> ${estimatedTotal}</p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={confirmBooking}
                    className="btn"
                    style={{ flex: 1 }}
                  >
                    Confirm Booking
                  </button>
                  <button
                    onClick={() => setSelectedParking(null)}
                    className="btn"
                    style={{ flex: 1, backgroundColor: '#6c757d' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bookings' && (
        <BookingsList bookings={bookings} isOwner={false} />
      )}
    </div>
  );
};

export default UserDashboard;