FROM openjdk:8-jdk-slim

RUN mkdir -p /root/.npm/_logs/
RUN chmod -R 777 /root/.npm/

