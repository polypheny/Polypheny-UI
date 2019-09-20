import { Injectable } from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {Toast} from './toast.model';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  public toasts: Map<string, Toast> = new Map<string, Toast>();
  //public toastEvent: BehaviorSubject<Map<Date, Toast>> = new BehaviorSubject<Map<Date, Toast>>( new Map<Date, Toast>() );

  constructor() { }

  /**
   * Generate a toast message
   * @param title title of the message
   * @param message message
   * @param delay After how many seconds the message should fade out. The message will be displayed permanently if delay = 0
   * @param type Set the type of the message, e.g. 'bg-success', 'bg-warning', 'bg-danger'
   */
  toast(title:string, message:string, delay:number, type:String=''){
    const t:Toast = new Toast( title, message, delay, type );
    //const d:Date = new Date();
    //this.toasts.set(d, t);
    this.toasts.set ( t.hash, t);
    //this.toastEvent.next(this.toasts);
    if(t.delay > 0){
      setTimeout( () => {
        this.toasts.delete( t.hash );
        //this.toastEvent.next(this.toasts);
      }, t.delay*1000 );
    }
  }

  deleteToast ( key ) {
    this.toasts.delete( key );
    //this.toastEvent.next( this.toasts );
  }

}
