export interface HubResult {
  message: string;
  data: string[][];
  header: string[];
  error: string;

  //login
  id: number;
  user: string;
  secret: string;
  loginStatus: number;//2 if admin, 1 if user
}

export interface HubMeta {
  fileSize: number;
  numberOfRows: number;
  schema: string;
  tables: Map<String, TableMapping>;
}

export interface TableMapping {
  initialName: string;
  newName: string;
}
