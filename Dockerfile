FROM node:23.3.0-slim

# Install essential dependencies for the build process (python3-pip for ML training on Cloud)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    ffmpeg \
    g++ \
    git \
    make \
    python3 \
    python3-pip \
    unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*



# Install bun globally with npm
RUN npm install -g bun

# Add bun global bin to PATH for root and node users
ENV PATH="/root/.bun/bin:/home/node/.bun/bin:$PATH"

# Create a wrapper script for elizaos that uses the local installation
RUN echo '#!/bin/bash\nexec /app/node_modules/.bin/elizaos "$@"' > /usr/local/bin/elizaos && \
    chmod +x /usr/local/bin/elizaos

# Set working directory
WORKDIR /app

# Copy package files and local workspace deps (file:./packages/api-client) for install
COPY package.json bun.lock* ./
COPY packages/api-client packages/api-client

# Install dependencies
RUN bun install

# Apply plugin-route path fix so GET /api/agents/:id/plugins/vince/pulse works (Express strips /api from req.path)
COPY scripts/patch-elizaos-server-plugin-routes.cjs scripts/
RUN node scripts/patch-elizaos-server-plugin-routes.cjs

# Copy the rest of the application
COPY . .

# Build the application
RUN bun run build

# Ship ML ONNX models for Eliza Cloud (see src/plugins/plugin-vince/models/README.md)
RUN mkdir -p /app/.elizadb/vince-paper-bot/models && \
    cp -r /app/src/plugins/plugin-vince/models/. /app/.elizadb/vince-paper-bot/models/ 2>/dev/null || true

# Python ML deps so TRAIN_ONNX_WHEN_READY can run in container (train on Cloud, no redeploy needed)
RUN python3 -m pip install --break-system-packages -r /app/src/plugins/plugin-vince/scripts/requirements.txt || true

# Change ownership of the app directory to node user
RUN chown -R node:node /app

# Create node user's bun directory
RUN mkdir -p /home/node/.bun && chown -R node:node /home/node/.bun

# Switch to non-root user
USER node


# Environment variables should be provided at runtime (e.g., via docker-compose.yaml)

# Expose port (adjust if needed based on your application)
EXPOSE 3000


# Start the application
CMD ["elizaos", "start"]