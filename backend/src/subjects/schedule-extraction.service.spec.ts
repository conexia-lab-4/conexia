import {
  BadGatewayException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScheduleExtractionService } from './schedule-extraction.service';

const generateContent = jest.fn();

jest.mock('@google/genai', () => ({
  ...jest.requireActual<object>('@google/genai'),
  GoogleGenAI: jest.fn(() => ({ models: { generateContent } })),
}));

describe('ScheduleExtractionService', () => {
  const image = {
    buffer: Buffer.from('imagen'),
    mimetype: 'image/png',
  } as Express.Multer.File;

  const createService = (env: Record<string, string | undefined>) =>
    new ScheduleExtractionService({
      get: (key: string) => env[key],
    } as unknown as ConfigService);

  beforeEach(() => {
    generateContent.mockReset();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('manda la imagen a Gemini y devuelve el borrador normalizado', async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        subjects: [
          {
            name: 'Álgebra',
            career: '',
            campus: '',
            color: '',
            schedules: [
              {
                dayOfWeek: 'MONDAY',
                startTime: '8:00',
                endTime: '10:00',
                classroom: '',
              },
            ],
          },
        ],
      }),
    });
    const service = createService({
      GEMINI_API_KEY: 'key',
      GEMINI_MODEL: 'modelo-test',
    });

    const result = await service.extract(image);

    expect(result.subjects[0].schedules[0].startTime).toBe('08:00');
    const [request] = generateContent.mock.calls[0] as [
      {
        model: string;
        contents: { inlineData?: { mimeType: string; data: string } }[];
      },
    ];
    expect(request.model).toBe('modelo-test');
    expect(request.contents[0].inlineData).toEqual({
      mimeType: 'image/png',
      data: image.buffer.toString('base64'),
    });
  });

  it('responde 503 si no hay API key configurada', async () => {
    const service = createService({});

    await expect(service.extract(image)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('responde 502 si falla el proveedor', async () => {
    generateContent.mockRejectedValue(new Error('quota exceeded'));
    const service = createService({ GEMINI_API_KEY: 'key' });

    await expect(service.extract(image)).rejects.toThrow(BadGatewayException);
  });

  it('responde 502 si la respuesta no es JSON', async () => {
    generateContent.mockResolvedValue({ text: 'no soy json' });
    const service = createService({ GEMINI_API_KEY: 'key' });

    await expect(service.extract(image)).rejects.toThrow(BadGatewayException);
  });
});
