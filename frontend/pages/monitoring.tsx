import React from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Layout from '@/components/Layout';
import MonitoringDashboard from '@/components/MonitoringDashboard';
import { useAuth } from '../src/AuthContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function MonitoringPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">You need admin privileges to access this page.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>System Monitoring - SuitSync</title>
        <meta name="description" content="System monitoring and performance metrics" />
      </Head>
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <MonitoringDashboard />
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {},
  };
};
