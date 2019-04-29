FROM openjdk:8-jdk-slim
RUN mkdir -p /home/node/.npm-global
RUN mkdir -p /home/node/app

WORKDIR /home/node/app

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

RUN mkdir -p /root/.npm/
RUN ["chmod", "777", "/root/.npm/"]

