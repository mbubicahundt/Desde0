import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../common/current-user.decorator';
import type { JwtUser } from '../common/request-user';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CarsService } from '../cars/cars.service';
import { AiService } from './ai.service';
import type { DbCarAiAnalysis } from '../cars/cars.service';

@Controller('cars')
export class AiController {
  constructor(
    private readonly cars: CarsService,
    private readonly ai: AiService,
  ) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SELLER')
  @Post(':id/analyze')
  async analyze(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
  ): Promise<DbCarAiAnalysis> {
    await this.cars.assertSellerOwnsCar(user.sub, id);
    return this.ai.analyzeCar(id);
  }
}
