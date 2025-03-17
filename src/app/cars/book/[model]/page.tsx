import CarBookingContainer from '@/components/CarBookingContainer';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{
    model: string;
  }>;
};

export const revalidate = 3600; // Revalidate every hour
export const dynamic = 'force-static';

async function getModelAvailability(model: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vehicles/cars/availability?model=${model}`, {
    next: { revalidate: 3600 }
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

// Generate metadata for the page
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { model } = await params;
  const modelData = decodeURIComponent(model);
  const availabilityData = await getModelAvailability(modelData);
  
  if (!availabilityData) {
    return {
      title: 'Car Not Found | Nevo Test Drive',
      description: 'The requested car model is not available for test drive.',
    };
  }

  // Get the first vehicle's details for metadata
  const modelName = availabilityData?.vehicles?.[0]?.model;
  const locations = Object.keys(availabilityData?.locationAvailability || {});
  
  return {
    title: `Book Test Drive - ${modelName} | Nevo Test Drive`,
    description: `Book a test drive for the ${modelName} at your preferred location. Available in ${locations.join(', ')}. Choose from available slots and experience the thrill of driving your dream car.`,
    keywords: [
      'test drive',
      modelName,
      'car booking',
      'vehicle test drive',
      'book test drive',
      'car rental service',
      ...locations
    ]
  };
}

export default async function BookingPage({ params }: Props) {
  const { model } = await params;
  const modelName = decodeURIComponent(model);
  const availabilityData = await getModelAvailability(modelName);
  
  if (!availabilityData) {
    notFound();
  }

  return (
    <main>
      <CarBookingContainer availabilityData={availabilityData} />
    </main>
  );
} 