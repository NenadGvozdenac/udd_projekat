import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-blue-700">UDD Forensics</span>
          <NavLink to="/search" className={({ isActive }) => `text-sm ${isActive ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}>
            Search
          </NavLink>
          <NavLink to="/upload" className={({ isActive }) => `text-sm ${isActive ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}>
            Upload
          </NavLink>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{user?.email}</span>
          <button onClick={logout} className="text-red-500 hover:text-red-700">Logout</button>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
