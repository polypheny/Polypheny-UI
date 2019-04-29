FROM openjdk:8-jdk-slim
RUN mkdir -p /home/node/app && chown -R node:node /home/node/app

USER node

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

