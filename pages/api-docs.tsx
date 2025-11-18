/**
 * API Documentation Page
 * Interactive Swagger UI for API v1
 */

import { GetServerSideProps } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocs() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading API Documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-6 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Kanban Board API Documentation</h1>
          <p className="text-blue-100">RESTful API v1 - Interactive Documentation</p>
          <div className="mt-4 flex gap-4 flex-wrap">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 bg-white text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            >
              ← Back to App
            </Link>
            <Link
              href="/settings/api-keys"
              className="inline-flex items-center px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900 transition-colors"
            >
              🔑 Manage API Keys
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            🚀 Quick Start
          </h2>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p><strong>Base URL:</strong> <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded">http://localhost:3000/api/v1</code></p>
            <p><strong>Authentication:</strong> Bearer Token (API Key)</p>
            <p><strong>Get API Key:</strong> Go to Settings → API Keys → Generate New Key</p>
            <p><strong>Usage:</strong> <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded">Authorization: Bearer sk_live_...</code></p>
          </div>
        </div>

        {/* Swagger UI */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <SwaggerUI
            url="/api/v1/openapi"
            docExpansion="list"
            defaultModelsExpandDepth={1}
            displayRequestDuration={true}
            filter={true}
            persistAuthorization={true}
            tryItOutEnabled={true}
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
          <p>Kanban Board API v1.0.0</p>
          <p className="text-sm mt-2">
            Generated from OpenAPI 3.0 specification
          </p>
        </div>
      </footer>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
};
