import { NextPageContext } from 'next';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  statusCode?: number;
  hasGetInitialProps?: boolean;
  err?: Error;
}

function Error({ statusCode, hasGetInitialProps, err }: ErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {statusCode ? `Error ${statusCode}` : 'Application Error'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {statusCode === 404
              ? 'The page you are looking for could not be found.'
              : statusCode
              ? 'A server error occurred.'
              : 'An error occurred on the client.'}
          </p>

          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </button>

            <Link
              href="/"
              className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Link>
          </div>

          {process.env.NODE_ENV === 'development' && err && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Error Details (Development)
              </summary>
              <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono overflow-auto">
                <div className="text-red-600 dark:text-red-400 font-semibold">
                  {err.name}: {err.message}
                </div>
                {err.stack && (
                  <pre className="mt-2 text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                    {err.stack}
                  </pre>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;