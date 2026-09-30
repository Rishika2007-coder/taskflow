import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

interface Board {
  id: string;
  title: string;
  createdAt: string;
}

export default function Boards() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchBoards = async () => {
    try {
      const res = await api.get('/boards');
      setBoards(res.data);
    } catch {
      setError('Failed to load boards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBoards(); }, []);

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/boards', { title });
      setBoards([res.data, ...boards]);
      setTitle('');
    } catch {
      setError('Failed to create board');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold dark:text-white">Your Boards</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Welcome back, {user?.name}</p>
          </div>
        </div>

        <form onSubmit={createBoard} className="flex gap-3 mb-8 max-w-md">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New board title..."
            className="flex-1 border dark:border-gray-700 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:bg-gray-800 dark:text-white"
            required
          />
          <button
            type="submit"
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            Create
          </button>
        </form>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {boards.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 dark:text-gray-500 text-lg">No boards yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {boards.map((board) => (
              <Link
                key={board.id}
                to={`/boards/${board.id}`}
                className="group bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-5 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200"
              >
                <h2 className="font-semibold text-lg dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {board.title}
                </h2>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                  Created {new Date(board.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
