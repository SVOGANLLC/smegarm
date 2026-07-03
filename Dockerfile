# syntax=docker/dockerfile:1

# ---- Build stage ----
FROM node:22-slim AS build
WORKDIR /app

# Install deps with a clean, reproducible install.
COPY package.json package-lock.json ./
RUN npm ci

# Client-side env vars are inlined into the browser bundle at BUILD time,
# so they must be present here. They are public values (anon/publishable key).
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_ANALYTICS_ENABLED=false
ARG VITE_FUZZY_SEARCH_ENABLED=false
ENV NODE_OPTIONS=--max-old-space-size=1024 \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID \
    VITE_ANALYTICS_ENABLED=$VITE_ANALYTICS_ENABLED \
    VITE_FUZZY_SEARCH_ENABLED=$VITE_FUZZY_SEARCH_ENABLED

COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# Nitro bundles all server deps into .output, so no node_modules are needed here.
COPY --from=build /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
