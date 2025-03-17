import { CarModel } from "@/app/page";
import Image from "next/image";
import Link from "next/link";

export default function CarModelGrid({ cars }: { cars: CarModel[] }) {
  return (
    <div className="container mx-auto px-4 py-8 xl:px-0">
      <h1 className="text-3xl font-bold text-center mb-8">Available Cars</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {cars.map((car) => (
          <Link 
            href={`/cars/book/${encodeURIComponent(car.image_url)}`} 
            key={car.model}
          >
            <div className="relative group overflow-hidden rounded-lg border-gray-200 border bg-gray-50 hover:cursor-pointer">
              <Image
                src={`/assets/images/${car.image_url}.webp`}
                alt={car.model}
                width={300}
                height={200}
                className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="relative inset-x-0 bottom-0 bg-black text-white text-center py-2 transition-colors duration-300 ease-in-out group-hover:bg-[#0da2e7]">
                <h2 className="block group-hover:hidden font-semibold">{car.model}</h2>
                <span className="hidden group-hover:block font-semibold">Book Test Drive</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
} 