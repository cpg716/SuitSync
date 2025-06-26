import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../src/AuthContext';
import Button from '../components/ui/Button';

const ITEMS_PER_PAGE = 10;

export default function SalesWorkspace() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [myCommissions, setMyCommissions] = useState([]);
  const [allCommissions, setAllCommissions] = useState([]);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [page, setPage] = useState(1);
  const [myPage, setMyPage] = useState(1);
  const [adminPage, setAdminPage] = useState(1);

  useEffect(() => {
    fetch('/api/commissions/leaderboard')
      .then(res => res.json())
      .then(setData);
    if (user?.role === 'admin') {
      fetch(`/api/commissions/all?month=${month}`)
        .then(res => res.json())
        .then(setAllCommissions);
    } else if (user) {
      fetch(`/api/commissions/mine?month=${month}`)
        .then(res => res.json())
        .then(setMyCommissions);
    }
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

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 md:px-8 lg:px-12 xl:px-16" style={{ paddingLeft: '6vw', paddingRight: '6vw' }}>
      <div className="pt-2 pb-4">
        <h1 className="text-3xl font-bold mb-2 text-accent">Sales</h1>
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">Commissions are paid on the <b>first Thursday</b> of each month for the prior month.</span>
          <div>
            <label className="text-sm font-medium mr-2">Month:</label>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="border rounded px-2 py-1" />
          </div>
        </div>
      </div>
      <h2 className="text-xl font-semibold mb-2 text-accent">Leaderboard</h2>
      <div className="bg-white dark:bg-gray-900 p-4 rounded shadow mb-4">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={pagedLeaderboard.map(row => ({ name: row.associate?.name, sales: row.totalSales }))}>
            <XAxis dataKey="name" stroke="#00AFB9" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="sales" fill="#00AFB9" />
          </BarChart>
        </ResponsiveContainer>
        {/* Pagination controls for leaderboard */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-2">
            <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <Button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        )}
      </div>
      {isAdmin ? (
        <div>
          <h2 className="text-xl font-semibold mb-2 text-accent">All Staff Commissions ({month})</h2>
          <div className="overflow-x-auto">
            <table className="w-full mb-2 border rounded bg-white dark:bg-gray-900 text-black dark:text-white">
              <thead>
                <tr className="bg-accent text-white">
                  <th className="p-2 text-left">Associate</th>
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Commission</th>
                  <th className="p-2 text-left">Sales Total</th>
                </tr>
              </thead>
              <tbody>
                {pagedAllCommissions.map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{row.associate?.name}</td>
                    <td className="p-2">{row.associate?.email}</td>
                    <td className="p-2 text-accent font-semibold">${row.commission?.toFixed(2)}</td>
                    <td className="p-2">${row.salesTotal?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination controls for all staff commissions */}
            {adminTotalPages > 1 && (
              <div className="flex justify-between items-center mt-2 mb-2">
                <Button onClick={() => setAdminPage(p => Math.max(1, p - 1))} disabled={adminPage === 1}>Previous</Button>
                <span className="text-sm">Page {adminPage} of {adminTotalPages}</span>
                <Button onClick={() => setAdminPage(p => Math.min(adminTotalPages, p + 1))} disabled={adminPage === adminTotalPages}>Next</Button>
              </div>
            )}
          </div>
        </div>
      ) : user ? (
        <div>
          <h2 className="text-xl font-semibold mb-2 text-accent">My Commissions ({month})</h2>
          <div className="overflow-x-auto">
            <table className="w-full mb-2 border rounded bg-white dark:bg-gray-900 text-black dark:text-white">
              <thead>
                <tr className="bg-accent text-white">
                  <th className="p-2 text-left">Sale</th>
                  <th className="p-2 text-left">Amount</th>
                  <th className="p-2 text-left">Commission</th>
                </tr>
              </thead>
              <tbody>
                {pagedMyCommissions.map((row, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{row.saleId}</td>
                    <td className="p-2">${row.amount?.toFixed(2)}</td>
                    <td className="p-2 text-accent font-semibold">${row.commission?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination controls for my commissions */}
            {myTotalPages > 1 && (
              <div className="flex justify-between items-center mt-2 mb-2">
                <Button onClick={() => setMyPage(p => Math.max(1, p - 1))} disabled={myPage === 1}>Previous</Button>
                <span className="text-sm">Page {myPage} of {myTotalPages}</span>
                <Button onClick={() => setMyPage(p => Math.min(myTotalPages, p + 1))} disabled={myPage === myTotalPages}>Next</Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
} 