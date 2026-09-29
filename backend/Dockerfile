FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim

WORKDIR /app

# Python + Chromium para o gerador de relatórios SCCS (backend/sccs-docs)
RUN apt-get update -y && apt-get install -y openssl python3 python3-pip && rm -rf /var/lib/apt/lists/*
RUN pip3 install --no-cache-dir --break-system-packages playwright pillow \
 && python3 -m playwright install --with-deps chromium

COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY sccs-docs ./sccs-docs

RUN mkdir -p uploads config data

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
