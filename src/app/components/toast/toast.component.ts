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
  time: String;//time when toast is shown, for the gui
  type: String;

  constructor(title:string, message:string, delay:number = 0, type:String = ''){
    this.title = title;
    this.message = message;
    const d = new Date();
    this.time = d.getHours()+':'+d.getMinutes();
    this.type = type;
    this.delay = delay;//default 0 -> not removed automatically. if > 0: removed after n miliseconds
  }
}
