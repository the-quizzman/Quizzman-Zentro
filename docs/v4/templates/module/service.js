export const SAMPLE_TOKEN = 'svc:sample.main';

export class SampleService {
  constructor() {}
  ping() { return 'ok'; }
}

export function registerSampleServices(ctx) {
  ctx.container.registerFactory(SAMPLE_TOKEN, () => new SampleService());
}
