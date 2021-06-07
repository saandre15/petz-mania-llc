import OtherService from "./OtherService";
import ServiceStore from "./ServiceStore";

export class OtherServiceStore extends ServiceStore<OtherService> {

    constructor() {
        super(
            "other services",
            "other services",
            ["Service Name", "Price"],
            OtherService
        );
    }

}

export default OtherServiceStore;
