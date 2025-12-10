'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/api';

interface PredictionResult {
  filename: string;
  file_size_bytes: number;
  duration_seconds: number;
  num_chunks: number;
  predictions: {
    random_forest: ModelPrediction;
    cnn: ModelPrediction;
    ensemble: ModelPrediction;
  };
  final_prediction: string;
  final_confidence: number;
  confidence_level: string;
  models_agree: boolean;
}

interface ModelPrediction {
  prediction: string;
  confidence: number;
  probabilities: {
    spoof: number;
    bonafide: number;
  };
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Check authentication on mount
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

    // Check token expiry every minute
    const interval = setInterval(() => {
      const currentExpiresAt = localStorage.getItem('expiresAt');
      if (currentExpiresAt && Date.now() > parseInt(currentExpiresAt)) {
        localStorage.clear();
        alert('Session expired after 2 hours. Please login again.');
        router.push('/login');
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select an audio file');
      return;
    }

    // Check token before making request
    const token = localStorage.getItem('token');
    const expiresAt = localStorage.getItem('expiresAt');

    if (!token) {
      router.push('/login');
      return;
    }

    if (expiresAt && Date.now() > parseInt(expiresAt)) {
      localStorage.clear();
      alert('Session expired. Please login again.');
      router.push('/login');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.status === 401) {
        localStorage.clear();
        alert('Session expired. Please login again.');
        router.push('/login');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Prediction failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during prediction');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 75) return 'text-blue-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getPredictionColor = (prediction: string) => {
    return prediction === 'BONAFIDE' 
      ? 'bg-green-50 text-green-700 border-green-200' 
      : 'bg-red-50 text-red-700 border-red-200';
  };

  // Don't render if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* User Info & Logout Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {user.full_name || user.username}
              </p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition duration-200 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Audio Deepfake Detector
          </h1>
          <p className="text-slate-600 text-lg">
            Upload an audio file to detect AI-generated deepfakes using ensemble ML models
          </p>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Select Audio File
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".wav,.mp3,.flac,.ogg,.m4a,.opus"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-3 file:px-6
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-slate-900 file:text-white
                    hover:file:bg-slate-800
                    file:cursor-pointer cursor-pointer
                    transition-all duration-200"
                />
              </div>
              {file && (
                <p className="mt-3 text-sm text-slate-600">
                  Selected: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full bg-slate-900 text-white py-4 px-6 rounded-lg font-semibold
                hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed
                transition-all duration-200 shadow-lg hover:shadow-xl
                transform hover:-translate-y-0.5"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing Audio...
                </span>
              ) : (
                'Detect Deepfake'
              )}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-fadeIn">
            {/* Final Prediction Card */}
            <div className={`rounded-2xl shadow-xl p-8 border-2 ${getPredictionColor(result.final_prediction)}`}>
              <div className="text-center">
                <p className="text-sm font-semibold uppercase tracking-wide mb-2">Final Prediction</p>
                <h2 className="text-4xl font-bold mb-2">{result.final_prediction}</h2>
                <p className={`text-2xl font-semibold ${getConfidenceColor(result.final_confidence)}`}>
                  {result.final_confidence}% Confidence
                </p>
                <p className="text-sm mt-2 opacity-80">
                  {result.confidence_level} Confidence Level
                </p>
                {result.models_agree && (
                  <div className="mt-4 inline-flex items-center px-4 py-2 bg-white/50 rounded-full text-sm font-medium">
                    All Models Agree
                  </div>
                )}
              </div>
            </div>

            {/* Audio Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Audio Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Filename</p>
                  <p className="text-sm font-medium text-slate-900 mt-1 truncate">{result.filename}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Duration</p>
                  <p className="text-sm font-medium text-slate-900 mt-1">{result.duration_seconds.toFixed(2)}s</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">File Size</p>
                  <p className="text-sm font-medium text-slate-900 mt-1">{(result.file_size_bytes / 1024).toFixed(2)} KB</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Chunks</p>
                  <p className="text-sm font-medium text-slate-900 mt-1">{result.num_chunks}</p>
                </div>
              </div>
            </div>

            {/* Model Predictions */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Model Predictions</h3>
              <div className="space-y-4">
                {/* Random Forest */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-slate-900">Random Forest</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        {result.predictions.random_forest.prediction}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getConfidenceColor(result.predictions.random_forest.confidence)}`}>
                      {result.predictions.random_forest.confidence}%
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">Spoof: </span>
                      <span className="font-medium">{(result.predictions.random_forest.probabilities.spoof * 100).toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Bonafide: </span>
                      <span className="font-medium">{(result.predictions.random_forest.probabilities.bonafide * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                {/* CNN */}
                <div className="border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-slate-900">CNN (Deep Learning)</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        {result.predictions.cnn.prediction}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getConfidenceColor(result.predictions.cnn.confidence)}`}>
                      {result.predictions.cnn.confidence}%
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">Spoof: </span>
                      <span className="font-medium">{(result.predictions.cnn.probabilities.spoof * 100).toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Bonafide: </span>
                      <span className="font-medium">{(result.predictions.cnn.probabilities.bonafide * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                {/* Ensemble */}
                <div className="border-2 border-slate-300 rounded-lg p-4 bg-slate-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-slate-900">Ensemble (Combined)</h4>
                      <p className="text-sm text-slate-600 mt-1">
                        {result.predictions.ensemble.prediction}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getConfidenceColor(result.predictions.ensemble.confidence)}`}>
                      {result.predictions.ensemble.confidence}%
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">Spoof: </span>
                      <span className="font-medium">{(result.predictions.ensemble.probabilities.spoof * 100).toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Bonafide: </span>
                      <span className="font-medium">{(result.predictions.ensemble.probabilities.bonafide * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
