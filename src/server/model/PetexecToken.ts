import axios from "axios";
import { BASEURL } from "../controller/petexec";


export class PetexecToken {

  private static BASEURL: string = BASEURL + "/token";
  
  private clientId: string;
  private clientSecret: string;
  private username: string;
  private password: string;
  private scope: string;
  private autoRefresh: boolean;
  
  private refreshToken?: string;
  private accessToken?: string;
  
  private auth: boolean;

  public constructor(
    clientId: string, 
    clientSecret: string, 
    username: string, 
    password: string, 
    scope: string,
    autoRefresh: boolean,
    refreshToken?: string,
    accessToken?: string,
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.username = username;
    this.password = password;
    this.scope = scope;
    this.autoRefresh = autoRefresh;
    this.refreshToken = refreshToken;
    this.accessToken = accessToken;

    // if(autoRefresh && refreshToken && accessToken ) this.enableAutoRefresh(expiresIn);
  }

  public isAuth() {
    return this.auth;
  }

  public async build(): Promise<PetexecToken> {
    try {
      const body = {
        grant_type: "password",
        username: this.username,
        password: this.password,
        scope: this.scope
      };
      const token = await axios({
        method: "post",
        url: PetexecToken.BASEURL,
        data: body,
        headers: {
          "Authorization": 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
        }
      });
      
      console.log("Token with scope " + this.scope + " and username of "+ this.username + " has been built.");

      this.accessToken = token.data["access_token"];
      this.refreshToken = token.data["refresh_token"];
      
      this.auth = true;
      this.enableAutoRefresh(token.data["expires_in"]);
      
      return this;
    }
    catch(e) {
      console.error(e);
    }
  }

  private enableAutoRefresh(expiresIn: number): void {
    if(this.autoRefresh) {
      setTimeout(this.refresh, (expiresIn - 5) * 1000);
      // setTimeout(() => this.refresh(), 5 * 1000);
    } else {
      setTimeout(() => this.auth = false, expiresIn * 1000);
    }
  }

  public async refresh(): Promise<PetexecToken> {
    try {
      const body = {
        grant_type: "refresh_token",
        refresh_token: this.refreshToken
      }
      const token = await axios({
        method: "post",
        url: PetexecToken.BASEURL,
        data: body,
        headers: {
          "Authorization": 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
        }
      });

      console.log("Token with scope " + this.scope + " has been refreshed");
      
      this.accessToken = token.data["access_token"];
      this.refreshToken = token.data["refresh_token"];
      this.enableAutoRefresh(token.data["expires_in"]);
      this.auth = true;
  
      return this;
    }
    catch(e) {
      console.error(e);
    }
  }

  public getAccessToken() {
    return this.accessToken;
  }
}

export default PetexecToken;