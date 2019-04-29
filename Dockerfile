FROM openjdk:8-jdk-slim

RUN sudo mkdir -p /root/.npm/_logs
RUN sudo chmod -R 777 /root/.npm/

