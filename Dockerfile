FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 61860

# Start the application
CMD ["npm", "start"]
