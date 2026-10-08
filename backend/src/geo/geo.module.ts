import { Module } from '@nestjs/common';
import { GeoService } from './geo.service';
import { GeoapifyGeoService } from './geoapify-geo.service';

@Module({
  // Para cambiar de proveedor alcanza con reemplazar useClass
  providers: [{ provide: GeoService, useClass: GeoapifyGeoService }],
  exports: [GeoService],
})
export class GeoModule {}
