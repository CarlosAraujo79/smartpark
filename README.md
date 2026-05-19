# 🚗 SmartPark — Sistema Integrado Multi-Modal de Estacionamento Inteligente

O **SmartPark** é uma solução completa de monitoramento e controle de acesso veicular baseada em Inteligência Artificial e Visão Computacional. O sistema utiliza múltiplos modelos (YOLO, InsightFace, OCR Híbrido) processando vídeo em tempo real para gerenciar portarias e mapear vagas no pátio físico do estacionamento.

---

## 🏗️ Arquitetura do Sistema

O projeto possui uma arquitetura full-stack moderna e de alta concorrência:

- **Frontend**: React 19 + Vite + CSS Vanilla (Design Premium, Responsivo, Glassmorphism).
- **Backend**: FastAPI (Python 3.10+) com processamento de IA isolado em ThreadPool.
- **Comunicação em Tempo Real**: Múltiplos canais WebSocket para streaming e predição visual síncrona com baixa latência.
- **IA/Visão Computacional**: 
  - **Identificação Veicular**: YOLOv8 (modelo customizado `plaquinhas.pt`) + Tesseract OCR + Google Gemini 2.5 Flash.
  - **Biometria (Reconhecimento Facial)**: InsightFace (modelo `buffalo_s`).
  - **Segurança (Pedestres)**: YOLOv8n (`yolov8n.pt` COCO class 0).
  - **Mapeamento de Vagas**: YOLOv8n (veículos) combinado com intersecção de polígonos (ROIs).
- **Automação**: Shell Script (`start.sh`) para orquestração de serviços.

---

## 🚀 Como Iniciar

### Pré-requisitos
- Python 3.10+
- Node.js (npm)
- Tesseract OCR (`sudo apt install tesseract-ocr`)
- *Opcional: Câmeras compatíveis com o navegador (Webcams/Virtual Cams).*

### Execução Rápida
O sistema possui um script automatizado que configura os ambientes virtuais, instala as dependências e inicia a aplicação:

```bash
chmod +x start.sh
./start.sh
```

- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **Documentação API (Swagger)**: `http://localhost:8000/docs`

---

## ⚙️ Configuração do Gemini Vision

Para utilizar o OCR complementar de altíssima precisão:
1. Obtenha uma chave em [Google AI Studio](https://aistudio.google.com/).
2. Edite o arquivo `backend/.env`:
   ```env
   GEMINI_API_KEY="SUA_CHAVE_AQUI"
   GEMINI_MODEL_NAME="gemini-2.5-flash"
   ```

---

## 📖 Guia de Funcionalidades

### 1. Monitoramento Multi-Câmera (Gate Control)
- A portaria exige três níveis de validação de segurança simultâneos para liberação da cancela:
  - **Câmera da Placa**: Identifica a placa e valida na lista de autorizados.
  - **Câmera do Rosto**: Faz a validação biométrica cruzada do motorista.
  - **Câmera da Área**: Garante que nenhum pedestre esteja transitando em zona de risco na rampa/calçada.

### 2. Dashboard (Gêmeo Digital do Pátio)
- **Visão em Tempo Real**: Um mapa visual reflete instantaneamente o status do estacionamento. Se a câmera do pátio flagrar um carro parando na vaga, ela acende e o contador diminui.
- **Histórico Rápido**: Exibe as últimas liberações e interações com a cancela.

### 3. Calibração de Vagas (ROIs)
- Módulo interativo no navegador onde o administrador conecta a câmera do pátio e desenha (arrasta e solta) polígonos sobre o vídeo para indicar onde cada vaga (V01, V02) está pintada no chão. 
- A IA do backend cruza esses polígonos com as caixas delimitadoras (*bounding boxes*) de carros detectados no pátio para marcar as vagas como Livres ou Ocupadas.

### 4. Gestão de Acesso
- **Lista de Placas (Whitelist)**: Adição, remoção e validação do padrão normal e Mercosul.
- **Condutores (Faces)**: Capture imagens via webcam ou upload de arquivos para gerar e salvar *embeddings* faciais.
- **Histórico/Logs**: Registro minucioso (com imagens) de todas as tentativas de acesso à catraca.

---

## 🛠️ Estrutura de Pastas

```text
placas_tcc/
├── backend/                  # Servidor FastAPI
│   ├── .env                  # Variáveis sensíveis
│   ├── api.py                # Endpoints REST e WebSockets principais
│   ├── area_detection_module.py  # Modelo para área segura (pedestres)
│   ├── face_recognition_module.py # Validação Biométrica (InsightFace)
│   ├── parking.py            # Estrutura lógica das vagas
│   ├── plate_ocr.py          # YOLO Placas + OCR Híbrido
│   ├── spot_detection_module.py  # Visão para Vagas Livres/Ocupadas
│   ├── plaquinhas.pt         # YOLO treinado para placas
│   └── yolov8n.pt            # YOLO leve para veículos e pedestres
├── frontend/                 # Interface React Vite
│   ├── src/
│   │   ├── components/       # Interface UI e Pages Modulares
│   │   └── assets/           # Logos e SVGs
│   └── index.html
├── start.sh                  # Orquestrador local
└── README.md                 # Você está aqui
```

---

## 📄 Licença
Este projeto de Automação de Cidades Inteligentes e Visão Computacional foi desenvolvido no contexto acadêmico (TCC).
