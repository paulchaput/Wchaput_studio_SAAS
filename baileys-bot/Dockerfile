FROM node:20-slim

WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Create session directory
RUN mkdir -p session

# Expose nothing (outbound WebSocket connections only)
EXPOSE 3000

CMD ["npm", "start"]
