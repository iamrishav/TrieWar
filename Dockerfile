# ── Build Stage ──
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
# Install all dependencies (including dev) for any potential build steps
RUN npm ci

COPY . .
# We don't have a build step for this plain node app, but this stage separates deps.

# ── Production Stage ──
FROM node:20-alpine
WORKDIR /usr/src/app

# Only copy over the production node_modules from builder
# (Alternatively, you can just do `npm ci --omit=dev` directly here to save space)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy app source
COPY . .

# Set Google Cloud Run defaults
ENV NODE_ENV="production"
ENV PORT=8080

# Run as non-root user for security (GCP best practice)
USER node

# Expose the port that Cloud Run expects
EXPOSE 8080

# Use node server.js directly instead of npm to ensure graceful shutdowns
CMD ["node", "server.js"]
