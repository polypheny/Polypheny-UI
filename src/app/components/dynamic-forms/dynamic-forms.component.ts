import {Component, Input, OnInit} from '@angular/core';
import {UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';

@Component({
    selector: 'app-dynamic-forms',
    templateUrl: './dynamic-forms.component.html',
    styleUrls: ['./dynamic-forms.component.scss'],
    standalone: false
})
export class DynamicFormsComponent implements OnInit {

    // Quelle Tutorial: https://juristr.com/blog/2017/10/demystify-dynamic-angular-forms/

    @Input() formObj;
    formObjAsString;
    form: UntypedFormGroup;
    submitted = false;

    // objectProps;

    constructor() {
    }

    ngOnInit() {
        // setup the form
        const formGroup = {};
        for (const group of this.formObj.groups) {
            for (const i of group.groups) {
                formGroup[i.key] = new UntypedFormControl(i.value || '', this.mapValidators(i.validation));
            }
        }

        this.form = new UntypedFormGroup(formGroup);

        this.formObjAsString = JSON.stringify(this.formObj, undefined, 2);
    }

    private mapValidators(validators) {
        const formValidators = [];

        if (validators) {
            for (const validation of Object.keys(validators)) {
                if (validation === 'required') {
                    formValidators.push(Validators.required);
                } else if (validation === 'min') {
                    formValidators.push(Validators.min(validators[validation]));
                } else if (validation === 'email') {
                    formValidators.push(Validators.email);
                }
            }
        }

        return formValidators;
    }

    onSubmit(form, e) {
        // e.target.classList.add('was-validated');
        this.submitted = true;
    }

    inputValidation(key) {
        if (this.submitted && this.form.get(key).invalid) {
            return {'is-invalid': true};
        } else if (this.submitted) {
            return {'is-valid': true};
        }
    }

    updateRange(key, event) {
        // this.form.get(key).value = event.target.value;
        event.target.previousElementSibling.innerText = event.target.value;
        return true;
    }

}
