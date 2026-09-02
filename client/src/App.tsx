import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';

import { RequesterProvider } from "./context/RequesterContext";
import { RequesterGuard } from "./components/RequesterGuard";
import { RequesterSelection } from "./pages/RequesterSelection";

interface HealthResponse {
  status: string;
  service: string;
}

interface Category {
  id: number;
  name: string;
}

type SystemState = 'idle' | 'loading' | 'success' | 'error';

export default function App() {
  const [state, setState] = useState<SystemState>('idle');
  const [categories, setCategories] = useState<Category[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCheckSystem = async () => {
    setState('loading');
    setErrorMessage(null);

    try {
      const [healthRes, categoriesRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/categories'),
      ]);

      if (!healthRes.ok || !categoriesRes.ok) {
        throw new Error('Unable to connect to TokTickIT API');
      }

      const healthData: HealthResponse = await healthRes.json();
      const categoriesData: Category[] = await categoriesRes.json();

      if (healthData.status !== 'ok') {
        throw new Error('Unable to connect to TokTickIT API');
      }

      setCategories(categoriesData);
      setState('success');
    } catch {
      setErrorMessage('Unable to connect to TokTickIT API');
      setState('error');
    }
  };

  return (
    <RequesterProvider>
      <Routes>
        {/* หน้าเลือก Requester */}
        <Route path="/select-requester" element={<RequesterSelection />} />

        <Route
          path="/"
          element={
            <div className="container mt-5 text-center mb-5" style={{ maxWidth: 480 }}>
              <h1 className="display-4 fw-bold mb-4">TokTickIT</h1>

              <button
                className="btn btn-primary btn-lg mb-4"
                onClick={handleCheckSystem}
                disabled={state === 'loading'}
              >
                Check System
              </button>

              {state === 'loading' && (
                <div
                  className="alert alert-secondary d-flex justify-content-center align-items-center"
                  data-testid="loading-state"
                >
                  <div className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  loading...
                </div>
              )}

              {state === 'error' && (
                <div className="alert alert-danger text-start" data-testid="error-state">
                  <p className="mb-0">
                    <strong>System Status: Offline</strong>
                  </p>
                  <p className="mb-0">{errorMessage}</p>
                </div>
              )}

              {state === 'success' && (
                <div className="text-start">
                  <div className="alert alert-success" data-testid="success-state">
                    <strong>System Status: Online</strong>
                  </div>

                  <h2 className="fs-5 fw-bold">Supported Request Categories</h2>
                  <ul className="list-group mb-3" data-testid="category-list">
                    {categories.map((cat) => (
                      <li key={cat.id} className="list-group-item">
                        {cat.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          }
        />

        {/* ตัวอย่าง Route ที่ต้องผ่าน RequesterGuard ในอนาคต */}
        {/* 
        <Route 
          path="/my-tickets" 
          element={
            <RequesterGuard>
              <div>My Tickets Page</div>
            </RequesterGuard>
          } 
        /> 
        */}
      </Routes>
    </RequesterProvider>
  );
}