import {Component, signal} from '@angular/core';
import {portTypeIcons, stateColors} from '../editor/activity/activity.component';
import {ActivityState} from '../../../models/workflows.model';
import {PortType} from '../../../models/activity-registry.model';

type HelpTabs = 'intro' | 'control' | 'variables' | 'optimization' | 'nested';

@Component({
    selector: 'app-workflow-help',
    templateUrl: './workflow-help.component.html',
    styleUrl: './workflow-help.component.scss',
    standalone: false
})
export class WorkflowHelpComponent {

    protected readonly stateColors = stateColors;
    protected readonly portTypeIcons = portTypeIcons;
    protected readonly ActivityState = ActivityState;
    protected readonly PortType = PortType;


    readonly helpTab = signal<HelpTabs>('intro');
    readonly showHelpModal = signal(false);

    readonly stripedColor = `repeating-linear-gradient(                    135deg,
                    ${stateColors[ActivityState.SAVED]}, ${stateColors[ActivityState.SAVED]} 10px,
                    ${stateColors[ActivityState.FINISHED]} 10px, ${stateColors[ActivityState.FINISHED]} 20px
                )`;


    toggleHelpModal() {
        this.showHelpModal.update(b => !b);
    }
}
