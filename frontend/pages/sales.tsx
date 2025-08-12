import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../src/AuthContext';
import { Button } from '../components/ui/Button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Skeleton } from '../components/ui/Skeleton';
import { apiFetch } from '../lib/apiClient';

const ITEMS_PER_PAGE = 10;

export default function SalesWorkspace() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [myCommissions, setMyCommissions] = useState([]);
  const [allCommissions, setAllCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [page, setPage] = useState(1);
  const [myPage, setMyPage] = useState(1);
  const [adminPage, setAdminPage] = useState(1);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        // Fetch leaderboard data
        const leaderboardRes = await apiFetch('/api/commissions/leaderboard');
        if (leaderboardRes.status === 401) {
          // User not authenticated, redirect to login
          window.location.href = '/login';
          return;
        }
        if (leaderboardRes.status === 404) {
          // Endpoint not implemented, use empty data
          setData([]);
        } else if (!leaderboardRes.ok) {
          throw new Error('Failed to fetch leaderboard');
        } else {
          const leaderboardData = await leaderboardRes.json();
          setData(leaderboardData);
        }

        // Fetch commission data based on user role
        if (user.role === 'admin') {
          const commissionsRes = await apiFetch(`/api/commissions/all?month=${month}`);
          if (commissionsRes.status === 404) {
            setAllCommissions([]);
          } else if (!commissionsRes.ok) {
            throw new Error('Failed to fetch commissions');
          } else {
            const commissionsData = await commissionsRes.json();
            setAllCommissions(commissionsData);
          }
        } else {
          const myCommissionsRes = await apiFetch(`/api/commissions/mine?month=${month}`);
          if (myCommissionsRes.status === 404) {
            setMyCommissions([]);
          } else if (!myCommissionsRes.ok) {
            throw new Error('Failed to fetch my commissions');
          } else {
            const myCommissionsData = await myCommissionsRes.json();
            setMyCommissions(myCommissionsData);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sales data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, month]);

  const isAdmin = user?.role === 'admin';

  // Pagination logic
  const pagedLeaderboard = data.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const pagedMyCommissions = myCommissions.slice((myPage - 1) * ITEMS_PER_PAGE, myPage * ITEMS_PER_PAGE);
  const pagedAllCommissions = allCommissions.slice((adminPage - 1) * ITEMS_PER_PAGE, adminPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const myTotalPages = Math.ceil(myCommissions.length / ITEMS_PER_PAGE);
  const adminTotalPages = Math.ceil(allCommissions.length / ITEMS_PER_PAGE);

  // Set Sales title in Appbar (if using context or prop, otherwise add here)
  if (typeof window !== 'undefined') {
    document.title = 'Sales | SuitSync';
  }

  if (loading) {
    return (
      <div className="w-full space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-12">
        <div className="text-red-600 dark:text-red-400 text-center">
          <h3 className="text-lg font-semibold mb-2">Error Loading Sales Data</h3>
          <p className="text-sm mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <span className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Note:</strong> Commissions are paid on the <strong>first Thursday</strong> of each month for the prior month.
        </span>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Month:</label>
          <input 
            type="month" 
            value={month} 
            onChange={e => setMonth(e.target.value)} 
            className="border border-gray-300 dark:border-gray-600 rounded px-3 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      
      {/* Sales Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Sales Leaderboard</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={pagedLeaderboard.map(row => ({ name: row.associate?.name, sales: row.totalSales, associate: row.associate }))}>
            <XAxis dataKey="name" stroke="#6b7280" className="dark:stroke-gray-400" />
            <YAxis stroke="#6b7280" className="dark:stroke-gray-400" />
            <Tooltip content={({ payload }) => {
              const p = Array.isArray(payload) && payload.length ? payload[0].payload : null;
              return p ? (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md p-2 text-sm">
                  <div className="flex items-center gap-2">
                    {p.associate ? <UserAvatar user={{ id: p.associate.id, name: p.associate.name }} size="xs" showName /> : <span>{p.name}</span>}
                  </div>
                  <div className="mt-1">Sales: ${p.sales}</div>
                </div>
              ) : null;
            }} />
            <Bar dataKey="sales" fill="#0055A5" />
          </BarChart>
        </ResponsiveContainer>
        {/* Pagination controls for leaderboard */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} variant="outline">
              Previous
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">Page {page} of {totalPages}</span>
            <Button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} variant="outline">
              Next
            </Button>
          </div>
        )}
      </div>
      
      {/* Commission Tables */}
      {isAdmin ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">All Staff Commissions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Associate</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Commission</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Sales Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {pagedAllCommissions.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{row.associate?.name}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{row.associate?.email}</td>
                    <td className="px-6 py-4 text-primary dark:text-accent font-semibold">${row.commission?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100">${row.salesTotal?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination controls for all staff commissions */}
          {adminTotalPages > 1 && (
            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <Button onClick={() => setAdminPage(p => Math.max(1, p - 1))} disabled={adminPage === 1} variant="outline">
                Previous
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">Page {adminPage} of {adminTotalPages}</span>
              <Button onClick={() => setAdminPage(p => Math.min(adminTotalPages, p + 1))} disabled={adminPage === adminTotalPages} variant="outline">
                Next
              </Button>
            </div>
          )}
        </div>
      ) : user ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">My Commissions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Sale</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {pagedMyCommissions.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{row.saleId}</td>
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100">${row.amount?.toFixed(2)}</td>
                    <td className="px-6 py-4 text-primary dark:text-accent font-semibold">${row.commission?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination controls for my commissions */}
          {myTotalPages > 1 && (
            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <Button onClick={() => setMyPage(p => Math.max(1, p - 1))} disabled={myPage === 1} variant="outline">
                Previous
              </Button>
              <span className="text-sm text-gray-600 dark:text-gray-400">Page {myPage} of {myTotalPages}</span>
              <Button onClick={() => setMyPage(p => Math.min(myTotalPages, p + 1))} disabled={myPage === myTotalPages} variant="outline">
                Next
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
} 