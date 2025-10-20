import {Component, computed, effect, input, OnInit, signal} from '@angular/core';
import {ActivityDef, GroupDef, portTypeToDataModel} from '../../../models/activity-registry.model';
import {KatexOptions} from 'ngx-markdown';

@Component({
    selector: 'app-activity-help',
    templateUrl: './activity-help.component.html',
    styleUrl: './activity-help.component.scss',
    standalone: false
})
export class ActivityHelpComponent implements OnInit {
    def = input.required<ActivityDef>();

    // if longDescription does not exist, it is set to shortDescription by backend, which could result in unescaped .md
    readonly requiresMarkdown = computed(() => this.def().shortDescription !== this.def().longDescription);
    activeSettingGroup = signal<GroupDef>(null);

    protected readonly portTypeToDataModel = portTypeToDataModel;

    readonly options: KatexOptions = {
        throwOnError: false,
        errorColor: '#f86c6b'
    };

    constructor() {
        effect(() => this.activeSettingGroup.set(this.def().getFirstGroup()), {allowSignalWrites: true});
    }

    ngOnInit(): void {
    }
}
