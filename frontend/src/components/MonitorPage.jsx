import { useRef, useCallback, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Play, Square, Camera, User, MapPin, RefreshCw } from 'lucide-react';
import GateStatusPanel from './GateStatusPanel';

const API_WS      = 'ws://localhost:8000';
const FRAME_MS    = 600; // ~1.6 fps — equilibrio entre responsividade e CPU

// ─── Sub-componente: feed de câmera individual ────────────────────────────────
function CameraFeed({ label, icon: Icon, color, camId, feedRef, isLive = false, phaseLabel = null, children }) {
  return (
    <div className="card" style={{ padding: '1rem', opacity: phaseLabel && !isLive ? 0.65 : 1, transition: 'opacity 0.3s' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <Icon size={15} style={{ color }} />
        <span style={{ fontSize: '0.82rem', fontWeight: 600, flex: 1 }}>{label}</span>
        {isLive     && <span className="live-badge">AO VIVO</span>}
        {phaseLabel && <span className="phase-badge">{phaseLabel}</span>}
      </div>

      {/* Video feed */}
      {camId ? (
        <Webcam
          ref={feedRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{ deviceId: { exact: camId } }}
          style={{ width: '100%', borderRadius: 8, display: 'block' }}
        />
      ) : (
        <div className="camera-placeholder">
          <Icon size={28} style={{ opacity: 0.25, color }} />
          <p style={{ fontSize: '0.78rem', marginTop: '0.4rem', color: 'var(--text-muted)' }}>
            Não configurada
          </p>
        </div>
      )}

      {/* Slot para resultado / mensagem de fase */}
      {children}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function MonitorPage({ onResult, addToast }) {
  const plateRef = useRef(null);
  const faceRef  = useRef(null);
  const areaRef  = useRef(null);

  const [cameras,    setCameras]    = useState([]);
  const [plateCamId, setPlateCamId] = useState('');
  const [faceCamId,  setFaceCamId]  = useState('');
  const [areaCamId,  setAreaCamId]  = useState('');

  const [isRunning,    setIsRunning]    = useState(false);
  const [plateResult,  setPlateResult]  = useState(null);
  const [faceResult,   setFaceResult]   = useState(null);  // Phase 2
  const [areaResult]  = useState(null);                    // Phase 3

  const wsPlateRef  = useRef(null);
  const wsFaceRef   = useRef(null);
  const intervalRef = useRef(null);
  const faceIntervalRef = useRef(null);

  // ─── Enumerate available cameras ──────────────────────────────────────────
  const refreshCameras = useCallback(() => {
    navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const cams = devices.filter(d => d.kind === 'videoinput');
        setCameras(cams);
        if (cams[0] && !plateCamId) setPlateCamId(cams[0].deviceId);
        if (cams[1] && !faceCamId)  setFaceCamId (cams[1].deviceId);
        if (cams[2] && !areaCamId)  setAreaCamId (cams[2].deviceId);
      })
      .catch(() => {});
  }, [plateCamId, faceCamId, areaCamId]);

  useEffect(() => { refreshCameras(); }, []); // eslint-disable-line

  // ─── Start monitoring ─────────────────────────────────────────────────────
  const startMonitoring = useCallback(() => {
    if (!plateCamId) {
      addToast('Selecione a câmera de placas antes de iniciar.', 'error');
      return;
    }

    // ── WebSocket: Placa ──────────────────────────────────────────────────
    const wsPlate = new WebSocket(`${API_WS}/ws/plate`);
    wsPlateRef.current = wsPlate;

    wsPlate.onopen = () => {
      addToast('Monitoramento contínuo iniciado.', 'success');
      intervalRef.current = setInterval(() => {
        if (!plateRef.current || wsPlate.readyState !== WebSocket.OPEN) return;
        const shot = plateRef.current.getScreenshot({ width: 640, height: 480 });
        if (!shot) return;
        fetch(shot).then(r => r.arrayBuffer()).then(buf => {
          if (wsPlate.readyState === WebSocket.OPEN) wsPlate.send(buf);
        }).catch(() => {});
      }, FRAME_MS);
      setIsRunning(true);
    };

    wsPlate.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setPlateResult(data);
        if (data.detected && data.authorized) {
          onResult(data);
          addToast(`Acesso liberado! Placa: ${data.plate} — Vaga ${(data.spot_assigned ?? 0) + 1}`, 'success');
        }
      } catch (_) {}
    };

    wsPlate.onerror = () => addToast('Erro na conexão WebSocket de placas.', 'error');
    wsPlate.onclose = () => { clearInterval(intervalRef.current); };

    // ── WebSocket: Rosto (apenas se câmera selecionada) ──────────────────
    if (faceCamId) {
      const wsFace = new WebSocket(`${API_WS}/ws/face`);
      wsFaceRef.current = wsFace;

      wsFace.onopen = () => {
        faceIntervalRef.current = setInterval(() => {
          if (!faceRef.current || wsFace.readyState !== WebSocket.OPEN) return;
          const shot = faceRef.current.getScreenshot({ width: 320, height: 240 });
          if (!shot) return;
          fetch(shot).then(r => r.arrayBuffer()).then(buf => {
            if (wsFace.readyState === WebSocket.OPEN) wsFace.send(buf);
          }).catch(() => {});
        }, FRAME_MS * 1.5); // face é mais pesado, intervalo maior
      };

      wsFace.onmessage = (e) => {
        try { setFaceResult(JSON.parse(e.data)); } catch (_) {}
      };

      wsFace.onerror  = () => addToast('Erro na conexão WebSocket de face.', 'error');
      wsFace.onclose  = () => { clearInterval(faceIntervalRef.current); };
    }
  }, [plateCamId, faceCamId, addToast, onResult]);

  // ─── Stop monitoring ──────────────────────────────────────────────────────
  const stopMonitoring = useCallback(() => {
    clearInterval(intervalRef.current);
    clearInterval(faceIntervalRef.current);
    if (wsPlateRef.current) wsPlateRef.current.close();
    if (wsFaceRef.current)  wsFaceRef.current.close();
    setIsRunning(false);
    setPlateResult(null);
    setFaceResult(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopMonitoring(), [stopMonitoring]);

  // ─── Camera selector helper ───────────────────────────────────────────────
  const CamSelect = ({ value, onChange, disabled, label }) => (
    <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
      <label>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}>
        <option value="">Selecione...</option>
        {cameras.map((c, i) => (
          <option key={c.deviceId} value={c.deviceId}>
            {c.label || `Câmera ${i + 1}`}
          </option>
        ))}
      </select>
    </div>
  );

  // ─── Plate result block ───────────────────────────────────────────────────
  const PlateResultBlock = () => {
    if (!plateResult) return null;
    if (!plateResult.detected) return (
      <div style={{ marginTop: '0.6rem', padding: '0.5rem 0.75rem', background: 'var(--bg-2)',
        borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Nenhuma placa no frame
      </div>
    );
    return (
      <div style={{ marginTop: '0.6rem', padding: '0.5rem 0.75rem', background: 'var(--bg-2)',
        borderRadius: 8, border: `1px solid ${plateResult.authorized ? 'var(--primary)' : 'var(--danger)'}` }}>
        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Placa detectada
        </div>
        <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: '1.1rem', marginTop: '0.1rem' }}>
          {plateResult.plate || '---'}
        </div>
        <div style={{ fontSize: '0.72rem', marginTop: '0.15rem',
          color: plateResult.authorized ? 'var(--primary)' : 'var(--danger)' }}>
          {plateResult.authorized ? 'Autorizada' : 'Não autorizada'}
          {plateResult.confidence ? ` · ${(plateResult.confidence * 100).toFixed(0)}%` : ''}
        </div>
      </div>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Controls bar ── */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <CamSelect label="Câmera — Placa"        value={plateCamId} onChange={setPlateCamId} disabled={isRunning} />
          <CamSelect label="Câmera — Rosto (Fase 2)" value={faceCamId}  onChange={setFaceCamId}  disabled={isRunning} />
          <CamSelect label="Câmera — Área (Fase 3)"  value={areaCamId}  onChange={setAreaCamId}   disabled={isRunning} />

          <button className="btn btn-ghost" onClick={refreshCameras} disabled={isRunning} title="Atualizar câmeras">
            <RefreshCw size={15} />
          </button>

          {!isRunning ? (
            <button className="btn btn-primary" style={{ minWidth: 120 }} onClick={startMonitoring}>
              <Play size={15} /> Iniciar
            </button>
          ) : (
            <button className="btn" style={{ minWidth: 120, background: 'var(--danger-dim)',
              color: 'var(--danger)', border: '1px solid rgba(255,77,109,0.3)' }} onClick={stopMonitoring}>
              <Square size={15} /> Parar
            </button>
          )}
        </div>
      </div>

      {/* ── Camera grid + gate panel ── */}
      <div className="monitor-grid">

        {/* Plate Camera */}
        <CameraFeed
          label="Câmera — Placa"
          icon={Camera}
          color="var(--primary)"
          camId={plateCamId}
          feedRef={plateRef}
          isLive={isRunning}
        >
          <PlateResultBlock />
        </CameraFeed>

        {/* Face Camera — Phase 2: ACTIVE */}
        <CameraFeed
          label="Câmera — Rosto"
          icon={User}
          color="var(--blue)"
          camId={faceCamId}
          feedRef={faceRef}
          isLive={isRunning && !!faceCamId}
        >
          {faceResult ? (
            <div style={{ marginTop: '0.6rem', padding: '0.5rem 0.75rem', background: 'var(--bg-2)',
              borderRadius: 8, border: `1px solid ${faceResult.authorized ? 'var(--blue)' : faceResult.detected ? 'var(--danger)' : 'var(--border)'}` }}>
              {faceResult.detected ? (
                <>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rosto detectado</div>
                  <div style={{ fontWeight: 700, marginTop: '0.1rem' }}>
                    {faceResult.authorized ? faceResult.person : 'Não reconhecido'}
                  </div>
                  <div style={{ fontSize: '0.72rem', marginTop: '0.15rem',
                    color: faceResult.authorized ? 'var(--blue)' : 'var(--danger)' }}>
                    {faceResult.authorized ? 'Autorizado' : 'Não autorizado'}
                    {faceResult.confidence ? ` · ${(faceResult.confidence * 100).toFixed(0)}%` : ''}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Nenhum rosto no frame</div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: '0.6rem', padding: '0.5rem 0.75rem', background: 'var(--bg-2)',
              borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {isRunning && faceCamId ? 'Aguardando frame de rosto...' : 'InsightFace — selecione uma câmera para ativar'}
            </div>
          )}
        </CameraFeed>

        {/* Area Camera — Phase 3 placeholder */}
        <CameraFeed
          label="Câmera — Área"
          icon={MapPin}
          color="var(--warning)"
          camId={areaCamId}
          feedRef={areaRef}
          phaseLabel="FASE 3"
        >
          <div style={{ marginTop: '0.6rem', padding: '0.5rem 0.75rem', background: 'var(--bg-2)',
            borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Detecção de presença na área — YOLOv8n (em desenvolvimento)
          </div>
        </CameraFeed>

        {/* Gate Status Panel */}
        <GateStatusPanel
          plateResult={plateResult}
          faceResult={faceResult}
          areaResult={areaResult}
        />
      </div>
    </div>
  );
}
