
import React from 'react';
import { X, CalendarDays, Clock, Building2 } from 'lucide-react';

export default function BookingForm({
  facility,
  onClose,
  onSubmit,
  submitting = false,
  status = ''
}) {
  const [title, setTitle] = React.useState('');
  const [purpose, setPurpose] = React.useState('');
  const [date, setDate] = React.useState('');
  const [startTime, setStartTime] = React.useState('');
  const [endTime, setEndTime] = React.useState('');
  const [error, setError] = React.useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please enter a booking title.');
      return;
    }

    if (!date || !startTime || !endTime) {
      setError('Please select a date, start time and end time.');
      return;
    }

    if (startTime >= endTime) {
      setError('The end time must be later than the start time.');
      return;
    }

    onSubmit({
      facility_id: facility.id,
      title: title.trim(),
      purpose: purpose.trim(),
      start_time: new Date(`${date}T${startTime}:00+08:00`).toISOString(),
      end_time: new Date(`${date}T${endTime}:00+08:00`).toISOString()
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal booking-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="icon-button booking-close"
          onClick={onClose}
          aria-label="Close booking form"
        >
          <X size={20} />
        </button>

        <div className="booking-heading">
          <span className="facility-card-icon">
            <Building2 size={24} />
          </span>
          <p className="eyebrow">NEW RESERVATION</p>
          <h2 id="booking-title">Book a facility</h2>
          <p>{facility.name} · {facility.location}</p>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          <label>
            Booking title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Volleyball practice"
              maxLength={120}
              required
            />
          </label>

          <label>
            Purpose or description
            <textarea
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
              placeholder="Tell us briefly about your activity"
              rows={3}
            />
          </label>

          <label>
            <span><CalendarDays size={16} /> Booking date</span>
            <input
              type="date"
              value={date}
              min={new Date().toLocaleDateString('en-CA', {
                timeZone: 'Asia/Kuala_Lumpur'
              })}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </label>

          <div className="booking-time-row">
            <label>
              <span><Clock size={16} /> Start time</span>
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                required
              />
            </label>

            <label>
              <span><Clock size={16} /> End time</span>
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                required
              />
            </label>
          </div>

          {error && <p className="error-message">{error}</p>}
          {status && <p role="status">{status}</p>}

          <button
            type="submit"
            className="button button-primary booking-submit"
            disabled={submitting}
          >
            {submitting ? 'Checking availability...' : 'Check & submit booking'}
          </button>
        </form>
      </section>
    </div>
  );
}
