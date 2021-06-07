import InvalidServiceTypeError from "../error/InvalidServiceTypeError";
import Service from "./Service";

export class ExoticAnimalService extends Service {
  
  private animalName: string;
  private animalQuantity: number;

  constructor(serviceId: number, serviceName: string, price: number, showToOwner: number) {
    super(serviceId, serviceName, price, showToOwner, "exotic animals");
    const vals = this.parseName();
    this.animalName = vals[1];
    this.animalQuantity = Number.parseFloat(vals[2]);
  }

  public getAnimalName() {
    return this.animalName;
  }

  public getAnimalQuantity() {
    return this.animalQuantity;
  }

  public toTableBody() {
    return [this.animalName, this.animalQuantity.toString(), this.price.toString()];
  }
}

export default ExoticAnimalService;