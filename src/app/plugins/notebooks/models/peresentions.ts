
export interface  Slides {
    source:string[] | string;
    fragments:{text: string[]| string, type:string,language?:string}[];
    children: Slides[];
    type:string;
    language?:string;
  }