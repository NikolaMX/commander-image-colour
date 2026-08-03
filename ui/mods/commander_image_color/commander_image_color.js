(function() {
  var colors = {
    'ORANGE': {
      colour: 'rgb(255,144,47)',
      secondary_colour: ['LIGHT BLUE', 'DARK BLUE'],
      index: 8
    },
    'LIGHT BLUE': {
      colour: 'rgb(51,151,197)',
      secondary_colour: ['YELLOW', 'RED'],
      index: 4
    },
    'DARK BLUE': {
      colour: 'rgb(59,54,182)',
      secondary_colour: ['ORANGE', 'YELLOW'],
      index: 3
    },
    'GREEN': {
      colour: 'rgb(83,119,48)',
      secondary_colour: ['PINK', 'PURPLE'],
      index: 5
    },
    'YELLOW': {
      colour: 'rgb(219,217,37)',
      secondary_colour: ['LIGHT BLUE', 'PURPLE'],
      index: 6
    },
    'BLACK': {
      colour: 'rgb(25,25,25)',
      secondary_colour: ['ORANGE', 'PINK', 'LIGHT BLUE', 'GREEN', 'RED'],
      index: 10
    },
    'PINK': {
      colour: 'rgb(206,51,122)',
      secondary_colour: ['LIGHT BLUE', 'ORANGE'],
      index: 1
    },
    'WHITE': {
      colour: 'rgb(200,200,200)',
      secondary_colour: ['PINK', 'LIGHT BLUE', 'ORANGE', 'RED', 'GREEN'],
      index: 9
    },
    'BROWN': {
      colour: 'rgb(142,107,68)',
      secondary_colour: ['DARK BLUE', 'PINK'],
      index: 7
    },
    'PURPLE': {
      colour: 'rgb(113,52,165)',
      secondary_colour: ['YELLOW', 'GREEN'],
      index: 2
    },
    'RED': {
      colour: 'rgb(210,50,44)',
      secondary_colour: ['GREEN', 'LIGHT BLUE'],
      index: 0
    }
  };
  var colorNames = Object.keys(colors)

  // The stock team colours the commander art is authored in.  These are the
  // chroma reference: a pixel keeps its saturation *relative* to the stock
  // colour rather than being assigned a single flat saturation, which is what
  // preserves the difference between dull plating and bright team panels.
  var STOCK_PRIMARY = [58, 119, 174]
  var STOCK_SECONDARY = [255, 200, 2]

  // Hue bands (HSL, 0..1) those colours occupy, and how wide an ease to put
  // either side.  A hard cutoff leaves a rim of un-swapped pixels along every
  // anti-aliased edge, which is exactly where the eye looks.
  var PRIMARY_LOW = 0.40, PRIMARY_HIGH = 0.70, PRIMARY_FEATHER = 0.05
  var SECONDARY_LOW = 0.05, SECONDARY_HIGH = 0.18, SECONDARY_FEATHER = 0.03

  // Below SAT_FLOOR a pixel is neutral metal and has to stay neutral; the
  // effect fades in over SAT_RAMP above it.  Most of a commander falls inside
  // the primary hue band because the base steel is a desaturated blue, so
  // without this the whole hull gets tinted rather than just the team panels.
  var SAT_FLOOR = 0.04, SAT_RAMP = 0.10

  // Working resolution.  Never below this, never above the source's own size.
  // Using the element's layout size instead throws away most of a 1780x1780
  // source; going all the way to natural size would put several MB of base64
  // in the DOM per commander.
  var MIN_EDGE = 768

  var parseRgb = function(string) {
    return string.replace('rgb(', '').replace(')', '').split(',').map(function(s) {return parseInt(s, 10)})
  }

  // --- colour space ---------------------------------------------------------
  // Oklab rather than HSL.  HSL is computed on gamma-encoded sRGB, so
  // replacing saturation and remapping lightness in it turns dark tones muddy.
  // Oklab's lightness can be carried through untouched, which is what keeps
  // the shading intact.

  var cbrt = Math.cbrt || function(x) { return Math.pow(x, 1 / 3) }

  // sRGB -> linear, for the 256 byte values the source can actually hold.
  var TO_LINEAR = new Float32Array(256)
  for (var i = 0; i < 256; i++) {
    var c = i / 255
    TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }

  // linear -> sRGB, sampled.  Rounding to 1/4096 is far below a byte of output.
  var SRGB_STEPS = 4096
  var TO_SRGB = new Uint8Array(SRGB_STEPS + 1)
  for (var j = 0; j <= SRGB_STEPS; j++) {
    var v = j / SRGB_STEPS
    var e = v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055
    TO_SRGB[j] = Math.max(0, Math.min(255, Math.round(e * 255)))
  }

  var encode = function(linear) {
    if (linear <= 0) return 0
    if (linear >= 1) return 255
    return TO_SRGB[(linear * SRGB_STEPS) | 0]
  }

  // Oklab of a 0..255 triple, returned through these module-level slots so the
  // per-pixel path never allocates.
  var okL = 0, okA = 0, okB = 0

  var toOklab = function(lr, lg, lb) {
    var l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb
    var m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb
    var s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb

    var l_ = cbrt(l), m_ = cbrt(m), s_ = cbrt(s)

    okL = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    okA = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    okB = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
  }

  // Direction and chroma of a target colour, so the per-pixel path can rotate
  // towards it with no trigonometry at all.
  var describe = function(rgb) {
    toOklab(TO_LINEAR[rgb[0]], TO_LINEAR[rgb[1]], TO_LINEAR[rgb[2]])
    var chroma = Math.sqrt(okA * okA + okB * okB)
    return {
      unitA: chroma > 1e-6 ? okA / chroma : 1,
      unitB: chroma > 1e-6 ? okB / chroma : 0,
      chroma: chroma
    }
  }

  // 1 well inside the band, easing to 0 across `feather` either side.
  var band = function(h, low, high, feather) {
    var t = Math.min((h - low + feather) / feather, (high + feather - h) / feather)
    if (t <= 0) return 0
    if (t >= 1) return 1
    return t * t * (3 - 2 * t)
  }

  // --- the recolour ---------------------------------------------------------

  function workingSize(image) {
    var natural = Math.max(image.naturalWidth || 0, image.naturalHeight || 0)
    if (!natural) return 0
    var shown = Math.max(image.offsetWidth || 0, image.offsetHeight || 0)
    var dpr = window.devicePixelRatio || 1
    return Math.min(natural, Math.max(MIN_EDGE, Math.ceil(shown * dpr)))
  }

  // The pristine pixels, cached on the element.  Without this a second call
  // recolours the previous output: the hue is the player's colour by then, so
  // a repeat pass can land it in the *other* band and shift it again.
  function sourcePixels(image) {
    // Once the element's src has been replaced with our output, the original
    // pixels are only available from the cache - re-reading the element would
    // recolour the previous pass.  So the cache is used whenever the element
    // is not showing artwork we have never seen.
    var cached = image.__cicSource
    if (cached && (image.src === image.__cicRenderedSrc || image.src === image.__cicSourceSrc)) {
      return cached
    }

    var edge = workingSize(image)
    if (!edge) return null

    var ratio = edge / Math.max(image.naturalWidth, image.naturalHeight)
    var width = Math.max(1, Math.round(image.naturalWidth * ratio))
    var height = Math.max(1, Math.round(image.naturalHeight * ratio))

    var canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    var ctx = canvas.getContext('2d')
    ctx.drawImage(image, 0, 0, width, height)

    image.__cicSource = ctx.getImageData(0, 0, width, height)
    image.__cicSourceSrc = image.src
    return image.__cicSource
  }

  function replaceTeamColors(from, to, primary, secondary) {
    var source = sourcePixels(from)
    if (!source) return

    var width = source.width, height = source.height

    var canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    var ctx = canvas.getContext('2d')

    var target = ctx.createImageData(width, height)
    var src = source.data
    var out = target.data

    var stockPrimary = describe(STOCK_PRIMARY)
    var stockSecondary = describe(STOCK_SECONDARY)
    var wantPrimary = describe(primary)
    var wantSecondary = describe(secondary)

    var primaryGain = wantPrimary.chroma / Math.max(stockPrimary.chroma, 1e-6)
    var secondaryGain = wantSecondary.chroma / Math.max(stockSecondary.chroma, 1e-6)

    var r, g, b, mx, mn, chroma, h, s, l
    var lr, lg, lb, a2, b2, c2, wp, ws, want, gain, tA, tB, w
    var l_, m_, s_, lin_l, lin_m, lin_s

    for (var p = 0, len = src.length; p < len; p += 4) {
      r = src[p]; g = src[p + 1]; b = src[p + 2]
      out[p + 3] = src[p + 3]

      // Fully transparent pixels are over half the canvas on this artwork and
      // carry no colour worth converting.
      if (src[p + 3] === 0) {
        out[p] = r; out[p + 1] = g; out[p + 2] = b
        continue
      }

      mx = r > g ? (r > b ? r : b) : (g > b ? g : b)
      mn = r < g ? (r < b ? r : b) : (g < b ? g : b)
      chroma = mx - mn

      if (chroma === 0) {
        out[p] = r; out[p + 1] = g; out[p + 2] = b
        continue
      }

      l = (mx + mn) / 510
      s = l <= 0.5 ? chroma / (mx + mn) : chroma / (510 - mx - mn)

      if (mx === r) {
        h = (g - b) / chroma
      } else if (mx === g) {
        h = ((b - r) / chroma) + 2
      } else {
        h = ((r - g) / chroma) + 4
      }
      h = ((h / 6) + 1) % 1

      wp = band(h, PRIMARY_LOW, PRIMARY_HIGH, PRIMARY_FEATHER)
      ws = band(h, SECONDARY_LOW, SECONDARY_HIGH, SECONDARY_FEATHER)
      if (wp > 0 || ws > 0) {
        w = (s - SAT_FLOOR) / SAT_RAMP
        w = w <= 0 ? 0 : (w >= 1 ? 1 : w)
        wp *= w
        ws *= w * (1 - wp)
      }

      if (wp <= 0 && ws <= 0) {
        out[p] = r; out[p + 1] = g; out[p + 2] = b
        continue
      }

      lr = TO_LINEAR[r]; lg = TO_LINEAR[g]; lb = TO_LINEAR[b]
      toOklab(lr, lg, lb)
      l = okL; a2 = okA; b2 = okB

      // Rotate towards each target's hue and scale chroma by how much more (or
      // less) saturated that target is than the stock colour it replaces.
      // Working in Cartesian keeps this free of atan2/sin/cos per pixel.
      if (wp > 0) {
        c2 = Math.sqrt(a2 * a2 + b2 * b2)
        want = wantPrimary; gain = primaryGain
        tA = want.unitA * c2 * gain
        tB = want.unitB * c2 * gain
        a2 += (tA - a2) * wp
        b2 += (tB - b2) * wp
      }
      if (ws > 0) {
        c2 = Math.sqrt(a2 * a2 + b2 * b2)
        want = wantSecondary; gain = secondaryGain
        tA = want.unitA * c2 * gain
        tB = want.unitB * c2 * gain
        a2 += (tA - a2) * ws
        b2 += (tB - b2) * ws
      }

      l_ = l + 0.3963377774 * a2 + 0.2158037573 * b2
      m_ = l - 0.1055613458 * a2 - 0.0638541728 * b2
      s_ = l - 0.0894841775 * a2 - 1.2914855480 * b2
      lin_l = l_ * l_ * l_
      lin_m = m_ * m_ * m_
      lin_s = s_ * s_ * s_

      out[p] = encode(4.0767416621 * lin_l - 3.3077115913 * lin_m + 0.2309699292 * lin_s)
      out[p + 1] = encode(-1.2684380046 * lin_l + 2.6097574011 * lin_m - 0.3413193965 * lin_s)
      out[p + 2] = encode(-0.0041960863 * lin_l - 0.7034186147 * lin_m + 1.7076147010 * lin_s)
    }

    ctx.putImageData(target, 0, 0)

    to.src = canvas.toDataURL()
    to.__cicRenderedSrc = to.src
    if (to !== from) {
      to.__cicSource = source
      to.__cicSourceSrc = from.__cicSourceSrc
    }
  }

  window.commander_image_color = {
    colors: colors,
    colorNames: colorNames,
    parseRgb: parseRgb,
    replaceTeamColors: replaceTeamColors
  }
})()
