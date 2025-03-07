import {Component, inject} from '@angular/core';
import {JobCreatorService} from '../../../services/job-creator.service';

@Component({
    selector: 'app-job-creator',
    templateUrl: './job-creator.component.html',
    styleUrl: './job-creator.component.scss'
})
export class JobCreatorComponent {
    readonly _creator = inject(JobCreatorService);

    saveJob() {
        if (this._creator.isValid()) {
            this._creator.buildAndSave();
        }
    }
}
