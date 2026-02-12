# Stage 1: Build client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine
WORKDIR /app

# Install server deps
COPY server/package.json server/package-lock.json ./
RUN npm ci

# Copy server source (using tsx runtime, no tsc build needed)
COPY server/src ./src
COPY server/tsconfig.json ./
COPY server/drizzle.config.ts ./

# Copy built client
COPY --from=client-build /app/client/dist ./client/dist

# Create storage directory
RUN mkdir -p /app/storage/blobs

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000
CMD ["npx", "tsx", "src/index.ts"]
