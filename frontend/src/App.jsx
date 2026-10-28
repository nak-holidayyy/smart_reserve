
import React from 'react';
import { Building2, MapPin, Users, CalendarDays } from 'lucide-react';
import { api } from './lib/api';
import { useSession } from './hooks/useSession';
import Header from './components/Header';
import Footer from './components/Footer';
import Auth from './components/Auth';
import BookingForm from './components/BookingForm';


function toMalaysiaDateTime(value) {
  const date = new Date(value);

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type).value;

  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

function malaysiaDateTimeToISO(date, time) {
  return new Date(`${date}T${time}:00+08:00`).toISOString();
}

export default function App() {
  const session = useSession();
  const [facilities, setFacilities] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [authOpen, setAuthOpen] = React.useState(false);
  const [bookingFacility, setBookingFacility] = React.useState(null);
  const [bookingError, setBookingError] = React.useState('');
  const [bookingChecking, setBookingChecking] = React.useState(false);
  const [myBookings, setMyBookings] = React.useState([]);
  const [bookingsLoading, setBookingsLoading] = React.useState(false);
  const [cancellingBookingId, setCancellingBookingId] = React.useState(null);
  const [cancellationError, setCancellationError] = React.useState('');
  const [editingBooking, setEditingBooking] = React.useState(null);
  const [updatingBooking, setUpdatingBooking] = React.useState(false);
  const [updateError, setUpdateError] = React.useState('');
  const [editDate, setEditDate] = React.useState('');
  const [editStartTime, setEditStartTime] = React.useState('');
  const [editEndTime, setEditEndTime] = React.useState('');
  const [calendarBookings, setCalendarBookings] = React.useState([]);
  const [calendarLoading, setCalendarLoading] = React.useState(false);
  const [calendarError, setCalendarError] = React.useState('');

  React.useEffect(() => {
    async function loadFacilities() {
      try {
        const data = await api('/facilities');
        setFacilities(data);
      } catch (err) {
        setError(err.message || 'Unable to load facilities.');
      } finally {
        setLoading(false);
      }
    }

    loadFacilities();
  }, []);

  React.useEffect(() => {
    async function loadMyBookings() {
      if (!session) {
        setMyBookings([]);
        setBookingsLoading(false);
        return;
      }

      setBookingsLoading(true);

      try {
        const data = await api('/bookings');
        setMyBookings(data);
      } catch (err) {
        console.error('Could not load bookings:', err);
      } finally {
        setBookingsLoading(false);
      }
    }

      loadMyBookings();
  }, [session]);

  async function handleCancelBooking(bookingId) {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this booking?'
    );

    if (!confirmed) return;

    setCancellingBookingId(bookingId);
    setCancellationError('');

    try {
      await api(`/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
      });

      const updatedBookings = await api('/bookings');
      setMyBookings(updatedBookings);
    } catch (err) {
      setCancellationError(err.message || 'Could not cancel this booking.');
    } finally {
      setCancellingBookingId(null);
    }
  }
  
  async function handleUpdateBooking(event) {
    event.preventDefault();
    alert('Update function started!');

    if (!editingBooking) return;

    setUpdatingBooking(true);
    setUpdateError('');

    try {
      if (!editDate || !editStartTime || !editEndTime) {
        throw new Error('Please select a date, start time and end time.');
      }

      const startISO = malaysiaDateTimeToISO(editDate, editStartTime);
      const endISO = malaysiaDateTimeToISO(editDate, editEndTime);

      if (new Date(endISO) <= new Date(startISO)) {
        throw new Error('The end time must be later than the start time.');
      }

      if (new Date(startISO) <= new Date()) {
        throw new Error('Please choose a booking time in the future.');
      }

      // Check availability, excluding this booking itself
      const params = new URLSearchParams({
        start_time: startISO,
        end_time: endISO,
        exclude_booking_id: editingBooking.id,
      });

      const availability = await api(
        `/facilities/${editingBooking.facility_id}/availability?${params.toString()}`
      );

      alert(
        `Availability check completed: ${availability.available}`
      );

      if (!availability.available) {
        throw new Error(
          'This facility is already booked for that time. Please choose another time.'
        );
      }

      // Save the updated booking
      await api(`/bookings/${editingBooking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facility_id: editingBooking.facility_id,
          title: editingBooking.title.trim(),
          purpose: editingBooking.purpose || null,
          start_time: startISO,
          end_time: endISO,
        }),
      });

      // Refresh the bookings list
      const updatedBookings = await api('/bookings');
      setMyBookings(updatedBookings);
      setEditingBooking(null);
      setUpdateError('');
    } catch (err) {
      setUpdateError(err.message || 'Could not update this booking.');
    } finally {
      setUpdatingBooking(false);
    }
  }

  async function loadCalendarBookings() {
    setCalendarLoading(true);
    setCalendarError('');

    try {
      const bookings = await api('/bookings/calendar');
      setCalendarBookings(bookings);
    } catch (err) {
      setCalendarError(err.message || 'Could not load calendar bookings.');
    } finally {
      setCalendarLoading(false);
    }
  }
  
  React.useEffect(() => {
  loadCalendarBookings();
  }, []);

  return (
    <div className="app">
      <Header
        session={session}
        onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onExplore={() =>
          document.getElementById('facilities')?.scrollIntoView({
            behavior: 'smooth'
          })
        }
        onSignIn={() => setAuthOpen(true)}
      />

      <main>
        <section className="hero">
          <div className="hero-inner">
            <p className="eyebrow">YOUR COLLEGE, YOUR SPACE</p>
            <h1>
              Make room for
              <br />
              <span>what matters.</span>
            </h1>
            <p className="hero-description">
              Find available rooms and courts, check facility details,
              and plan your next college activity with ease.
            </p>
            <button
              className="button button-primary"
              onClick={() =>
                document.getElementById('facilities')?.scrollIntoView({
                  behavior: 'smooth'
                })
              }
            >
              <CalendarDays size={18} />
              Explore facilities
            </button>
          </div>
        </section>

        
        <section className="facility-section" id="live-calendar">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PLAN YOUR ACTIVITIES</p>
              <h2>Live Facility Calendar</h2>
              <p>See confirmed bookings across your college facilities.</p>
            </div>

            <button
              type="button"
              className="button button-primary"
              onClick={loadCalendarBookings}
              disabled={calendarLoading}
            >
              {calendarLoading ? 'Refreshing...' : 'Refresh Calendar'}
            </button>
          </div>

          {!session && (
            <p>Sign in to view the facility calendar.</p>
          )}

          {session && calendarLoading && (
            <p>Loading calendar bookings...</p>
          )}

          {session && calendarError && (
            <p className="error-message">
              Could not load calendar: {calendarError}
            </p>
          )}

          {session && !calendarLoading && !calendarError && (
            <div className="facility-grid">
              {calendarBookings.length === 0 ? (
                <p>No confirmed bookings found.</p>
              ) : (
                calendarBookings.map((booking) => (
                  <article className="facility-card" key={booking.id}>
                    <div className="facility-card-icon">
                      <CalendarDays size={26} />
                    </div>

                    <div className="facility-card-content">
                      <h3>{booking.facility_name}</h3>
                      <p>{booking.title}</p>

                      <div className="facility-detail">
                        <MapPin size={16} />
                        <span>
                          {booking.location || 'Location not specified'}
                        </span>
                      </div>

                      <div className="facility-detail">
                        <CalendarDays size={16} />
                        <span>
                          {new Date(booking.start_time).toLocaleString(
                            'en-MY',
                            {
                              timeZone: 'Asia/Kuala_Lumpur',
                              dateStyle: 'medium',
                            }
                          )}
                        </span>
                      </div>

                      <div className="facility-detail">
                        <CalendarDays size={16} />
                        <span>
                          {new Date(booking.start_time).toLocaleTimeString(
                            'en-MY',
                            {
                              timeZone: 'Asia/Kuala_Lumpur',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                          {' – '}
                          {new Date(booking.end_time).toLocaleTimeString(
                            'en-MY',
                            {
                              timeZone: 'Asia/Kuala_Lumpur',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </span>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
        </section>

        <section className="facility-section" id="my-bookings">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR RESERVATIONS</p>
              <h2>My Bookings</h2>
              <p>Keep track of your upcoming and past reservations.</p>
            </div>
          </div>

          {!session && (
            <p>Sign in to view your bookings.</p>
          )}

          {session && bookingsLoading && (
            <p>Loading your bookings...</p>
          )}

          {session && !bookingsLoading && (() => {
            const now = Date.now();

            const upcomingBookings = myBookings.filter(
              (booking) =>
                new Date(booking.end_time).getTime() > now &&
                booking.status === 'confirmed'
            );

            const pastBookings = myBookings.filter(
              (booking) =>
                new Date(booking.end_time).getTime() <= now
            );

            const cancelledBookings = myBookings.filter(
              (booking) => booking.status === 'cancelled'
            );

            function formatBookingDate(dateString) {
              return new Date(dateString).toLocaleString('en-MY', {
                timeZone: 'Asia/Kuala_Lumpur',
                dateStyle: 'medium',
                timeStyle: 'short'
              });
            }

            function renderBooking(booking, label) {
              return (
                <article className="facility-card" key={booking.id}>
                  <div className="facility-card-icon">
                    <CalendarDays size={26} />
                  </div>

                  <div className="facility-card-content">
                    <h3>{booking.title}</h3>
                    <p>{booking.facility_name}</p>

                    <div className="facility-detail">
                      <MapPin size={16} />
                      <span>
                        {booking.location || 'Location not specified'}
                      </span>
                    </div>

                    <div className="facility-detail">
                      <CalendarDays size={16} />
                      <span>
                        Start: {formatBookingDate(booking.start_time)}
                      </span>
                    </div>

                    <div className="facility-detail">
                      <CalendarDays size={16} />
                      <span>
                        End: {formatBookingDate(booking.end_time)}
                      </span>
                    </div>

                    <div className="facility-detail">
                      <span>Status: {booking.status}</span>
                    </div>

                    {label && <p>{label}</p>}

                    {booking.purpose && <p>{booking.purpose}</p>}

                    
                    {label === 'Upcoming reservation' && (
                      <>
                        <button
                          type="button"
                          className="button button-primary"
                          onClick={() => {
                            console.log('Edit button clicked:', booking);
                            setEditingBooking(booking);

                            const start = toMalaysiaDateTime(booking.start_time);
                            const end = toMalaysiaDateTime(booking.end_time);

                            setEditDate(start.date);
                            setEditStartTime(start.time);
                            setEditEndTime(end.time);

                            setUpdateError('');
                          }}

                        >
                          Edit Booking
                        </button>

                        <button
                          type="button"
                          className="button button-primary"
                          disabled={cancellingBookingId === booking.id}
                          onClick={() => handleCancelBooking(booking.id)}
                        >
                          {cancellingBookingId === booking.id
                            ? 'Cancelling...'
                            : 'Cancel Booking'}
                        </button>
                      </>
                    )}


                  </div>
                </article>
              );
            }

            
            
function renderEditBookingForm() {
  if (!editingBooking) return null;

  return (
    <div className="booking-modal-overlay">
      <div className="booking-modal">
        <h2>Edit Booking</h2>
        <p>Update the details for your reservation.</p>

        {updateError && (
          <p className="error-message">{updateError}</p>
        )}

        <form onSubmit={handleUpdateBooking}>
          
          <label>
            Facility
            <select
              value={editingBooking.facility_id}
              onChange={(event) => {
                const selectedFacility = facilities.find(
                  (facility) => facility.id === event.target.value
                );

                setEditingBooking({
                  ...editingBooking,
                  facility_id: event.target.value,
                  facility_name: selectedFacility?.name || '',
                  location: selectedFacility?.location || '',
                });
              }}
              required
            >
              {facilities.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Booking Title
            <input
              type="text"
              value={editingBooking.title}
              onChange={(event) =>
                setEditingBooking({
                  ...editingBooking,
                  title: event.target.value,
                })
              }
              required
              maxLength={200}
            />
          </label>

          <label>
            Purpose
            <textarea
              value={editingBooking.purpose || ''}
              onChange={(event) =>
                setEditingBooking({
                  ...editingBooking,
                  purpose: event.target.value,
                })
              }
            />
          </label>

          <label>
            Booking Date
            <input
              type="date"
              value={editDate}
              min={new Date().toLocaleDateString('en-CA', {
                timeZone: 'Asia/Kuala_Lumpur',
              })}
              onChange={(event) => setEditDate(event.target.value)}
              required
            />
          </label>

          <div className="booking-time-row">
            <label>
              Start Time
              <input
                type="time"
                value={editStartTime}
                onChange={(event) =>
                  setEditStartTime(event.target.value)
                }
                required
              />
            </label>

            <label>
              End Time
              <input
                type="time"
                value={editEndTime}
                onChange={(event) =>
                  setEditEndTime(event.target.value)
                }
                required
              />
            </label>
          </div>

          <div className="booking-form-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                setEditingBooking(null);
                setUpdateError('');
              }}
            >
              Close
            </button>
 
            <button
              type="submit"
              className="button button-primary"
              disabled={updatingBooking}
            >
              {updatingBooking ? 'Checking & Saving...' : 'Check Availability & Save'}
            </button>

          </div>
        </form>
      </div>
    </div>
  );
}



            return (
              <>
                <h3>Upcoming Bookings</h3>

                {upcomingBookings.length === 0 ? (
                  <p>You have no upcoming bookings.</p>
                ) : (
                  <div className="facility-grid">
                    {upcomingBookings.map((booking) =>
                      renderBooking(booking, 'Upcoming reservation')
                    )}
                  </div>
                )}

                <h3 style={{ marginTop: '32px' }}>Past Bookings</h3>

                {pastBookings.length === 0 ? (
                  <p>You have no past bookings yet.</p>
                ) : (
                  <div className="facility-grid">
                    {pastBookings.map((booking) =>
                      renderBooking(booking, 'Reservation completed')
                    )}
                  </div>
                )}

                {cancelledBookings.length > 0 && (
                  <>
                    <h3 style={{ marginTop: '32px' }}>
                      Cancelled Bookings
                    </h3>

                    <div className="facility-grid">
                      {cancelledBookings.map((booking) =>
                        renderBooking(booking, 'This reservation was cancelled')
                      )}
                    </div>
                  </>
                )}
              {renderEditBookingForm()}
              </>
            );
          })()}
        </section>


        <section className="facility-section" id="facilities">
          <div className="section-heading">
            <div>
              <p className="eyebrow">DISCOVER YOUR SPACE</p>
              <h2>College facilities</h2>
              <p>Find the right space for your next activity.</p>
            </div>
            <span className="facility-count">
              {facilities.length} facilities
            </span>
          </div>

          {loading && <p>Loading facilities...</p>}

          {error && (
            <p className="error-message">
              Could not load facilities: {error}
            </p>
          )}

          {!loading && !error && facilities.length === 0 && (
            <p>No facilities are available yet.</p>
          )}

          {!loading && !error && facilities.length > 0 && (
            <div className="facility-grid">
              {facilities.map((facility) => (
                <article className="facility-card" key={facility.id}>
                  <div className="facility-card-icon">
                    <Building2 size={26} />
                  </div>

                  <div className="facility-card-content">
                    <h3>{facility.name}</h3>
                    <p>{facility.description || 'College facility'}</p>

                    <div className="facility-detail">
                      <MapPin size={16} />
                      <span>{facility.location || 'Location not specified'}</span>
                    </div>

                    <div className="facility-detail">
                      <Users size={16} />
                      <span>Capacity: {facility.capacity ?? 'Not specified'}</span>
                    </div>
                  </div>

                  <button
                    className="button button-primary facility-book-button"
                    onClick={() => {
                      if (!session) {
                       setAuthOpen(true);
                       } else {
                          setBookingError('');
                          setBookingFacility(facility);
                        }
                      }}
                  >
                    {session ? 'Book facility' : 'Sign in to book'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />

      {bookingFacility && (
        <BookingForm
          facility={bookingFacility}
          status={bookingError}
          onClose={() => {
            setBookingFacility(null);
            setBookingError('');
          }}
          submitting={bookingChecking}
          onSubmit={async (bookingDetails) => {
            setBookingChecking(true);
            setBookingError('');

            try {
              const params = new URLSearchParams({
                start_time: bookingDetails.start_time,
                end_time: bookingDetails.end_time,
            });

            
          const availability = await api(
            `/facilities/${bookingDetails.facility_id}/availability?${params.toString()}`
          );

          if (!availability.available) {
            setBookingError(
              'This facility is not available for the selected time. Please choose another time.'
            );
            return;
          }

          const result = await api('/bookings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingDetails),
          });

          setBookingError('Booking confirmed successfully!');

          } catch (err) {
            setBookingError(
              `Could not check availability: ${err.message}`
            );
          } finally {
            setBookingChecking(false);
          }
        }}
      />
    )}

    {bookingError && (
      <div role="status" className="booking-status">
      {bookingError}
      </div>
    )}

      {authOpen && (
        <Auth onClose={() => setAuthOpen(false)} />
      )}
    </div>
  );
}
