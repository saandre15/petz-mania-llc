import InvalidServiceTypeError from "../error/InvalidServiceTypeError";
import Service from "./Service";

export class DaycareService extends Service {

  constructor(serviceId: number, serviceName: string, price: number, showToOwner: number) {
    super(serviceId, serviceName, price, showToOwner, "dog daycare");
    const vals = this.parseName();
    this.serviceName = vals.splice(1).join();
  }

  public toTableBody() {
    return [this.serviceName, this.price.toString()];
  }

}

export default DaycareService;