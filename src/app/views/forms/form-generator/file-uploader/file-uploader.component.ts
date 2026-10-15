import {Component, inject, Input, OnInit} from '@angular/core';
import {PluginService} from '../../../../services/plugin.service';
import {ToasterService} from '../../../../components/toast-exposer/toaster.service';

@Component({
    selector: 'app-file-uploader',
    templateUrl: './file-uploader.component.html',
    styleUrls: ['./file-uploader.component.scss']
})
export class FileUploaderComponent implements OnInit {
    public readonly _plugin = inject(PluginService);
    public readonly _toast = inject(ToasterService);

    public files: File[];

    public isLoading = false;
    private uploadProgress = 0;

    @Input() loadPage: () => void;

    constructor() {
    }

    ngOnInit(): void {
    }

    onFileSelected(event: Event) {
        this.files = Array.from((event.target as HTMLInputElement).files);
    }

    removeFile(file
                   :
                   File
    ) {
        this.files = this.files.filter(f => f.name !== file.name);
    }

    hasFiles() {
        return this.files && this.files.length > 0;
    }
}
