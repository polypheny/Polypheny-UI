export class IPlan {
  id: string;
  name: string;
  content: any;
  query: string;
  createdOn: Date;
  planStats: any;
  formattedQuery: string;

  constructor(id: string, name: string, content: any, query: string, createdOn: Date) {
    this.id = id;
    this.name = name;
    this.content = content;
    this.query = query;
    this.createdOn = createdOn;
  }
}
