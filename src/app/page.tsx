import CarModelGrid from '@/components/CarGrid';
import { notFound } from 'next/navigation';

export interface CarModel {
  id?: string;
  model: string;
  image_url: string;
}

export const revalidate = 3600; // Revalidate every hour
export const dynamic = 'force-static'; // Ensures SSG, prevents server execution on requests

async function getCarModels() {

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vehicles/cars`, {
    next: { revalidate: 3600 }
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export default async function Home() {
  const cars = await getCarModels();
  if (!cars || !cars?.length) {
    notFound();
  }

  return (
    <main>
      <CarModelGrid cars={cars} />
    </main>
  );
}
