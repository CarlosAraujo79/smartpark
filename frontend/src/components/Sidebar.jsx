import { LayoutDashboard, ShieldCheck, Camera, Activity, Monitor } from 'lucide-react';

import logo from '../assets/logo.png';

const navItems = [
  { id: 'dashboard', label: 'Dashboard',       icon: <LayoutDashboard size={17} /> },
  { id: 'monitor',   label: 'Monitoramento',   icon: <Monitor size={17} /> },
  { id: 'camera',    label: 'Câmera / Detecção', icon: <Camera size={17} /> },
  { id: 'whitelist', label: 'Lista de Acesso', icon: <ShieldCheck size={17} /> },
  { id: 'logs',      label: 'Histórico',        icon: <Activity size={17} /> },
];

export default function Sidebar({ active, onNavigate, apiOnline }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src={logo} alt="SmartPark Logo" style={{ width: 32, height: 32, borderRadius: 6 }} />
        <div className="sidebar-logo-text">
          <strong>SmartPark</strong>
          <span>TCC - Visão Computacional</span>
        </div>
      </div>

      <span className="sidebar-label">Navegação</span>
      {navItems.map(item => (
        <button
          key={item.id}
          className={`nav-item ${active === item.id ? 'active' : ''}`}
          onClick={() => onNavigate(item.id)}
        >
          {item.icon}
          {item.label}
        </button>
      ))}

      <div className="sidebar-bottom">
        <div className="api-status">
          <span className="status-dot" style={{ background: apiOnline ? 'var(--primary)' : 'var(--danger)', boxShadow: apiOnline ? '0 0 8px var(--primary)' : '0 0 8px var(--danger)' }} />
          {apiOnline ? 'API Conectada' : 'API Offline'}
        </div>
      </div>
    </aside>
  );
}
