import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class LogicService {

  constructor( private _http:HttpClient ) { }

  path = '/home';

  httpUrl = 'http://localhost:8081';
  httpOptions = { headers: new HttpHeaders({'Content-Type': 'application/json'})};

  // rendering routerLinks from string might not be possible:7
  // https://www.intertech.com/Blog/angular-4-case-study-caution-about-binding-html-content-using-innerhtml/
  // workarounds:
  // https://stackoverflow.com/questions/44613069/angular4-routerlink-inside-innerhtml-turned-to-lowercase

  getDatabases() {
    return [
      {
        list: [
          {type: 'header', label: 'DB1', routerLink: this.path+'/db/1', button: [
              {icon: 'icon-layers btn btn-light btn-sm', routerLink: ['/graphical-querying/1']},
              {icon: 'icon-vector btn btn-light btn-sm', routerLink: ['/uml/1']}
            ]},
          {type: 'collapsible', label: 'schemas:', badge: '2', isCollapsed: false, items: [
              {type: 'link', label: 'schema1', routerLink: this.path+'/schema/1'},
              {type: 'link', label: 'schema2', routerLink: this.path+'/schema/2'}
            ]
          },
          {type: 'progress', label: 'cpu', value: 30},
          {type: 'progress', label: 'memory', value: 70}
        ]
      },
      {
        list: [
          {type: 'header', label: 'DB2', routerLink: this.path+'/db/2', button: [
              {icon: 'icon-layers btn btn-light btn-sm', routerLink: ['/graphical-querying/1']},
              {icon: 'icon-vector btn btn-light btn-sm', routerLink: ['/uml/1']}
            ]},
          {type: 'collapsible', label: 'schemas:', badge: '2', isCollapsed: true, items: [
              {type: 'link', label: 'schema1', routerLink: this.path+'/schema/1'},
              {type: 'link', label: 'schema2', routerLink: this.path+'/schema/2'}
            ]
          },
          {type: 'progress', label: 'cpu', value: 30},
          {type: 'progress', label: 'memory', value: 70}
        ]
      }
    ];
  }

  getSchemas(db) {
    if(!db) db = 0;
    return [
      {
        list: [
          {type: 'header', label: 'schema1', routerLink: this.path+'/schema/1', button: [
              {icon: 'icon-layers btn btn-light btn-sm', routerLink: ['/graphical-querying/1']},
              {icon: 'icon-vector btn btn-light btn-sm', routerLink: ['/uml/1']}
            ]},
          {type: 'collapsible', label: 'tables:', badge: '2', isCollapsed: false, items: [
              {type: 'link', label: 'table1', routerLink: this.path+'/table/1'},
              {type: 'link', label: 'table2', routerLink: this.path+'/table/2'}
            ]
          }
        ]
      },
      {
        list: [
          {type: 'header', label: 'schema2', routerLink: this.path+'/schema/1', button: [
              {icon: 'icon-layers btn btn-light btn-sm', routerLink: ['/graphical-querying/1']},
              {icon: 'icon-vector btn btn-light btn-sm', routerLink: ['/uml/1']}
            ]},
          {type: 'collapsible', label: 'tables:', badge: '2', isCollapsed: false, items: [
              {type: 'link', label: 'table1', routerLink: this.path+'/table/1'},
              {type: 'link', label: 'table2', routerLink: this.path+'/table/2'}
            ]
          }
        ]
      }
    ];
  }

  getTables(schema) {
    return [
      {
        list: [
          {type: 'header', label: 'table1', routerLink: this.path+'/table/1', button: [
              {icon: 'fa fa-table btn btn-light btn-sm', routerLink: ['/data-table/1']},
              {icon: 'icon-list btn btn-light btn-sm', routerLink: ['/edit-columns/1']}
            ]},
          {type: 'collapsible', label: 'columns:', badge: '2', isCollapsed: false, items: [
              {type: 'link', label: 'column1', routerLink: this.path+'/table/1'},
              {type: 'link', label: 'column2', routerLink: this.path+'/table/2'}
            ]
          },
          {type: 'progress', label: 'cpu', value: 30},
          {type: 'progress', label: 'memory', value: 70}
        ]
      },
      {
        list: [
          {type: 'header', label: 'table2', routerLink: this.path+'/table/2', button: [
              {icon: 'fa fa-table btn btn-light btn-sm', routerLink: ['/data-table/1']},
              {icon: 'icon-list btn btn-light btn-sm', routerLink: ['/edit-columns/1']}
            ]},
          {type: 'collapsible', label: 'columns:', badge: '2', isCollapsed: false, items: [
              {type: 'link', label: 'column1', routerLink: this.path+'/table/1'},
              {type: 'link', label: 'column2', routerLink: this.path+'/table/2'}
            ]
          },
          {type: 'progress', label: 'cpu', value: 30},
          {type: 'progress', label: 'memory', value: 70}
        ]
      }
    ];
  }

  getColumns(table) {
    return [
      {
        list: [
          {type: 'header', label: 'col1'},
          {label: 'some info'},
          {label: 'more info'}
        ]
      },
      {
        list: [
          {type: 'header', label: 'col2'},
          {label: 'some info'},
          {label: 'more info'}
        ]
      }    ];
  }

}
