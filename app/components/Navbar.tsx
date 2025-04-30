"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white w-full" role="banner">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="https://www.paylatertravel.com.au/" className="flex items-center" aria-label="home">
          <div className="flex items-center">
            <img 
              src="https://cdn.prod.website-files.com/67eb810caa88c4e6c7adca60/67eb810caa88c4e6c7adcafe_Logo.svg" 
              alt="Untitled UI logotext" 
              className="h-8"
            />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className={`hidden md:flex items-center space-x-8`}>
          <Link href="https://www.paylatertravel.com.au/about-us" className="text-gray-700 hover:text-gray-900">About Us</Link>
          <Link href="https://www.paylatertravel.com.au/testimonials" className="text-gray-700 hover:text-gray-900">Testimonials</Link>
          <Link href="https://www.paylatertravel.com.au/how-it-works" className="text-gray-700 hover:text-gray-900">How It Works</Link>
          <Link href="https://www.paylatertravel.com.au/offers" className="text-gray-700 hover:text-gray-900">Offers</Link>
          <Link href="https://www.paylatertravel.com.au/refer" className="text-gray-700 hover:text-gray-900">Refer A Friend</Link>
          <Link href="https://help.paylatertravel.com/au/" className="text-gray-700 hover:text-gray-900">FAQ</Link>
          <Link 
            href="https://app.paylatertravel.com.au/login" 
            className="bg-[#c1ff72] text-black px-6 py-2 rounded-full hover:bg-[#a8e665]"
          >
            Login
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <div className="w-6 h-5 relative flex flex-col justify-between">
            <span className={`w-full h-0.5 bg-black transition-all ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
            <span className={`w-full h-0.5 bg-black transition-all ${isMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`w-full h-0.5 bg-black transition-all ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
          </div>
        </button>

        {/* Mobile Navigation */}
        <div className={`md:hidden fixed inset-0 bg-white z-50 transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4">
            <button 
              className="absolute top-4 right-4"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Close menu"
            >
              ✕
            </button>
            <div className="flex flex-col space-y-4 mt-12">
              <Link href="/about-us" className="text-gray-700 hover:text-gray-900 py-2">About Us</Link>
              <Link href="/testimonials" className="text-gray-700 hover:text-gray-900 py-2">Testimonials</Link>
              <Link href="/how-it-works" className="text-gray-700 hover:text-gray-900 py-2">How It Works</Link>
              <Link href="/offers" className="text-gray-700 hover:text-gray-900 py-2">Offers</Link>
              <Link href="/refer" className="text-gray-700 hover:text-gray-900 py-2">Refer A Friend</Link>
              <Link href="/faq" className="text-gray-700 hover:text-gray-900 py-2">FAQ</Link>
              <Link 
                href="https://app.paylatertravel.com.au/login" 
                className="bg-[#c1ff72] text-black px-6 py-2 rounded-full hover:bg-[#a8e665] text-center"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 