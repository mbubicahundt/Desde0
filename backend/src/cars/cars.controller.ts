import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../common/current-user.decorator';
import type { JwtUser } from '../common/request-user';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CarsService } from './cars.service';
import { CreateCarDto } from './dto/create-car.dto';
import { ListCarsQuery } from './dto/list-cars.query';
import { UpdateCarDto } from './dto/update-car.dto';

@Controller('cars')
export class CarsController {
  constructor(private readonly cars: CarsService) {}

  @Get()
  async list(@Query() query: ListCarsQuery) {
    return this.cars.listCars(query);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SELLER')
  @Get('mine')
  async mine(@CurrentUser() user: JwtUser) {
    return this.cars.listMyCars(user.sub);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.cars.getCarById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SELLER')
  @Post()
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreateCarDto) {
    return this.cars.createCar(user.sub, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SELLER')
  @Patch(':id')
  async update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateCarDto,
  ) {
    return this.cars.updateCar(user.sub, id, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SELLER')
  @Delete(':id')
  async remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.cars.deleteCar(user.sub, id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('SELLER')
  @Post(':id/images')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
      limits: {
        fileSize: Number(process.env.MAX_IMAGE_SIZE_BYTES ?? 5_242_880),
      },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          return cb(
            new Error(
              `Unsupported image type: ${file.mimetype}. Allowed: jpeg/png/webp`,
            ),
            false,
          );
        }
        return cb(null, true);
      },
    }),
  )
  async uploadImages(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.cars.uploadImages(user.sub, id, files);
  }
}
