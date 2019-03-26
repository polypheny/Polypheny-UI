import { Component, OnInit } from '@angular/core';
import {LogicService} from '../../../services/logic.service';

@Component({
  selector: 'app-form-generator',
  templateUrl: './form-generator.component.html',
  styleUrls: ['./form-generator.component.scss']
})
export class FormGeneratorComponent implements OnInit {

  formObj;

  constructor( private _logic:LogicService ) {
    this.formObj = formObj;
  }

  ngOnInit() {
    this._logic.register('server.port', 'descr').subscribe(
      res => {
        console.log(res);
      },
      err => {
        console.log(err);
      }
    );
  }

}

export const formObj = {
  groups: [
    {title: 'Personalien', items: [
        {label: 'Name', value: 'Juri', type: 'text', key:'name', validation: {required: true}},
        {label: 'Age', value: 32, type: 'number', key:'age'},
        {label: 'Gender', value: 'M', type: 'radio', key:'gender', options: [
        { label: "Male", value: 'M', checked: true},
        { label: "Female", value: 'F'}
        ]}
      ]
    },
    {
    title: 'mehr', items: [
      {label: 'is-cool', type: 'checkbox', key:'iscool', value: false},
      {label: 'range',type: 'range',min: 10,max: 60,step: 5,value: 20, key:'range1'},
      {label: 'City', value: '39010',type: 'select', key: 'select1',
        options: [
          { label: "(choose one)", value: ''},
          { label: "Bolzano", value: '39100'},
          { label: "Meltina", value: '39010'},
          { label: "Appiano", value: '39057'}
        ],
        validation: {required: true}
      },
        {label: 'email', type:'email', key:'email1', validation:{email:true, required: true}}
      ]
    }
  ]
};
