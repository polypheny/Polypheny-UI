export interface Handshake {
    lastErrorMessage: string;
    hostname: string;
    execCommand: string;
    containerExists: string;
    status: string;
    runCommand: string;
}

export interface DockerInstance {
    id: number;
    host: string;
    alias: string;
    registry: string;
    connected: boolean;
}

export interface DockerStatus {
    successful: boolean;
    errorMessage: string;
    instanceId: number;
}

export interface DockerSetupResponse {
    error: string;
    success: boolean;
    handshake: Handshake;
    instances: DockerInstance[];
}

export interface DockerUpdateResponse {
    error: string;
    instance: DockerInstance;
    handshake: Handshake;
}

export interface DockerReconnectResponse {
    error: string;
    handshake: Handshake;
}

export interface DockerRemoveResponse {
    error: string;
    instances: DockerInstance[];
}

export interface HandshakeAndInstance {
    handshake: Handshake;
    instance: DockerInstance;
}
