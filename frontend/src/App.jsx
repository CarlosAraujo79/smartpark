import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CameraPage from './components/CameraPage';
import WhitelistPage from './components/WhitelistPage';
import LogsPage from './components/LogsPage';
import ToastContainer from './components/Toast';

const API = 'http://localhost:8000';

const PAGE_TITLES = {
  dashboard: { title: 'Dashboard', subtitle: 'Visão geral do estacionamento' },
  camera:    { title: 'Câmera / Detecção', subtitle: 'Capture ou envie uma imagem para detectar placas' },
  whitelist: { title: 'Lista de Acesso', subtitle: 'Gerencie quais placas têm acesso permitido' },
  logs:      { title: 'Histórico', subtitle: 'Todas as detecções desta sessão' },
};

let toastId = 0;

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [spots, setSpots] = useState(Array(30).fill(null));
  const [whitelist, setWhitelist] = useState([]);
  const [logs, setLogs] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [apiOnline, setApiOnline] = useState(false);
  const [freeLoading, setFreeLoading] = useState(false);

  const addToast = useCallback((msg, type = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const fetchParking = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/parking`);
      setSpots(res.data.spots);
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    }
  }, []);

  const fetchWhitelist = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/whitelist`);
      setWhitelist(res.data.allowed);
    } catch {}
  }, []);

  useEffect(() => {
    fetchParking();
    fetchWhitelist();
    const interval = setInterval(fetchParking, 5000);
    return () => clearInterval(interval);
  }, [fetchParking, fetchWhitelist]);

  const handleResult = useCallback((data) => {
    const now = new Date();
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { ...data, time }]);
    if (data.authorized) {
      // Refresh parking after someone entered
      setTimeout(fetchParking, 500);
    }
  }, [fetchParking]);

  const freeSpot = async () => {
    setFreeLoading(true);
    try {
      const res = await axios.post(`${API}/parking/free`);
      setSpots(res.data.spots);
      addToast(`Vaga V${String(res.data.freed_idx + 1).padStart(2,'0')} liberada.`, 'info');
    } catch {
      addToast('Erro ao liberar vaga.', 'error');
    } finally {
      setFreeLoading(false);
    }
  };

  const { title, subtitle } = PAGE_TITLES[page];

  return (
    <div className="app-layout">
      <Sidebar active={page} onNavigate={setPage} apiOnline={apiOnline} />

      <div className="main-content">
        <div className="page-header">
          <div>
            <div className="page-title">{title}</div>
            <div className="page-subtitle">{subtitle}</div>
          </div>
          {page === 'dashboard' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Atualização automática a cada 5s
              </span>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse-dot 2s infinite' }} />
            </div>
          )}
        </div>

        <div className="page-body">
          {page === 'dashboard' && (
            <Dashboard
              spots={spots}
              whitelist={whitelist}
              logs={logs}
              onFreeSpot={freeSpot}
              loading={freeLoading}
            />
          )}
          {page === 'camera' && (
            <CameraPage onResult={handleResult} addToast={addToast} />
          )}
          {page === 'whitelist' && (
            <WhitelistPage
              whitelist={whitelist}
              setWhitelist={setWhitelist}
              addToast={addToast}
            />
          )}
          {page === 'logs' && (
            <LogsPage logs={logs} onClear={() => setLogs([])} />
          )}
        </div>
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
