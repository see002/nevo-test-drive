/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDb } from "./db";

interface AvailabilityForGivenModel {
  [key: string]: {
    locationId: number;
    availableDays: string[];
    vehicleIds: string[];
  };
}

interface Vehicle {
  id: string;
  available_from: string;
  available_to: string;
  drive_duration_minutes: number;
  available_day: string;
  minimum_gap_minutes: number;
}

interface BookingCount {
  vehicle_id: string;
  count: number;
}

export interface SlotAvailabilityRequest {
  location_id: number;
  date: string;  // YYYY-MM-DD format
  vehicle_ids: string[];
  booking_start_time: string;  // HH:mm 24Hformat 16:15
  booking_end_time?: string;  // HH:mm 24Hformat 16:15
}

export interface SlotBookingRequest {
  location_id: number; 
  booking_date: string;  // YYYY-MM-DD format
  vehicle_id: string; 
  booking_start_time: string;  // HH:mm 24Hformat 16:15
  booking_end_time: string;  // HH:mm 24Hformat 16:15
  name: string; 
  email: string; 
  phone: string;
}

interface SlotAvailabilityResponse {
  available: boolean;
  slot?: {
    vehicle_id: string;
    booking_start_time: string;
    booking_end_time: string;
    location_id: number;
    booking_date: string;
  };
  error?: string;
}

interface BookingResponse {
  status: boolean;
  error?: string;
}

export interface CarModel {
  model: string;
  image_url: string;
}

const db = getDb();

export function getDistinctVehicleModels() {
  return db.prepare("SELECT DISTINCT model, image_url FROM vehicles ORDER BY model ASC").all();
}

export function getAvailabilityForGivenModel(model: string) {
  // Get all vehicles of the given model with their basic details
  const vehicles = db
    .prepare(
      `
    SELECT 
      id,
      model,
      available_from,
      available_to,
      minimum_gap_minutes,
      drive_duration_minutes
    FROM vehicles 
    WHERE image_url = ?
  `
    )
    .all(model);

  if (!vehicles.length) return null;

  // Get available days for all vehicles in a single query
  const availableDays = db
    .prepare(
      `
    SELECT vehicle_id, available_day 
    FROM vehicle_availability
    WHERE vehicle_id IN (${vehicles.map(() => "?").join(",")})
  `
    )
    .all(...vehicles.map(({ id }: any) => id));

  // Get locations for all vehicles
  const locations = db
    .prepare(
      `
    SELECT vl.vehicle_id, l.id, l.name
    FROM locations l
    INNER JOIN vehicle_locations vl ON l.id = vl.location_id
    WHERE vl.vehicle_id IN (${vehicles.map(() => "?").join(",")})
  `
    )
    .all(...vehicles.map(({ id }: any) => id));

  // Create location-based availability mapping
  const locationMap: AvailabilityForGivenModel = {};

  // Initialize location map with empty arrays
  locations.forEach((loc: any) => {
    if (!locationMap[loc.name]) {
      locationMap[loc.name] = {
        locationId: loc.id,
        availableDays: [],
        vehicleIds: [],
      };
    }
    locationMap[loc.name].vehicleIds.push(loc.vehicle_id);
  });

  // Add available days to each location based on vehicle availability
  Object.keys(locationMap).forEach((locationName) => {
    const vehicleIds = locationMap[locationName].vehicleIds;
    const daysSet = new Set<string>();

    // Get all available days for vehicles at this location
    availableDays.forEach((day: any) => {
      if (vehicleIds.includes(day.vehicle_id)) {
        daysSet.add(day.available_day);
      }
    });

    // Sort days in correct order
    const sortOrder = {
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
      sun: 7,
    };
    locationMap[locationName].availableDays = Array.from(daysSet).sort(
      (a, b) =>
        sortOrder[a as keyof typeof sortOrder] -
        sortOrder[b as keyof typeof sortOrder]
    );
  });

  return {
    vehicles,
    locationAvailability: locationMap,
  };
}

function addMinutes(time: string, minutesToAdd: any) {
  const [hours, minutes] = time.split(":").map(Number); // Convert "12:15" → [12, 15]
  const date = new Date();
  date.setHours(hours);
  date.setMinutes(minutes + minutesToAdd); // Add 45 minutes

  // Format back to HH:MM
  return date.toTimeString().slice(0, 5);
}

