## 1.4.0

- Recolour the commander thumbnails in the armory as well, each in its own
  random pair. The pair is derived from the commander's own thumbnail path so
  the grid does not reshuffle while you scroll, and from a salt drawn once per
  visit so it still looks different every time you open the armory. Primary
  and secondary are always drawn a step apart, so no commander comes out in a
  single colour.
- The armory shows every commander at once, so thumbnails are recoloured one
  per tick rather than in a single pass that would stall the scene.

## 1.3.0

Image quality pass.

- Work at the source image's own resolution rather than the element's layout
  size. The commander art is 1780x1780 and was being resampled down to a few
  hundred pixels before recolouring, then written back over the original.
  Working size is now `min(natural, max(768, displayed x dpr))` - 3-4x the
  linear resolution in the cinematic, and it never upscales.
- Recolour in Oklab instead of HSL, carrying lightness through untouched so
  shading and material detail survive the swap.
- Scale chroma relative to the stock team colour instead of assigning one flat
  saturation to every pixel in the band. Saturation inside the band spans
  0.1-1.0 in the source art; collapsing that to a single value is what made
  the result look flat.
- Weight the effect by saturation so neutral steel stays neutral. Most of a
  commander falls inside the primary hue band because the base metal is a
  desaturated blue, and hue was previously swapped regardless of saturation,
  tinting the whole hull rather than the team panels.
- Ease the hue bands in and out instead of cutting hard at the edges, which
  left a rim of un-swapped pixels along every anti-aliased edge.
- Fix the secondary branch using the primary's lightness.
- Cache the source pixels. Recolouring happened in place, reading back the
  element that had already been recoloured, so a second pass processed its own
  output - and with the hue by then sitting on the player colour, a repeat
  could land in the other band and shift it again.
- Drop the per-pixel object allocations (two per pixel, so roughly a million
  per commander) in favour of scalar maths and lookup tables.

The zero-size bail from 1.1.1 is no longer needed: the canvas is sized from
the image now, so a zero-size element cannot produce a zero-size canvas.

## 1.1.1

- Bail if the source image has zero size (e.g. titans mode)

## 1.1.0

- Use full color choice for start screen secondary
- Fix start page function for new layout
- Fix black colors on PTE cinematic

## 1.0.1

- Rename function to avoid name collision with game
