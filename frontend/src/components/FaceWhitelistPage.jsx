import { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { User, Camera, Upload, Trash2, Plus, UserCheck, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:8000';

export default function FaceWhitelistPage({ addToast }) {
  const webcamRef  = useRef(null);
  const fileRef    = useRef(null);

  const [faces,       setFaces]       = useState([]);   // [{ name }]
  const [name,        setName]        = useState('');
  const [preview,     setPreview]     = useState(null); // base64 ou objectURL
  const [previewBlob, setPreviewBlob] = useState(null); // Blob para envio
  const [loading,     setLoading]     = useState(false);
  const [captureMode, setCaptureMode] = useState('webcam'); // 'webcam' | 'upload'

  // ─── Carrega lista de rostos cadastrados ──────────────────────────────────
  const fetchFaces = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/faces`);
      setFaces(res.data.faces || []);
    } catch {
      addToast('Erro ao carregar lista de rostos.', 'error');
    }
  }, [addToast]);

  useEffect(() => { fetchFaces(); }, [fetchFaces]);

  // ─── Captura da webcam ────────────────────────────────────────────────────
  const captureFromWebcam = useCallback(async () => {
    if (!webcamRef.current) return;
    const shot = webcamRef.current.getScreenshot({ width: 640, height: 480 });
    if (!shot) return;
    setPreview(shot);
    const res  = await fetch(shot);
    const blob = await res.blob();
    setPreviewBlob(blob);
  }, []);

  // ─── Upload de arquivo ────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewBlob(file);
    setPreview(URL.createObjectURL(file));
  };

  // ─── Cadastrar rosto ──────────────────────────────────────────────────────
  const registerFace = async () => {
    if (!name.trim()) { addToast('Digite um nome antes de cadastrar.', 'error'); return; }
    if (!previewBlob) { addToast('Capture ou selecione uma imagem primeiro.', 'error'); return; }

    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', previewBlob, 'face.jpg');
      form.append('name', name.trim());
      await axios.post(`${API}/faces`, form);
      addToast(`Rosto de "${name.trim()}" cadastrado com sucesso!`, 'success');
      setName(''); setPreview(null); setPreviewBlob(null);
      fetchFaces();
    } catch (e) {
      const msg = e.response?.data?.detail || e.message;
      addToast(`Erro: ${msg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Remover rosto ────────────────────────────────────────────────────────
  const deleteFace = async (faceName) => {
    try {
      await axios.delete(`${API}/faces/${encodeURIComponent(faceName)}`);
      addToast(`"${faceName}" removido.`, 'info');
      fetchFaces();
    } catch {
      addToast('Erro ao remover rosto.', 'error');
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '1.5rem', alignItems: 'start' }}>

      {/* ── Painel de cadastro ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Toggle webcam / upload */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${captureMode === 'webcam' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setCaptureMode('webcam')}
          >
            <Camera size={15} /> Webcam
          </button>
          <button
            className={`btn ${captureMode === 'upload' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setCaptureMode('upload')}
          >
            <Upload size={15} /> Imagem
          </button>
        </div>

        {/* Feed / upload area */}
        <div className="card" style={{ padding: '1rem' }}>
          {captureMode === 'webcam' ? (
            <>
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: 'user' }}
                style={{ width: '100%', borderRadius: 8 }}
              />
              <button
                className="btn btn-primary btn-full"
                style={{ marginTop: '0.75rem' }}
                onClick={captureFromWebcam}
              >
                <Camera size={15} /> Capturar Foto
              </button>
            </>
          ) : (
            <>
              <div
                className="upload-area"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) { setPreviewBlob(file); setPreview(URL.createObjectURL(file)); }
                }}
              >
                {preview ? (
                  <img src={preview} alt="Preview" style={{ maxHeight: 200, borderRadius: 8, maxWidth: '100%' }} />
                ) : (
                  <>
                    <User size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.85rem' }}>Clique ou arraste uma foto aqui</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>JPG, PNG, WEBP</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            </>
          )}
        </div>

        {/* Preview da captura (no modo webcam) */}
        {captureMode === 'webcam' && preview && (
          <div className="card" style={{ padding: '0.75rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Foto capturada
            </div>
            <img src={preview} alt="Captura" style={{ width: '100%', borderRadius: 8 }} />
          </div>
        )}

        {/* Nome + botão de cadastro */}
        <div className="card" style={{ padding: '1rem' }}>
          <div className="form-group">
            <label>Nome do Condutor</label>
            <input
              type="text"
              placeholder="Ex: João Silva"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && registerFace()}
            />
          </div>
          <button
            className="btn btn-primary btn-full"
            onClick={registerFace}
            disabled={loading || !previewBlob || !name.trim()}
          >
            {loading ? <span className="spinner" /> : <Plus size={16} />}
            {loading ? 'Cadastrando...' : 'Cadastrar Rosto'}
          </button>
        </div>
      </div>

      {/* ── Lista de rostos cadastrados ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <UserCheck size={18} /> Rostos Autorizados
          </span>
          <button className="btn btn-ghost" onClick={fetchFaces} style={{ padding: '0.4rem' }}>
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Contador */}
        <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--blue)' }}>{faces.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Condutores autorizados
          </div>
        </div>

        <div className="divider" style={{ margin: '0 0 0.75rem' }} />

        {/* Lista */}
        <div className="whitelist-list">
          {faces.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Nenhum condutor cadastrado ainda.
            </div>
          ) : (
            faces.map((f, i) => (
              <div key={i} className="whitelist-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--blue-dim)', border: '1px solid rgba(59,130,246,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: 700, color: 'var(--blue)'
                  }}>
                    {f.name.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600 }}>{f.name}</span>
                </div>
                <button className="btn btn-danger" onClick={() => deleteFace(f.name)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
