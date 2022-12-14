import {Component, Input, OnInit} from '@angular/core';
import {PluginService} from '../../../../services/plugin.service';
import {ToastService} from '../../../../components/toast/toast.service';
import {HttpEventType} from '@angular/common/http';

@Component({
  selector: 'app-file-uploader',
  templateUrl: './file-uploader.component.html',
  styleUrls: ['./file-uploader.component.scss']
})
export class FileUploaderComponent implements OnInit {
  public files: FileList;

  public isLoading = false;
  private uploadProgress = 0;

  @Input() loadPage: () => void;

  constructor(
      public _plugin: PluginService,
      public _toast: ToastService,
  ) { }

  ngOnInit(): void {
  }

  onFileSelected(event: Event) {
    this.files = (event.target as HTMLInputElement).files;
    console.log(this.files);
  }

  getFilesMessage() {
    let msg = '';
    for (const filesKey of Array.from( this.files)) {
      msg += filesKey.name + "\n";
    }
    return msg;
  }

  loadPlugins() {
    this.isLoading = true;
    this.uploadProgress = 0;
    this._plugin.loadPlugins(this.files).subscribe( res => {
      this.files = null;
      this.isLoading = false;
      this.loadPage();
    }, err => {
      console.log(err);
      this._toast.error(err.message);
      this.isLoading = false;
    });

  }
}
