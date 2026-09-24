'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';

/** Parent keys this component by URL so late events cannot affect another card. */
export default function CardArtwork({ src, name }: { src: string; name: string }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const checkCachedImage = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete) setStatus(image.naturalWidth > 0 ? 'ready' : 'error');
  }, []);

  return (
    <div className="card-art" data-image-state={status} aria-busy={status === 'loading'}>
      <Image
        ref={checkCachedImage}
        unoptimized
        src={src}
        alt={`${name}插画`}
        width={1024}
        height={1536}
        loading="eager"
        onLoad={() => setStatus('ready')}
        onError={() => setStatus('error')}
      />
      {status !== 'ready' && (
        <output className="card-art-status" aria-live="polite">
          {status === 'loading' && <span className="card-art-spinner" aria-hidden="true" />}
          <span>{status === 'loading' ? '图片加载中…' : '图片暂时加载失败'}</span>
        </output>
      )}
      <div className="postmark" aria-hidden="true">
        <span>岁 时 有 信</span>
        <strong>JIEQI</strong>
        <span>寄 给 此 刻</span>
      </div>
    </div>
  );
}
