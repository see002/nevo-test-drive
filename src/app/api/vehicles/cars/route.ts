import { NextResponse } from "next/server";
import { getDistinctVehicleModels } from "@/server/model";

export async function GET() {
  try {
    const vehicles = getDistinctVehicleModels();
    return NextResponse.json(vehicles, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
};
