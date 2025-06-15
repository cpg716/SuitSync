import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function CommissionLeaderboard() {
  const [data, setData] = useState([]);
  useEffect(() => {
    fetch('/api/commissions/leaderboard')
      .then(res => res.json())
      .then(setData);
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Commission Leaderboard</h1>
      <table className="w-full mb-8 border rounded">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            <th className="p-2 text-left">Associate</th>
            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Total Commission</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t">
              <td className="p-2">{row.associate?.name}</td>
              <td className="p-2">{row.associate?.email}</td>
              <td className="p-2">${row.totalCommission?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="text-xl font-semibold mb-2">Bar Chart</h2>
      <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.map(row => ({ name: row.associate?.name, commission: row.totalCommission }))}>
            <XAxis dataKey="name" stroke="#8884d8" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="commission" fill="#0055A5" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 