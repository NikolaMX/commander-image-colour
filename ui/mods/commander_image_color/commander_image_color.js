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

  var parseRgb = function(string) {
    return string.replace('rgb(', '').replace(')', '').split(',').map(function(s) {return parseInt(s, 10)})
  }

  var componentFromHue = function(m1, m2, h) {
    h = ((h % 1) + 1) % 1;
    if (h*6 < 1) {
      return m1 + (m2-m1) * h*6;
    }
    if (h*2 < 1) {
      return m2;
    }
    if (h*3 < 2) {
      return m1 + (m2-m1) * (2/3 - h) * 6;
    }
    return m1;
  }

  var rgbFromHsl = function(h, s, l) {
    var m2;
    if (l < 0.5) {
      m2 = l * (s+1);
    } else {
      m2 = l + s - l*s;
    }
    var m1 = l*2 - m2;
    return {
      r: componentFromHue(m1, m2, h + 1/3),
      g: componentFromHue(m1, m2, h),
      b: componentFromHue(m1, m2, h - 1/3)
    };
  }

  var hslFromRgb = function(r, g, b) {
    var m = Math.min(r, g, b)
    var M = Math.max(r, g, b)
    var l = (M+m)/2
    var c = M - m
    var s
    if (l <= 0.0) {
      s = 0
    } else if (l <= 0.5) {
      s = c/(2*l)
    } else {
      s = c/(2 - 2*l)
    }
    var h = 0
    if (c == 0) {
      h = 0
    } else if (M == r) {
      h = ((g - b) / c)
    } else if (M == g) {
      h = ((b - r) / c) + 2
    } else if (M == b) {
      h = ((r - g) / c) + 4
    }
    h = ((h/6) + 1) % 1;

    return {
      h: h,
      s: s, 
      l: l
    }
  }


  function replaceTeamColors(from, to, primary, secondary) {
    if (from.offsetWidth < 1 || from.offsetHeight < 1) return

    primary = hslFromRgb(primary[0]/255, primary[1]/255, primary[2]/255)
    secondary = hslFromRgb(secondary[0]/255, secondary[1]/255, secondary[2]/255)

    var canvas = document.createElement("canvas");
    canvas.width = from.offsetWidth
    canvas.height = from.offsetHeight

    var ctx = canvas.getContext("2d");
    ctx.drawImage(from, 0, 0, canvas.width, canvas.height);

    var map = ctx.getImageData(0, 0, canvas.width, canvas.height)
    var data = map.data;

    var r, g, b
    var hsl, rgb
    for(var i = 0, len = data.length;i < len;i += 4) {
      r = data[i]/255
      g = data[i+1]/255
      b = data[i+2]/255
      // alpha channel (p+3) is ignored

      hsl = hslFromRgb(r, g, b)
      if (hsl.h > 0.40 && hsl.h < 0.70) {
        hsl.h = primary.h
        if (hsl.s > 0.1) {
          hsl.s = primary.s
          hsl.l = primary.l*Math.sqrt(hsl.l) + (1-primary.l)*Math.pow(hsl.l, 2)
        }
      } else if (hsl.h > 0.05 && hsl.h < 0.18) {
        hsl.h = secondary.h
        if (hsl.s > 0.2) {
          hsl.s = secondary.s
          hsl.l = primary.l*Math.sqrt(hsl.l) + (1-primary.l)*Math.pow(hsl.l, 2)
        }
      }
      rgb = rgbFromHsl(hsl.h, hsl.s, hsl.l)

      data[i] = rgb.r*255
      data[i+1] = rgb.g*255
      data[i+2] = rgb.b*255
      //data[i] = hsl.l*255
      //data[i+1] = hsl.l*255
      //data[i+2] = hsl.l*255
    }

    ctx.putImageData(map,0,0);

    to.src = canvas.toDataURL();
  }

  window.commander_image_color = {
    colors: colors,
    colorNames: colorNames,
    parseRgb: parseRgb,
    replaceTeamColors: replaceTeamColors
  }
})()
