import { useRef, useCallback, useState } from 'react';
import Webcam from 'react-webcam';
import { Camera, Upload, Zap, ImageIcon } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:8000';

export default function CameraPage({ onResult, addToast }) {
  const webcamRef = useRef(null);
  const fileRef = useRef(null);
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState('camera'); // 'camera' | 'upload'
  const [preview, setPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [ocrType, setOcrType] = useState('both');
  const [geminiKey, setGeminiKey] = useState('');

  const sendBlob = useCallback(async (blob) => {
    setDetecting(true);
    setResult(null);
    const form = new FormData();
    form.append('file', blob, 'img.jpg');
    form.append('ocr_type', ocrType);
    if (ocrType === 'gemini' && geminiKey) form.append('gemini_key', geminiKey);

    try {
      const res = await axios.post(`${API}/detect`, form);
      const data = res.data;
      setResult(data);
      onResult(data);
      if (data.error) {
        addToast('Nenhuma placa detectada na imagem.', 'error');
      } else if (data.authorized) {
        addToast(`Acesso liberado! Placa: ${data.plate} — Vaga ${data.spot_assigned + 1}`, 'success');
      } else {
        addToast(`Acesso negado. Placa: ${data.plate || '---'}`, 'error');
      }
    } catch (e) {
      console.error("Erro Axios:", e);
      const msg = e.response ? `Erro ${e.response.status}: ${JSON.stringify(e.response.data)}` : e.message;
      addToast(`Falha na API: ${msg}`, 'error');
    } finally {
      setDetecting(false);
    }
  }, [ocrType, geminiKey, onResult, addToast]);

  const captureCamera = useCallback(async () => {
    if (!webcamRef.current) return;
    const src = webcamRef.current.getScreenshot();
    if (!src) return;
    const res = await fetch(src);
    const blob = await res.blob();
    sendBlob(blob);
  }, [sendBlob]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      {/* Left: Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`btn ${mode === 'camera' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('camera')}>
            <Camera size={15} /> Webcam
          </button>
          <button className={`btn ${mode === 'upload' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('upload')}>
            <Upload size={15} /> Imagem
          </button>
        </div>

        {/* Camera or upload */}
        {mode === 'camera' ? (
          <div className="card" style={{ padding: '1rem' }}>
            <div className="camera-wrapper">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: 'environment' }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div className="camera-overlay">
                <div className="scan-frame">
                  <div className="scan-line" />
                </div>
              </div>
            </div>
            <button
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: '0.75rem' }}
              onClick={captureCamera}
              disabled={detecting}
            >
              {detecting ? <><span className="spinner" /> Processando IA...</> : <><Zap size={16} /> Capturar e Detectar</>}
            </button>
          </div>
        ) : (
          <div className="card" style={{ padding: '1rem' }}>
            <div
              className="upload-area"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
            >
              {preview ? (
                <img src={preview} alt="Preview" style={{ maxHeight: 200, borderRadius: 8, maxWidth: '100%' }} />
              ) : (
                <>
                  <ImageIcon size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.85rem' }}>Clique ou arraste uma imagem aqui</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>JPG, PNG, WEBP</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => fileRef.current?.click()} disabled={detecting}>
                <Upload size={16} /> {selectedFile ? 'Trocar Imagem' : 'Selecionar'}
              </button>
              {selectedFile && (
                <button className="btn btn-primary" style={{ flex: 1.5 }} onClick={() => sendBlob(selectedFile)} disabled={detecting}>
                  {detecting ? <span className="spinner" /> : <Zap size={16} />}
                  Analisar Imagem
                </button>
              )}
            </div>
          </div>
        )}

        {/* OCR Config */}
        <div className="card" style={{ padding: '1rem' }}>
          <span className="card-title" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            Configuração OCR
          </span>
          <div className="form-group">
            <label>Configuração OCR</label>
            <div style={{ padding: '0.5rem', background: 'var(--primary-dim)', borderRadius: '8px', border: '1px solid var(--primary)', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600 }}>
              Usando Motores Híbridos (Tesseract + Gemini)
            </div>
          </div>
          <div className="form-group">
            <label>Gemini API Key (Opcional se definida no servidor)</label>
            <input type="text" placeholder="AIza... (Deixe vazio para usar a do servidor)" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Right: Result */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="card" style={{ minHeight: 200 }}>
          <div className="card-header">
            <span className="card-title"><Zap size={18} /> Resultado</span>
          </div>

          {!result && !detecting && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <Camera size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.85rem' }}>Capture ou envie uma imagem para detectar a placa</p>
            </div>
          )}

          {detecting && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
              <p style={{ fontSize: '0.85rem', marginTop: '0.75rem' }}>Modelo de IA processando...</p>
            </div>
          )}

          {result && !detecting && (
            <div className={`result-card ${result.authorized ? 'authorized' : 'denied'}`}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '0.25rem' }}>PLACA DETECTADA</div>
              <div className="result-plate">{result.plate || '— —  — — — —'}</div>
              {result.confidence != null && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                  Confiança: {(result.confidence * 100).toFixed(1)}%
                </div>
              )}
              <div className={`result-badge ${result.authorized ? 'ok' : 'no'}`}>
                {result.authorized ? 'ACESSO LIBERADO' : 'ACESSO NEGADO'}
              </div>

              <div className="divider" style={{ margin: '1rem 0' }} />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>TESSERACT</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.9rem' }}>{result.tesseract || '---'}</div>
                </div>
                <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>GEMINI</div>
                  <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.9rem' }}>{result.gemini || '---'}</div>
                </div>
              </div>

              {result.authorized && result.spot_assigned != null && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Vaga atribuída: <strong style={{ color: 'var(--primary)' }}>V{String(result.spot_assigned + 1).padStart(2, '0')}</strong>
                </div>
              )}
              {result.error && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--danger)' }}>
                  {result.error}
                </div>
              )}
              {result.bbox && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  BBox: [{result.bbox.join(', ')}]
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
