import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Only1Core } from '../only1-core/entities/only1-core.entity';
import { StrategyRule } from './entities/strategy-rule.entity';
import { Strategy } from './entities/strategy.entity';
import { StrategySuggestion } from './entities/strategy-suggestion.entity';
import { StrategiesController } from './strategies.controller';
import { StrategiesService } from './strategies.service';

@Module({ imports: [TypeOrmModule.forFeature([Strategy, StrategyRule, StrategySuggestion, Only1Core])], controllers: [StrategiesController], providers: [StrategiesService], exports: [TypeOrmModule] })
export class StrategiesModule {}
