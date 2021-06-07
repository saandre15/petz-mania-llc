import InvalidServiceTypeError from "../error/InvalidServiceTypeError";
import Service from "./Service";

export class CatService extends Service {

  
  constructor(serviceId: number, serviceName: string, price: number, showToOwner: number) {
    super(serviceId, serviceName, price, showToOwner, "cat services");
    const vals = this.parseName();
    this.serviceName = vals.splice(1).join();
  }

  public toTableBody() {
    return [this.serviceName, this.price.toString()];
  }


}

export default CatService;