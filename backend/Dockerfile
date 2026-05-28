FROM node:18-bullseye-slim

# Create app directory
WORKDIR /usr/src/app

# Install required native dependencies for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install deps (including Prisma runtime dependencies)
COPY backend/package*.json ./
RUN npm install --no-audit --no-fund

# Copy source
COPY backend/prisma ./prisma
COPY backend/src ./src
COPY backend/run.sh ./run.sh

RUN chmod +x /usr/src/app/run.sh

EXPOSE 5000

CMD ["./run.sh"]
