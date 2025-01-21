import {Injectable, signal} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {ActivityModel, ExecutionMonitorModel, SessionModel, Variables, WorkflowConfigModel, WorkflowDefModel, WorkflowModel} from '../models/workflows.model';
import {ActivityDefModel, ActivityRegistry} from '../models/activity-registry.model';

class JsonNode {
}

@Injectable({
    providedIn: 'root'
})
export class WorkflowsService {

    private activityRegistry: ActivityRegistry;
    registryLoaded = signal(false);

    constructor(private _http: HttpClient, private _settings: WebuiSettingsService) {
        this._http.get<Record<string, ActivityDefModel>>(`${this.httpUrl}/registry`, this.httpOptions).subscribe({
            next: defs => {
                this.activityRegistry = new ActivityRegistry(defs);
                console.log(defs);
                this.registryLoaded.set(true);
            }
        });
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

    getWorkflowVariables(sessionId: string) {
        return this._http.get<Variables>(`${this.httpUrl}/sessions/${sessionId}/workflow/variables`, this.httpOptions);
    }

    getExecutionMonitor(sessionId: string) {
        return this._http.get<ExecutionMonitorModel>(`${this.httpUrl}/sessions/${sessionId}/workflow/monitor`, this.httpOptions);
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

    createSession(workflowName: string, group: string) {
        const json = {
            name: workflowName,
            group: group
        };
        return this._http.post<string>(`${this.httpUrl}/sessions`, json, this.httpOptions);
    }

    openWorkflow(workflowId: string, version: number) {
        return this._http.post<string>(`${this.httpUrl}/workflows/${workflowId}/${version}`, {}, this.httpOptions);
    }

    renameWorkflow(workflowId: string, newName: string = null, newGroup: string = null) {
        const json = {
            name: newName,
            group: newGroup
        };
        return this._http.patch<string>(`${this.httpUrl}/workflows/${workflowId}`, json, this.httpOptions);
    }

    deleteWorkflow(workflowId: string) {
        return this._http.delete<void>(`${this.httpUrl}/workflows/${workflowId}`, this.httpOptions);
    }

    deleteVersion(workflowId: string, version: number) {
        return this._http.delete<void>(`${this.httpUrl}/workflows/${workflowId}/${version}`, this.httpOptions);
    }

    saveSession(sessionId: string, saveMessage: string) {
        const json = {
            message: saveMessage
        };
        return this._http.post<number>(`${this.httpUrl}/sessions/${sessionId}/save`, json, this.httpOptions); // returns the new version
    }

    terminateSession(sessionId: string) {
        return this._http.delete<void>(`${this.httpUrl}/sessions/${sessionId}`, this.httpOptions);
    }

    getRegistry() {
        return this.activityRegistry;
    }
}
