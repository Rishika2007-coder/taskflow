import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();

  return (
    <nav className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 px-6 py-3 flex items-center justify-between shadow-sm">
      <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
        TaskFlow
      </h1>
      <div className="flex items-center gap-4">
        <button
          onClick={toggle}
          className="text-sm border rounded-full px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 dark:border-gray-700 dark:text-white transition-colors"
        >
          {dark ? 'Light' : 'Dark'}
        </button>
        <span className="text-sm text-gray-600 dark:text-gray-400">{user?.name}</span>
        <button
          onClick={logout}
          className="text-sm text-red-500 hover:text-red-600 font-medium"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
