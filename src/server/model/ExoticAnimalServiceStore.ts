import ExoticAnimalService from "./ExoticAnimalService";
import ServiceStore from "./ServiceStore";

export class ExoticAnimalServiceStore extends ServiceStore<ExoticAnimalService> {

  constructor() {
    super(
      "exotic animals",
      "exotic animal service",
      ["Animal Name", "Animal Quantity","Price"],
      ExoticAnimalService
    )
  }

}

export default ExoticAnimalServiceStore;
