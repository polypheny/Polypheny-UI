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

  //get users
  users: HubUser[];

  //hub datasets
  datasets: HubDataset[];
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

export interface HubDataset {
  name: string;
  description: string;
  lines: number;
  zipSize: number;
  pub: number;
  uploaded: string;
  dsId: number;
  file: string;
  username: string;
  userId: number;
}

export interface HubUser {
  id: number;
  name: string;
  email: string;
  admin: number;
}
