# 🚗 SmartPark — Sistema de Controle de Estacionamento Inteligente

O **SmartPark** é uma solução completa de monitoramento e controle de acesso veicular baseada em Visão Computacional. O sistema utiliza modelos de Deep Learning (YOLO) e mecanismos híbridos de OCR para identificar placas e gerenciar vagas de estacionamento em tempo real.

---

## 🏗️ Arquitetura do Sistema

O projeto foi migrado de uma arquitetura legada (Streamlit) para um stack moderno full-stack:

- **Frontend**: React 19 + Vite + CSS Vanilla (Design Premium/Glassmorphism)
- **Backend**: FastAPI (Python 3.10+)
- **IA/Visão**: 
  - **Detecção**: YOLOv8 (modelo customizado `plaquinhas.pt`)
  - **OCR Local**: Tesseract OCR
  - **OCR Nuvem**: Google Gemini 2.5 Flash (Vision API)
- **Automação**: Shell Script (`start.sh`) para orquestração de serviços.

---

## 🚀 Como Iniciar

### Pré-requisitos
- Python 3.10 ou superior
- Node.js (npm)
- Tesseract OCR instalado no sistema (`sudo apt install tesseract-ocr`)

### Execução Rápida
O sistema possui um script automatizado que configura o ambiente virtual, instala dependências e inicia ambos os serviços:

```bash
chmod +x start.sh
./start.sh
```

- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **Documentação API (Swagger)**: `http://localhost:8000/docs`

---

## ⚙️ Configuração do Gemini Vision

Para utilizar o OCR de alta precisão via Google Gemini:
1. Obtenha uma chave em [Google AI Studio](https://aistudio.google.com/).
2. Edite o arquivo `backend/.env`:
   ```env
   GEMINI_API_KEY="SUA_CHAVE_AQUI"
   GEMINI_MODEL_NAME="gemini-2.5-flash"
   ```

---

## 📖 Guia de Uso

### 1. Dashboard (Painel Principal)
- **Visão Geral**: Acompanhe o status das vagas (ocupadas vs. livres).
- **Mapa de Vagas**: Visualização gráfica do estacionamento. Clique em "Liberar Aleatório" para simular a saída de um veículo.
- **Últimas Detecções**: Log rápido dos eventos mais recentes.

### 2. Câmera / Detecção
- **Modo Webcam**: Use a câmera do dispositivo para capturar placas em tempo real.
- **Modo Imagem**: Faça upload de fotos de veículos para análise.
- **Processamento**: O sistema executa automaticamente o modelo YOLO para localizar a placa e, em seguida, utiliza os motores Tesseract e Gemini simultaneamente para extrair o texto.
- **Resultado**: Exibe a placa detectada, o nível de confiança e se o acesso foi liberado (baseado na Whitelist).

### 3. Lista de Acesso (Whitelist)
- Gerencie as placas autorizadas a entrar no estacionamento.
- Adicione novas placas ou remova as existentes. 
- O sistema reconhece tanto o formato antigo (ABC-1234) quanto o padrão Mercosul.

### 4. Histórico
- Registro detalhado de todas as tentativas de acesso, incluindo horário, placa, imagem processada (bbox) e o resultado da autorização.

---

## 🛠️ Estrutura de Pastas

```text
placas_tcc/
├── backend/          # Servidor FastAPI e Lógica de IA
│   ├── .env          # Variáveis sensíveis (API Keys)
│   ├── api.py        # Endpoints da API
│   ├── plate_ocr.py  # Integração YOLO + OCR
│   ├── parking.py    # Lógica de gestão de vagas
│   └── plaquinhas.pt # Modelo YOLO treinado
├── frontend/         # Interface React
│   ├── src/
│   │   ├── components/ # Componentes da UI
│   │   └── assets/     # Logos e imagens
│   └── index.html
├── start.sh          # Script de inicialização unificado
└── README.md         # Esta documentação
```

---

## 📄 Licença
Este projeto foi desenvolvido para fins acadêmicos (TCC).
