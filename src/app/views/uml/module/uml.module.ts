import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UmlComponent } from '../component/uml.component';
import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { ModalModule } from 'ngx-bootstrap/modal';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ComponentsModule } from '../../../components/components.module';
import { ViewsModule } from '../../views.module';
import { RouterModule } from '@angular/router';
import { ButtonsModule } from 'ngx-bootstrap/buttons';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { UmlContainerComponent } from '../container/uml-container.component';


const routes = [
  {
    path: '',
    pathMatch: 'full',
    component: UmlContainerComponent,
    data: {
      title: 'UML'
    }
  },
  {
    path: ':id',
    component: UmlContainerComponent,
    data: {
      title: 'UML'
    }
  },
];
@NgModule({
  declarations: [
    UmlComponent,
    UmlContainerComponent,
  ],
  imports: [
    CommonModule,
    ViewsModule,
    BsDropdownModule,
    ButtonsModule.forRoot(),
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    ModalModule.forChild(),
    ComponentsModule,
    RouterModule.forChild(routes)
  ],
  exports: [UmlComponent]
})
export class UmlModule { }
