import InvalidServiceTypeError from "../error/InvalidServiceTypeError";

export abstract class Service {

  protected readonly serviceID: number;
  protected serviceName: string;
  protected price: string;
  protected showToOwner: boolean;
  protected category: string;

  public constructor(
    serviceID: number,
    serviceName: string,
    price: number,
    showToOwner: number,
    category: string
  ) {
    this.serviceID = serviceID;
    this.serviceName = serviceName;
    this.price = "$" + price.toFixed(2);
    this.showToOwner = showToOwner == 1;
    this.category = category;
    if(this.parseName()[0].toLowerCase() !== this.category) 
      throw new InvalidServiceTypeError("Invalid " + this.parseName()[0] + " type");
  }

  protected parseName(): string[] {
    return this.serviceName.split("-").map(cur => cur.trim());
  }

  public getServiceId(): number {
    return this.serviceID;
  }
  
  public getServiceName(): string {
    return this.serviceName;
  }

  public getPrice(): string {
    return this.price;
  }
  
  public canShowToOwner(): boolean {
    return this.showToOwner;
  }

  public abstract toTableBody(): string[];

  public toString(): string {
    return this.toTableBody.toString();
  }

}


export default Service;
