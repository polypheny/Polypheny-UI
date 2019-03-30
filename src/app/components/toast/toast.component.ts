import {Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss']
})
export class ToastComponent implements OnInit {

  @Input() toasts: Toast[];

  constructor() { }

  ngOnInit() {
  }

  closeToast(key) {
    //todo https://www.pluralsight.com/guides/angular-communication-between-components-input-output-properties
    delete this.toasts[key];
  }

}
export class Toast{
  title: string;
  message: string;
  delay:number;//hide after delay, todo
  time: String;

  constructor(title:string, message:string){
    this.title = title;
    this.message = message;
    const d = new Date();
    this.time = d.getHours()+':'+d.getMinutes();
  }
}
