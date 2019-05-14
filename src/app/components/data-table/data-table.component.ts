import {Component, Input, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {TableConfig} from './table-config';
import * as $ from 'jquery';

@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss']
})
export class DataTableComponent implements OnInit {
  @Input() data: any[];
  @Input() config?: TableConfig;

  defaultConfig: TableConfig = {
    create: true,
    update: true,
    delete: true,
    sort: true,
    search: true
  };

  constructor() {
    //for testing
    const a = [
      [1,2,3],
      [4,5,6],
      [7,8,9]
    ];
    this.data = a;
  }


  ngOnInit() {
    this.setConfig();

    if(this.defaultConfig.update){
      this.documentListener();
    }
  }

  setConfig(){
    if(this.config){
      for (const prop in this.config) {
        if (this.defaultConfig.hasOwnProperty(prop)) {
          this.defaultConfig[prop] = this.config[prop];
        }
      }
    }
  }

  triggerEditing(d){
    if(this.defaultConfig.update){
      d.editing = true;
    }
  }

  documentListener(){
    const self = this;
    $(document).on('click', function(e){
      if(!$(e.target).hasClass('editing')){
        for(const d of self.data){
          //d.editing = false;//todo
        }
        // todo save changes
      }
    });
  }

}
