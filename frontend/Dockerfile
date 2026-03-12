

# Stage 1: Build the Next.js application
FROM docker.m.daocloud.io/library/node:20-alpine AS builder

WORKDIR /app

# Copy package manager files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build the Next.js application for production
RUN npm run build

# Stage 2: Create the production image
FROM docker.m.daocloud.io/library/node:20-alpine

WORKDIR /app

# Copy production dependencies from builder stage
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

# Install production dependencies
RUN npm install --production

# Copy built assets from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Expose the port the app runs on
EXPOSE 3000

# Set the command to start the server
CMD ["npm", "start"]
