import InvalidServiceTypeError from "../error/InvalidServiceTypeError";
import Service from "./Service";

export class BoardingService extends Service {

  private kennelSize: string;
  private dogSize: string;
  private dogQuantity: number;

  constructor(serviceId: number, serviceName: string, price: number, showToOwner: number) {
    super(serviceId, serviceName, price, showToOwner, "dog boarding");
    const vals = this.parseName();
    this.kennelSize = vals[1];
    this.dogSize = vals[2];
    this.dogQuantity = Number.parseInt(vals[3]);
  }

  public toTableBody() {
    return [this.kennelSize, this.dogSize, this.dogQuantity.toString(), this.price.toString()];
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

}

export default BoardingService;