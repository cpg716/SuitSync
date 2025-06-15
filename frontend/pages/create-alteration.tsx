import AlterationTagEditor from '../components/AlterationTagEditor';
import { useRouter } from 'next/router';

export default function CreateAlterationPage() {
  const router = useRouter();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">New Alteration Tag</h1>
      <AlterationTagEditor
        onSave={async (data) => {
          await fetch('/api/alterations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          router.push('/alterations');
        }}
      />
    </div>
  );
}