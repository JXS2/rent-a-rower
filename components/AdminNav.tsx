'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(path);
  };

  return (
    <nav className="bg-gray-800 text-white p-4 mb-8">
      <div className="max-w-7xl mx-auto flex gap-6 items-center">
        <Link 
          href="/admin" 
          className={`font-bold ${isActive('/admin') && pathname === '/admin' ? 'text-blue-400' : 'hover:text-gray-300'}`}
        >
          Dashboard
        </Link>
        <Link 
          href="/admin/dates" 
          className={isActive('/admin/dates') ? 'text-blue-400' : 'hover:text-gray-300'}
        >
          Dates
        </Link>
        <Link 
          href="/admin/roster" 
          className={isActive('/admin/roster') ? 'text-blue-400' : 'hover:text-gray-300'}
        >
          Roster
        </Link>
        <Link 
          href="/admin/bookings" 
          className={isActive('/admin/bookings') ? 'text-blue-400' : 'hover:text-gray-300'}
        >
          Bookings
        </Link>
        <Link 
          href="/admin/assignments" 
          className={isActive('/admin/assignments') ? 'text-blue-400' : 'hover:text-gray-300'}
        >
          Assignments
        </Link>
        <Link 
          href="/admin/payments" 
          className={isActive('/admin/payments') ? 'text-blue-400' : 'hover:text-gray-300'}
        >
          Payments
        </Link>
      </div>
    </nav>
  );
}
