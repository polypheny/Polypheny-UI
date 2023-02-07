import {Component, Input, OnInit} from '@angular/core';
import {Duration, InformationObject, InformationResponse} from '../../../models/information-page.model';
import {InformationService} from '../../../services/information.service';
import {ToastService} from '../../toast/toast.service';

@Component({
    selector: 'app-render-item',
    templateUrl: './render-item.component.html',
    styleUrls: ['./render-item.component.scss']
})
export class RenderItemComponent implements OnInit {

    @Input() li: InformationObject;
    executingInformationAction = false;

    constructor(
        private _infoService: InformationService,
        private _toast: ToastService
    ) {
    }

    ngOnInit() {
    }

    displayProgressValue(li) {
        if ((li.min === undefined || li.min === 0) && (li.max === undefined || li.max === 100)) {
            return li.value + '%';
        } else {
            li.max = li.max || 100;
            return li.value + '/' + li.max;
        }
    }

    getProgressColor(li) {
        const col = li.color || 'dynamic';
        switch (col) {
            case 'BLUE':
                return 'info';
            case 'GREEN':
                return 'success';
            case 'YELLOW':
                return 'warning';
            case 'RED':
                return 'danger';
            case 'BLACK':
                return 'dark';
            case 'DYNAMIC':
                if (li.value === undefined) {
                    return 'info';
                } else {
                    li.min = li.min || 0;
                    li.max = li.max || 100;
                    const current = li.value / li.max;
                    if (current < 0.25) {
                        return 'info';
                    } else if (current < 0.5) {
                        return 'success';
                    } else if (current < 0.75) {
                        return 'warning';
                    } else {
                        return 'danger';
                    }
                }
            default:
                return 'info';
        }
    }

    getCodeHeight() {
        if (!this.li.code) {
            return '20px';
        } else {
            const match = this.li.code.match(/\n/g);
            let numberOfLines = 1;
            if (Array.isArray(match)) {
                numberOfLines = this.li.code.match(/\n/g).length;
            }

            return numberOfLines * 16 + 60 + 'px';
        }
    }

    executeInformationAction(i: InformationObject) {
        this.executingInformationAction = true;
        this._infoService.executeAction(i).subscribe(
            res => {
                const result = <InformationResponse>res;
                if (result.errorMsg) {
                    this._toast.warn(result.errorMsg);
                } else if (result.successMsg) {
                    this._toast.success(result.successMsg);
                }
            }, err => {
                console.log(err);
                this._toast.error(err.message);
            }
        ).add(() => this.executingInformationAction = false);
    }

    displayTime(nanoSecs: number) {
        const text = [];
        if (Math.floor(nanoSecs / 3.6e12) > 1) {
            text.push(Math.floor(nanoSecs / 3.6e12) + 'h');
            nanoSecs = nanoSecs % 3.6e12;
        }
        if (Math.floor(nanoSecs / 6e10) > 1) {
            text.push(Math.floor(nanoSecs / 6e10) + 'min');
            nanoSecs = nanoSecs % 6e10;
        }
        if (Math.floor(nanoSecs / 1e9) > 1) {
            text.push(Math.floor(nanoSecs / 1e9) + 's');
            nanoSecs = nanoSecs % 1e9;
        }
        if (Math.floor(nanoSecs / 1e6) > 1) {
            text.push(Math.floor(nanoSecs / 1e6) + 'ms');
            nanoSecs = nanoSecs % 1e6;
        }
        text.push(nanoSecs + 'ns');
        return text.join(' ');
    }

    showTotalDuration(d: InformationObject) {
        return d.name == null && d.children && d.children.length !== 1;
    }

    castDuration(d: Duration): InformationObject {
        return <InformationObject>d;
    }

    /**
     * Get the width in percent
     * Min-width is 5px (set by CSS)
     */
    getProgressWidth(parent: Duration, child: Duration) {
        let total = 0;
        for (const c of parent.children) {
            total += c.duration;
        }
        return child.duration / total * 100;
    }

    getDurationColor(i: number) {
        //alternate between blue and yellow
        const colors = ['', 'bg-warning'];
        return colors[i % colors.length];
    }

    parameterWarning(i: InformationObject, tooltip) {
        let show = false;
        for (const p of Object.keys(i.parameters)) {
            if (!i.parameters[p]) {
                show = true;
            }
        }
        if (show) {
            tooltip.show();
        }
    }

    trackBy(index: any, item: any) {
        return index;
    }

}
