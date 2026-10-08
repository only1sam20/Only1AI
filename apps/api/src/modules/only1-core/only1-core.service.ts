import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOnly1CoreDto } from './dto/create-only1-core.dto';
import { UpdateOnly1CoreDto } from './dto/update-only1-core.dto';
import { Only1Core, Only1CoreStatus } from './entities/only1-core.entity';

@Injectable()
export class Only1CoreService {
  constructor(@InjectRepository(Only1Core) private readonly cores: Repository<Only1Core>) {}

  async listForUser(userId: string): Promise<Only1Core[]> { return this.cores.find({ where: { userId }, order: { updatedAt: 'DESC' } }); }

  async getForUser(userId: string, coreId: string): Promise<Only1Core> {
    const core = await this.cores.findOneBy({ id: coreId, userId });
    if (!core) throw new NotFoundException('Only1Core not found.');
    return core;
  }

  async create(userId: string, dto: CreateOnly1CoreDto): Promise<Only1Core> {
    return this.cores.save(this.cores.create({ userId, name: dto.name.trim(), description: dto.description?.trim() ?? null, status: Only1CoreStatus.PAUSED, analysisIntervalMinutes: 60 }));
  }

  async update(userId: string, coreId: string, dto: UpdateOnly1CoreDto): Promise<Only1Core> {
    const core = await this.getForUser(userId, coreId);
    Object.assign(core, dto);
    if (dto.name) core.name = dto.name.trim();
    if (dto.description !== undefined) core.description = dto.description?.trim() || null;
    return this.cores.save(core);
  }
}
