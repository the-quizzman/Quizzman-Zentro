/**
 * @qmf/ui - Avatar Component
 * User avatar with fallback initials and online status indicator.
 */

import { createElement } from '@qmf/utils';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarOptions {
  /** Image source URL */
  src?: string;
  /** User display name (for fallback initials) */
  name?: string;
  /** Size */
  size?: AvatarSize;
  /** Show online indicator */
  online?: boolean;
  /** Additional CSS class */
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function createAvatar(options: AvatarOptions): HTMLElement {
  const { src, name = '', size = 'md', online, className = '' } = options;

  const wrapper = createElement('div', {
    className: `qmf-avatar qmf-avatar--${size} ${className}`.trim(),
  });

  if (src) {
    const img = createElement('img', {
      className: 'qmf-avatar__img',
      src,
      alt: name || 'Avatar',
    });
    img.addEventListener('error', () => {
      img.remove();
      const fallback = createElement('span', { className: 'qmf-avatar__initials' }, [getInitials(name)]);
      wrapper.appendChild(fallback);
    });
    wrapper.appendChild(img);
  } else {
    const initials = createElement('span', { className: 'qmf-avatar__initials' }, [getInitials(name) || '?']);
    wrapper.appendChild(initials);
  }

  if (online !== undefined) {
    const status = createElement('span', {
      className: `qmf-avatar__status ${online ? 'qmf-avatar__status--online' : 'qmf-avatar__status--offline'}`,
    });
    wrapper.appendChild(status);
  }

  return wrapper;
}
