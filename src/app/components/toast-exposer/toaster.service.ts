import {Injectable} from '@angular/core';
import {Result} from '../data-view/models/result-set.model';
import {Subject} from 'rxjs';
import {Toast} from './toaster.model';

@Injectable({
    providedIn: 'root'
})
export class ToasterService {

    public toasts: Subject<Toast> = new Subject<Toast>();

    constructor() {
    }

    /**
     * Generate a toast message
     * @param title Title of the message
     * @param message Message
     * @param generatedQuery Generated query
     * @param delay After how many seconds the message should fade out. The message will be displayed permanently if delay = 0
     * @param type Set the type of the message, e.g. 'bg-success', 'bg-warning', 'bg-danger'
     */
    private generateToast(title: string, message: string, generatedQuery: string, delay: number, type: String = '') {
        const t: Toast = new Toast(title, message, generatedQuery, delay, type);
        this.toasts.next(t);
    }

    /**
     * Generate a success toast message
     * @param message Message
     * @param generatedQuery Generated query that can be copied to the clipboard
     * @param title Title of the message, default: 'success'. If null, it will be set to 'success'
     * @param duration Optional. Set the duration of the toast message. Default: NORMAL
     */
    success(message: string, generatedQuery: string = null, title = 'success', duration: ToastDuration = ToastDuration.NORMAL) {
        if (!title) {
            title = 'success';
        }
        this.generateToast(title, message, generatedQuery, duration.valueOf(), 'bg-success');
    }

    /**
     * Generate an info toast message
     * @param message Message
     * @param generatedQuery Generated query that can be copied to the clipboard
     * @param title Title of the message, default: 'info'. If null, it will be set to 'info'
     * @param duration Optional. Set the duration of the toast message. Default: NORMAL
     */
    info(message: string, generatedQuery: string = null, title = 'info', duration: ToastDuration = ToastDuration.NORMAL) {
        if (!title) {
            title = 'info';
        }
        this.generateToast(title, message, generatedQuery, duration.valueOf(), 'bg-info');
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
        this.generateToast(title, message, null, duration.valueOf(), 'bg-warning');
    }

    /**
     * Generate a error toast message. Use this method for uncaught errors from the backend.
     * @param message Message
     * @param title Title of the message, default: 'error'. If null, it will be set to 'error'
     * @param duration Optional. Set the duration of the toast message. Default LONG
     */
    error(message: string, title = 'error', duration: ToastDuration = ToastDuration.LONG) {
        if (!title) {
            title = 'error';
        }
        this.generateToast(title, message, null, duration.valueOf(), 'bg-danger');
    }

    /**
     * Generate an warning toast message. Use this method for ResultSets containing an error message (and optionally an exception with Stacktrace)
     * If the ResultSet contains a StackTrace, it will appear in a modal when clicking on the toast message
     * @param result ResultSet with the error message
     * @param message Additional message to the exception message (optional)
     * @param title Title of the message, default: 'error'. If null, it will be set to 'error'
     * @param duration Optional. Set the duration of the toast message. Default LONG
     */
    exception(result: Result<any, any>, message: string = null, title = 'error', duration = ToastDuration.LONG) {
        let msg = result.error;
        if (message) {
            if (message.endsWith(' ')) {
                msg = message + msg;
            } else {
                msg = message + ' ' + msg;
            }
        }
        if (!title) {
            title = 'error';
        }
        const t: Toast = new Toast(title, msg, result.query, duration, 'bg-warning');
        if (result.exception) {
            t.setException(result.exception);
        }
        this.toasts.next(t);
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
