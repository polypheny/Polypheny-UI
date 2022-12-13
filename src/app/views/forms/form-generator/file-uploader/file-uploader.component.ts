import { Component, OnInit } from '@angular/core';
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
      msg += filesKey.name;
    }
    return msg;
  }

  loadPlugins() {
    this.isLoading = true;
    this.uploadProgress = 0;
    this._plugin.loadPlugins(this.files).subscribe( res => {
      if (res.type && res.type === HttpEventType.DownloadProgress) {
        this.uploadProgress = Math.round(100 * res.loaded / res.total);
      } else if (res.type === HttpEventType.Response) {
        this._toast.success('Plugins were loaded successfully.');
        this.isLoading = false;
      }
    }, err => {
      console.log(err);
      this._toast.error(err.message);
      this.isLoading = false;
    });

  }
}
