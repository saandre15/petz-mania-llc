import BoardingPackage from "./BoardingPackage";
import ServiceStore from "./ServiceStore";

export class BoardingPackageStore extends ServiceStore<BoardingPackage> {

  constructor() {
    super(
      "dog boarding packages",
      "dog boarding packages",
      ["Kennel Size", "Dog Size", "Dog Quantity", "Package Amount", "Price"],
      BoardingPackage
    )
  }

}

export default BoardingPackageStore;
