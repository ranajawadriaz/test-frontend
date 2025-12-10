'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      const response = await fetch('http://localhost:8000/predict', {
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-700">Checking authentication...</p>
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
              href="/history"
              className="px-6 py-2.5 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition duration-200 flex items-center space-x-2 shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>History</span>
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
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Audio Deepfake Detector
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Upload an audio file to detect AI-generated deepfakes using ensemble ML models
          </p>
        </div>

        {/* Upload Form */}
        <div className="bg-white border-2 border-blue-100 rounded-2xl shadow-xl p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-3">
                Select Audio File
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".wav,.mp3,.flac,.ogg,.m4a,.opus"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-600
                    file:mr-4 file:py-3 file:px-6
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-600 file:text-white
                    hover:file:bg-blue-700
                    file:cursor-pointer cursor-pointer
                    transition-all duration-200"
                />
              </div>
              {file && (
                <p className="mt-3 text-sm text-gray-700">
                  Selected: <span className="font-semibold">{file.name}</span> ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-bold text-base
                hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed
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
            <div className="mt-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
              <p className="text-red-700 text-sm font-semibold">{error}</p>
            </div>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-6 animate-fadeIn">
            {/* Final Prediction Card */}
            <div className={`rounded-2xl shadow-xl p-8 border-4 ${getPredictionColor(result.final_prediction)}`}>
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
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">Audio Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold">Filename</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1 truncate">{result.filename}</p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold">Duration</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{result.duration_seconds.toFixed(2)}s</p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold">File Size</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{(result.file_size_bytes / 1024).toFixed(2)} KB</p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 uppercase tracking-wide font-semibold">Chunks</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{result.num_chunks}</p>
                </div>
              </div>
            </div>

            {/* Model Predictions */}
            <div className="bg-white border-2 border-blue-100 rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-4 text-lg">Model Predictions</h3>
              <div className="space-y-4">
                {/* Random Forest */}
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-white">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-gray-900">Random Forest</h4>
                      <p className="text-sm text-gray-700 mt-1 font-semibold">
                        {result.predictions.random_forest.prediction}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getConfidenceColor(result.predictions.random_forest.confidence)}`}>
                      {result.predictions.random_forest.confidence}%
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-gray-600 font-semibold">Spoof: </span>
                      <span className="font-bold text-gray-900">{(result.predictions.random_forest.probabilities.spoof * 100).toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600 font-semibold">Bonafide: </span>
                      <span className="font-bold text-gray-900">{(result.predictions.random_forest.probabilities.bonafide * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                {/* CNN */}
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-white">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-gray-900">CNN (Deep Learning)</h4>
                      <p className="text-sm text-gray-700 mt-1 font-semibold">
                        {result.predictions.cnn.prediction}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getConfidenceColor(result.predictions.cnn.confidence)}`}>
                      {result.predictions.cnn.confidence}%
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-gray-600 font-semibold">Spoof: </span>
                      <span className="font-bold text-gray-900">{(result.predictions.cnn.probabilities.spoof * 100).toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600 font-semibold">Bonafide: </span>
                      <span className="font-bold text-gray-900">{(result.predictions.cnn.probabilities.bonafide * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                {/* Ensemble */}
                <div className="border-2 border-blue-400 rounded-lg p-4 bg-blue-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-gray-900">Ensemble (Combined)</h4>
                      <p className="text-sm text-gray-700 mt-1 font-semibold">
                        {result.predictions.ensemble.prediction}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getConfidenceColor(result.predictions.ensemble.confidence)}`}>
                      {result.predictions.ensemble.confidence}%
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-gray-600 font-semibold">Spoof: </span>
                      <span className="font-bold text-gray-900">{(result.predictions.ensemble.probabilities.spoof * 100).toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600 font-semibold">Bonafide: </span>
                      <span className="font-bold text-gray-900">{(result.predictions.ensemble.probabilities.bonafide * 100).toFixed(2)}%</span>
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
