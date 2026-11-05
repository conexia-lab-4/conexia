import { useState } from 'react';
import { getInitials } from '../../lib/tripFormat';
import './index.css';

interface AvatarProps {
  photoUrl?: string | null;
  name: string | null | undefined;
  // Clase de cada pantalla con el tamaño y los colores del avatar
  className: string;
}

// Muestra la foto del usuario; sin foto, o si no carga, muestra sus iniciales
export function Avatar({ photoUrl, name, className }: AvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = photoUrl && photoUrl !== failedUrl;

  return (
    <span className={`avatar ${className}`}>
      {showPhoto ? (
        <img
          src={photoUrl}
          alt=""
          className="avatar__img"
          onError={() => setFailedUrl(photoUrl)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
