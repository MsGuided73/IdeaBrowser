# BizWiz NeuroBoard Backend

Enterprise-grade backend API for BizWiz NeuroBoard - an infinite whiteboard with RAG-powered AI assistant.

## 🏗️ Architecture Overview

### Tech Stack
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15+ with pgvector extension
- **Vector Search**: pgvector (cosine similarity)
- **Object Storage**: S3-compatible (AWS S3 or MinIO)
- **Job Queue**: BullMQ + Redis
- **AI**: Google Gemini 1.5 Flash/Pro
- **Real-time**: Socket.IO
- **ORM**: Prisma

### Key Features
- ✅ Multi-user board collaboration with WebSocket
- ✅ YouTube video transcription and analysis
- ✅ Web page scraping and content extraction
- ✅ Document processing (PDF, DOCX, TXT)
- ✅ RAG (Retrieval-Augmented Generation) chat
- ✅ Vector embeddings with semantic search
- ✅ Async job processing for long-running tasks
- ✅ S3-compatible file storage
- ✅ JWT authentication (ready for integration)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- yt-dlp (for YouTube processing)

### Local Development Setup

1. **Clone and navigate to backend**:
```bash
cd backend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Copy environment template**:
```bash
cp .env.example .env
```

4. **Configure environment variables** (edit `.env`):
```env
GEMINI_API_KEY=your_actual_gemini_api_key
DATABASE_URL=postgresql://bizwiz:password@localhost:5432/bizwiz
```

5. **Start infrastructure services** (Postgres, Redis, MinIO):
```bash
docker-compose up -d postgres redis minio
```

6. **Run database migrations**:
```bash
npm run db:push
```

7. **Initialize pgvector extension** (first time only):
```bash
npx prisma db execute --file ./prisma/init-vector.sql
```
Or run this SQL manually:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

8. **Start development server**:
```bash
npm run dev
```

9. **Start background worker** (in a separate terminal):
```bash
npm run worker
```

The API will be available at `http://localhost:3001`.

---

## 📦 Docker Deployment (Production)

### Full Stack with Docker Compose

1. **Set environment variables**:
```bash
export GEMINI_API_KEY="your_gemini_api_key"
export JWT_SECRET="your_secure_jwt_secret"
```

2. **Start all services**:
```bash
docker-compose up -d
```

This starts:
- PostgreSQL with pgvector
- Redis
- MinIO (S3-compatible storage)
- Backend API server
- Background worker

3. **Run migrations**:
```bash
docker-compose exec backend npm run db:push
```

4. **Access services**:
- API: http://localhost:3001
- MinIO Console: http://localhost:9001 (minioadmin/minioadmin)
- PostgreSQL: localhost:5432

---

## 🗄️ Database Management

### Prisma Commands

```bash
# Generate Prisma Client
npm run db:generate

# Push schema changes (dev)
npm run db:push

# Create migration
npm run db:migrate

# Open Prisma Studio (GUI)
npm run db:studio

# Seed database
npm run db:seed
```

### Manual SQL Access

```bash
# Via Docker
docker-compose exec postgres psql -U bizwiz -d bizwiz

# Locally
psql postgresql://bizwiz:password@localhost:5432/bizwiz
```

---

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `GEMINI_API_KEY` | Google Gemini API key | Required |
| `S3_ENDPOINT` | S3 endpoint URL | `http://localhost:9000` |
| `S3_ACCESS_KEY_ID` | S3 access key | `minioadmin` |
| `S3_SECRET_ACCESS_KEY` | S3 secret key | `minioadmin` |
| `S3_BUCKET` | S3 bucket name | `bizwiz-neuroboard` |
| `S3_FORCE_PATH_STYLE` | Use path-style URLs (MinIO) | `true` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `JWT_SECRET` | JWT signing secret | Required in prod |
| `YT_DLP_PATH` | Path to yt-dlp | `yt-dlp` |

---

## 📡 API Endpoints

### Boards

```http
POST   /api/boards              Create a new board
GET    /api/boards              List user's boards
GET    /api/boards/:id          Get board details
GET    /api/boards/:id/state    Get full board state
PATCH  /api/boards/:id          Update board
DELETE /api/boards/:id          Delete board
```

### Nodes

```http
POST   /api/boards/:boardId/nodes/note       Create text note
POST   /api/boards/:boardId/nodes/document   Upload document (multipart)
POST   /api/boards/:boardId/nodes/youtube    Add YouTube video
POST   /api/boards/:boardId/nodes/url        Add web URL
GET    /api/boards/:boardId/nodes/:nodeId    Get node
PATCH  /api/boards/:boardId/nodes/:nodeId    Update node
DELETE /api/boards/:boardId/nodes/:nodeId    Delete node
```

### Groups & Edges

```http
POST   /api/boards/:boardId/groups           Create group
POST   /api/boards/:boardId/groups/:id/members  Add nodes to group
DELETE /api/boards/:boardId/groups/:id        Delete group
POST   /api/boards/:boardId/edges            Create connection
DELETE /api/boards/:boardId/edges/:id        Delete connection
```

