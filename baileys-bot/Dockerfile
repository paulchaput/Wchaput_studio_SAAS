FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Create session directory
RUN mkdir -p session

# Expose nothing (outbound WebSocket connections only)
EXPOSE 3000

CMD ["npm", "start"]
