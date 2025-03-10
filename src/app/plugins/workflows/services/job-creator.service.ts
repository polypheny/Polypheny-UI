import {computed, inject, Injectable, signal} from '@angular/core';
import {WorkflowsService} from './workflows.service';
import {JobModel, TriggerType, Variables, WorkflowDefModel} from '../models/workflows.model';
import * as uuid from 'uuid';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {Subject} from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class JobCreatorService {
    private readonly _workflows = inject(WorkflowsService);
    private readonly _toast = inject(ToasterService);

    readonly showModal = signal(false);
    readonly isModifying = signal(false);
    private readonly jobSaveSubject = new Subject<JobModel>();

    jobId: string;
    type: TriggerType;
    workflowName: string;
    version: number;
    enableOnStartup: boolean;
    name: string;
    maxRetries: number;
    performance: boolean;
    variables: Variables;

    //scheduled
    schedule: string;


    workflowDefs = signal<Record<string, WorkflowDefModel>>({});
    workflowNames = computed<string[]>(() => {
        const names = Object.values(this.workflowDefs()).map(def => def.name);
        names.sort((a, b) => a.localeCompare(b));
        return names;
    });
    workflowNamesToId = computed(() => {
        const map = new Map<string, string>();
        Object.entries(this.workflowDefs()).forEach(([key, def]) => map.set(def.name, key));
        return map;
    });

    constructor() {
        this.updateDefs();
    }

    openCreate(type: TriggerType) {
        this.updateDefs();
        this.jobId = uuid.v4();
        this.type = type;
        this.workflowName = '';
        this.version = 1;
        this.enableOnStartup = false;
        this.name = 'New Job';
        this.maxRetries = 0;
        this.performance = false;
        this.variables = {};
        this.schedule = '0 * * * *';

        this.isModifying.set(false);
        this.showModal.set(true);
    }

    openModify(job: JobModel) {
        this.updateDefs();
        const def = this.workflowDefs()[job.workflowId];
        this.jobId = job.jobId;
        this.type = job.type;
        this.workflowName = def?.name || '';
        this.version = job.version;
        this.enableOnStartup = job.enableOnStartup;
        this.maxRetries = job.maxRetries;
        this.performance = job.performance;
        this.name = job.name;
        this.variables = job.variables;

        if (this.type === TriggerType.SCHEDULED) {
            this.schedule = job.schedule;
        }
        this.isModifying.set(true);
        this.showModal.set(true);
    }

    close() {
        this.showModal.set(false);
    }

    isValid(): boolean {
        if (!this.workflowNamesToId().has(this.workflowName)) {
            this._toast.warn('Workflow with name "' + this.workflowName + '" does not exists');
            return false;
        }
        const wId = this.workflowNamesToId().get(this.workflowName);
        const def = this.workflowDefs()[wId];
        if (!Object.keys(def.versions).includes(String(this.version))) {
            this._toast.warn('Workflow version "' + this.version + '" does not exist');
            return false;
        }
        return true;
    }

    build(): JobModel {
        const job = {
            jobId: this.jobId,
            type: TriggerType.SCHEDULED,
            workflowId: this.workflowNamesToId().get(this.workflowName),
            version: this.version,
            enableOnStartup: this.enableOnStartup,
            maxRetries: this.maxRetries,
            performance: this.performance,
            variables: this.variables,
            name: this.name
        };
        if (this.type === TriggerType.SCHEDULED) {
            job['schedule'] = this.schedule;
            return job;
        }
        throw new Error('Unknown job type');
    }

    buildAndSave() {
        this.jobSaveSubject.next(this.build());
    }

    onSaveJob() {
        return this.jobSaveSubject.asObservable();
    }

    private updateDefs() {
        this._workflows.getWorkflowDefs().subscribe(defs => this.workflowDefs.set(defs));
    }

}
