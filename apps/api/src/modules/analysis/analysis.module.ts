import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfluenceAssessment } from '../confluence/entities/confluence-assessment.entity';
import { Strategy } from '../strategies/entities/strategy.entity';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { AiExplanationService } from './ai-explanation.service';
import { Analysis } from './entities/analysis.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Analysis, ConfluenceAssessment, Strategy])],
  controllers: [AnalysisController], providers: [AnalysisService, AiExplanationService],
})
export class AnalysisModule {}
