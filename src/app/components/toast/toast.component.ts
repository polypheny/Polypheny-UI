import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {KeyValue} from '@angular/common';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss']
})
export class ToastComponent implements OnInit {

  @Input() toastEvent: BehaviorSubject<Map<Date, Toast>>;
  @Output() toastDeleted = new EventEmitter();
  toasts: Map<Date, Toast>;

  constructor() { }

  ngOnInit() {
    this.toastEvent.asObservable().subscribe( t => {
      this.toasts = t;
    });
  }

  closeToast(key) {
    //todo https://www.pluralsight.com/guides/angular-communication-between-components-input-output-properties
    this.toasts.delete(key);
    this.toastDeleted.emit(this.toasts);
  }

  /**
   * show newest toasts before the older ones
   */
  private orderToasts( a: KeyValue<string, any>, b: KeyValue<string, any>) {
    return b.value.time - a.value.time;
  }

}

export class Toast{
  title: string;
  message: string;
  delay:number;//hide after delay, todo
  timeAsString: String;//timeAsString when toast is shown, for the gui
  time: Date;
  type: String;


  constructor(title:string, message:string, delay:number = 0, type:String = ''){
    this.title = title;
    this.message = message;
    const d = new Date();
    this.time = d;
    this.timeAsString = d.getHours()+':'+d.getMinutes()+':'+d.getSeconds();
    this.type = type;
    this.delay = delay;//default 0 -> not removed automatically. if > 0: removed after n miliseconds
  }
}
