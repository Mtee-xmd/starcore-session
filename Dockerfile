# Use lightweight official Node.js image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json first for better caching
COPY package*.json ./

# Install only production dependencies (saves memory & build time)
RUN npm ci --only=production && npm install -g pm2

# Copy rest of the app
COPY . .

# Set environment variables for production
ENV NODE_ENV=production

# Expose port for Render web service
EXPOSE 8000

# Start app with pm2 (keeps it alive in container)
CMD ["pm2-runtime", "npm", "--", "start"]