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
  const [bookingMinutes, setBookingMinutes] = useState(0); // minutes
  const [selectedParking, setSelectedParking] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const selectedParkingData = selectedParking ? parkingSpaces.find((p) => p.id === selectedParking) : null;
  const pricePerHour = selectedParkingData?.price || 0;
  const durationHours = bookingDuration + bookingMinutes / 60;
  const estimatedTotal = (pricePerHour * durationHours).toFixed(2);

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

  const requestBooking = async () => {
    if (!selectedParking) return;
    if (bookingDuration === 0 && bookingMinutes === 0) {
      toast.error('Please choose a duration for your booking.');
      return;
    }

    const startTime = new Date();
    const durationMs = (bookingDuration * 60 + bookingMinutes) * 60 * 1000;
    const endTime = new Date(startTime.getTime() + durationMs);

    try {
      const response = await createBooking({
        user_id: auth.user.id,
        parking_id: selectedParking,
        start_time: startTime.toISOString().slice(0, 19).replace('T', ' '),
        end_time: endTime.toISOString().slice(0, 19).replace('T', ' ')
      });

      if (response.data.success) {
        const totalPrice = Number(response.data.total_price);
        toast.success(`Booking request sent! Total: $${totalPrice.toFixed(2)}`);
        const newBooking = {
          id: response.data.booking_id,
          parking_id: selectedParking,
          address: selectedParkingData?.address || '',
          price: pricePerHour,
          start_time: startTime.toISOString().slice(0, 19).replace('T', ' '),
          end_time: endTime.toISOString().slice(0, 19).replace('T', ' '),
          total_price: totalPrice,
          status: 'pending',
          created_at: new Date().toISOString()
        };
        setBookings((prev) => [newBooking, ...prev]);
        setActiveTab('bookings');
        fetchBookings();
        searchNearbyParking();
        setSelectedParking(null);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Failed to request booking');
      console.error(error);
    }
  };

  const handleContact = (phone) => {
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>User Dashboard</h1>
          <p>Welcome, {auth.user?.name}! Find parking fast with powerful search and smooth booking.</p>
        </div>
      </div>

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
          <div className="search-controls">
            <h3>Search Nearby Parking</h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
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
                style={{ width: 'auto', padding: '12px 24px' }}
                disabled={loading}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
              <button 
                onClick={getUserLocation} 
                className="btn" 
                style={{ width: 'auto', padding: '12px 24px', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
              >
                Update Location
              </button>
            </div>
          </div>

          {userLocation && (
            <div className="location-display">
              📍 <strong>Your Location:</strong> {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
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
            <div className="modal-overlay">
              <div className="modal-content">
                <h3>Request Booking</h3>
                <div className="form-group">
                  <label>Booking Duration:</label>
                  <div className="duration-selector">
                    <select
                      value={bookingDuration}
                      onChange={(e) => setBookingDuration(Number(e.target.value))}
                    >
                      <option value={0}>0 hours</option>
                      <option value={1}>1 hour</option>
                      <option value={2}>2 hours</option>
                      <option value={3}>3 hours</option>
                      <option value={4}>4 hours</option>
                      <option value={6}>6 hours</option>
                      <option value={8}>8 hours</option>
                      <option value={12}>12 hours</option>
                      <option value={24}>24 hours</option>
                    </select>
                    <select
                      value={bookingMinutes}
                      onChange={(e) => setBookingMinutes(Number(e.target.value))}
                    >
                      <option value={0}>0 minutes</option>
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                    </select>
                  </div>
                </div>

                <div className="booking-summary">
                  <p><strong>Start:</strong> {new Date().toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  <p><strong>End:</strong> {new Date(Date.now() + (bookingDuration * 60 + bookingMinutes) * 60 * 1000).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  <p><strong>Duration:</strong> {bookingDuration} hour{bookingDuration !== 1 ? 's' : ''} {bookingMinutes > 0 ? `and ${bookingMinutes} minutes` : ''}</p>
                  <p><strong>Price per hour:</strong> ${pricePerHour.toFixed(2)}</p>
                  <p><strong>Estimated total:</strong> ${estimatedTotal}</p>
                </div>

                <div className="modal-buttons">
                  <button
                    onClick={requestBooking}
                    className="btn"
                  >
                    Send Request
                  </button>
                  <button
                    onClick={() => setSelectedParking(null)}
                    className="btn"
                    style={{ background: '#64748b' }}
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