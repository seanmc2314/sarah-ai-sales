'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Agent {
  id: string;
  name: string;
  slug: string;
  description: string;
  persona: string;
  targetAudience: string;
  products: any;
  active: boolean;
  color: string;
  icon: string;
  createdAt: string;
  _count: {
    prospects: number;
    campaigns: number;
    emailTemplates: number;
    followUpSequences: number;
  };
}

export default function AgentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      if (!response.ok) throw new Error('Failed to fetch agents');
      const data = await response.json();
      setAgents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching agents');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Sales Agents</h1>
            <p className="text-gray-600 mt-2">
              Manage your multi-agent sales automation system
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {agents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No agents configured yet
            </h3>
            <p className="text-gray-600 mb-6">
              Run the seed script to create your two sales agents
            </p>
            <code className="bg-gray-100 px-4 py-2 rounded text-sm">
              npx tsx scripts/seed-agents.ts
            </code>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-white rounded-lg shadow-sm border-2 hover:shadow-md transition-shadow"
                style={{ borderColor: agent.color }}
              >
                <div
                  className="p-6 rounded-t-lg"
                  style={{ backgroundColor: `${agent.color}10` }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{agent.icon}</div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          {agent.name}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                          {agent.slug}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        agent.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {agent.active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-gray-700 mb-4">{agent.description}</p>

                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-sm text-gray-700 mb-2">
                      Target Audience
                    </h4>
                    <p className="text-sm text-gray-600">{agent.targetAudience}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {agent._count.prospects}
                      </div>
                      <div className="text-sm text-gray-600">Prospects</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {agent._count.campaigns}
                      </div>
                      <div className="text-sm text-gray-600">Campaigns</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {agent._count.emailTemplates}
                      </div>
                      <div className="text-sm text-gray-600">Email Templates</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {agent._count.followUpSequences}
                      </div>
                      <div className="text-sm text-gray-600">Sequences</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        router.push(`/dashboard/agents/${agent.id}/prospects`)
                      }
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      View Prospects
                    </button>
                    <button
                      onClick={() =>
                        router.push(`/dashboard/agents/${agent.id}/campaigns`)
                      }
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Campaigns
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/dashboard/prospects')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="text-2xl mb-2">👥</div>
              <div className="font-semibold text-gray-900">Import Prospects</div>
              <div className="text-sm text-gray-600">
                Add prospects from CSV or LinkedIn
              </div>
            </button>
            <button
              onClick={() => router.push('/dashboard/campaigns')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left"
            >
              <div className="text-2xl mb-2">📧</div>
              <div className="font-semibold text-gray-900">Create Campaign</div>
              <div className="text-sm text-gray-600">
                Launch LinkedIn or email outreach
              </div>
            </button>
            <button
              onClick={() => window.open('/api-docs', '_blank')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
            >
              <div className="text-2xl mb-2">📖</div>
              <div className="font-semibold text-gray-900">API Documentation</div>
              <div className="text-sm text-gray-600">
                View API endpoints and integration
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
