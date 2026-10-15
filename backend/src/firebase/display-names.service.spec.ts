import * as admin from 'firebase-admin';
import { Logger } from '@nestjs/common';
import { DisplayNamesService } from './display-names.service';

describe('DisplayNamesService', () => {
  let service: DisplayNamesService;
  let getUsers: jest.Mock;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    getUsers = jest.fn();
    const firebaseAdminMock = { auth: () => ({ getUsers }) };
    service = new DisplayNamesService(
      firebaseAdminMock as unknown as typeof admin,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('devuelve el displayName de cada usuario', async () => {
    getUsers.mockResolvedValue({
      users: [
        { uid: 'u1', displayName: 'Ana Pérez' },
        { uid: 'u2', displayName: 'Luis Gómez' },
      ],
      notFound: [],
    });

    const names = await service.getDisplayNames(['u1', 'u2']);

    expect(names.get('u1')).toBe('Ana Pérez');
    expect(names.get('u2')).toBe('Luis Gómez');
  });

  it('deja en null a quien no tiene displayName', async () => {
    getUsers.mockResolvedValue({
      users: [
        { uid: 'u1', displayName: undefined },
        { uid: 'u2', displayName: '   ' },
      ],
      notFound: [],
    });

    const names = await service.getDisplayNames(['u1', 'u2']);

    expect(names.get('u1')).toBeNull();
    expect(names.get('u2')).toBeNull();
  });

  it('consulta una sola vez los ids repetidos', async () => {
    getUsers.mockResolvedValue({ users: [], notFound: [] });

    await service.getDisplayNames(['u1', 'u1', 'u2']);

    expect(getUsers).toHaveBeenCalledTimes(1);
    expect(getUsers).toHaveBeenCalledWith([{ uid: 'u1' }, { uid: 'u2' }]);
  });

  it('parte la consulta en lotes de 100', async () => {
    getUsers.mockResolvedValue({ users: [], notFound: [] });
    const ids = Array.from({ length: 150 }, (_, index) => `u${index}`);

    await service.getDisplayNames(ids);

    expect(getUsers).toHaveBeenCalledTimes(2);
  });

  it('no lanza si Firebase falla: devuelve un mapa vacío', async () => {
    getUsers.mockRejectedValue(new Error('sin conexión'));

    const names = await service.getDisplayNames(['u1']);

    expect(names.size).toBe(0);
  });
});
