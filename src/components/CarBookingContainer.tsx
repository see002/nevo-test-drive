import Image from 'next/image';
import BookingForm, { Vehicle } from "./BookingForm";

interface CarBookingContainerProps {
  availabilityData: {
    vehicles: Array<Vehicle>;
    locationAvailability: Record<string, {
      locationId: number;
      availableDays: string[];
      vehicleIds: string[];
    }>;
  };
}

export default function CarBookingContainer({ availabilityData }: CarBookingContainerProps) {
  const firstVehicle = availabilityData.vehicles[0];
  const locationCount = Object.keys(availabilityData.locationAvailability).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Section 1: Car Details */}
      <section className="bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Column 1: Car Image */}
            <div className="relative h-[300px] rounded-lg overflow-hidden">
              <Image
                src={`/assets/images/${firstVehicle.model.toLowerCase().replace(/\s+/g, '-')}.webp`}
                alt={firstVehicle.model}
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Column 2: Car Details */}
            <div>
              <h1 className="text-3xl font-bold mb-6">{firstVehicle.model}</h1>
              <p className="text-primary mb-8">
                Experience the thrill of driving the {firstVehicle.model}. Book your test drive today and discover the perfect blend of performance and comfort.
              </p>
              
              <div className="space-y-4 bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-primary">
                    Test Drive Duration: {firstVehicle.drive_duration_minutes} minutes
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-primary">
                    Available at {locationCount} locations
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-primary">
                    Book up to 14 days in advance
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Booking Form */}
      <section className="py-16">
        <div className="container mx-auto px-4 xl:px-0">
          <BookingForm 
            vehicles={availabilityData.vehicles}
            locations={Object.entries(availabilityData.locationAvailability).map(([name, data]) => ({
              id: data.locationId,
              name,
              availableDays: data.availableDays,
              vehicleIds: data.vehicleIds
            }))}
          />
        </div>
      </section>
    </div>
  );
}