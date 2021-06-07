import axios from "axios";
import path from "path";

import { BASEURL, getData } from "../controller/petexec";
import  PetexecToken  from "./PetexecToken";

interface PetexecProfile {
  userid: number;
  // 3 - Owner | Else - Employee
  usertypeid: number;
  username: string;
  password: string;
  password2: string;
  firstName: string;
  lastName: string;
  addr1: string;
  addr2: string;
  city: string;
  state: string;
  zip: number;
  email: string;
  homePhone: string;
  workPhone: string;
  emergencyContact: string;
  emergencyPhone: string;
  howFoundId: number;
  howFoundOther: string;
  pawpointcapable: number;
  pawpoints: number;
  additionalOwner: string;
  birthdayEmail: number;
  boardingEmail: number;
  boardingReminderEmail: number;
  daycarePackageEmail: number;
  enableEmail: number;
  groomingEmail: number;
  newOwnerEmail: number;
  orderReceiptEmail: number;
  scheduledServiceEmail: number;
  trainingClassEmail: number;
  temptestEmail: number;
  vaccinationEmail: number;
  companyname: string;
  mobileapp: number;
  haswebcam: number;
  webcamname: number;
  webcamurl: string;
  companyemail: string;
}

export class PetexecAccount {

  private token: PetexecToken;
  private profile?: PetexecProfile;

  constructor(token: PetexecToken) {
    this.token = token;
  }

  public async build(): Promise<void> {
    const data = (await getData(path.join(BASEURL, "profile"), this.token)) as PetexecProfile;
    this.profile = data;
  }

  public isPetOwner(): boolean {
    return this.profile?.usertypeid === 3;
  }
  
  public isEmployee(): boolean {
    return this.profile?.usertypeid !== 3;
  }
}

export default PetexecAccount;