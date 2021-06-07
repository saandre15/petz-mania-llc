import BathService from "./BathService";
import ServiceStore from "./ServiceStore";

export class BathServiceStore extends ServiceStore<BathService> {

  constructor() {
    super(
      "dog bath", 
      "dog baths", 
      ["Service Name", "Dog Size", "Price"],
      BathService, 
      "The dog bath price on our website is the \"baseline estimate\" cost and may not reflect the final price. The final total price will be determined during checkout. Phone #: 214-731-6605"
    )
  }

}

export default BathServiceStore;
