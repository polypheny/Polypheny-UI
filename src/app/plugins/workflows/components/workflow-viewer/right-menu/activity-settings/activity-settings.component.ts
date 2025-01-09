import {Component, effect, input, signal} from '@angular/core';
import {GroupDef} from '../../../../models/activity-registry.model';
import {Activity} from '../../workflow';

@Component({
    selector: 'app-activity-settings',
    templateUrl: './activity-settings.component.html',
    styleUrl: './activity-settings.component.scss'
})
export class ActivitySettingsComponent {
    activity = input.required<Activity>();
    activeSettingGroup = signal<GroupDef>(null);

    constructor() {
        effect(() => this.activeSettingGroup.set(this.activity().def.getFirstGroup()), {allowSignalWrites: true});
    }

}
