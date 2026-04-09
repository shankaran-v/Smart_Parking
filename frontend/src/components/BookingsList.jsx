import React from 'react';

const BookingsList = ({ bookings, isOwner, onConfirm }) => {
  const getStatusBadge = (status) => {
    const statusColors = {
      pending: '#ffc107',
      confirmed: '#28a745',
      rejected: '#dc3545',
      cancelled: '#6c757d',
      completed: '#17a2b8'
    };
    
    return {
      backgroundColor: statusColors[status] || '#6c757d',
      color: 'white',
      padding: '5px 10px',
      borderRadius: '5px',
      fontSize: '12px',
      fontWeight: 'bold',
      display: 'inline-block'
    };
  };

  if (bookings.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', background: 'white', borderRadius: '10px' }}>
        <p>No bookings found.</p>
      </div>
    );
  }

  return (
    <div>
      <h3>Bookings</h3>
      <div className="parking-grid">
        {bookings.map((booking) => (
          <div key={booking.id} className="parking-card">
            <div className="parking-card-content">
              <h3 className="parking-title">
                Booking #{booking.id}
              </h3>
              
              {isOwner ? (
                <>
                  <p><strong>User:</strong> {booking.user_name}</p>
                  <p><strong>Email:</strong> {booking.user_email}</p>
                  <p><strong>Phone:</strong> {booking.user_phone}</p>
                </>
              ) : (
                <p><strong>Address:</strong> {booking.address}</p>
              )}
              
              <p><strong>Start Time:</strong> {booking.formatted_start || new Date(booking.start_time).toLocaleString()}</p>
              <p><strong>End Time:</strong> {booking.formatted_end || new Date(booking.end_time).toLocaleString()}</p>
              {booking.total_price && (
                <p><strong>Total Price:</strong> ${booking.total_price.toFixed(2)}</p>
              )}
              <p><strong>Duration:</strong> {(() => {
                const start = new Date(booking.start_time);
                const end = new Date(booking.end_time);
                const hours = Math.round((end - start) / (1000 * 60 * 60) * 10) / 10;
                return `${hours} hour${hours !== 1 ? 's' : ''}`;
              })()}</p>
              <p><strong>Created:</strong> {new Date(booking.created_at).toLocaleString()}</p>
              
              {!isOwner && (
                <p><strong>Price:</strong> ${booking.price}/hour</p>
              )}
              
              <div style={{ margin: '15px 0' }}>
                <span style={getStatusBadge(booking.status)}>
                  {booking.status.toUpperCase()}
                </span>
              </div>
              
              {isOwner && booking.status === 'pending' && (
                <div className="booking-buttons">
                  <button 
                    className="btn-book" 
                    onClick={() => onConfirm(booking.id, 'confirmed')}
                    style={{ background: '#28a745' }}
                  >
                    Confirm
                  </button>
                  <button 
                    className="btn-book" 
                    onClick={() => onConfirm(booking.id, 'rejected')}
                    style={{ background: '#dc3545' }}
                  >
                    Reject
                  </button>
                </div>
              )}
              
              {!isOwner && booking.status === 'confirmed' && booking.owner_phone && (
                <div className="booking-buttons">
                  <button 
                    className="btn-contact" 
                    onClick={() => window.location.href = `tel:${booking.owner_phone}`}
                  >
                    📞 Call Owner
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookingsList;