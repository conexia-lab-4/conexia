import * as admin from 'firebase-admin';
import { AvatarStorageService } from './avatar-storage.service';

describe('AvatarStorageService', () => {
  let service: AvatarStorageService;
  let save: jest.Mock;
  let file: jest.Mock;
  let updateUser: jest.Mock;
  const photo = {
    buffer: Buffer.from('img'),
    mimetype: 'image/jpeg',
  } as Express.Multer.File;

  beforeEach(() => {
    save = jest.fn().mockResolvedValue(undefined);
    file = jest.fn(() => ({ save }));
    updateUser = jest.fn().mockResolvedValue(undefined);
    const firebaseAdminMock = {
      storage: () => ({
        bucket: () => ({ name: 'conexia.firebasestorage.app', file }),
      }),
      auth: () => ({ updateUser }),
    };
    service = new AvatarStorageService(
      firebaseAdminMock as unknown as typeof admin,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('guarda la foto en avatars/{uid}, reemplazando la anterior', async () => {
    await service.uploadAvatar('u1', photo);

    expect(file).toHaveBeenCalledWith('avatars/u1');
    expect(save).toHaveBeenCalledWith(photo.buffer, {
      contentType: 'image/jpeg',
      metadata: { cacheControl: 'public, max-age=300' },
    });
  });

  it('devuelve la URL pública y la asocia al usuario', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

    const photoUrl = await service.uploadAvatar('u1', photo);

    expect(photoUrl).toBe(
      'https://firebasestorage.googleapis.com/v0/b/conexia.firebasestorage.app/o/avatars%2Fu1?alt=media&v=1700000000000',
    );
    expect(updateUser).toHaveBeenCalledWith('u1', { photoURL: photoUrl });
  });

  it('no asocia la URL si falla la subida', async () => {
    save.mockRejectedValue(new Error('sin conexión'));

    await expect(service.uploadAvatar('u1', photo)).rejects.toThrow(
      'sin conexión',
    );
    expect(updateUser).not.toHaveBeenCalled();
  });
});