export function checkSlotAvailability(payload: SlotAvailabilityRequest) {
  console.log(db.prepare("SELECT * FROM bookings").all());

  const { 
    location_id, 
    date, 
    vehicle_ids, 
    booking_start_time,
    booking_end_time
  } = payload;

  // Convert date to day of week (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = new Date(date).getDay();
  const dayMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const day = dayMap[dayOfWeek];

  // Check if date is within valid range (today to next 14 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 14);
  maxDate.setHours(23, 59, 59, 999);

  const bookingDate = new Date(date);
  bookingDate.setHours(0, 0, 0, 0);

  if (bookingDate < today || bookingDate > maxDate) {
    return (
      { 
        available: false, 
        error: "Booking date must be between today and 14 days from now" 
      }
    );
  }

  const placeholders = vehicle_ids.map(() => "?").join(","); // Generates ?,?,? for safe binding
  // Get available vehicles for the given day
  const availableVehicles = db
    .prepare(
      `
    SELECT v.*, va.available_day, vl.location_id, ? as date, ? as start_time
    FROM vehicles v
    INNER JOIN vehicle_availability va ON v.id = va.vehicle_id
    INNER JOIN vehicle_locations vl ON v.id = vl.vehicle_id
    WHERE v.id IN (${placeholders})
    AND vl.location_id = ?
    AND va.available_day = ?
    AND v.available_from <= ?
    AND v.available_to >= time(?, '+' || v.drive_duration_minutes || ' minutes')
  `
    )
    .all(date, booking_start_time, ...vehicle_ids, location_id, day, booking_start_time, booking_start_time) as Vehicle[];

  if (!availableVehicles.length) {
    return (
      { available: false, error: "No vehicles available at this time" }
    );
  }

  // Calculate end time for each vehicle based on drive duration
  const vehicleSlots = availableVehicles.map((vehicle) => ({
    ...vehicle,
    end_time: addMinutes(booking_start_time, vehicle.drive_duration_minutes),
  })).filter((vehicle) => (vehicle.end_time && booking_end_time ? vehicle.end_time === booking_end_time : true));

  if (!vehicleSlots.length) {
    return (
      { available: false, error: "No vehicles available at this time" }
    );
  }

  if (booking_end_time) {
    return ({available: true});
  }

  // Check for conflicting bookings
  const availableSlots = vehicleSlots.filter((vehicle) => {
    const conflicts = db.prepare(
        `
      SELECT COUNT(*) as count 
      FROM bookings
      WHERE vehicle_id = ?  
      AND location_id = ?
      AND booking_date = ?
      AND status = 'confirmed'
      AND (
        (? BETWEEN booking_start_time AND booking_end_time)
        OR
        (? BETWEEN booking_start_time AND booking_end_time)
        OR
        (? <= booking_start_time AND ? >= booking_end_time)
        OR
        CASE 
          WHEN (? >= booking_end_time 
            AND ? < time(booking_end_time, '+' || CAST(? AS TEXT) || ' minutes')) THEN 1
          ELSE 0  -- If condition is false, this always evaluates to true (ignoring the check)
        END
      )
    `
      )
      .get(
        vehicle.id,
        location_id,
        date,
        booking_start_time, vehicle.end_time,
        booking_start_time, vehicle.end_time,
        booking_start_time, booking_start_time, vehicle.minimum_gap_minutes - 1
      ) as { count: number };

    return conflicts.count === 0;
  });


  if (!availableSlots.length) {
    return (
      { available: false, error: "All slots are booked" }
    );
  }

  // Get booking counts for the past 7 days
  const sevenDaysAgo = new Date(date);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const formattedDate = sevenDaysAgo.toISOString().split("T")[0];

  const bookingCounts = db
    .prepare(
      `
    SELECT vehicle_id, MIN(booking_count) as count
    FROM (
      SELECT vehicle_id, COUNT(*) as booking_count
      FROM bookings 
      WHERE vehicle_id IN (${availableSlots.map(() => "?").join(",")})
      AND booking_date >= ?
      AND status != 'cancelled'
      GROUP BY vehicle_id
    )
  `
    )
    .all(...availableSlots.map(({ id }: any) => id), formattedDate) as BookingCount[];

  let optimalVehicle = availableSlots[0];
  const finalVehicleId = bookingCounts[0]?.vehicle_id || null;
  if (finalVehicleId) {
    const foundVehicle = availableSlots.find(({id}) => id === finalVehicleId);
    if (foundVehicle) {
      optimalVehicle = foundVehicle;
    }
  }

  const response: SlotAvailabilityResponse = {
    available: true,
    slot: {
      vehicle_id: optimalVehicle.id,
      booking_start_time: booking_start_time,
      booking_end_time: optimalVehicle.end_time,
      location_id,
      booking_date: date,
    }
  };

  return response;
}

export function slotBookingHandler(payload: SlotBookingRequest): BookingResponse {
  try {
    const { 
      location_id, 
      booking_date, 
      vehicle_id, 
      booking_start_time, 
      booking_end_time,
      name, 
      email, 
      phone
    } = payload;

    // UPSERT customer
    const customer = db.prepare(`
      INSERT INTO customers (name, email, phone)
      VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        name = excluded.name,
        phone = excluded.phone
      RETURNING id
    `).get(name, email, phone) as { id: number };

    if (!customer?.id) {
      return { 
        status: false, 
        error: 'Failed to create or update customer' 
      };
    }

    const slotAvailability = checkSlotAvailability({
      location_id, 
      date: booking_date, 
      vehicle_ids: [vehicle_id], 
      booking_start_time,
      booking_end_time
    })

    if (!slotAvailability.available) {
      return {
        status: false,
        error: 'Slot is not available'
      };
    }
    // Insert booking
    const insertBooking = db.prepare(`
      INSERT INTO bookings (
        customer_id,
        vehicle_id,
        location_id,
        booking_date,
        booking_start_time,
        booking_end_time,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, 'confirmed')
    `);

    insertBooking.run(
      customer.id,
      vehicle_id,
      location_id,
      booking_date,
      booking_start_time,
      booking_end_time
    );


    return { status: true };
  } catch (error) {
    if ((error as any)?.code === 'SQLITE_CONSTRAINT_TRIGGER') {
      return ({
        status: false,
        error: 'Overlapping booking'
      })
    }
    throw error
  }
}
