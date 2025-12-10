'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PredictionHistory {
  id: number;
  filename: string;
  file_size_bytes: number;
  duration_seconds: number;
  final_prediction: string;
  final_confidence: number;
  confidence_level: string;
  models_agree: boolean;
  predictions: {
    random_forest: { prediction: string; confidence: number };
    cnn: { prediction: string; confidence: number };
    ensemble: { prediction: string; confidence: number };
  };
  num_chunks: number;
  processing_time: number;
  created_at: string;
}

interface UserStats {
  total_predictions: number;
  bonafide_count: number;
  spoof_count: number;
  average_confidence: number;
  bonafide_percentage: number;
  spoof_percentage: number;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<PredictionHistory[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const expiresAt = localStorage.getItem('expiresAt');
    const userData = localStorage.getItem('user');

    if (!token || !expiresAt) {
      router.push('/login');
      return;
    }

    if (Date.now() > parseInt(expiresAt)) {
      localStorage.clear();
      alert('Session expired. Please login again.');
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData || '{}'));
    fetchHistory(token);
    fetchStats(token);
  }, [router]);

  const fetchHistory = async (token: string) => {
    try {
      const response = await fetch('http://localhost:8000/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.clear();
        router.push('/login');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setHistory(data.history);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (token: string) => {
    try {
      const response = await fetch('http://localhost:8000/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const getPredictionColor = (prediction: string) => {
    return prediction === 'BONAFIDE'
      ? 'bg-green-100 text-green-800 border-green-300'
      : 'bg-red-100 text-red-800 border-red-300';
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Blue Header Bar */}
      <div className="bg-blue-600 shadow-lg">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
              <span className="text-blue-600 font-bold text-xl">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-white font-semibold text-base">
                {user.full_name || user.username}
              </p>
              <p className="text-blue-100 text-sm">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="px-6 py-2.5 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition duration-200 shadow-md"
            >
              ← Back to Detector
            </Link>
            <button
              onClick={handleLogout}
              className="px-6 py-2.5 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition duration-200 flex items-center space-x-2 shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Prediction History</h1>
          <p className="text-gray-600 text-lg">View your past audio deepfake detection results</p>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 shadow-md">
              <p className="text-sm text-blue-600 font-bold uppercase">Total Predictions</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_predictions}</p>
            </div>
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 shadow-md">
              <p className="text-sm text-green-600 font-bold uppercase">Bonafide</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.bonafide_count}</p>
              <p className="text-xs text-gray-600 mt-1">{stats.bonafide_percentage}%</p>
            </div>
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 shadow-md">
              <p className="text-sm text-red-600 font-bold uppercase">Spoof</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.spoof_count}</p>
              <p className="text-xs text-gray-600 mt-1">{stats.spoof_percentage}%</p>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 shadow-md">
              <p className="text-sm text-blue-600 font-bold uppercase">Avg Confidence</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.average_confidence}%</p>
            </div>
          </div>
        )}

        {/* History List */}
        {history.length === 0 ? (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-12 text-center">
            <svg className="w-16 h-16 text-blue-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No predictions yet</h3>
            <p className="text-gray-600 mb-4">Start by uploading an audio file to detect deepfakes</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition duration-200"
            >
              Go to Detector
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <div key={item.id} className="bg-white border-2 border-blue-100 rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{item.filename}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(item.created_at).toLocaleString()} • {(item.file_size_bytes / 1024).toFixed(2)} KB • {item.duration_seconds.toFixed(2)}s
                    </p>
                  </div>
                  <div className={`px-4 py-2 rounded-lg border-2 font-bold ${getPredictionColor(item.final_prediction)}`}>
                    {item.final_prediction}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-blue-600 font-bold uppercase">Confidence</p>
                    <p className="text-2xl font-bold text-gray-900">{item.final_confidence}%</p>
                    <p className="text-xs text-gray-600">{item.confidence_level}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-bold uppercase">Random Forest</p>
                    <p className="text-sm font-semibold text-gray-900">{item.predictions.random_forest.prediction}</p>
                    <p className="text-xs text-gray-600">{item.predictions.random_forest.confidence}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-bold uppercase">CNN</p>
                    <p className="text-sm font-semibold text-gray-900">{item.predictions.cnn.prediction}</p>
                    <p className="text-xs text-gray-600">{item.predictions.cnn.confidence}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-bold uppercase">Processing Time</p>
                    <p className="text-sm font-semibold text-gray-900">{item.processing_time.toFixed(2)}s</p>
                    {item.models_agree && (
                      <p className="text-xs text-green-600 font-semibold">✓ Models Agree</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
