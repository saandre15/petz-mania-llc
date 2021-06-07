import cron from "node-cron";

import ServiceCache from "../model/ServiceCache";
import BathServiceStore from "../model/BathServiceStore";
import BoardingPackageStore from "../model/BoardingPackageStore";
import BoardingServiceStore  from "../model/BoardingServiceStore";
import CatServiceStore from "../model/CatServiceStore";
import DaycareServiceStore from "../model/DaycareServiceStore";
import ExoticAnimalServiceStore from "../model/ExoticAnimalServiceStore";
import FullGroomingServiceStore from "../model/FullGroomingServiceStore";
import IndividualGroomingServiceStore from "../model/IndividualGroomingServiceStore";
import OtherServiceStore from "../model/OtherServiceStore";

const cache = new ServiceCache();

cache.add(new BathServiceStore());
cache.add(new BoardingPackageStore());
cache.add(new BoardingServiceStore());
cache.add(new CatServiceStore());
cache.add(new DaycareServiceStore());
cache.add(new ExoticAnimalServiceStore());
cache.add(new FullGroomingServiceStore());
cache.add(new IndividualGroomingServiceStore());
cache.add(new OtherServiceStore());

cache.refresh();

cron.schedule("0 0 1 * * *", cache.refresh, 
{
  scheduled: true,
  timezone: "America/Chicago"
});

export { cache };
