# Documentação Técnica - Backend SmartPark

Esta pasta contém a lógica de processamento de imagens, inteligência artificial e a API do sistema SmartPark.

## 🧠 Modelos de IA

### 1. Detecção de Placas (YOLOv8)
- **Arquivo**: `plaquinhas.pt`
- **Descrição**: Modelo YOLOv8 treinado especificamente para detectar placas de veículos brasileiras (padrão cinza e Mercosul).
- **Processamento**: O modelo recebe uma imagem e retorna as coordenadas (bounding box) da placa com maior nível de confiança.

### 2. Reconhecimento de Caracteres (OCR)
O sistema utiliza uma abordagem híbrida:
- **Tesseract OCR (Local)**: Utilizado para processamento offline. Requer o binário do Tesseract instalado no SO.
- **Google Gemini 2.5 Flash (API)**: Utilizado para detecções de alta precisão via Multimodal LLM. Excelente para placas com sombras, sujeira ou ângulos difíceis.

---

## 📡 Endpoints da API (FastAPI)

### `GET /parking`
Retorna o estado atual das 30 vagas de estacionamento.

### `POST /detect`
Endpoint principal para processamento de imagens.
- **Body**: `multipart/form-data`
- **Campos**:
  - `file`: Arquivo de imagem (JPG/PNG).
  - `gemini_key` (opcional): Chave da API caso não esteja no `.env`.
- **Retorno**: JSON contendo a placa extraída, textos individuais do Tesseract/Gemini, coordenadas da placa e vaga atribuída.

### `GET /whitelist`
Lista todas as placas autorizadas.

### `POST /whitelist`
Atualiza a lista de placas autorizadas (sobrescreve a lista atual).

---

## 💾 Persistência de Dados
Os dados são persistidos em arquivos JSON simples para facilitar a portabilidade:
- `parking_state.json`: Estado das vagas.
- `plates_db.json`: Lista de acesso (whitelist).

---

## 🛠️ Manutenção
Para atualizar as dependências do backend:
```bash
source .venv/bin/activate
pip install -r requirements.txt
```
