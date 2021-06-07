import InvalidServiceTypeError from "../error/InvalidServiceTypeError";
import Service from "./Service";

export class FullGroomingService extends Service {

  private dogBreed: string;

  constructor(serviceId: number, serviceName: string, price: number, showToOwner: number) {
    super(serviceId, serviceName, price, showToOwner, "dog full groom");
    const vals = this.parseName();
    this.serviceName = "";
    this.dogBreed = vals[1];
  }

  public toTableBody() {
    return [this.dogBreed, this.price.toString()];
  }

  public getDogBreed() {
    return this.dogBreed;
  }

}

export default FullGroomingService;