### RAG Chat

```http
POST   /api/boards/:boardId/chat             Chat with board

Body:
{
  "message": "What are the main themes?",
  "options": {
    "nodeIds": ["node-id-1", "node-id-2"],  // Optional
    "groupIds": ["group-id-1"]               // Optional
  }
}

Response:
{
  "answer": "Based on your board...",
  "sources": [
    { "nodeId": "...", "chunkIndex": 0, "relevance": 0.92 }
  ]
}
```

---

## 🔄 Ingestion Pipelines

### YouTube Video Processing

1. User adds YouTube URL
2. Backend downloads audio using yt-dlp
3. Audio uploaded to S3
4. Gemini transcribes and analyzes audio
5. Text chunked and embedded
6. Embeddings stored in database
7. WebSocket notification sent to clients

### Web Page Scraping

1. User adds web URL
2. Puppeteer launches and navigates to page
3. Text content extracted
4. Screenshot captured and uploaded to S3
5. Content chunked and embedded
6. Node updated with extracted data

### Document Upload

1. User uploads PDF/DOCX/TXT
2. File uploaded to S3
3. Text extracted using appropriate library
4. Content chunked and embedded
5. Node created with extracted text

---

## 🧠 RAG System

### How It Works

1. **User asks a question** about their board
2. **Question is embedded** using Gemini embeddings (768 dimensions)
3. **Vector search** finds similar chunks using pgvector cosine similarity
4. **Top K chunks** are retrieved as context (default: 10)
5. **Context + Question** sent to Gemini for answer generation
6. **Answer returned** with source node references

### Vector Search Query

```sql
SELECT 
  ne.node_id,
  ne.chunk_text,
  1 - (ne.embedding <=> $1::vector) AS similarity
FROM node_embeddings ne
JOIN nodes n ON n.id = ne.node_id
WHERE n.board_id = $2
ORDER BY ne.embedding <=> $1::vector
LIMIT 10;
```

---

## 🔌 WebSocket Events

### Client → Server

- `join_board`: Join a board room
- `leave_board`: Leave a board room
- `node_update`: Update node content
- `node_move`: Move node position
- `cursor_move`: Update cursor position

### Server → Client

- `node:created`: New node added
- `node:updated`: Node content changed
- `node:moved`: Node position updated
- `node:deleted`: Node removed
- `user:joined`: User joined board
- `user:left`: User left board

---

## 🧪 Development

### Code Structure

```
backend/
├── src/
│   ├── server.ts           # Express app entry
│   ├── config/             # Configuration
│   │   ├── env.ts
│   │   ├── database.ts
│   │   ├── storage.ts
│   │   └── logger.ts
│   ├── services/           # Business logic
│   │   ├── gemini.service.ts
│   │   ├── embeddings.service.ts
│   │   ├── rag.service.ts
│   │   ├── youtube.service.ts
│   │   ├── web-scraper.service.ts
│   │   ├── document.service.ts
│   │   └── storage.service.ts
│   ├── routes/             # API routes
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Express middleware
│   ├── jobs/               # Background job processors
│   ├── ws/                 # WebSocket handlers
│   └── types/              # TypeScript types
├── prisma/
│   └── schema.prisma       # Database schema
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

---

## 🚨 Troubleshooting

### Common Issues

**1. pgvector extension not found**
```sql
-- Run this manually in PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;
```

**2. yt-dlp not found**
```bash
# Install yt-dlp
pip install yt-dlp
# or
brew install yt-dlp
```

**3. Puppeteer/Chromium issues**
```bash
# Install system dependencies (Ubuntu/Debian)
sudo apt-get install -y chromium-browser
```

**4. S3 connection failed**
```bash
# Check MinIO is running
docker-compose ps minio

# Access MinIO console
open http://localhost:9001
```

---

## 🔐 Security

### Production Checklist

- [ ] Change default database credentials
- [ ] Set strong JWT_SECRET
- [ ] Use AWS S3 instead of MinIO (or secure MinIO)
- [ ] Enable HTTPS
- [ ] Set up rate limiting
- [ ] Configure CORS properly
- [ ] Enable Helmet security headers
- [ ] Set up monitoring and logging
- [ ] Regular security audits

---

## 📈 Performance

### Optimization Tips

1. **Database**: Add indexes for frequently queried fields
2. **Embeddings**: Batch embedding generation
3. **Caching**: Use Redis for frequently accessed data
4. **S3**: Use CloudFront or CDN for file delivery
5. **Job Queue**: Scale workers horizontally

---

## 🤝 Contributing

This backend is designed to be modular and extensible. Key extension points:

- **New node types**: Add to `NodeType` enum and create ingestion service
- **New vector DB**: Abstract vector operations in `embeddings.service.ts`
- **New AI model**: Replace Gemini in `gemini.service.ts`
- **New storage**: Replace S3 in `storage.service.ts`

---

## 📝 License

MIT

---

## 🆘 Support

For issues and questions:
- Check the troubleshooting section above
- Review the code comments (they're detailed!)
- Open an issue on GitHub

Built with ❤️ for BizWiz NeuroBoard
