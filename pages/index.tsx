function QuickLink({ href, label }) {
  return (
    <Link href={href} className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded transition">
      {label}
    </Link>
  );
} 

<Badge className="flex-shrink-0">{a.type}</Badge>
<Badge className="flex-shrink-0">{a.status}</Badge>
<StatCard title="Total Parties" value={metrics ? metrics.parties.length : null} link="/parties" icon={<span />} />
<StatCard title="Upcoming Appointments" value={metrics ? metrics.appts.length : null} link="/appointments" icon={<span />} />
<StatCard title="Pending Alterations" value={metrics ? alterationsArr.filter(a => a.status === 'pending').length : null} link="/alterations" icon={<span />} />
<StatCard title="Top Commission" value={metrics ? `$${Math.max(0, ...salesBar.map(c => c.sales || 0)).toFixed(2)}` : null} link="/sales" icon={<span />} /> 