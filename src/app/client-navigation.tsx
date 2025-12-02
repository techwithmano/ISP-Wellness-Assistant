'use client';

import React from 'react';
import Link from 'next/link';
import { useState } from 'react';
import ThemeSwitcher from '@/components/ThemeSwitcher';
import {
  FaHeartbeat,
  FaBars,
  FaTimes,
  FaHome,
  FaInfoCircle,
  FaEnvelope,
  FaStethoscope,
} from 'react-icons/fa';

// Toggle this flag to hide/show navigation
const COMING_SOON_MODE = true;

const navItems = [
  { href: '/', icon: <FaHome />, label: 'Home' },
  { href: '/about', icon: <FaInfoCircle />, label: 'About' },
  { href: '/contact', icon: <FaEnvelope />, label: 'Contact' },
];

export default function ClientNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen((s) => !s);
  const closeMenu = () => setIsMenuOpen(false);

  if (COMING_SOON_MODE) {
    return null;
  }

  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md shadow-md">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center space-x-2" aria-label="Medical Diagnosis System Home">
          <FaHeartbeat size={24} />
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            Medical Diagnosis System
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden sm:flex items-center space-x-6">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center space-x-1 text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition"
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
          <Link
            href="/ManoMedai"
            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-full font-medium shadow hover:bg-blue-700 transition"
          >
            MDS
          </Link>
          <ThemeSwitcher />
        </nav>

        {/* Mobile Toggle */}
        <div className="sm:hidden flex items-center space-x-3">
          <ThemeSwitcher />
          <button
            aria-label="Toggle menu"
            onClick={toggleMenu}
            className="p-2 text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition"
          >
            {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div className="absolute top-full left-0 w-full bg-white dark:bg-black shadow-md animate-slideDown z-50">
            <div className="flex flex-col space-y-4 p-6">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={closeMenu}
                  className="flex items-center space-x-3 text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
              <Link
                href="/ManoMedai"
                onClick={closeMenu}
                className="flex items-center space-x-3 px-4 py-2 bg-blue-600 text-white rounded-full transition"
              >
                <FaStethoscope />
                <span>MDS</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
