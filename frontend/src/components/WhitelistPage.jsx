import { useState } from 'react';
import { ShieldCheck, Plus, Trash2, Search } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:8000';

export default function WhitelistPage({ whitelist, setWhitelist, addToast }) {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (list) => {
    setSaving(true);
    try {
      await axios.post(`${API}/whitelist`, list);
      setWhitelist(list);
    } catch {
      addToast('Erro ao salvar whitelist.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const add = async () => {
    const plate = input.trim().toUpperCase();
    if (!plate || whitelist.includes(plate)) {
      addToast('Placa inválida ou já cadastrada.', 'error');
      return;
    }
    const updated = [...whitelist, plate];
    await save(updated);
    setInput('');
    addToast(`Placa ${plate} adicionada.`, 'success');
  };

  const remove = async (plate) => {
    const updated = whitelist.filter(p => p !== plate);
    await save(updated);
    addToast(`Placa ${plate} removida.`, 'info');
  };

  const filtered = whitelist.filter(p => p.includes(search.toUpperCase()));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem', alignItems: 'start' }}>
      {/* Add */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><ShieldCheck size={18} /> Adicionar Placa</span>
        </div>
        <div className="form-group">
          <label>Número da Placa</label>
          <div className="input-row">
            <input
              type="text"
              placeholder="ABC1234 ou BRA2E19"
              value={input}
              maxLength={8}
              onChange={e => setInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && add()}
              style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, letterSpacing: '0.08em' }}
            />
            <button className="btn btn-primary" onClick={add} disabled={saving}>
              {saving ? <span className="spinner" /> : <Plus size={16} />}
            </button>
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Suporta formato antigo (ABC-1234) e Mercosul (BRA2E19).
        </p>
        <div className="divider" />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{whitelist.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Placas autorizadas</div>
        </div>
      </div>

      {/* List */}
      <div className="card">
        <div className="card-header">
          <span className="card-title"><Search size={18} /> Lista de Acesso</span>
        </div>
        <div className="form-group">
          <label>Buscar</label>
          <input
            type="text"
            placeholder="Filtrar placas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="whitelist-list">
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {whitelist.length === 0 ? 'Nenhuma placa cadastrada.' : 'Nenhum resultado encontrado.'}
            </div>
          )}
          {filtered.map(plate => (
            <div key={plate} className="whitelist-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="whitelist-plate">{plate}</span>
              </div>
              <button className="btn btn-danger" onClick={() => remove(plate)}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
