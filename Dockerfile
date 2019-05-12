FROM openjdk:8-jdk-slim

RUN useradd --create-home --shell /bin/bash builduser

USER builduser
WORKDIR /home/builduser

RUN whoami 
