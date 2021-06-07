export interface PetexecService {
  serviceid: number;
  servicename: string;
  istaxable: number;
  price: string;
  showtoowner?: number;
  price1?: string;
  price2?: string;
  price3?: string;
  price4?: string;
  price5?: string;
}

export interface PetexecServiceTypes {
  servicetypeid: number;
  servicetype: string;
  stid: number;
  services: PetexecService[];
}