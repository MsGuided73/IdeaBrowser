# =========================================
#  FRONTEND BUILD STAGE (Vite)
# =========================================
FROM node:20-alpine AS frontend_builder

WORKDIR /app/frontend

# Install frontend dependencies
COPY package*.json ./
RUN npm ci

# Copy full repo (frontend lives at root)
COPY . .

# Build the Vite app (assumes "build": "vite build")
RUN npm run build


# =========================================
#  BACKEND BUILD STAGE (Express/TS)
# =========================================
FROM node:20-alpine AS backend_builder

# Install Python and build tools (needed for some native deps)
RUN apk add --no-cache python3 make g++

WORKDIR /app/backend

# Copy backend package + tsconfig + prisma schema
COPY backend/package*.json ./
COPY backend/tsconfig.json ./
COPY backend/prisma ./prisma/

# Install backend dependencies
RUN npm ci

# Copy backend source
COPY backend/src ./src

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript -> dist
RUN npm run build


# =========================================
#  RUNTIME STAGE (combined app)
# =========================================
FROM node:20-alpine

# Install yt-dlp, ffmpeg, Chromium, etc. for YouTube/Puppeteer
RUN apk add --no-cache \
    yt-dlp \
    ffmpeg \
    python3 \
    chromium \
    chromium-chromedriver

# Let Puppeteer use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# ----- Backend runtime files -----
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --only=production
WORKDIR /app

# Copy compiled backend and Prisma bits
COPY --from=backend_builder /app/backend/dist ./backend/dist
COPY --from=backend_builder /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY --from=backend_builder /app/backend/prisma ./backend/prisma

# ----- Frontend build output -----
# Vite build ends up in /app/frontend/dist in the frontend_builder stage
COPY --from=frontend_builder /app/frontend/dist ./frontend

# Create temp dir for file processing (as in original Dockerfile)
RUN mkdir -p /app/temp

EXPOSE 3001

# (Optional) healthcheck - keep your original one
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the backend (which should also serve the frontend)
CMD ["npm", "start", "--prefix", "backend"]
