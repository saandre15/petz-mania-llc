import Service from "./Service";
import InvalidServiceTypeError from "../error/InvalidServiceTypeError";

/**
 * Dog Bath Service
 */
export class BathService extends Service {

  private dogSize: string;

  constructor(serviceID: number, serviceName: string, price: number, showToOwner: number) {
    super(serviceID, serviceName, price, showToOwner, "dog bath");
    const vals = this.parseName();
    this.serviceName = vals[1];
    this.dogSize = vals[2];
  }

  public toTableBody(): string[] {
    return [this.serviceName, this.dogSize, this.price.toString()];
  }

  public getDogSize(): string {
    return this.dogSize;
  }

  
}

export default BathService;