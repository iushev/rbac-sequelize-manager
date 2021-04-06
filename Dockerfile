FROM node:14
WORKDIR /opt/rbac/rbac-sequelize-manager
COPY ./package.json ./
RUN npm i

COPY . .
