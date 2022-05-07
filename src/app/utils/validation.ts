import { Validators } from "@angular/forms";

const getNameValidator = (required: boolean = false) => {
  if (required) {
    return [Validators.pattern('^[a-zA-Z_][a-zA-Z0-9_]*$'), Validators.required, Validators.max(100)];
  } else {
    return [Validators.pattern('^[a-zA-Z_][a-zA-Z0-9_]*$'), Validators.max(100)];
  }
}

const invalidNameMessage = (type: string = '') => {
  type = type + ' ';
  return `Please provide a valid ${type}name`;
}

const getValidationRegex = () => {
  return new RegExp('^[a-zA-Z_][a-zA-Z0-9_]*$');
}

const nameIsValid = (name: string) => {
  const regex = getValidationRegex();
  return regex.test(name) && name.length <= 100;
}

const getValidationClass = (name: string) => {
  const regex = getValidationRegex();
  if (name === '') {
    return '';
  }
  else if (regex.test(name) && name.length <= 100) {
    return 'is-valid';
  } else {
    return 'is-invalid';
  }
}

export {
  getNameValidator,
  invalidNameMessage,
  getValidationRegex,
  nameIsValid,
  getValidationClass,
};
