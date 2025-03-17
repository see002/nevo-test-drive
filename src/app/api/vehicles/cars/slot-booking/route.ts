import { NextResponse } from 'next/server';
import { slotBookingHandler, SlotBookingRequest } from '@/server/model';

export async function POST(request: Request) {
  try {
    const body: SlotBookingRequest = await request.json();
    const { location_id, booking_date, vehicle_id, booking_start_time, booking_end_time,
      name, email, phone
     } = body;

    // Validate input
    if (!location_id || !booking_date || !vehicle_id || !booking_start_time || !booking_end_time || 
      !name || !email || !phone
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const response = slotBookingHandler(body);
    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 