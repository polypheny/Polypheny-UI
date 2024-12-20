import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {ActivityModel, SessionModel, WorkflowConfigModel, WorkflowDefModel, WorkflowModel} from '../models/workflows.model';

class JsonNode {
}

@Injectable({
    providedIn: 'root'
})
export class WorkflowsService {

    constructor(private _http: HttpClient, private _settings: WebuiSettingsService) {
    }

    private httpUrl = this._settings.getConnection('workflows.rest');
    private httpOptions = {headers: new HttpHeaders({'Content-Type': 'application/json'})};

    getSessions() {
        return this._http.get<Record<string, SessionModel>>(`${this.httpUrl}/sessions`, this.httpOptions);
    }

    getSession(sessionId: string) {
        return this._http.get<SessionModel>(`${this.httpUrl}/sessions/${sessionId}`, this.httpOptions);
    }

    getActiveWorkflow(sessionId: string) {
        return this._http.get<WorkflowModel>(`${this.httpUrl}/sessions/${sessionId}/workflow`, this.httpOptions);
    }

    getWorkflowConfig(sessionId: string) {
        return this._http.get<WorkflowConfigModel>(`${this.httpUrl}/sessions/${sessionId}/workflow/config`, this.httpOptions);
    }

    getActivity(sessionId: string, activityId: string) {
        return this._http.get<ActivityModel>(`${this.httpUrl}/sessions/${sessionId}/workflow/${activityId}`, this.httpOptions);
    }

    getIntermediaryResult(sessionId: string, activityId: string, outIndex: number) {
        return this._http.get<JsonNode>(`${this.httpUrl}/sessions/${sessionId}/workflow/${activityId}/${outIndex}`, this.httpOptions);
    }

    getWorkflowDefs() {
        return this._http.get<Record<string, WorkflowDefModel>>(`${this.httpUrl}/workflows`, this.httpOptions);
    }

    createSession(workflowName: string) {
        const json = {
            name: workflowName
        };
        return this._http.post<string>(`${this.httpUrl}/sessions`, json, this.httpOptions);
    }

    openWorkflow(workflowId: string, version: number) {
        return this._http.post<string>(`${this.httpUrl}/workflows/${workflowId}/${version}`, {}, this.httpOptions);
    }

    saveSession(sessionId: string, saveMessage: string) {
        const json = {
            message: saveMessage
        };
        return this._http.post<void>(`${this.httpUrl}/sessions/${sessionId}`, json, this.httpOptions);
    }

    terminateSession(sessionId: string) {
        return this._http.delete<void>(`${this.httpUrl}/sessions/${sessionId}`, this.httpOptions);
    }
}
