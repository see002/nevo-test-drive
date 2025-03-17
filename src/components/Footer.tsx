export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white p-4 mt-auto">
      <div className="container mx-auto text-center text-gray-600">
        <p className="text-sm">
          © {currentYear} Nevo. All rights reserved.
        </p>
      </div>
    </footer>
  );
} 