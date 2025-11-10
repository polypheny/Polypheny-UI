import {Component, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {ToasterService} from '../../../../../components/toast-exposer/toaster.service';
import {WorkflowsService} from '../../../services/workflows.service';
import {JobModel, TriggerType} from '../../../models/workflows.model';
import {Router} from '@angular/router';
import {JobCreatorService} from '../../../services/job-creator.service';
import {Subscription} from 'rxjs';

@Component({
    selector: 'app-job-list',
    templateUrl: './job-list.component.html',
    styleUrl: './job-list.component.scss'
})
export class JobListComponent implements OnInit, OnDestroy {
    private readonly _toast = inject(ToasterService);
    private readonly _workflows = inject(WorkflowsService);
    private readonly _router = inject(Router);
    readonly _creator = inject(JobCreatorService);
    private readonly subscriptions = new Subscription();

    jobs = signal<JobModel[]>([]);
    triggerType: TriggerType = TriggerType.SCHEDULED;

    ngOnInit(): void {
        this._workflows.getJobs().subscribe(res => this.jobs.set(Object.values(res)));
        this.subscriptions.add(this._creator.onSaveJob().subscribe(job => this.createScheduledJob(job)));
    }

    createScheduledJob(job: JobModel) {
        this._workflows.setJob(job).subscribe({
            next: jobId => {
                this._creator.close();
                this.openJob(jobId);
            },
            error: err => this._toast.error(err.error)
        });
    }

    openJob(jobId: string) {
        this._router.navigate([`/views/workflows/jobs/${jobId}`]);
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }
}
