import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { DataReader } from '@tadil-database';
import { DisplayBoundaryDTO, DisplayCityDTO, DisplayDistrictDTO } from './dtos';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

type Geometry = { type: string; coordinates: number[][][] };

// Most cities in the dataset have no districts (only ~150 of 4500+ do), so they
// have no polygon to union. For those we fence a circle around the city centre.
const CITY_FALLBACK_RADIUS_KM = 20;

function circlePolygon(
  lat: number,
  lng: number,
  radiusKm: number,
  steps = 48
): number[][][] {
  const coords: number[][] = [];
  const latDeg = radiusKm / 110.574;
  const lngDeg = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    coords.push([lng + lngDeg * Math.cos(theta), lat + latDeg * Math.sin(theta)]);
  }
  return [coords];
}

@Controller('locations')
@ApiTags('Locations')
export class LocationsController {
  constructor(private readonly _dataReader: DataReader) {}

  @Get('cities')
  @RequirePermissions('locations.read')
  @ApiOkResponse({ type: DisplayCityDTO, isArray: true })
  @ApiQuery({ name: 'search', type: 'string', required: false })
  @ApiQuery({ name: 'regionId', type: 'number', required: false })
  async getCities(
    @Query('search') search?: string,
    @Query('regionId') regionId?: string
  ): Promise<DisplayCityDTO[]> {
    const term = search?.trim();
    const cities = await this._dataReader.queries.city.findMany({
      where: {
        regionId: regionId ? Number(regionId) : undefined,
        OR: term
          ? [
              { nameAr: { contains: term, mode: 'insensitive' } },
              { nameEn: { contains: term, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: { nameEn: 'asc' },
      take: 50,
    });

    return cities.map((city) => ({
      id: city.id,
      regionId: city.regionId,
      arabicName: city.nameAr,
      englishName: city.nameEn,
      bengaliName: city.nameBn,
      hindiName: city.nameHi,
      urduName: city.nameUr,
      lat: city.lat,
      lng: city.lng,
    }));
  }

  @Get('cities/:cityId/districts')
  @RequirePermissions('locations.read')
  @ApiParam({ name: 'cityId', type: 'number' })
  @ApiOkResponse({ type: DisplayDistrictDTO, isArray: true })
  async getDistricts(
    @Param('cityId') cityId: string
  ): Promise<DisplayDistrictDTO[]> {
    const districts = await this._dataReader.queries.district.findMany({
      where: { cityId: Number(cityId) },
      orderBy: { nameEn: 'asc' },
    });

    return districts.map((district) => ({
      id: district.id,
      cityId: district.cityId,
      arabicName: district.nameAr,
      englishName: district.nameEn,
      bengaliName: district.nameBn,
      hindiName: district.nameHi,
      urduName: district.nameUr,
    }));
  }

  @Get('districts/:districtId/boundary')
  @RequirePermissions('locations.read')
  @ApiParam({ name: 'districtId', type: 'string' })
  @ApiOkResponse({ type: DisplayBoundaryDTO })
  async getDistrictBoundary(
    @Param('districtId') districtId: string
  ): Promise<DisplayBoundaryDTO | null> {
    const district = await this._dataReader.queries.district.findUnique({
      where: { id: districtId },
      select: { boundaries: true },
    });
    const geometry = district?.boundaries as Geometry | null;
    return geometry ? (geometry as DisplayBoundaryDTO) : null;
  }

  @Get('cities/:cityId/boundary')
  @RequirePermissions('locations.read')
  @ApiParam({ name: 'cityId', type: 'number' })
  @ApiOkResponse({ type: DisplayBoundaryDTO })
  async getCityBoundary(
    @Param('cityId') cityId: string
  ): Promise<DisplayBoundaryDTO | null> {
    // A city has no shape of its own, so its boundary is the union of its
    // districts' polygons expressed as a single GeoJSON MultiPolygon.
    const districts = await this._dataReader.queries.district.findMany({
      where: { cityId: Number(cityId) },
      select: { boundaries: true },
    });

    const polygons = districts
      .map((d) => d.boundaries as Geometry | null)
      .filter((b): b is Geometry => !!b && b.type === 'Polygon')
      .map((b) => b.coordinates);

    if (polygons.length > 0) {
      return { type: 'MultiPolygon', coordinates: polygons };
    }

    // No districts (and therefore no polygons) for this city: fall back to a
    // circle around the city centre so the map still draws a fence.
    const city = await this._dataReader.queries.city.findUnique({
      where: { id: Number(cityId) },
      select: { lat: true, lng: true },
    });
    if (!city || city.lat == null || city.lng == null) return null;

    return {
      type: 'Polygon',
      coordinates: circlePolygon(city.lat, city.lng, CITY_FALLBACK_RADIUS_KM),
    };
  }
}
