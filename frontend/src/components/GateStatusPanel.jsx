import { Camera, User, MapPin, Lock, Unlock, CheckCircle, XCircle, Clock } from 'lucide-react';

const CONDITIONS = [
  {
    key: 'plate',
    label: 'Placa Autorizada',
    icon: Camera,
    color: 'var(--primary)',
    phase: null,
  },
  {
    key: 'face',
    label: 'Rosto Autorizado',
    icon: User,
    color: 'var(--blue)',
    phase: 2,
  },
  {
    key: 'area',
    label: 'Área Livre',
    icon: MapPin,
    color: 'var(--warning)',
    phase: 3,
  },
];

function getStatus(result, key) {
  if (key === 'plate') {
    if (!result) return 'idle';
    if (!result.detected) return 'idle';
    return result.authorized ? 'ok' : 'denied';
  }
  if (key === 'face') {
    if (!result) return 'phase';
    return result.authorized ? 'ok' : 'denied';
  }
  if (key === 'area') {
    if (!result) return 'phase';
    return result.clear ? 'ok' : 'denied';
  }
  return 'idle';
}

function StatusIcon({ status }) {
  if (status === 'ok')     return <CheckCircle size={18} style={{ color: 'var(--primary)' }} />;
  if (status === 'denied') return <XCircle    size={18} style={{ color: 'var(--danger)' }} />;
  if (status === 'phase')  return <Clock      size={18} style={{ color: 'var(--text-muted)' }} />;
  return <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border)' }} />;
}

export default function GateStatusPanel({ plateResult, faceResult, areaResult }) {
  const results = { plate: plateResult, face: faceResult, area: areaResult };

  const plateOk  = getStatus(plateResult, 'plate') === 'ok';
  const faceOk   = faceResult ? getStatus(faceResult, 'face') === 'ok' : false;
  const areaClear = areaResult ? getStatus(areaResult, 'area') === 'ok' : false;

  // Gate opens only when ALL conditions met (face & area pending while not implemented)
  const hasActiveData   = !!plateResult?.detected;
  const gateOpen        = plateOk && faceOk && areaClear;
  const partialProgress = plateOk; // at least plate matched

  const getDetail = (key) => {
    if (key === 'plate') {
      if (!plateResult?.detected) return 'Aguardando frame...';
      return plateResult.plate
        ? `${plateResult.plate} · ${(plateResult.confidence * 100).toFixed(0)}%`
        : 'Não detectada';
    }
    if (key === 'face')  return faceResult  ? (faceResult.person  || '---') : 'Fase 2';
    if (key === 'area')  return areaResult  ? (areaResult.clear ? 'Livre' : `${areaResult.person_count} pessoa(s)`) : 'Fase 3';
    return '---';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Gate decision */}
      <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.72rem',
          textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600,
        }}>
          {gateOpen ? <Unlock size={14} /> : <Lock size={14} />}
          Portaria
        </div>

        <div className={`gate-decision-badge ${gateOpen ? 'gate-open' : partialProgress ? 'gate-partial' : 'gate-closed'}`}>
          {gateOpen       ? 'LIBERADO'       :
           partialProgress ? 'PLACA OK'       : 'BLOQUEADO'}
        </div>

        {!hasActiveData && (
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Inicie o monitoramento
          </p>
        )}
      </div>

      {/* Conditions list */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase',
          letterSpacing: '0.07em', fontWeight: 600, marginBottom: '0.75rem' }}>
          Condições
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {CONDITIONS.map(({ key, label, icon: Icon, color, phase }) => {
            const status = getStatus(results[key], key);
            return (
              <div key={key} className={`condition-item condition-${status}`}>
                <div className="condition-icon" style={{ color }}>
                  <Icon size={15} />
                </div>
                <div className="condition-body">
                  <div className="condition-label">
                    {label}
                    {phase && (
                      <span style={{ marginLeft: '0.4rem', fontSize: '0.6rem', background: 'var(--bg-2)',
                        border: '1px solid var(--border)', borderRadius: 99, padding: '0.1rem 0.4rem',
                        color: 'var(--text-muted)', verticalAlign: 'middle' }}>
                        FASE {phase}
                      </span>
                    )}
                  </div>
                  <div className="condition-detail">{getDetail(key)}</div>
                </div>
                <StatusIcon status={status} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
