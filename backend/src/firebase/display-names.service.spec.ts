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

  it('devuelve el displayName y la foto de cada usuario', async () => {
    getUsers.mockResolvedValue({
      users: [
        { uid: 'u1', displayName: 'Ana', photoURL: 'https://foto/u1' },
        { uid: 'u2', displayName: 'Luis', photoURL: 'https://foto/u2' },
      ],
      notFound: [],
    });

    const users = await service.getPublicUsers(['u1', 'u2']);

    expect(users.get('u1')).toEqual({
      displayName: 'Ana',
      photoUrl: 'https://foto/u1',
    });
    expect(users.get('u2')).toEqual({
      displayName: 'Luis',
      photoUrl: 'https://foto/u2',
    });
  });

  it('deja en null a quien no tiene displayName ni foto', async () => {
    getUsers.mockResolvedValue({
      users: [
        { uid: 'u1', displayName: undefined, photoURL: undefined },
        { uid: 'u2', displayName: '   ' },
      ],
      notFound: [],
    });

    const users = await service.getPublicUsers(['u1', 'u2']);

    expect(users.get('u1')).toEqual({ displayName: null, photoUrl: null });
    expect(users.get('u2')).toEqual({ displayName: null, photoUrl: null });
  });

  it('consulta una sola vez los ids repetidos', async () => {
    getUsers.mockResolvedValue({ users: [], notFound: [] });

    await service.getPublicUsers(['u1', 'u1', 'u2']);

    expect(getUsers).toHaveBeenCalledTimes(1);
    expect(getUsers).toHaveBeenCalledWith([{ uid: 'u1' }, { uid: 'u2' }]);
  });

  it('parte la consulta en lotes de 100', async () => {
    getUsers.mockResolvedValue({ users: [], notFound: [] });
    const ids = Array.from({ length: 150 }, (_, index) => `u${index}`);

    await service.getPublicUsers(ids);

    expect(getUsers).toHaveBeenCalledTimes(2);
  });

  it('no lanza si Firebase falla: devuelve un mapa vacío', async () => {
    getUsers.mockRejectedValue(new Error('sin conexión'));

    const users = await service.getPublicUsers(['u1']);

    expect(users.size).toBe(0);
  });
});
