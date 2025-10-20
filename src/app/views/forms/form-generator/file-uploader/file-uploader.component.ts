import {Component, inject, Input, OnInit} from '@angular/core';
import {PluginService} from '../../../../services/plugin.service';
import {ToasterService} from '../../../../components/toast-exposer/toaster.service';

@Component({
    selector: 'app-file-uploader',
    templateUrl: './file-uploader.component.html',
    styleUrls: ['./file-uploader.component.scss'],
    standalone: false
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

    loadPlugins() {
        this.isLoading = true;
        this.uploadProgress = 0;
        this._plugin.loadPlugins(this.files).subscribe({
            next: res => {
                this.files = null;
                this.isLoading = false;
                this.loadPage();
            }, error: err => {
                console.log(err);
                this._toast.error(err.message);
                this.isLoading = false;
            }
        });
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
