import axios from "axios";
import { PetexecToken } from "../model/PetexecToken";


export const BASEURL = 'https://secure.petexec.net/api';
export const BOTUSER = process.env["PETEXEC_USERNAME"];
export const BOTPASS = process.env["PETEXEC_PASSWORD"];


export async function getData(url: string, token: PetexecToken): Promise<any> {
  const res = await axios({
    method: 'get',
    url: BASEURL + url,
    headers: {
      'Authorization' : 'Bearer ' + token.getAccessToken(),
    }
  });
  if(!res) throw new Error("Unable to get a response from the petexec servers. Please try again later.");
  const data = res.data;
  // if(!data.success) throw new Error("Petexec was unable to successful give a response, given the input data.");
  return data;
}

export async function postData(data: any, url: string, token: PetexecToken): Promise<any> {
  const res = await axios({
    method: 'post',
    url: BASEURL + url,
    data: data,
    headers: {
      'Authorization' : 'Bearer ' + token.getAccessToken()
    }
  });
  return res.data;
}


