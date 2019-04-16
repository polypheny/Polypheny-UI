import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-dynamic-forms',
  templateUrl: './dynamic-forms.component.html',
  styleUrls: ['./dynamic-forms.component.scss']
})
export class DynamicFormsComponent implements OnInit {

  // Quelle Tutorial: https://juristr.com/blog/2017/10/demystify-dynamic-angular-forms/

  @Input() formObj;
  formObjAsString;
  form: FormGroup;
  submitted = false;
  // objectProps;

  constructor() { }

  ngOnInit() {
    // setup the form
    const formGroup = {};
    for(const group of this.formObj.groups) {
      for(const i of group.groups){
        formGroup[i.key] = new FormControl(i.value || '', this.mapValidators(i.validation));
      }
    }

    this.form = new FormGroup(formGroup);

    this.formObjAsString = JSON.stringify(this.formObj, undefined, 2);
  }

  private mapValidators(validators) {
    const formValidators = [];

    if(validators) {
      for(const validation of Object.keys(validators)) {
        if(validation === 'required') {
          formValidators.push(Validators.required);
        } else if(validation === 'min') {
          formValidators.push(Validators.min(validators[validation]));
        } else if(validation === 'email') {
          formValidators.push(Validators.email);
        }
      }
    }

    return formValidators;
  }

  onSubmit(form, e) {
    // e.target.classList.add('was-validated');
    this.submitted = true;
    console.log(form);
    console.log(this.form);
  }

  inputValidation(key){
    if(this.submitted && this.form.get(key).invalid){
      return {'is-invalid': true };
    }else if(this.submitted){
      return {'is-valid': true};
    }
  }

  updateRange(key, event) {
    // this.form.get(key).value = event.target.value;
    event.target.previousElementSibling.innerText = event.target.value;
    return true;
  }

}
