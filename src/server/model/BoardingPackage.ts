import InvalidServiceTypeError from "../error/InvalidServiceTypeError";
import Service from "./Service";

/**
 * Dog Boarding Packages
 */
export class BoardingPackage extends Service {

  private kennelSize: string;
  private dogSize: string;
  private dogQuantity: number;
  private packageAmount: number;
  
  constructor(serviceID: number, serviceName: string, price: number, showToOwner: number) {
    super(serviceID, serviceName, price, showToOwner, "dog boarding packages");
    const vals = this.parseName();
    this.serviceName = "";
    this.kennelSize = vals[1];
    this.dogSize = vals[2];
    this.dogQuantity = Number.parseInt(vals[3]);
    this.packageAmount = Number.parseInt(vals[4]);
  }

  public toTableBody() {
    return [this.kennelSize, this.dogSize, this.dogQuantity.toString(), this.packageAmount.toString(), this.price.toString()];
  }

  public getKennelSize() {
    return this.kennelSize;
  }

  public getDogSize() {
    return this.dogSize;
  }

  public getDogQuantity() {
    return this.dogQuantity;
  }

  public getPackageAmount() {
    return this.packageAmount;
  }

}

export default BoardingPackage;