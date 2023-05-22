import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {Content, FileContent, KernelResponse, KernelSpecs, SessionResponse} from '../models/notebooks-response.model';
import {Notebook} from '../models/notebook.model';

@Injectable({
    providedIn: 'root'
})
export class NotebooksService {

    constructor(private _http: HttpClient, private _settings: WebuiSettingsService) {
    }

    private httpUrl = this._settings.getConnection('notebooks.rest');
    private httpOptions = {headers: new HttpHeaders({'Content-Type': 'application/json'})};

    getKernelspecs() {
        return this._http.get<KernelSpecs>(`${this.httpUrl}/kernelspecs`, this.httpOptions);
    }

    getContents(path: string, includeInnerContent = true) {
        const params = new HttpParams().append('content', includeInnerContent ? '1' : '0');
        return this._http.get<Content>(`${this.httpUrl}/contents/` + path,
            {...this.httpOptions, ...{params: params}});
    }

    getSession(sessionId: string) {
        return this._http.get<SessionResponse>(`${this.httpUrl}/sessions/` + sessionId, this.httpOptions);
    }

    getSessions() {
        return this._http.get<SessionResponse[]>(`${this.httpUrl}/sessions`, this.httpOptions);
    }

    getKernels() {
        return this._http.get<KernelResponse>(`${this.httpUrl}/kernels`, this.httpOptions);
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
        return this._http.post<SessionResponse>(`${this.httpUrl}/sessions`, json, this.httpOptions);
    }

    createFile(location: string, type: string) {
        const json = {
            type: type
        };
        return this._http.post<Content>(`${this.httpUrl}/contents/${location}`, json, this.httpOptions);
    }

    createFileWithExtension(location: string, type: string, ext: string) {
        if (type !== 'file') {
            return this.createFile(location, type);
        }
        const json = {
            type: type,
            ext: ext
        };
        return this._http.post<Content>(`${this.httpUrl}/contents/${location}`, json, this.httpOptions);
    }

    interruptKernel(kernelId: string) {
        return this._http.post(`${this.httpUrl}/kernels/${kernelId}/interrupt`, '', this.httpOptions);
    }

    restartKernel(kernelId: string) {
        return this._http.post<KernelResponse>(`${this.httpUrl}/kernels/${kernelId}/restart`, '', this.httpOptions);
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
        return this._http.patch<SessionResponse>(`${this.httpUrl}/sessions/${sessionId}`, json, this.httpOptions);
    }

    moveFile(srcFilePath: string, destFilePath: string) {
        const json = {
            path: destFilePath,
        };
        return this._http.patch<Content>(`${this.httpUrl}/contents/${srcFilePath}`, json, this.httpOptions);
    }

    updateFile(filePath: string, content, format: string, type: string) {
        const json = {
            content: content,
            format: format,
            type: type
        };
        return this._http.put<Content>(`${this.httpUrl}/contents/${filePath}`, json, this.httpOptions);
    }

    updateNotebook(filePath: string, content: Notebook) {
        const json = {
            content: content,
            format: 'json',
            type: 'notebook'
        };
        return this._http.put<Content>(`${this.httpUrl}/contents/${filePath}`, json, this.httpOptions);
    }

    deleteFile(filePath: string) {
        return this._http.delete(`${this.httpUrl}/contents/${filePath}`, this.httpOptions);

    }
}