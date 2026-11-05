import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type } from '@google/genai';
import {
  normalizeSubjectDraft,
  type SubjectDraftResponse,
} from './subject-draft.normalizer';

const DEFAULT_MODEL = 'gemini-3.5-flash';
// Si Gemini no responde a tiempo se corta el pedido y se devuelve un 502
const REQUEST_TIMEOUT_MS = 45_000;

// Todo es string para que el modelo pueda devolver '' en lo que no lee
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    subjects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          career: { type: Type.STRING },
          campus: { type: Type.STRING },
          color: { type: Type.STRING },
          schedules: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                dayOfWeek: { type: Type.STRING },
                startTime: { type: Type.STRING },
                endTime: { type: Type.STRING },
                classroom: { type: Type.STRING },
              },
              required: ['dayOfWeek', 'startTime', 'endTime', 'classroom'],
            },
          },
        },
        required: ['name', 'career', 'campus', 'color', 'schedules'],
      },
    },
  },
  required: ['subjects'],
};

const PROMPT = `Extraé las materias y horarios de esta imagen de un horario universitario.
Reglas:
- dayOfWeek: MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY o SUNDAY.
- startTime y endTime: formato HH:mm de 24 horas.
- Si un dato no se puede leer con seguridad, devolvé "". No inventes valores.
- Incluí todos los horarios, aunque estén incompletos. Una materia puede tener varios horarios.
- career y campus solo si aparecen en la imagen.
- color: siempre "", salvo que la imagen lo indique explícitamente con uno de BLUE, PURPLE, PINK, ORANGE, YELLOW, GREEN, RED o CREAM.
- Si la imagen no es un horario, devolvé {"subjects": []}.`;

@Injectable()
export class ScheduleExtractionService {
  private readonly logger = new Logger(ScheduleExtractionService.name);
  private readonly ai: GoogleGenAI | null;
  private readonly model: string;

  constructor(config: ConfigService) {
    // Sin key la app arranca igual; el endpoint responde 503 de forma controlada
    const apiKey = config.get<string>('GEMINI_API_KEY');
    this.ai = apiKey
      ? new GoogleGenAI({
          apiKey,
          httpOptions: { timeout: REQUEST_TIMEOUT_MS },
        })
      : null;
    this.model = config.get<string>('GEMINI_MODEL') ?? DEFAULT_MODEL;
  }

  async extract(image: Express.Multer.File): Promise<SubjectDraftResponse> {
    if (!this.ai) {
      throw new ServiceUnavailableException(
        'La importación de horarios no está configurada',
      );
    }

    let text: string | undefined;
    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          {
            inlineData: {
              mimeType: image.mimetype,
              data: image.buffer.toString('base64'),
            },
          },
          { text: PROMPT },
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0,
        },
      });
      text = response.text;
    } catch (error) {
      this.logger.error(
        `Falló la llamada a Gemini: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadGatewayException(
        'No pudimos procesar la imagen. Intentá de nuevo',
      );
    }

    try {
      return normalizeSubjectDraft(JSON.parse(text ?? ''));
    } catch {
      this.logger.error('Gemini devolvió una respuesta que no es JSON');
      throw new BadGatewayException(
        'No pudimos procesar la imagen. Intentá de nuevo',
      );
    }
  }
}
