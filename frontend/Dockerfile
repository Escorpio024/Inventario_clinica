FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production=false

COPY . .

# Recibe la URL de la API como argumento de build para que quede horneada en el bundle
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build de produccion
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]

