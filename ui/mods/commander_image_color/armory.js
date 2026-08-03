(function() {
  var cic = commander_image_color
  var names = cic.colorNames

  // Colours are picked from the commander's own thumbnail path, so the grid
  // stays put while you scroll or the list re-renders rather than reshuffling
  // under you.  The salt is drawn once per visit, so the armory still looks
  // different every time you open it.
  var salt = Math.floor(Math.random() * 0x7fffffff)

  var hash = function(text) {
    var h = 2166136261
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i)
      // 16777619, via shifts so it stays in 32-bit range
      h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0
    }
    return h >>> 0
  }

  var choose = function(key) {
    var h = hash(key + ':' + salt)
    var primary = h % names.length
    // an offset of 1..n-1 can never land back on the primary, so the two are
    // always a contrasting pair
    var secondary = (primary + 1 + (Math.floor(h / names.length) % (names.length - 1))) % names.length
    return {
      primary: cic.parseRgb(cic.colors[names[primary]].colour),
      secondary: cic.parseRgb(cic.colors[names[secondary]].colour)
    }
  }

  // The armory shows every commander at once, so recolouring them in one pass
  // would block the UI thread for as long as it takes.  One per tick keeps the
  // scene responsive while the grid fills in.
  var queue = []
  var draining = false

  var drain = function() {
    var image = queue.shift()
    if (!image) {
      draining = false
      return
    }
    try {
      var choice = choose(image.src)
      cic.replaceTeamColors(image, image, choice.primary, choice.secondary)
    } catch (e) {
      console.error(e)
    }
    setTimeout(drain, 0)
  }

  var enqueue = function(image) {
    queue.push(image)
    if (!draining) {
      draining = true
      setTimeout(drain, 0)
    }
  }

  var scan = function() {
    $('#commander-list img.icon').each(function() {
      var image = this

      // already carrying our output
      if (image.src && image.src === image.__cicRenderedSrc) return
      if (image.__cicQueued === image.src) return

      if (!image.src) return

      if (!image.complete || !image.naturalWidth) {
        if (!image.__cicHooked) {
          image.__cicHooked = true
          $(image).on('load', function() { scan() })
        }
        return
      }

      image.__cicQueued = image.src
      enqueue(image)
    })
  }

  if (model.commanders) {
    ko.computed(function() {
      model.commanders()
      setTimeout(scan, 0)
    })
  }

  setTimeout(scan, 500)
})()
