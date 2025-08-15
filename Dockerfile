
FROM node:20-slim

WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install dependencies
RUN npm install --only=production && npm install -g pm2

# Copy rest of the app
COPY . .

# Expose port
EXPOSE 8000

# Start server
CMD ["npm", "start"]