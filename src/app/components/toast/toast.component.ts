import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {KeyValue} from '@angular/common';
import {ToastService} from './toast.service';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss']
})
export class ToastComponent implements OnInit {

  toasts = this._toast.toasts;

  constructor( private _toast: ToastService ) { }

  ngOnInit() {}

  closeToast(key) {
    this._toast.deleteToast(key);
    //todo close by swiping:
      //https://stackoverflow.com/questions/22078941/minimum-drag-swipe-distance-with-hammer-js
      //(swipeleft)="closeToast(toast.key)"
  }

  /**
   * show newest toasts before the older ones
   */
  orderToasts( a: KeyValue<string, any>, b: KeyValue<string, any>) {
    return b.value.time - a.value.time;
  }

}
