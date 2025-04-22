import { redirect } from 'next/navigation';

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Efacture
        </h1>
        <p className="text-xl text-gray-600">
          Your electronic invoice management solution
        </p>
      </section>

      <section className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Authentication
          </h2>
          <p className="text-gray-600 mb-4">
            Securely authenticate with your Cecurity account to manage your invoices.
          </p>
          <a
            href="/authenticate"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Go to Authentication
          </a>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            File Upload
          </h2>
          <p className="text-gray-600 mb-4">
            Upload and manage your electronic invoices with ease.
          </p>
          <a
            href="/authenticate/upload"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Upload Files
          </a>
        </div>
      </section>
    </div>
  );
}
