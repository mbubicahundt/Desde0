import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { QaController } from './qa.controller';
import { QaService } from './qa.service';

@Module({
  imports: [NotificationsModule],
  controllers: [QaController],
  providers: [QaService],
})
export class QaModule {}
