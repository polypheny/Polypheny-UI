import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {WebuiSettingsService} from '../../../services/webui-settings.service';

@Injectable({
    providedIn: 'root'
})
export class NotebooksService {

    constructor(private _http: HttpClient, private _settings: WebuiSettingsService) {
    }

    private httpUrl = this._settings.getConnection('notebooks.rest');
    private httpOptions = {headers: new HttpHeaders({'Content-Type': 'application/json'})};

    getKernelspecs() {
        return this._http.get(`${this.httpUrl}/kernelspecs`, this.httpOptions);
    }

    getContents(path: string) {
        return this._http.get(`${this.httpUrl}/contents/` + path, this.httpOptions);
    }

    getSession(sessionId: string) {
        return this._http.get(`${this.httpUrl}/sessions/` + sessionId, this.httpOptions);
    }

    getSessions() {
        return this._http.get(`${this.httpUrl}/sessions`, this.httpOptions);
    }

    getKernels() {
        return this._http.get(`${this.httpUrl}/kernels`, this.httpOptions);
    }

    createSession(name: string, path: string, kernel: string) {
        const json = {
            kernel: {
                name: kernel
            },
            name: name,
            path: path,
            type: 'notebook'
        };
        return this._http.post(`${this.httpUrl}/sessions`, json, this.httpOptions);
    }

    createFile(location: string, type: string) {
        const json = {
            type: type
        };
        return this._http.post(`${this.httpUrl}/contents/${location}`, json, this.httpOptions);
    }

    createFileWithExtension(location: string, type: string, ext: string) {
        const json = {
            type: type,
            ext: ext
        };
        return this._http.post(`${this.httpUrl}/contents/${location}`, json, this.httpOptions);
    }

    interruptKernel(kernelId: string) {
        return this._http.post(`${this.httpUrl}/kernels/${kernelId}/interrupt`, '', this.httpOptions);
    }

    restartKernel(kernelId: string) {
        return this._http.post(`${this.httpUrl}/kernels/${kernelId}/restart`, '', this.httpOptions);
    }

    deleteSession(sessionId: string) {
        return this._http.delete(`${this.httpUrl}/sessions/${sessionId}`, this.httpOptions);
    }

    renameSession(sessionId: string, name: string, path: string) {
        const json = {
            id: sessionId,
            name: name,
            path: path,
        };
        return this._http.patch(`${this.httpUrl}/sessions/${sessionId}`, json, this.httpOptions);
    }

    moveFile(srcFilePath: string, destFilePath: string) {
        const json = {
            path: destFilePath,
        };
        return this._http.patch(`${this.httpUrl}/contents/${srcFilePath}`, json, this.httpOptions);
    }

    updateFile(filePath: string, content: string, format: string) {
        const json = {
            content: content,
            format: format,
        };
        return this._http.put(`${this.httpUrl}/contents/${filePath}`, json, this.httpOptions);
    }

    uploadFile(filePath: string, fileName: string, content: string, format: string, type: string) {
        const json = {
            content: content,
            format: format,
            name: fileName,
            path: filePath,
            type: type,
        };
        return this._http.put(`${this.httpUrl}/contents/${filePath}`, json, this.httpOptions);
    }

    deleteFile(filePath: string) {
        return this._http.delete(`${this.httpUrl}/contents/${filePath}`, this.httpOptions);

    }
}
