import { useEffect, useState } from 'react';

export default function PublicBooking() {
  const [cfg, setCfg] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [salesId, setSalesId] = useState<number|''>('');
  const [date, setDate] = useState('');
  const [dur, setDur] = useState(60);
  const [slots, setSlots] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [type, setType] = useState('fitting');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    fetch(`${base}/api/public/booking-config`)
      .then(r => r.json())
      .then(setCfg)
      .catch(() => setCfg({}));
    fetch(`${base}/api/public/staff?role=sales`).then(r=>r.json()).then(setSales).catch(()=>setSales([]));
  }, []);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    if (!salesId || !date) { setSlots([]); return; }
    const u = `${base}/api/public/availability?userId=${salesId}&date=${date}&duration=${dur}`;
    fetch(u).then(r=>r.json()).then(setSlots).catch(()=>setSlots([]));
  }, [salesId, date, dur]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/public/appointments/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, dateTime, durationMinutes, type, notes })
    });
    const data = await res.json();
    if (res.ok) {
      setResult(data);
    } else {
      alert(data.error || 'Failed to book');
    }
  };

  const brandColor = cfg?.primaryColor || '#2563eb';
  return (
    <div className="max-w-md mx-auto p-4" style={{ color: '#111' }}>
      {cfg?.logoUrl ? (
        <div className="flex items-center gap-3 mb-3">
          <img src={cfg.logoUrl} alt={cfg.businessName || 'Logo'} style={{ height: 48 }} />
          <div>
            <div className="text-xl font-bold" style={{ color: brandColor }}>{cfg.businessName || ''}</div>
            {cfg?.businessSubtitle && <div className="text-sm text-gray-600">{cfg.businessSubtitle}</div>}
          </div>
        </div>
      ) : (
        <h1 className="text-2xl font-bold mb-2" style={{ color: brandColor }}>{cfg?.businessName || 'Book an Appointment'}</h1>
      )}
      {cfg?.welcomeMessage && <p className="mb-4 text-gray-700">{cfg.welcomeMessage}</p>}
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Salesperson</label>
            <select className="border rounded px-3 py-2 w-full" value={salesId} onChange={e=>setSalesId(e.target.value ? parseInt(e.target.value,10):'')} required>
              <option value="">Select</option>
              {sales.map(s=> (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Date</label>
            <input className="border rounded px-3 py-2 w-full" type="date" value={date} onChange={e=>setDate(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Available Times</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {slots.length === 0 && <div className="text-sm text-gray-500">Select salesperson and date to view available times.</div>}
            {slots.map(ts => (
              <button type="button" key={ts} onClick={()=>setDateTime(ts.slice(0,16))} className="border rounded px-2 py-1 hover:bg-gray-50">
                {new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </button>
            ))}
          </div>
        </div>
        <input className="border rounded px-3 py-2 w-full" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required />
        <input className="border rounded px-3 py-2 w-full" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="border rounded px-3 py-2 w-full" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
        <input className="border rounded px-3 py-2 w-full" type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} required />
        <select className="border rounded px-3 py-2 w-full" value={durationMinutes} onChange={e => setDurationMinutes(parseInt(e.target.value,10))}>
          <option value={30}>30 minutes</option>
          <option value={45}>45 minutes</option>
          <option value={60}>60 minutes</option>
          <option value={90}>90 minutes</option>
        </select>
        <select className="border rounded px-3 py-2 w-full" value={type} onChange={e => setType(e.target.value)}>
          <option value="fitting">Fitting</option>
          <option value="pickup">Pickup</option>
          <option value="consultation">Consultation</option>
        </select>
        <textarea className="border rounded px-3 py-2 w-full" placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
        <button className="text-white px-4 py-2 rounded" type="submit" style={{ backgroundColor: brandColor }}>Book</button>
      </form>
      {result && (
        <div className="mt-4 p-3 border rounded bg-green-50">
          <div className="font-semibold" style={{ color: brandColor }}>Booked!</div>
          <div className="text-sm">{cfg?.successMessage || 'Use the links below to manage your appointment:'}</div>
          <ul className="text-sm list-disc pl-5 mt-2">
            <li><a className="text-blue-600 underline" href={result.rescheduleUrl} target="_blank" rel="noreferrer">Reschedule</a></li>
            <li><a className="text-blue-600 underline" href={result.cancelUrl} target="_blank" rel="noreferrer">Cancel</a></li>
          </ul>
          {(cfg?.businessAddress || cfg?.businessPhone || cfg?.businessEmail) && (
            <div className="text-xs text-gray-600 mt-3">
              {cfg?.businessAddress || ''}
              {(cfg?.businessAddress && (cfg?.businessPhone || cfg?.businessEmail)) ? ' • ' : ''}
              {cfg?.businessPhone || ''}
              {(cfg?.businessPhone && cfg?.businessEmail) ? ' • ' : ''}
              {cfg?.businessEmail || ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

