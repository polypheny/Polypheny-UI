import {Component, signal} from '@angular/core';
import {portTypeIcons, stateColors} from '../editor/activity/activity.component';
import {ActivityState} from '../../../models/workflows.model';
import {PortType} from '../../../models/activity-registry.model';

type HelpTabs = 'intro' | 'control' | 'variables' | 'optimization';

@Component({
    selector: 'app-workflow-help',
    templateUrl: './workflow-help.component.html',
    styleUrl: './workflow-help.component.scss'
})
export class WorkflowHelpComponent {

    protected readonly stateColors = stateColors;
    protected readonly portTypeIcons = portTypeIcons;
    protected readonly ActivityState = ActivityState;
    protected readonly PortType = PortType;


    readonly helpTab = signal<HelpTabs>('intro');
    readonly showHelpModal = signal(false);


    toggleHelpModal() {
        this.showHelpModal.update(b => !b);
    }
}
