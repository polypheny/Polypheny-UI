import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {NotebooksApiComponent} from './components/notebooks-api-view/notebooks-api.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {ComponentsModule} from '../../components/components.module';
import { NotebooksComponent } from './components/notebooks-view/notebooks.component';



@NgModule({
  imports: [
    CommonModule,
    FormsModule, ReactiveFormsModule,
    ComponentsModule,
  ],
  declarations: [
    NotebooksApiComponent,
    NotebooksComponent
  ],
  exports: [
    NotebooksApiComponent,
    NotebooksComponent
  ]
})
export class NotebooksModule { }
