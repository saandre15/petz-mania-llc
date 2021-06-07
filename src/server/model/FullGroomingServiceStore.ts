import FullGroomingService from "./FullGroomingService";
import ServiceStore from "./ServiceStore";

export class FullGroomingServiceStore extends ServiceStore<FullGroomingService> {
  
  constructor() {
    super(
      "dog full groom",
      "full grooming services",
      ["Dog Breed", "Price"],
      FullGroomingService,
      "The full grooming price on our website is the \"baseline estimate\" cost and may not reflect the final price. The final total price will be determined during checkout. Please call to get a better estimate price. Phone #: 214-731-6605"
    )
  }

}

export default FullGroomingServiceStore;
