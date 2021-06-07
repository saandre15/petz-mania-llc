export class InvalidServiceTypeError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export default InvalidServiceTypeError;