import { format, parse } from 'date-fns';

interface BookingSuccessProps {
  formData: {
    name: string;
    email: string;
    phone: string;
  };
  bookingDetails: {
    vehicle_id: string;
    booking_start_time: string;
    booking_end_time: string;
    location_id: number;
    booking_date: string;
  };
  vehicleModel: string;
  locationName: string;
  onBackToBooking: () => void;
}

export default function BookingSuccess({ 
  formData, 
  bookingDetails, 
  vehicleModel,
  locationName,
  onBackToBooking 
}: BookingSuccessProps) {
  const bookingDate = parse(bookingDetails.booking_date, 'yyyy-MM-dd', new Date());
  const startTime = parse(bookingDetails.booking_start_time, 'HH:mm', new Date());
  const endTime = parse(bookingDetails.booking_end_time, 'HH:mm', new Date());

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Booking Confirmed!</h2>
        <p className="text-gray-600">Your test drive has been successfully booked.</p>
      </div>

      <div className="space-y-6">
        {/* Vehicle Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Vehicle Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Vehicle Model</p>
              <p className="font-medium text-gray-900">{vehicleModel}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Location</p>
              <p className="font-medium text-gray-900">{locationName}</p>
            </div>
          </div>
        </div>

        {/* Booking Schedule */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Booking Schedule</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="font-medium text-gray-900">{format(bookingDate, 'EEEE, MMMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Time</p>
              <p className="font-medium text-gray-900">
                {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
              </p>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Your Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="font-medium text-gray-900">{formData.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium text-gray-900">{formData.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-medium text-gray-900">{formData.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Booking ID</p>
              <p className="font-medium text-gray-900">{bookingDetails.vehicle_id}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={onBackToBooking}
          className="bg-primary-custom text-white px-6 py-3 rounded-md hover:bg-primary/90 transition-colors font-semibold cursor-pointer"
        >
          Book Another Test Drive
        </button>
      </div>
    </div>
  );
} 