import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Only1Core } from '../only1-core/entities/only1-core.entity';
import { Strategy } from '../strategies/entities/strategy.entity';
import { MarketMonitor } from './entities/market-monitor.entity';
import { MarketScannerController } from './market-scanner.controller';
import { MarketScannerService } from './market-scanner.service';
import { MarketDataService } from './market-data.service';

@Module({ imports: [TypeOrmModule.forFeature([MarketMonitor, Only1Core, Strategy])], controllers: [MarketScannerController], providers: [MarketScannerService, MarketDataService] })
export class MarketScannerModule {}
