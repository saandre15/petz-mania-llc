import IndividualGroomingService from "./IndividualGroomingService";
import ServiceStore from "./ServiceStore";

export class IndividualGroomingServiceStore extends ServiceStore<IndividualGroomingService> {

  constructor() {
    super(
      "dog additional groom",
      "a'la carte grooming services",
      ["Service Name", "Dog Size", "Price"],
      IndividualGroomingService
    );
  }

}

export default IndividualGroomingServiceStore;
