import {Component, computed, effect, inject, OnInit, signal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {ToasterService} from '../../../../components/toast-exposer/toaster.service';
import {LeftSidebarService} from '../../../../components/left-sidebar/left-sidebar.service';
import {WorkflowsService} from '../../services/workflows.service';
import {JobModel, SessionModel} from '../../models/workflows.model';
import {JobCreatorService} from '../../services/job-creator.service';
import {Subscription} from 'rxjs';

@Component({
    selector: 'app-workflow-job',
    templateUrl: './workflow-job.component.html',
    styleUrl: './workflow-job.component.scss'
})
export class WorkflowJobComponent implements OnInit {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _toast = inject(ToasterService);
    private readonly _sidebar = inject(LeftSidebarService);
    private readonly _workflows = inject(WorkflowsService);
    readonly _creator = inject(JobCreatorService);
    private readonly subscriptions = new Subscription();

    jobId = signal<string>(null);
    job = signal<JobModel>(null);
    sessionId = computed<string>(() => this.job()?.sessionId);
    session = signal<SessionModel>(null);
    isEnabled = computed(() => this.job().sessionId != null);

    constructor() {
        effect(() => this.updateSession(), {allowSignalWrites: true});
    }

    ngOnInit(): void {
        this._sidebar.hide();
        this.subscriptions.add(this._creator.onSaveJob().subscribe(job => this.updateModifiedJob(job)));
        this._route.paramMap.subscribe(params => {
            this.jobId.set(params.get('jobId'));
            if (this.jobId()) {
                this._workflows.getJobs().subscribe({
                    next: res => {
                        this.job.set(res[this.jobId()]);
                        if (!this.job()) {
                            this.backToDashboard();
                        }
                    },
                    error: () => this.backToDashboard()
                });
            }
        });
        this.jobId.set(this._route.snapshot.paramMap.get('jobId'));
    }

    backToDashboard() {
        this._router.navigate(['/views/workflows/jobs']); // TODO: job page
    }

    enableJob() {
        this._workflows.enableJob(this.jobId()).subscribe({
            next: sessionId => this.job.update(job => ({...job, sessionId})),
            error: err => this._toast.error(err.error)
        });
    }

    disableJob() {
        this._workflows.disableJob(this.jobId()).subscribe({
            next: () => this.job.update(job => ({...job, sessionId: null})),
            error: err => this._toast.error(err.error)
        });

    }

    executeJob() {
        this._workflows.triggerJob(this.jobId()).subscribe({
            next: () => this.updateSession(),
            error: err => this._toast.error(err.error)
        });
    }

    updateSession() {
        // TODO: periodically check for changes
        if (this.sessionId?.()) {
            this._workflows.getSession(this.sessionId()).subscribe({
                next: res => this.session.set(res)
            });
        } else {
            this.session.set(null);
        }

    }

    openSession() {
        this._router.navigate([`/views/workflows/sessions/${this.sessionId()}`]);
    }

    editJob() {
        this._creator.openModify(this.job());
    }

    deleteJob() {
        this._workflows.deleteJob(this.jobId()).subscribe({
            next: () => {
                this.backToDashboard();
                this._toast.success('Job was successfully deleted');
            },
            error: err => this._toast.error(err.error)
        });
    }

    private updateModifiedJob(job: JobModel) {
        console.log('modified job', job);
        this._workflows.setJob(job).subscribe({
            next: jobId => {
                this._creator.close();
                this.job.set(job);
            },
            error: err => this._toast.error(err.error)
        });
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }
}
