# syntax = docker/dockerfile:1

# Set base Node.js version
ARG NODE_VERSION=20.10.0
FROM node:${NODE_VERSION}-slim as base

# Set metadata labels
LABEL fly_launch_runtime="Node.js/Prisma"

# Set working directory
WORKDIR /app

# Set development environment to allow ts>js conversion
ENV NODE_ENV="development"

# Install Yarn globally
ARG YARN_VERSION=1.22.10
RUN npm install -g yarn@$YARN_VERSION --force

# Throw-away build stage
FROM base as build

# Install build dependencies
RUN apt-get update -qq && \
apt-get install --no-install-recommends -y build-essential node-gyp openssl pkg-config python-is-python3

# Copy only necessary files for installing dependencies
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn

# Generate Prisma Client
COPY prisma ./prisma
RUN npx prisma generate

# Copy application code
COPY . .

# Compile TypeScript to JavaScript, and convert aliases to relative paths
RUN yarn build

# Final stage for app image
FROM base

# Install packages needed for deployment
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Set working directory
WORKDIR /app

# Copy built application from build stage
COPY --from=build /app .

# Set production environment
ENV NODE_ENV="production"

# Expose port and start the server
EXPOSE 8080
CMD [ "yarn", "start" ]
