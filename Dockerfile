FROM node:20-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Install production dependencies only
RUN npm install --production

# Copy game files
COPY . .

EXPOSE 8000

CMD ["node", "server-multiplayer.cjs"]
