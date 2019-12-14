import {Component, Input, OnInit} from '@angular/core';
import { InformationObject } from '../../../models/information-page.model';

@Component({
  selector: 'app-render-item',
  templateUrl: './render-item.component.html',
  styleUrls: ['./render-item.component.scss']
})
export class RenderItemComponent implements OnInit {

  @Input() li:InformationObject;

  constructor() { }

  ngOnInit() { }

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

  getCodeHeight(){
    if( ! this.li.code ){
      return '20px';
    } else {
      const numberOfLines = this.li.code.match( /\n/g ).length;
      return numberOfLines*16 + 60 + 'px';
    }
  }

}
