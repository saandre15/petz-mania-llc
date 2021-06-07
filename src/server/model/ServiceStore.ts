import { PetexecService } from "./PetexecService";
import Service from "./Service";

export class ServiceStore<T extends Service> {

  private data: Map<number, T>;
  private indexer: string;
  private message?: string;
  private ctor: new(serviceId: number, serviceName: string, price: number, showToOwner: number) => T;
  private displayName: string;
  private headers: string[];

  public constructor(
    indexer: string,
    displayName: string,
    headers: string[],
    ctor: typeof ServiceStore.prototype["ctor"],
    message?: string
  ) {
    this.indexer = indexer;
    this.headers = headers;
    this.message = message;
    this.ctor = ctor;
    this.displayName = displayName;
    this.data = new Map();
  }
  public contains(serviceid: number): boolean {
    return this.data.has(serviceid);
  }

  public add(data: PetexecService) {
    const service = new this.ctor(data.serviceid, 
      data.servicename.trim(), 
      Number.parseFloat(data.price), 
      data.showtoowner);
    this.data.set(service.getServiceId(), service);
  }

  public replace(serviceid: number, data: T): boolean {
    if(this.contains(serviceid)) {
      this.data.set(serviceid, data);
      return true;
    }
    return false;
  }

  public clear(): void {
    return this.data.clear();
  }

  public getDataAsArray(): T[] {
    return Array.from(this.data.values());
  }

  public getIndexer(): string {
    return this.indexer;
  }

  public getDisplayName(): string {
    return this.displayName;
  }

  public getHeaders(): string[] {
    return this.headers;
  }

  public getMessage(): string | undefined {
    return this.message;
  }

}

export default ServiceStore;
