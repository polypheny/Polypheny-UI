export interface HandshakeInfo {
    id: number,
    host: DockerHost,
    runCommand: string,
    execCommand: string,
    status: string,
    lastErrorMessage: string,
    containerExistsGuess: boolean,
}

export interface DockerHost {
    hostname: string,
    alias: string,
    registry: string,
    communicationPort: number,
    handshakePort: number,
    proxyPort: number,
}

export interface DockerInstanceInfo {
    id: number;
    connected: boolean;
    numberOfContainers: number;
    host: DockerHost;
}

export interface CreateDockerResponse {
    handshake: HandshakeInfo,
    instances: DockerInstanceInfo[],
}

export interface UpdateDockerResponse {
    handshake: HandshakeInfo;
    instance: DockerInstanceInfo;
}

export interface InstancesAndAutoDocker {
    instances: DockerInstanceInfo[];
    status: AutoDockerStatus;
}

export interface AutoDockerStatus {
    available: boolean;
    connected: boolean;
    running: boolean;
    status: string;
}

export interface AutoDockerResult {
    status: AutoDockerStatus;
    instances: DockerInstanceInfo[];
}

export interface HandshakeAndInstance {
    handshake: HandshakeInfo;
    instance: DockerInstanceInfo;
}

export interface DockerSettings {
    defaultRegistry: string;
}
