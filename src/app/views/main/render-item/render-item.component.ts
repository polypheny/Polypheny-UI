import {Component, Input, OnInit} from '@angular/core';
import { RenderItem } from '../models';

@Component({
  selector: 'app-render-item',
  templateUrl: './render-item.component.html',
  styleUrls: ['./render-item.component.scss']
})
export class RenderItemComponent implements OnInit {

  @Input() li:RenderItem;

  constructor() { }

  ngOnInit() { }

  collapseTrigger() {
    if (this.li.isCollapsed !== undefined &&
      this.li.type === 'collapsible') {

      this.li.isCollapsed = !this.li.isCollapsed;
    }
  }

  displayProgressValue(li) {
    if((li.min===undefined || li.min===0) && (li.max===undefined || li.max===100)){
      return li.value+'%';
    }
    else{
      li.max = li.max ||100;
      return li.value + '/' + li.max;
    }
  }

  getProgressColor(li) {
    const col = li.color || 'dynamic';
    switch(col){
      case 'info':
      case 'blue':
        return 'info';
      case 'green':
      case 'success':
        return 'success';
      case 'yelllow':
      case 'warning':
        return 'warning';
      case 'red':
      case 'danger':
        return 'danger';
      case 'dark':
      case 'black':
        return 'dark';
      case 'dynamic':
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

}
