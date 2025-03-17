import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Ensure db directory exists
const dbDir = path.join(process.cwd(), "db");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    db = new Database(path.join(process.cwd(), "db/vehicle_booking.db"), {
      verbose: process.env.NODE_ENV === "development" ? console.log : undefined,
    });
  }
  return db;
}

// Cleanup on exit
process.on("exit", () => {
  if (db) {
    db.close();
  }
});

// Initialize database schema
const initDb = () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        model TEXT NOT NULL,
        available_from TIME,
        available_to TIME,
        minimum_gap_minutes INT,
        drive_duration_minutes INT,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicle_availability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id TEXT NOT NULL,
        available_day TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
        CHECK (available_day IN ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')),
        UNIQUE(vehicle_id, available_day)
    );

    CREATE TABLE IF NOT EXISTS vehicle_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id TEXT NOT NULL,
        location_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
        UNIQUE(vehicle_id, location_id)
    );

    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id TEXT NOT NULL,
        location_id INTEGER NOT NULL,
        customer_id INTEGER NOT NULL,
        booking_date DATE NOT NULL,
        booking_start_time TIME NOT NULL,
        booking_end_time TIME NOT NULL,
        status TEXT CHECK (status IN ('confirmed', 'cancelled', 'completed')) DEFAULT 'confirmed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE,
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        CHECK (booking_end_time > booking_start_time)
    );

    -- Step 1: Drop existing trigger if it exists
    DROP TRIGGER IF EXISTS prevent_overlapping_bookings;

    -- TRIGGER to prevent overlapping bookings on INSERT & UPDATE
    CREATE TRIGGER prevent_overlapping_bookings
    BEFORE INSERT ON bookings
    FOR EACH ROW
    WHEN NEW.status = 'confirmed'
    BEGIN
        -- Prevent overlapping bookings OR enforce minimum gap
        SELECT RAISE(ABORT, 'Overlapping booking detected')
        FROM bookings
        WHERE vehicle_id = NEW.vehicle_id
        AND booking_date = NEW.booking_date
        AND status = 'confirmed'
        AND (
            -- Case 1: New booking start time falls within an existing booking
            (NEW.booking_start_time BETWEEN booking_start_time AND booking_end_time)
            OR
            -- Case 2: New booking end time falls within an existing booking
            (NEW.booking_end_time BETWEEN booking_start_time AND booking_end_time)
            OR
            -- Case 3: New booking completely covers an existing booking
            (NEW.booking_start_time <= booking_start_time AND NEW.booking_end_time >= booking_end_time)
            OR
            -- Case 4: Enforce minimum gap after the last booking ends
            (NEW.booking_start_time >= booking_end_time 
            AND NEW.booking_start_time < time(booking_end_time, '+' || 
                  CAST(((SELECT minimum_gap_minutes FROM vehicles WHERE id = NEW.vehicle_id) - 1) AS TEXT) || ' minutes')
            )
        );
    END;

    -- Step 1: Drop existing trigger if it exists
    DROP TRIGGER IF EXISTS prevent_overlapping_bookings_update;

    CREATE TRIGGER prevent_overlapping_bookings_update
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    WHEN NEW.status = 'confirmed'
    BEGIN
        -- Prevent overlapping bookings OR enforce minimum gap
        SELECT RAISE(ABORT, 'Overlapping booking detected')
        FROM bookings
        WHERE vehicle_id = NEW.vehicle_id
        AND booking_date = NEW.booking_date
        AND status = 'confirmed'
        AND id != OLD.id
        AND (
            -- Case 1: New booking start time falls within an existing booking
            (NEW.booking_start_time BETWEEN booking_start_time AND booking_end_time)
            OR
            -- Case 2: New booking end time falls within an existing booking
            (NEW.booking_end_time BETWEEN booking_start_time AND booking_end_time)
            OR
            -- Case 3: New booking completely covers an existing booking
            (NEW.booking_start_time <= booking_start_time AND NEW.booking_end_time >= booking_end_time)
            OR
            -- Case 4: Enforce minimum gap after the last booking ends
            (NEW.booking_start_time >= booking_end_time 
            AND NEW.booking_start_time < time(booking_end_time, '+' || 
                  CAST(((SELECT minimum_gap_minutes FROM vehicles WHERE id = NEW.vehicle_id) - 1) AS TEXT) || ' minutes')
            )
        );
    END;
  `;

  getDb().exec(schema);
};

// Insert sample data
const insertSampleData = () => {
  try {
    const locations = [
      { name: "Dublin City Centre" },
      { name: "Cork City" },
      { name: "Galway City" },
      { name: "Limerick City" },
      { name: "Waterford City" },
      { name: "Kilkenny City" },
    ];

    const insertLocation = getDb().prepare(
      "INSERT OR IGNORE INTO locations (name) VALUES (?)"
    );
    locations.forEach((loc) => insertLocation.run(loc.name));

    // Base vehicle models
    const baseVehicles = [
      {
        model: "Mercedes-Benz AMG GT",
        imageSrc: "mercedes-benz-amg-gt",
        minimum_gap_minutes: 15,
        available_from: "10:00",
        available_to: "20:00",
        drive_duration_minutes: 45,
      },
      {
        model: "MG Cyberster",
        imageSrc: "mg-cyberster",
        minimum_gap_minutes: 30,
        available_from: "08:00",
        available_to: "20:00",
        drive_duration_minutes: 60,
      },
      {
        model: "BMW Series 5",
        imageSrc: "bmw-series-5",
        minimum_gap_minutes: 15,
        available_from: "08:00",
        available_to: "18:00",
        drive_duration_minutes: 45,
      },
      {
        model: "Kia EV6 GT",
        imageSrc: "kia-ev6-gt",
        minimum_gap_minutes: 30,
        available_from: "10:00",
        available_to: "19:00",
        drive_duration_minutes: 60,
      },
      {
        model: "Audi SQ6 e-tron",
        imageSrc: "audi-sq6-e-tron",
        minimum_gap_minutes: 15,
        available_from: "08:00",
        available_to: "20:00",
        drive_duration_minutes: 45,
      },
      {
        model: "BMW XM",
        imageSrc: "bmw-xm",
        minimum_gap_minutes: 30,
        available_from: "08:00",
        available_to: "20:00",
        drive_duration_minutes: 60,
      },
      {
        model: "Tesla Model 3",
        imageSrc: "tesla-model-3",
        minimum_gap_minutes: 15,
        available_from: "10:00",
        available_to: "20:00",
        drive_duration_minutes: 45,
      },
      {
        model: "Audi SQ8 Sportback e-tron",
        imageSrc: "audi-sq8-sportback-e-tron",
        minimum_gap_minutes: 30,
        available_from: "08:00",
        available_to: "20:00",
        drive_duration_minutes: 60,
      },
      {
        model: "Audi SQ8 e-tron",
        imageSrc: "audi-sq8-e-tron",
        minimum_gap_minutes: 15,
        available_from: "08:00",
        available_to: "18:00",
        drive_duration_minutes: 45,
      },
      {
        model: "Audi e-tron GT quattro",
        imageSrc: "audi-e-tron-gt-quattro",
        minimum_gap_minutes: 15,
        available_from: "10:00",
        available_to: "20:00",
        drive_duration_minutes: 45,
      },
      {
        model: "BMW iX",
        imageSrc: "bmw-ix",
        minimum_gap_minutes: 30,
        available_from: "08:00",
        available_to: "20:00",
        drive_duration_minutes: 60,
      },
      {
        model: "Porsche Panamera",
        imageSrc: "porsche-panamera",
        minimum_gap_minutes: 15,
        available_from: "08:00",
        available_to: "18:00",
        drive_duration_minutes: 45,
      },
    ];

    // Create multiple instances of each vehicle model (30 total vehicles)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vehicles: any = [];
    baseVehicles.forEach((baseVehicle, index) => {
      // Each model will have 2-3 instances
      const instances = index % 2 === 0 ? 3 : 2;
      for (let i = 1; i <= instances; i++) {
        vehicles.push({
          id: `${baseVehicle.imageSrc.replace(/-/g, "")}${index + 1}-${i}`,
          model: baseVehicle.model,
          available_from: "08:00",
          available_to: "20:00",
          minimum_gap_minutes: baseVehicle.minimum_gap_minutes,
          drive_duration_minutes: baseVehicle.drive_duration_minutes,
          image_url: `${baseVehicle.imageSrc}`,
        });
      }
    });

    const insertVehicle = getDb().prepare(
      "INSERT OR IGNORE INTO vehicles (id, model, available_from, available_to, minimum_gap_minutes, drive_duration_minutes, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    vehicles.forEach(
      (v: {
        id: unknown;
        model: unknown;
        available_from: unknown;
        available_to: unknown;
        minimum_gap_minutes: unknown;
        drive_duration_minutes: unknown;
        image_url: unknown;
      }) =>
        insertVehicle.run(
          v.id,
          v.model,
          v.available_from,
          v.available_to,
          v.minimum_gap_minutes,
          v.drive_duration_minutes,
          v.image_url
        )
    );

    // Insert vehicle availability (random 4 days for each vehicle)
    const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    const insertAvailability = getDb().prepare(
      "INSERT OR IGNORE INTO vehicle_availability (vehicle_id, available_day) VALUES (?, ?)"
    );

    vehicles.forEach((v: { id: unknown }) => {
      // Randomly select 4 days for each vehicle
      const availableDays = [...days]
        .sort(() => 0.5 - Math.random())
        .slice(0, 4);

      availableDays.forEach((day) => insertAvailability.run(v.id, day));
    });

    // Insert vehicle locations (each vehicle available in 3-4 random cities)
    const insertVehicleLocation = getDb().prepare(
      "INSERT OR IGNORE INTO vehicle_locations (vehicle_id, location_id) VALUES (?, ?)"
    );
    vehicles.forEach((v: { id: unknown }) => {
      // Randomly select 3-4 locations for each vehicle
      const numLocations = Math.floor(Math.random() * 2) + 3; // 3 or 4
      const locationIds = Array.from({ length: 6 }, (_, i) => i + 1)
        .sort(() => 0.5 - Math.random())
        .slice(0, numLocations);

      locationIds.forEach((locationId) =>
        insertVehicleLocation.run(v.id, locationId)
      );
    });

    // // Insert sample customers
    // const customers = [
    //   { name: 'John Doe', email: 'john@example.com', phone: '+353891234567' },
    //   { name: 'Jane Smith', email: 'jane@example.com', phone: '+353892345678' },
    //   { name: 'Bob Johnson', email: 'bob@example.com', phone: '+353893456789' }
    // ];

    // const insertCustomer = getDb().prepare('INSERT OR IGNORE INTO customers (name, email, phone) VALUES (?, ?, ?)');
    // customers.forEach(c => insertCustomer.run(c.name, c.email, c.phone));

    console.log("Sample data inserted successfully");
  } catch (error) {
    console.error("Error inserting sample data:", error);
  }
};

export { initDb, insertSampleData };
