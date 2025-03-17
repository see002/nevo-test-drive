'use client';
import { useMemo, useState } from 'react';
import { format, addDays, parse, subMinutes, addMinutes } from 'date-fns';
import Toast from './Toast';
import BookingSuccess from './BookingSuccess';

export interface Location {
  id: number;
  name: string;
  availableDays: string[];
  vehicleIds: string[];
}

export interface Vehicle {
  id: string;
  model: string;
  available_from: string;
  available_to: string;
  minimum_gap_minutes: number;
  drive_duration_minutes: number;
}

interface BookingFormProps {
  vehicles: Vehicle[];
  locations: Location[];
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface AvailableSlot {
  vehicle_id: string;
  booking_start_time: string;
  booking_end_time: string;
  location_id: number,
  booking_date: string;
}

export default function BookingForm({ vehicles, locations }: BookingFormProps) {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [availableSlotObj, setAvailableSlotObj] = useState<AvailableSlot | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Handle location selection
  const handleLocationChange = (locationId: number | null) => {
    const location = locations.find(loc => loc.id === locationId);
    setSelectedLocation(location || null);
    setSelectedDate('');
    setSelectedTime('');
    setAvailableSlotObj(null);
    setShowBookingForm(false);
  };

  // Handle date selection
  const handleDateChange = async (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    setAvailableSlotObj(null);
    setShowBookingForm(false);
  };

  const handleTimeSlotChange = (time: string) => {
    setSelectedTime(time);
    setAvailableSlotObj(null);
    setShowBookingForm((prev) => {
      if (prev === true) {
        return false;
      }
      return false;
    });
  };

  const checkingAvailabilityHandler = async () => {
    setIsCheckingAvailability(true);
    const { origin } = new URL(document.URL);
    const apiUrl = `${origin}/api/vehicles/cars/slot-availability`;
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicle_ids: selectedLocation?.vehicleIds,
          location_id: selectedLocation?.id,
          date: selectedDate,
          booking_start_time: selectedTime
        }),
      });
      
      const data = await response.json();
      const { available, error: reason } = data || {};
      
      if (available) {
        const { slot } = data;
        setShowBookingForm(true);
        setAvailableSlotObj(slot);
      } else {
        handleLocationChange(null);
        setToast({
          message: reason || 'Sorry, this time slot is no longer available. Please select another time.',
          type: 'error'
        });
      }
    } catch {
      handleLocationChange(null);
      setToast({
        message: 'There was an error checking availability. Please try again.',
        type: 'error'
      });
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  // Handle booking submission
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCheckingAvailability(true);
    const { origin } = new URL(document.URL);
    const apiUrl = `${origin}/api/vehicles/cars/slot-booking`;
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...availableSlotObj,
          ...formData
        }),
      });
      const data = await response.json();
      const { status, error: reason } = data || {};

      if (status) {
        setShowSuccess(true);
        setToast({
          message: 'Booking successful!',
          type: 'success'
        });
      } else {
        handleLocationChange(null);
        setToast({
          message: reason || 'Failed to submit booking. Please try again.',
          type: 'error'
        });
      }
    } catch {
      handleLocationChange(null);
      setToast({
        message: 'Failed to submit booking. Please try again.',
        type: 'error'
      });
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleBackToBooking = () => {
    setShowSuccess(false);
    handleLocationChange(null);
  };

  // Get available dates (next 14 days)
  const availableDates = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const date = addDays(new Date(), i);
      const formattedDate = format(date, 'yyyy-MM-dd');
      const dayName = format(date, 'EE').toLowerCase();
      return selectedLocation?.availableDays.includes(dayName) ? formattedDate : null;
    }).filter((date): date is string => date !== null);
  }, [selectedLocation]);

  // Calculate available time slots based on vehicle availability
  const timeSlots = useMemo(() => {
    if (!selectedLocation || !vehicles) return [];

    // Find earliest available_from and latest available_to
    const availableFromTimes = vehicles.map(v => parse(v.available_from, 'HH:mm', new Date()));
    const availableToTimes = vehicles.map(v => parse(v.available_to, 'HH:mm', new Date())); 
    
    const earliestFrom = availableFromTimes.reduce((a,b) => a < b ? a : b);
    const latestTo = availableToTimes.reduce((a,b) => a > b ? a : b);

    const driveDuration = vehicles[0].drive_duration_minutes;
    const minimumGap = vehicles[0].minimum_gap_minutes;
    const bufferTime = driveDuration + minimumGap;

    // Calculate last possible slot
    const lastPossibleTime = subMinutes(latestTo, bufferTime - 1);

    // Get current time plus minimum gap
    const now = new Date();
    const currentTimePlusGap = addMinutes(now, minimumGap);

    // Use the later of earliest available time or current time + gap
    let currentTime = selectedDate === format(new Date(), 'yyyy-MM-dd') ? (earliestFrom > currentTimePlusGap ? earliestFrom : currentTimePlusGap) : earliestFrom;

    // Round up to next 15 minute interval
    const minutes = currentTime.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    currentTime = addMinutes(currentTime, roundedMinutes - minutes);

    const slots: TimeSlot[] = [];

    while (currentTime < lastPossibleTime) {
      slots.push({
        time: format(currentTime, 'HH:mm'),
        available: true
      });
      currentTime = addMinutes(currentTime, 15);
    }

    return slots;
  }, [selectedLocation, vehicles, selectedDate]);

  const model = vehicles?.[0]?.model || '';

  if (showSuccess && availableSlotObj) {
    return (
      <BookingSuccess
        formData={formData}
        bookingDetails={availableSlotObj}
        vehicleModel={model}
        locationName={selectedLocation?.name || ''}
        onBackToBooking={handleBackToBooking}
      />
    );
  }

  return (
    <div className="rounded-lg w-full lg:w-3/6 xl:w-2/5 mx-auto">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold mb-2">Book Your Test Drive</h2>
        <p className="text-gray-700">Select your preferred location, date and time to book a test drive for the {model}.</p>
      </div>

      {/* Location Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-primary mb-2">
          Select Location
        </label>
        <select
          className="w-full p-3 border bg-white rounded-md focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer"
          value={selectedLocation?.id || ''}
          onChange={(e) => handleLocationChange(Number(e.target.value))}
        >
          <option value="">Choose a location</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date Selection */}
      {selectedLocation && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-primary mb-2">
            Select Date
          </label>
          <select
            className="w-full p-3 border bg-white rounded-md focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
          >
            <option value="">Choose a date</option>
            {availableDates.map((date) => (
              <option key={date} value={date}>
                {format(parse(date, 'yyyy-MM-dd', new Date()), 'EEEE, MMMM d')}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Time Selection */}
      {selectedDate && timeSlots.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-primary mb-2">
            Select Time
          </label>
          <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 border rounded-md">
            {timeSlots.map((slot) => (
              <button
                key={slot.time}
                className={`p-2 text-sm rounded-md transition-colors cursor-pointer ${
                  slot.available
                    ? 'bg-white border hover:bg-gray-50'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                } ${
                  selectedTime === slot.time
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-gray-200'
                }`}
                onClick={() => handleTimeSlotChange(slot.time)}
                disabled={!slot.available}
              >
                {slot.time}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedDate && timeSlots.length === 0 && (<p 
        className="block text-sm font-medium text-primary mb-2"
      >No available time slots for this date.</p>)}

      {selectedTime && !showBookingForm && (
        <div>
          <button
            type="button"
            onClick={checkingAvailabilityHandler}
            className="w-full bg-primary-custom text-white block font-semibold py-3 
            px-6 rounded-md cursor-pointer"
          >
            Confirm Booking
          </button>
        </div>
      )}

      {/* Booking Form */}
      {showBookingForm && (
        <form onSubmit={handleBookingSubmit} className="space-y-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Details</h3>
          
          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Name
            </label>
            <input
              type="text"
              required
              className="w-full p-3 border bg-white rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Email
            </label>
            <input
              type="email"
              required
              className="w-full p-3 border bg-white rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter your email address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-1">
              Phone
            </label>
            <input
              type="tel"
              required
              className="w-full p-3 border bg-white rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter your phone number"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-primary-custom text-white py-3 px-4 rounded-md hover:bg-primary/90 transition-colors font-semibold cursor-pointer"
          >
            Book Test Drive
          </button>
        </form>
      )}

      {/* Loading State */}
      {isCheckingAvailability && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      )}

      {/* Status Messages */}
      {/* {bookingStatus === 'success' && ( */}
        {/* <div className="mt-4 p-4 bg-green-100 text-green-700 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Booking successful! Redirecting...
          </div>
        </div> */}
      {/* )} */}
    </div>
  );
} 