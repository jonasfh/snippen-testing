FROM node:22-alpine

WORKDIR /app

# Install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy application source
COPY src/ ./src/

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

EXPOSE 3000

USER node

CMD ["npm", "start"]
