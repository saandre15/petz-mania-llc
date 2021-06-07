import CatService from "./CatService";
import ServiceStore from "./ServiceStore";

export class CatServiceStore extends ServiceStore<CatService> {
  
  constructor() {
    super(
      "cat services",
      "cat services",
      ["Service Name", "Price"],
      CatService
    );
  }

}

export default CatServiceStore;
