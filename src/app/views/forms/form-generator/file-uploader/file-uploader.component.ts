import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-file-uploader',
  templateUrl: './file-uploader.component.html',
  styleUrls: ['./file-uploader.component.scss']
})
export class FileUploaderComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files[0];

    // do something with the file
  }

}
