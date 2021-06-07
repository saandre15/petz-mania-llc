import BoardingService from "./BoardingService";
import ServiceStore from "./ServiceStore";

export class BoardingServiceStore extends ServiceStore<BoardingService> {
  
  constructor() {
    super(
      "dog boarding",
      "dog boardings",
      ["Kennel Size", "Dog Size", "Dog Quantity", "Price"],
      BoardingService,
    );
  }

}

export default BoardingServiceStore;
