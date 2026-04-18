import React, { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import { AuthContext } from '../App';
import { addParking, getOwnerBookings, confirmBooking } from '../api';
import BookingsList from './BookingsList';

const OwnerDashboard = () => {
  const { auth } = useContext(AuthContext);
  const [parkingData, setParkingData] = useState({
    address: '',
    latitude: '',
    longitude: '',
    price: '',
    phone: '',
    available_slots: 1,
    total_slots: 1
  });
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('add');

  useEffect(() => {
    if (auth.user?.id) {
      fetchBookings();
    }
  }, [auth.user]);

  useEffect(() => {
    if (auth.user?.id && activeTab === 'bookings') {
      fetchBookings();
    }
  }, [activeTab, auth.user]);

  const fetchBookings = async () => {
    try {
      const response = await getOwnerBookings(auth.user.id);
      if (response.data.success) {
        setBookings(response.data.bookings || []);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updatedData = {
      ...parkingData,
      [name]: value
    };

    if (name === 'available_slots') {
      updatedData.total_slots = value;
    }

    setParkingData(updatedData);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setParkingData({
            ...parkingData,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          toast.success('Location captured successfully!');
        },
        (error) => {
          toast.error('Unable to get location. Please enter manually.');
          console.error(error);
        }
      );
    } else {
      toast.error('Geolocation is not supported by this browser.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await addParking({
        ...parkingData,
        owner_id: auth.user.id
      });

      if (response.data.success) {
        toast.success('Parking space added successfully!');
        setParkingData({
          address: '',
          latitude: '',
          longitude: '',
          price: '',
          phone: '',
          available_slots: 1,
          total_slots: 1
        });
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Failed to add parking space');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async (bookingId, status) => {
    try {
      const response = await confirmBooking(bookingId, { status });
      if (response.data.success) {
        toast.success(`Booking ${status}!`);
        fetchBookings();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Failed to update booking');
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Owner Dashboard</h1>
          <p>Welcome, {auth.user?.name}! Manage your parking and bookings from one place.</p>
        </div>
      </div>

      <div className="tabs" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          className={`btn ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          Add Parking Space
        </button>
        <button 
          className={`btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          Manage Bookings ({bookings.filter(b => b.status === 'pending').length})
        </button>
      </div>

      {activeTab === 'add' && (
        <div className="form-container">
          <h3>Add New Parking Space</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Address</label>
              <textarea
                name="address"
                value={parkingData.address}
                onChange={handleChange}
                required
                rows="3"
                placeholder="Enter full address"
              />
            </div>
            
            <div className="form-group">
              <label>GPS Coordinates</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="number"
                  name="latitude"
                  value={parkingData.latitude}
                  onChange={handleChange}
                  placeholder="Latitude"
                  step="any"
                  required
                />
                <input
                  type="number"
                  name="longitude"
                  value={parkingData.longitude}
                  onChange={handleChange}
                  placeholder="Longitude"
                  step="any"
                  required
                />
                <button type="button" onClick={getCurrentLocation} style={{ width: 'auto' }}>
                  Get Location
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Price per Hour ($)</label>
              <input
                type="number"
                name="price"
                value={parkingData.price}
                onChange={handleChange}
                required
                step="0.01"
                placeholder="Enter price"
              />
            </div>

            <div className="form-group">
              <label>Contact Phone</label>
              <input
                type="tel"
                name="phone"
                value={parkingData.phone}
                onChange={handleChange}
                required
                placeholder="Your contact number"
              />
            </div>

            <div className="form-group">
              <label>Available Slots</label>
              <input
                type="number"
                name="available_slots"
                value={parkingData.available_slots}
                onChange={handleChange}
                required
                min="1"
                placeholder="Number of slots"
              />
            </div>

            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Adding...' : 'Add Parking Space'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <button className="btn" onClick={fetchBookings} style={{ width: 'auto', padding: '10px 20px' }}>
              Refresh Requests
            </button>
          </div>
          <BookingsList 
            bookings={bookings} 
            isOwner={true}
            onConfirm={handleConfirmBooking}
          />
        </div>
      )}
    </div>
  );
};

export default OwnerDashboard;