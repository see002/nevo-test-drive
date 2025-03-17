import { NextResponse } from 'next/server';
import { checkSlotAvailability, SlotAvailabilityRequest } from '@/server/model';

export async function POST(request: Request) {
  try {
    const body: SlotAvailabilityRequest = await request.json();
    const { location_id, date, vehicle_ids, booking_start_time } = body;

    // Validate input
    if (!location_id || !date || !vehicle_ids?.length || !booking_start_time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const response = checkSlotAvailability(body);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 