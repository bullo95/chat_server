FROM node:18 as builder

# Clone the frontend repository
RUN apt-get update && apt-get install -y git
WORKDIR /app
RUN git clone https://github.com/bullo95/chat_frontend.git .

# Install dependencies and build
RUN npm install
RUN npm run build

# Nginx stage
FROM nginx:alpine

# Copy the built React app
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY conf.d/default.conf /etc/nginx/conf.d/default.conf

# Expose ports
EXPOSE 80 443
