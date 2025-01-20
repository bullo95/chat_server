FROM node:18

# Install system dependencies
RUN apt-get update && apt-get install -y \
    mariadb-client \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY . .

# Create required directories
RUN mkdir -p \
    /usr/src/app/public/uploads \
    /usr/src/app/database_dumps

# Expose port
EXPOSE 61860

# Start the Node.js application
CMD ["node", "server.js"]
