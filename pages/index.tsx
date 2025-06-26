function QuickLink({ href, label }) {
  return (
    <Link href={href} className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded transition">
      {label}
    </Link>
  );
} 