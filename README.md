# PitchPilot Estimation Service

AI-powered multi-agent backend that analyzes a software project idea and generates a full professional PDF report covering 7 dimensions of software estimation.

## What It Does

Given a plain-English project description, the service runs 7 parallel AI agents and produces a combined PDF report containing:

- **SRS** — Software Requirements Specification
- **RTM** — Requirement Traceability Matrix
- **Cost Analysis** — Per-requirement cost, ROI, and viability
- **Feasibility Analysis** — Blockers and recommendations
- **Risk Analysis** — Risk levels and mitigation strategies
- **Priority Analysis** — MVP vs Phase 2 vs Future Release
- **Effort Estimation** — Hours, complexity, and role breakdown

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **AI:** Azure OpenAI (GPT-4o)
- **PDF:** pdfmake + pdf-lib
- **Storage:** Cloudinary (cloud PDF hosting)
- **Email:** Nodemailer (Gmail)

## Project Structure
```
ESTIMATION/
├── assets/fonts/          ← Roboto font files (TTF)
├── src/
│   ├── agents/            ← 7 AI agents (srs, rtm, cost, etc.)
│   ├── config/env.js      ← Environment config & validation
│   ├── middleware/        ← Error handler, request validator
│   ├── routes/            ← analyze, status, report routes
│   └── services/          ← AI, PDF, email, job services
├── storage/reports/       ← Temp PDF storage (auto-deleted after upload)
├── .env                   ← NOT committed — see .env.example
├── .gitignore
├── package.json
└── server.js
```

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/pitchpilot-estimation-service.git
cd pitchpilot-estimation-service
```

### 2. Install dependencies
```bash
npm install
```

### 3. Add fonts

Place these 4 Roboto TTF files in `assets/fonts/`:
- `Roboto-Regular.ttf`
- `Roboto-Bold.ttf`
- `Roboto-Italic.ttf`
- `Roboto-BoldItalic.ttf`

Download from: https://fonts.google.com/specimen/Roboto

### 4. Create `.env`
```env
PORT2=5007
AZURE_OPENAI_KEY=your_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4o
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
SENDER_NAME=PitchPilot AI
BASE_URL=http://localhost:5007
GMAIL_USER=your@gmail.com
APP_PASSWORD=your_app_password
```

### 5. Run
```bash
node server.js
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/analyze` | Submit a project idea → returns `{ jobId }` |
| GET | `/status/:jobId` | Poll for job status |
| GET | `/view/:jobId` | View the PDF in browser |
| GET | `/download/:jobId` | Download the PDF |

## Environment Notes

- `BASE_URL` should be your machine's LAN IP for mobile access (e.g. `http://192.168.1.x:5007`)
- Enable **"PDF and ZIP files delivery"** in Cloudinary Settings → Security
