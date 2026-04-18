import React from 'react';
import { FaMapMarkerAlt, FaMoneyBillWave, FaParking, FaPhone, FaRuler } from 'react-icons/fa';

const ParkingCard = ({ parking, onBook, onContact, isBooked }) => {
  const distanceText = parking.distance != null ? parking.distance.toFixed(2) : '0.00';
  const priceText = parking.price != null ? `$${parking.price}/hour` : 'N/A';

  return (
    <div className="parking-card">
      <div className="parking-card-content">
        <h3 className="parking-title">
          <FaMapMarkerAlt style={{ marginRight: '5px', color: '#667eea' }} />
          Parking Space #{parking.id}
        </h3>
        <p className="parking-address">{parking.address || 'Address not available'}</p>
        
        <div className="parking-details">
          <div className="detail-item">
            <div className="detail-label">Distance</div>
            <div className="detail-value">
              <FaRuler style={{ marginRight: '3px' }} />
              {distanceText} km
            </div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Price</div>
            <div className="detail-value">
              <FaMoneyBillWave style={{ marginRight: '3px' }} />
              {priceText}
            </div>
          </div>
          <div className="detail-item">
            <div className="detail-label">Available</div>
            <div className="detail-value">
              <FaParking style={{ marginRight: '3px' }} />
              {parking.available_slots}/{parking.total_slots}
            </div>
          </div>
        </div>
        
        <div className="booking-buttons">
          <button 
            className="btn-book" 
            onClick={onBook}
            disabled={isBooked}
          >
            {isBooked ? 'Fully Booked' : 'Request Booking'}
          </button>
          <button className="btn-contact" onClick={onContact}>
            <FaPhone style={{ marginRight: '5px' }} />
            Contact
          </button>
        </div>
      </div>
    </div>
  );
};

export default ParkingCard;