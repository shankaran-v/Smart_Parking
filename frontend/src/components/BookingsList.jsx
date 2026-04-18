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

  const formatDateTime = (value) => {
    return new Date(value).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (start, end) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diff = endTime - startTime;
    const totalMinutes = Math.round(diff / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours > 0 ? `${hours}h` : ''}${hours > 0 && minutes > 0 ? ' ' : ''}${minutes > 0 ? `${minutes}m` : ''}` || '0m';
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
        {bookings.map((booking) => {
          const totalPrice = booking.total_price != null ? Number(booking.total_price) : null;
          const bookingPrice = booking.price != null ? Number(booking.price) : null;

          return (
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
              
              <p><strong>Start Time:</strong> {booking.formatted_start || formatDateTime(booking.start_time)}</p>
              <p><strong>End Time:</strong> {booking.formatted_end || formatDateTime(booking.end_time)}</p>
              {totalPrice !== null && !Number.isNaN(totalPrice) && (
                <p><strong>Total Price:</strong> ${totalPrice.toFixed(2)}</p>
              )}
              <p><strong>Duration:</strong> {formatDuration(booking.start_time, booking.end_time) || '0m'}</p>
              <p><strong>Created:</strong> {formatDateTime(booking.created_at)}</p>
              
              {!isOwner && bookingPrice !== null && !Number.isNaN(bookingPrice) && (
                <p><strong>Price:</strong> ${bookingPrice.toFixed(2)}/hour</p>
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
        );
      })}
      </div>
    </div>
  );
};

export default BookingsList;