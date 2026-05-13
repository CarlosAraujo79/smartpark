import { Car, ParkingCircle, ShieldCheck, TrendingUp, RefreshCw } from 'lucide-react';

export default function Dashboard({ spots, whitelist, logs, onFreeSpot, loading }) {
  const total = spots.length;
  const occupied = spots.filter(Boolean).length;
  const free = total - occupied;
  const pct = total ? Math.round((occupied / total) * 100) : 0;
  const authorizedToday = logs.filter(l => l.authorized).length;

  return (
    <>
      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Vagas Ocupadas</span>
          <span className="stat-value red">{occupied}</span>
          <div className="stat-bar">
            <div className="stat-bar-fill" style={{ width: `${pct}%`, background: 'var(--danger)' }} />
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{pct}% de {total} vagas</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Vagas Livres</span>
          <span className="stat-value green">{free}</span>
          <div className="stat-bar">
            <div className="stat-bar-fill" style={{ width: `${100 - pct}%`, background: 'var(--primary)' }} />
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{100 - pct}% disponível</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Autorizados</span>
          <span className="stat-value blue">{whitelist.length}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>placas na whitelist</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Detectados Hoje</span>
          <span className="stat-value white">{logs.length}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{authorizedToday} liberados</span>
        </div>
      </div>

      {/* Parking Grid */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <ParkingCircle size={18} /> Mapa do Estacionamento
          </span>
          <button className="btn btn-ghost" onClick={onFreeSpot} disabled={loading}>
            {loading ? <span className="spinner" /> : <RefreshCw size={15} />}
            Liberar Aleatório
          </button>
        </div>

        <div className="parking-grid-wrapper">
          {spots.map((spot, i) => (
            <div key={i} className={`spot ${spot ? 'occupied' : 'free'}`}>
              <span className="spot-num">V{String(i + 1).padStart(2, '0')}</span>
              {spot && <span className="spot-plate">{spot}</span>}
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '1.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--primary)', opacity: 0.5, display: 'inline-block' }} />
            Livre
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--danger)', opacity: 0.5, display: 'inline-block' }} />
            Ocupado
          </span>
        </div>
      </div>

      {/* Recent logs */}
      {logs.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title"><TrendingUp size={18} /> Últimas Detecções</span>
          </div>
          <div className="log-list">
            {[...logs].reverse().slice(0, 8).map((l, i) => (
              <div key={i} className="log-entry">
                <span className="log-time">{l.time}</span>
                <span className="log-plate">{l.plate || '---'}</span>
                <span className={`log-status ${l.authorized ? 'ok' : 'no'}`}>
                  {l.authorized ? 'LIBERADO' : 'NEGADO'}
                </span>
                {l.spot_assigned != null && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Vaga {l.spot_assigned + 1}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
