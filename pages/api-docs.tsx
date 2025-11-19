/**
 * API Documentation Page
 * Clean Swagger UI with improved layout
 */

import { GetServerSideProps } from 'next';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import 'swagger-ui-react/swagger-ui.css';
import Head from 'next/head';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocs() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading API Documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>API Documentation - Kanban Board</title>
        <style>{`
          body { margin: 0; padding: 0; }
          .swagger-ui { max-width: 100%; }
          .swagger-ui .topbar { display: none; }
          .swagger-ui .info { margin: 20px 0; }
          .swagger-ui .scheme-container { margin: 20px 0; padding: 20px; background: #fafafa; }
        `}</style>
      </Head>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-6 px-6 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Kanban Board API Documentation</h1>
            <p className="text-blue-100 text-sm mt-1">RESTful API v1 - Interactive Documentation</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 bg-white text-blue-600 rounded-md hover:bg-blue-50 transition-colors text-sm font-medium"
            >
              ← Back to App
            </a>
            <a
              href="/settings/api-keys"
              className="inline-flex items-center px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900 transition-colors text-sm font-medium"
            >
              🔑 API Keys
            </a>
          </div>
        </div>
      </div>

      {/* API Documentation */}
      <div className="max-w-7xl mx-auto px-6 py-8 bg-white min-h-screen">
        <SwaggerUI
          url="/api/v1/openapi"
          docExpansion="list"
          defaultModelsExpandDepth={1}
          defaultModelExpandDepth={1}
          displayRequestDuration={true}
          filter={true}
          showExtensions={true}
          showCommonExtensions={true}
          persistAuthorization={true}
          tryItOutEnabled={true}
          displayOperationId={false}
          deepLinking={true}
        />
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    props: {},
  };
};
