import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { RsvpDto } from '@judien/shared';

@Injectable()
export class RsvpService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(eventId: string, userId: string, dto: RsvpDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found.');

    return this.prisma.rSVP.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, status: dto.status },
      update: { status: dto.status },
    });
  }

  async remove(eventId: string, userId: string) {
    await this.prisma.rSVP.deleteMany({ where: { eventId, userId } });
    return { removed: true };
  }

  async guests(eventId: string) {
    const rsvps = await this.prisma.rSVP.findMany({
      where: { eventId },
      include: { user: { select: { email: true, displayName: true } } },
      orderBy: { updatedAt: 'asc' },
    });

    const groups: Record<'GOING' | 'MAYBE' | 'NO', { handle: string; displayName: string | null }[]> = {
      GOING: [],
      MAYBE: [],
      NO: [],
    };

    for (const r of rsvps) {
      const status = r.status as 'GOING' | 'MAYBE' | 'NO';
      if (groups[status]) {
        groups[status].push({
          handle: r.user.email.slice(0, 3) + '***',
          displayName: (r.user as any).displayName ?? null,
        });
      }
    }

    return groups;
  }
}
