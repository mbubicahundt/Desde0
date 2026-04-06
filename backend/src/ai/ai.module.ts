import { Module } from '@nestjs/common';
import { CarsModule } from '../cars/cars.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [CarsModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
