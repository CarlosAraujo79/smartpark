import { Activity, CheckCircle, XCircle, Trash2 } from 'lucide-react';

export default function LogsPage({ logs, onClear }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title"><Activity size={18} /> Histórico de Detecções</span>
        {logs.length > 0 && (
          <button className="btn btn-ghost" onClick={onClear} style={{ fontSize: '0.78rem' }}>
            <Trash2 size={14} /> Limpar
          </button>
        )}
      </div>

      {logs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Activity size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
          <p style={{ fontSize: '0.85rem' }}>Nenhuma detecção registrada nesta sessão.</p>
        </div>
      )}

      <div className="log-list">
        {[...logs].reverse().map((l, i) => (
          <div key={i} className="log-entry" style={{ gap: '1rem' }}>
            <span className="log-time">{l.time}</span>
            <span className="log-plate">{l.plate || '—'}</span>
            {l.confidence != null && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{(l.confidence * 100).toFixed(1)}%</span>
            )}
            <span className={`log-status ${l.authorized ? 'ok' : 'no'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {l.authorized
                ? <><CheckCircle size={13} /> LIBERADO</>
                : <><XCircle size={13} /> NEGADO</>}
            </span>
            {l.spot_assigned != null && (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                Vaga V{String(l.spot_assigned + 1).padStart(2, '0')}
              </span>
            )}
            {l.error && (
              <span style={{ color: 'var(--danger)', fontSize: '0.72rem' }}>{l.error}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
