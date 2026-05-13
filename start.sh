#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  SmartPark — Script de Inicialização
#  Inicia o backend (FastAPI) e o frontend (Vite/React) simultaneamente.
# ─────────────────────────────────────────────────────────────────────────────

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
VENV_DIR="$BACKEND_DIR/.venv"

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

log()    { echo -e "${BOLD}[SmartPark]${NC} $1"; }
ok()     { echo -e "${GREEN}[✓]${NC} $1"; }
info()   { echo -e "${BLUE}[i]${NC} $1"; }
warn()   { echo -e "${YELLOW}[!]${NC} $1"; }
error()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  🚗  SmartPark — TCC Inicializando   ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════╝${NC}"
echo ""

# ─── BACKEND ──────────────────────────────────────────────────────────────────
log "Verificando ambiente Python..."

# Criar venv se não existir
if [ ! -d "$VENV_DIR" ]; then
  warn "Ambiente virtual não encontrado. Criando em $VENV_DIR ..."
  python3 -m venv "$VENV_DIR"
  ok "Ambiente virtual criado."
fi

# Ativar venv
source "$VENV_DIR/bin/activate"
ok "Ambiente virtual ativado."

# Instalar dependências do backend
if [ -f "$BACKEND_DIR/requirements.txt" ]; then
  info "Instalando dependências do backend..."
  pip install -q -r "$BACKEND_DIR/requirements.txt"
  ok "Dependências do backend instaladas."
fi

# ─── FRONTEND ─────────────────────────────────────────────────────────────────
log "Verificando dependências do frontend..."

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  warn "node_modules não encontrado. Executando npm install..."
  (cd "$FRONTEND_DIR" && npm install --silent)
  ok "Dependências do frontend instaladas."
else
  ok "Dependências do frontend já instaladas."
fi

# ─── INICIAR SERVIÇOS ─────────────────────────────────────────────────────────
echo ""
log "Iniciando serviços..."
echo ""

# Carregar variáveis de ambiente do .env
if [ -f "$BACKEND_DIR/.env" ]; then
  set -a
  source "$BACKEND_DIR/.env"
  set +a
  ok "Variáveis de ambiente carregadas (.env)."
fi

# Iniciar backend em background
info "Backend → http://localhost:8000  (FastAPI + Uvicorn)"
(cd "$BACKEND_DIR" && python api.py) &
BACKEND_PID=$!

# Aguardar backend iniciar
sleep 2

# Iniciar frontend em background
info "Frontend → http://localhost:5173  (Vite + React)"
(cd "$FRONTEND_DIR" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║  ✅  Projeto rodando!                ║${NC}"
echo -e "${GREEN}${BOLD}╠══════════════════════════════════════╣${NC}"
echo -e "${GREEN}${BOLD}║  Frontend : http://localhost:5173    ║${NC}"
echo -e "${GREEN}${BOLD}║  API Docs : http://localhost:8000/docs║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "  Pressione ${BOLD}Ctrl+C${NC} para encerrar ambos os serviços."
echo ""

# Ao pressionar Ctrl+C, encerra ambos os processos
cleanup() {
  echo ""
  warn "Encerrando serviços..."
  kill $BACKEND_PID  2>/dev/null && ok "Backend encerrado."
  kill $FRONTEND_PID 2>/dev/null && ok "Frontend encerrado."
  deactivate 2>/dev/null || true
  echo ""
  log "Até logo! 👋"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Aguardar processos
wait $BACKEND_PID $FRONTEND_PID
