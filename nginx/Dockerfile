FROM node:18 as builder

# Clone the frontend repository
RUN apt-get update && apt-get install -y git
WORKDIR /app
RUN git clone https://github.com/bullo95/chat_frontend.git .

# Install dependencies and build
RUN npm install
# Add environment variables needed for build
ENV REACT_APP_API_URL=https://t2m.vigilys.fr/api
RUN npm run build

# Verify build directory exists and show contents
RUN ls -la /app/build || echo "Build directory not found"

# Nginx stage
FROM nginx:alpine

# Copy the built React app
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY conf.d/default.conf /etc/nginx/conf.d/default.conf

# Expose ports
EXPOSE 80 443
