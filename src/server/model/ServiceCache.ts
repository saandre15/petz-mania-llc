import Service from "./Service";
import { BOTPASS, BOTUSER, getData, postData } from "../controller/petexec";
import { PetexecToken } from "./PetexecToken";
import ServiceStore from "./ServiceStore";
import { PetexecService, PetexecServiceTypes } from "./PetexecService";

/**
 * API documentation at the link below
 * @see https://beta.petexec.net/api/apidoc/index.html
 */
export class ServiceCache {

  public static readonly BATH_SERVICE_INDEX = "dog bath";
  public static readonly BOARDING_PACKAGE_INDEX = "";
  

  private APIURLs: string[];
  private lastUpdated: Date;
  private stores: Map<string, ServiceStore<any>>;
  private scope: string;
  private token: PetexecToken;

  public constructor() {
    this.APIURLs = [
      "/boarding/services",
      "/grooming/services",
      "/daycare/services",
      "/package",
      "/scheduled-service/services"
    ];

    this.scope = "daycare_read scheduled_service_read grooming_read boarding_read package_read";
    this.stores = new Map();
    this.token = new PetexecToken(
      process.env["PETEXEC_CLIENTID"],
      process.env["PETEXEC_CLIENTSECRET"],
      BOTUSER,
      BOTPASS,
      this.scope,
      true
    );
  }
  public add(store: ServiceStore<any>) {
    this.stores.set(store.getIndexer(), store);
  }

  public storeAdd(key: string, service: PetexecService): boolean {
    key = key.toLowerCase().trim();
    if(this.stores.has(key)) {
      const store = this.stores.get(key);
      if(store.contains(service.serviceid))
        store.replace(service.serviceid, service);
      else store.add(service);
      
      this.stores.get(key).add(service);
      return true;
    }
    return false;
  }

  private storeClear() {
    this.stores.forEach(store => store.clear());
  }

  public async refresh() {

    if(!this.token.isAuth())
      await this.token.build();
    
    // id => doesExist?
    // let subSet: Map<number, boolean> = new Map();

    const services: PetexecService[] = [];

    await Promise.all(this.APIURLs.map(async apiurl => {

      try {
        console.log("Petexec " + apiurl + " has begun loading");
        const res = await getData(apiurl, this.token);
        
        switch(apiurl) {
          case this.APIURLs[0]:
            (res.boardingservices as PetexecService[]).forEach(service => services.push(service));
            break;
          case this.APIURLs[1]:
            (res.groomingservices as PetexecService[]).forEach(service => services.push(service));
            break;
          case this.APIURLs[2]:
            (res.daycareservices as PetexecService[]).forEach(service => services.push(service));
            break;
          case this.APIURLs[3]:
            (res.packages as PetexecService[]).forEach(service => services.push(service));
            break;
          case this.APIURLs[4]:
            (res.servicetypes as PetexecServiceTypes[])
              .map(servicetype => servicetype.services)
              .reduce((prev, cur) => prev.concat(cur))
              .filter(service => service != null)
              .filter(service => service.showtoowner == 1)
              .forEach(service => services.push(service));
            break;
        }
        console.log("Petexec " + apiurl + " finished loading");

        // let mainSet: number[] = Array.from(this.stores.values())
        //   .map(store => store.getDataAsArray())
        //   .reduce((prev, cur) => prev.concat(cur))
        //   .map(service => (service as Service).getServiceId());
        
        // for(let i = 0 ; i < mainSet.length ; i++) {
        //   const id = mainSet[i];
        //   if(!subSet.has(id)) 
        //     Array.from(this.stores.values())
        //       .forEach(store => store.delete(id));
        // }
      }
      catch(e) {
        console.error("Petexec " + apiurl + " has failed to load properly. Using the old data"); 
      }
    }));

    if(services.length > 0) {
      this.storeClear();
      services.forEach(service => this.handleServiceAdd(service));
      this.lastUpdated = new Date(Date.now());
    }

  }

  private handleServiceAdd(service: PetexecService): boolean {
    const name: string = service.servicename;
    return this.storeAdd(name.split("-")[0], service);
  }

  public getLastUpdated(): Date {
    return this.lastUpdated;
  }

  public getDisplayNames(): string[] {
    return Array.from(this.stores.keys());
  }

  public getStores(): ServiceStore<Service>[] {
    return Array.from(this.stores.values());
  }

  public toString(): string {
    return Array.from(this.stores.values()).map(val => val.getDataAsArray().map(cur => cur.toTableBody())).toString();
  }

}

export default ServiceCache;