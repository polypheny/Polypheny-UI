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
   * @param title Title of the message
   * @param message Message
   * @param delay After how many seconds the message should fade out. The message will be displayed permanently if delay = 0
   * @param type Set the type of the message, e.g. 'bg-success', 'bg-warning', 'bg-danger'
   */
  private toast(title: string, message: string, delay: number, type: String = '') {
    const t: Toast = new Toast(title, message, delay, type);
    //const d:Date = new Date();
    //this.toasts.set(d, t);
    this.toasts.set(t.hash, t);
    //this.toastEvent.next(this.toasts);
    if (t.delay > 0) {
      setTimeout(() => {
        this.toasts.delete(t.hash);
        //this.toastEvent.next(this.toasts);
      }, t.delay * 1000);
    }
  }

  /**
   * Generate a success toast message
   * @param message Message
   * @param title Title of the message, default: 'success'. If null, it will be set to 'success'
   * @param duration Optional. Set the duration of the toast message. Default: NORMAL
   */
  success(message: string, title = 'success', duration: ToastDuration = ToastDuration.NORMAL) {
    if (!title) {
      title = 'success';
    }
    this.toast(title, message, duration.valueOf(), 'bg-success');
  }

  /**
   * Generate a warning toast message. Use this method for errors caught by the UI.
   * @param message Message
   * @param title Title of the message, default: 'warning'. If null, it will be set to 'warning'
   * @param duration Optional. Set the duration of the toast message. Default LONG
   */
  warn(message: string, title = 'warning', duration: ToastDuration = ToastDuration.LONG) {
    if (!title) {
      title = 'warning';
    }
    this.toast(title, message, duration.valueOf(), 'bg-warning');
  }

  /**
   * Generate a error toast message. Use this method for errors from the backend.
   * @param message Message
   * @param title Title of the message, default: 'error'. If null, it will be set to 'error'
   * @param duration Optional. Set the duration of the toast message. Default LONG
   */
  error(message: string, title = 'error', duration: ToastDuration = ToastDuration.LONG) {
    if (!title) {
      title = 'error';
    }
    this.toast(title, message, duration.valueOf(), 'bg-danger');
  }

  deleteToast(key) {
    this.toasts.delete(key);
    //this.toastEvent.next( this.toasts );
  }

}

/**
 * Duration of a toast message
 * INFINITE: will only close when the user clicks on it
 * SHORT: for a very short notice
 * NORMAL: the default for success messages
 * LONG: a longer message, default for warning and error messages
 */
export enum ToastDuration {
  INFINITE = 0,
  SHORT = 2,
  NORMAL = 5,
  LONG = 10
}
