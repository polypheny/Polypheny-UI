export class Toast{
  title: string;
  message: string;
  delay:number;
  timeAsString: String;//timeAsString when toast is shown, for the gui
  time: Date;
  type: String;
  hash: string;

  /**
   * A toast message
   * @param title title of the message
   * @param message message
   * @param delay After how many seconds the message should fade out. The message will be displayed permanently if delay = 0
   * @param type Set the type of the message, e.g. 'bg-success', 'bg-warning', 'bg-danger'
   */
  constructor(title:string, message:string, delay:number = 0, type:String = ''){
    this.title = title;
    this.message = message;
    const d = new Date();
    this.time = d;
    this.timeAsString = d.getHours()+':'+d.getMinutes()+':'+d.getSeconds();
    this.type = type;
    this.delay = delay;//default 0 -> not removed automatically. if > 0: removed after n miliseconds
    this.hash = this.timeAsString + this.message;
  }
}
