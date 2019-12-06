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

export interface Store {
  id: number;
  uniqueName: string;
  adapterName: string;
}
