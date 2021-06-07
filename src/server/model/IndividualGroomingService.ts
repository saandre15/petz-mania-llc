import InvalidServiceTypeError from "../error/InvalidServiceTypeError";
import Service from "./Service";

export class IndividualGroomingService extends Service {

  private dogSize: string;
  
  constructor(serviceId: number, serviceName: string, price: number, showToOwner: number) {
    super(serviceId, serviceName, price, showToOwner, "dog additional groom");
    const vals = this.parseName();
    this.serviceName = vals[1];
    this.dogSize = vals[2];
  }

  public toTableBody() {
    return [this.serviceName, this.dogSize, this.price.toString()];
  }

  public getDogSize() {
    return this.dogSize;
  }

}

export default IndividualGroomingService;
