'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    // Initial check
    handleScroll();

    // Cleanup
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`bg-white p-4 sticky top-0 z-50 transition-shadow ${isScrolled ? 'shadow-md' : ''}`}>
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/">
          <span className="text-4xl font-bold text-primary-custom cursor-pointer hover:opacity-80 transition-opacity">
            Nevo
          </span>
        </Link>
      </div>
    </header>
  );
}
