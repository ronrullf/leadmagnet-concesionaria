import type { APIRoute } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { getDemoBySlug, getProperties, featuredProperty } from '../../../lib/demos';

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
  const demo = await getDemoBySlug(params.slug!);
  if (!demo) return new Response('Not found', { status: 404 });

  const properties = await getProperties(demo.id);
  const featured = featuredProperty(properties);
  const featuredImage = featured?.image_urls?.[0] ?? null;
  const accent = demo.accent_hex || '#0F5C4E';

  const fonts = loadFonts();

  const leftWidth = featuredImage ? '60%' : '100%';

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          display: 'flex',
          backgroundColor: '#FBFAF8',
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
                padding: '0 64px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontFamily: 'Bricolage',
                      fontSize: '72px',
                      fontWeight: 700,
                      color: '#12161A',
                      lineHeight: 1.05,
                      letterSpacing: '-0.03em',
                    },
                    children: demo.agency_name,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontFamily: 'InterTight',
                      fontSize: '32px',
                      color: '#4A5560',
                      marginTop: '20px',
                    },
                    children: demo.agency_city,
                  },
                },
              ],
            },
          },
          ...(featuredImage
            ? [
                {
                  type: 'img',
                  props: {
                    src: featuredImage,
                    style: {
                      width: '40%',
                      height: '100%',
                      objectFit: 'cover',
                    },
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
