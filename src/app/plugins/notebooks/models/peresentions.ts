
export interface  Slides {
    source:string[] | string;
    fragments:{text: string[]| string, type:string}[];
    children: Slides[];
    type:string;
  }