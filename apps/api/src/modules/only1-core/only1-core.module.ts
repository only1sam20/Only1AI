import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Only1CoreController } from './only1-core.controller';
import { Only1Core } from './entities/only1-core.entity';
import { Only1CoreService } from './only1-core.service';

@Module({ imports: [TypeOrmModule.forFeature([Only1Core])], controllers: [Only1CoreController], providers: [Only1CoreService] })
export class Only1CoreModule {}
