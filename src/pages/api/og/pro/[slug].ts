import type { APIRoute } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { getProBySlug } from '../../../../lib/pro';
import { moodTokens } from '../../../../lib/pro-moods';
import { normalizeHex, inkOn } from '../../../../lib/color';

/**
 * OG dinámico de una landing de profesional. Sin esto, el link pegado en
 * WhatsApp parece spam y nadie lo abre. No es opcional.
 *
 * Usa las dos fuentes ya empaquetadas (astro.config.includeFiles). Las cuatro
 * familias de los moods no se embeben en la tarjeta: el acento del mood sí se
 * respeta, que es lo que da el reconocimiento a primera vista.
 */
let fontsCache: { display: Buffer; body: Buffer } | null = null;

function loadFonts() {
  if (fontsCache) return fontsCache;
  const dir = path.join(process.cwd(), 'src/assets/fonts');
  fontsCache = {
    display: fs.readFileSync(path.join(dir, 'BricolageGrotesque-Bold.ttf')),
    body: fs.readFileSync(path.join(dir, 'InterTight-Regular.ttf')),
  };
  return fontsCache;
}

export const GET: APIRoute = async ({ params }) => {
  const pro = await getProBySlug(params.slug!);
  if (!pro) return new Response('Not found', { status: 404 });

  const mood = moodTokens(pro.mood);
  const accent = normalizeHex(pro.accent_hex) ?? mood.accent;
  const photo = pro.photo_hero_url;
  const fonts = loadFonts();

  const leftWidth = photo ? '62%' : '100%';

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          display: 'flex',
          backgroundColor: mood.paper,
          position: 'relative',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                width: leftWidth,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '0 68px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontFamily: 'Bricolage',
                      fontSize: '72px',
                      fontWeight: 700,
                      color: mood.ink,
                      lineHeight: 1.04,
                      letterSpacing: '-0.03em',
                    },
                    children: pro.pro_name,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontFamily: 'InterTight',
                      fontSize: '32px',
                      color: mood.inkSoft,
                      marginTop: '22px',
                    },
                    children: pro.pro_title,
                  },
                },
                ...(pro.instagram_handle
                  ? [
                      {
                        type: 'div',
                        props: {
                          style: {
                            fontFamily: 'InterTight',
                            fontSize: '24px',
                            color: accent,
                            marginTop: '32px',
                          },
                          children: `@${pro.instagram_handle}`,
                        },
                      },
                    ]
                  : []),
              ],
            },
          },
          ...(photo
            ? [
                {
                  type: 'img',
                  props: {
                    src: photo,
                    style: { width: '38%', height: '100%', objectFit: 'cover' },
                  },
                },
              ]
            : []),
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: '8px',
                backgroundColor: accent,
              },
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Bricolage', data: fonts.display, weight: 700, style: 'normal' },
        { name: 'InterTight', data: fonts.body, weight: 400, style: 'normal' },
      ],
    }
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
};
