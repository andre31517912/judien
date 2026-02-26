import { Global, Module } from '@nestjs/common';
import { MessagingService, MESSAGING_ADAPTER } from './messaging.service';
import { MockMessagingAdapter } from './mock.adapter';
import { ProductionMessagingAdapter } from './production.adapter';

const isMock = process.env.MOCK_MODE === 'true';

const adapterProvider = {
  provide: MESSAGING_ADAPTER,
  useClass: isMock ? MockMessagingAdapter : ProductionMessagingAdapter,
};

@Global()
@Module({
  providers: [MockMessagingAdapter, ProductionMessagingAdapter, adapterProvider, MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
