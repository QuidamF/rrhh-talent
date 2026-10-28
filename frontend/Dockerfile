FROM node:18-alpine

WORKDIR /app

# Instalar dependencias primero para cachear la capa
COPY package.json package-lock.json* ./
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto de Vite
EXPOSE 5173

# Correr en modo de desarrollo con recarga en vivo
CMD ["npm", "run", "dev"]
