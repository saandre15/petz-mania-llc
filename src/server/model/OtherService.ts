import InvalidServiceTypeError from "../error/InvalidServiceTypeError";

import Service from "./Service";

export class OtherService extends Service {

  constructor(serviceId: number, serviceName: string, price: number, showToOwner: number) {
    super(serviceId, serviceName, price, showToOwner, "other services");
    const vals = this.parseName();
    this.serviceName = vals[1];
  }

  public toTableBody() {
    return [this.serviceName, this.price.toString()];
  }

}

export default OtherService;
