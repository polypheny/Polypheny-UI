
export interface  Slides {
    source:string[] | string;
    fragments:(string[]| string)[];
    children: Slides[];
  }