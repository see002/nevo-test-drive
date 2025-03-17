# Nevo Test Drive Booking System

A modern web application for booking test drives of vehicles, built with Next.js 14, TypeScript and SQLite.

## Features

- Dynamic vehicle availability checking
- Location-based test drive booking
- Real-time slot availability
- Responsive design with modern UI
- Type-safe development with TypeScript
- Server-side rendering for optimal performance

## Prerequisites

- Node.js 20.x or later
- npm or yarn package manager
- SQLite3

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nevo-test-drive
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory with the following variables:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   ```

4. **Initialize the database**
   ```bash
   npm run db:init
   # or
   yarn db:init
   ```

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Open the application**
   Visit [http://localhost:3000](http://localhost:3000) in your browser


## Available Scripts

- `npm run dev` - Start development server
- `npm run db:init` - Initialize database

## Testing the Application

1. Visit the homepage to see available car models
2. Click on a car model to view details
3. Click "Book Test Drive" to start the booking process
4. Select location, date, and time
5. Fill in your details and confirm the booking

## API Endpoints

- `GET /api/vehicles/cars/availability` - Get vehicle availability
- `POST /api/vehicles/cars/slot-availability` - Check slot availability
- `POST /api/vehicles/cars/slot-booking` - Submit booking

## Technologies Used

- Next.js 14
- TypeScript
- SQLite3
- Tailwind CSS
- date-fns
