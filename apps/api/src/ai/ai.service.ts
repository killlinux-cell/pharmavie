import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiChatDto } from './dto/ai.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';

const SYSTEM_PROMPT = `Tu es l'assistant PharmaVie pour la Côte d'Ivoire.
RÈGLES STRICTES:
- Tu INFORMES et ORIENTES, tu ne DIAGNOSTIQUES JAMAIS.
- Tu ne PRESCRIS AUCUN médicament ni posologie personnalisée.
- Commence toujours par rappeler que tes conseils ne remplacent pas un professionnel de santé.
- En cas de symptômes graves (douleur thoracique, difficulté respiratoire, hémorragie, perte de conscience, convulsions), oriente IMMÉDIATEMENT vers les urgences ou le SAMU.
- Suggère le type de spécialiste approprié (généraliste, pédiatre, gynécologue, dermatologue, etc.).
- Réponds en français, de manière claire et empathique.
- Sois concis (max 150 mots).`;

const EMERGENCY_KEYWORDS = [
  'douleur poitrine',
  'douleur thoracique',
  'respirer',
  'essoufflement',
  'saigne',
  'hémorragie',
  'inconscient',
  'convulsion',
  'crise cardiaque',
  'avc',
];

const SPECIALIST_HINTS: Record<string, string> = {
  enfant: 'pédiatre',
  bébé: 'pédiatre',
  grossesse: 'gynécologue',
  peau: 'dermatologue',
  bouton: 'dermatologue',
  yeux: 'ophtalmologue',
  oreille: 'ORL',
  dos: 'rhumatologue ou médecin généraliste',
  stress: 'psychologue ou médecin généraliste',
  fièvre: 'médecin généraliste',
  toux: 'médecin généraliste',
};

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  async chat(user: AuthUser | null, dto: AiChatDto) {
    const lower = dto.message.toLowerCase();
    const isEmergency = EMERGENCY_KEYWORDS.some((k) => lower.includes(k));

    let session = dto.sessionId
      ? await this.prisma.aiSession.findUnique({ where: { id: dto.sessionId } })
      : null;

    if (!session) {
      session = await this.prisma.aiSession.create({
        data: {
          userId: user?.id,
          messages: [],
        },
      });
    }

    const messages = (session.messages as { role: string; content: string }[]) ?? [];
    messages.push({ role: 'user', content: dto.message });

    let reply: string;
    let specialist: string | null = null;
    let urgency: 'normal' | 'urgent' = 'normal';

    if (isEmergency) {
      urgency = 'urgent';
      reply =
        '⚠️ URGENCE POSSIBLE — Vos symptômes nécessitent une prise en charge immédiate. ' +
        'Appelez le SAMU ou rendez-vous aux urgences les plus proches sans attendre. ' +
        'PharmaVie ne remplace pas un service d\'urgence médicale.';
      specialist = 'Urgences / SAMU';
    } else {
      specialist = this.detectSpecialist(lower);
      reply = await this.generateReply(dto.message, specialist);
    }

    messages.push({ role: 'assistant', content: reply });

    await this.prisma.aiSession.update({
      where: { id: session.id },
      data: { messages },
    });

    return {
      success: true,
      data: {
        sessionId: session.id,
        reply,
        urgency,
        suggestedSpecialist: specialist,
        disclaimer:
          'Ces informations sont à titre indicatif et ne remplacent pas une consultation médicale.',
      },
    };
  }

  private detectSpecialist(text: string): string | null {
    for (const [keyword, specialist] of Object.entries(SPECIALIST_HINTS)) {
      if (text.includes(keyword)) return specialist;
    }
    return 'médecin généraliste';
  }

  private async generateReply(message: string, specialist: string | null): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: message },
            ],
            max_tokens: 300,
            temperature: 0.3,
          }),
        });

        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          return `${content}\n\n→ Orientation suggérée : consulter un ${specialist ?? 'professionnel de santé'}.`;
        }
      } catch {
        // fallback below
      }
    }

    return (
      `Merci de partager vos symptômes. PharmaVie ne peut pas poser de diagnostic.\n\n` +
      `Pour "${message.slice(0, 80)}${message.length > 80 ? '...' : ''}", ` +
      `il est recommandé de consulter un ${specialist ?? 'médecin généraliste'} ` +
      `qui pourra évaluer votre situation en personne.\n\n` +
      `En attendant, reposez-vous et évitez l'automédication. ` +
      `Utilisez PharmaVie pour trouver une pharmacie de garde si besoin.`
    );
  }
}
