import {Component, Input, OnInit} from '@angular/core';
import {InformationObject, InformationResponse} from '../../../models/information-page.model';
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
    switch(col){
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
        if(li.value === undefined) return 'info';
        else{
          li.min = li.min || 0;
          li.max = li.max || 100;
          const current = li.value / li.max;
          if(current < 0.25) return 'info';
          else if(current < 0.5) return 'success';
          else if(current < 0.75) return 'warning';
          else return 'danger';
        }
      default:
        return 'info';
    }
  }

  getCodeHeight() {
    if (!this.li.code) {
      return '20px';
    } else {
      const numberOfLines = this.li.code.match(/\n/g).length;
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

}
