import {Injectable} from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class UtilService {

    textareaHeight(val: string) {
        val = val || '';
        return Math.min(val.split('\n').length, 5);
    }

    //see https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string/10420404
    humanFileSize(size: number): string {
        if (size !== 0 && !size) {
            return;
        }
        const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1000));
        return +(size / Math.pow(1000, i)).toFixed(2) + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
    }

    limitedString(str: string, maxLength = 120, postfix = '...') {
        if (str === undefined || str === null) {
            return;
        }
        if (str.length <= maxLength) {
            return str;
        }
        return str.slice(0, maxLength) + postfix;
    }

    /**
     * Modulo for negative numbers
     * from https://stackoverflow.com/questions/4467539/javascript-modulo-gives-a-negative-result-for-negative-numbers
     */
    mod(n, m) {
        return ((n % m) + m) % m;
    }

    /**
     * Copy a string to the clipboard
     */
    // from https://stackoverflow.com/questions/49102724/angular-5-copy-to-clipboard
    clipboard(msg: string) {
        const selBox = document.createElement('textarea');
        selBox.style.position = 'fixed';
        selBox.style.left = '0';
        selBox.style.top = '0';
        selBox.style.opacity = '0';
        selBox.value = msg;
        document.body.appendChild(selBox);
        selBox.focus();
        selBox.select();
        document.execCommand('copy');
        document.body.removeChild(selBox);
    }

}
