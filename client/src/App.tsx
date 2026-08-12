import { useEffect, useState } from 'react';

interface HealthResponse {
  status: string;
  service: string;
}

export default function App() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/health');
      if (!res.ok) {
        throw new Error(`Server error: HTTP ${res.status}`);
      }
      const data: HealthResponse = await res.json();
      setHealthData(data)
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message === 'Failed to fetch') {
          setError('Unable to connect to the backend server. Please check if the service is running.');
        } else {
          setError(error.message);
        }
      } else {
        setError('An unexpected error occurred while checking system status.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealthStatus();
  }, []);

  return (
    <div className="container mt-5 text-center">
      <h1 className="display-4 fw-bold text-primary mb-3">TokTickIT</h1>

      {/* Status Card */}
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-lg border-0">
            <div className="card-body">
              <h2 className="card-title fs-4 fw-bold mb-3">System Status</h2>

              {loading && (
                <div className="d-flex justify-content-center align-items-center mb-3">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted ms-2 mb-0">Connecting to the backend...</p>
                </div>
              )}

              {error && (
                <div className="alert alert-danger mb-3">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  <strong>Error:</strong> {error}
                </div>
              )}

              {healthData && !loading && !error && (
                <div className="text-start">
                  <p className="mb-2">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    <strong className="me-2">Status:</strong>
                    <span className={`badge ${healthData.status === 'ok' ? 'bg-success' : 'bg-warning'
                      }`}>
                      {healthData.status}
                    </span>
                  </p>
                  <p className="mb-2">
                    <i className="bi bi-server me-2"></i>
                    <strong className="me-2">Service:</strong>
                    {healthData.service}
                  </p>
                  <div className="mt-3">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      onClick={fetchHealthStatus}
                      disabled={loading}
                    >
                      <i className="bi bi-arrow-clockwise me-1"></i>
                      Check Again
                    </button>
                  </div>
                </div>
              )}

              {!healthData && !loading && !error && (
                <div className="text-center py-4">
                  <p className="text-muted">No health data available</p>
                  <button
                    className="btn btn-primary"
                    onClick={fetchHealthStatus}
                    disabled={loading}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    Check Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}