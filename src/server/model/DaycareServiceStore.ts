import DaycareService from "./DaycareService";
import ServiceStore from "./ServiceStore";

export class DaycareServiceStore extends ServiceStore<DaycareService> {

  constructor() {
    super(
      "dog daycare",
      "dog daycares",
      ["Service Name", "Price"],
      DaycareService
    );
  }

}

export default DaycareServiceStore;
