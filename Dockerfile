# Multi-stage production Dockerfile for Arena Tempur
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies needed for node-gyp if any
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies for build
RUN npm install

# Copy all source files
COPY . .

# Remove static index.html so React Router root route (_index.tsx) handles /
RUN rm -f public/index.html

# Build the production React Router bundle
ENV NODE_ENV=production
RUN npm run build

# Ensure index.html is not in build/client
RUN rm -f build/client/index.html

# Stage 2: Runner (Ultra lightweight)
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies and ensure react-router-serve is always present
COPY package*.json ./
RUN npm install --omit=dev && npm install @react-router/serve@7.18.4

# Copy built assets and public folder from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public

# Ensure no index.html interferes with React Router root route
RUN rm -f build/client/index.html public/index.html

# Expose port
EXPOSE 3000

# Start production server
CMD ["npx", "react-router-serve", "./build/server/index.js"]
