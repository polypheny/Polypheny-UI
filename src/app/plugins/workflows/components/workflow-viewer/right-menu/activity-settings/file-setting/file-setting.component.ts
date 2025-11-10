import {Component, computed, EventEmitter, input, model, OnInit, Output, signal} from '@angular/core';
import {SettingDefModel} from '../../../../../models/activity-registry.model';
import {TypePreviewModel} from '../../../../../models/workflows.model';

@Component({
    selector: 'app-file-setting',
    templateUrl: './file-setting.component.html',
    styleUrl: './file-setting.component.scss'
})
export class FileSettingComponent implements OnInit {
    isEditable = input.required<boolean>();
    settingDef = input.required<SettingDefModel>();
    inTypePreview = input.required<TypePreviewModel[]>(); // not required for int
    value = model.required<any>();
    @Output() hasChanged = new EventEmitter<void>();

    def = computed<FileSettingDef>(() => this.settingDef() as FileSettingDef);
    val = computed(() => this.value() as FileValue); // like value, but with correct type

    readonly modes: { type: SourceType, name: string, allowMultiple: boolean }[] = [
        {type: 'ABS_FILE', name: 'File Path', allowMultiple: true},
        {type: 'REL_FILE', name: 'Relative File Path', allowMultiple: true},
        {type: 'URL', name: 'URL', allowMultiple: false}
    ];
    allowedModes = computed(() => this.modes.filter(m => this.def().modes.includes(m.type)));
    showMulti = computed(() => {
            this.changed();
            return this.def().allowMultiple &&
                this.allowedModes().find(m => m.type === this.val().type)?.allowMultiple;
        }
    );
    private changed = signal(false); // dummy signal to trigger recomputation

    ngOnInit(): void {
    }


    valueChanged() {
        setTimeout(() => this.hasChanged.emit(), 1);
        this.changed.update(v => !v);
    }

    selectType(option: { type: SourceType; name: string; allowMultiple: boolean }) {
        if (!option.allowMultiple && this.val().multi) {
            this.val().multi = false;
        }
        this.val().type = option.type;
        this.valueChanged();
    }
}

type SourceType = 'ABS_FILE' | 'REL_FILE' | 'URL';

interface FileSettingDef extends SettingDefModel {
    allowMultiple: boolean;
    modes: SourceType[];
}

interface FileValue {
    path: string;
    type: SourceType;
    multi: boolean;
}
