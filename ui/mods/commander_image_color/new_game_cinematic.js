(function() {
  var cic = commander_image_color

  var colorCinematic = function() {
    $('.commander img').each(function(i) {
      var $com = $(this)
      var colorize = function() {
        cic.replaceTeamColors(
          $com[0],
          $com[0],
          playerColors()[i]
          ,
          secondaryColors()[i] || [127, 127, 127]
        );
      }
      setTimeout(colorize, 0)
    })
  }

  var secondaryColors = ko.observable([])
  var querySecondary = function() {
    api.Panel.query(api.Panel.parentId, 'panel.invoke', ['commanderImageColorSecondaryColors'])
      .then(function(colors) {
        secondaryColors(colors.map(cic.parseRgb))
      })
  }

  var playerColors = ko.computed(function() {
    var nested = model.teams().map(function(team) {
      return team.players().map(function(player) {
        return cic.parseRgb(player.color())
      })
    })
    return _.flatten(nested, !_.flattenDeep)
  })

  playerColors.subscribe(querySecondary)

  model.animate.subscribe(function() {
    setTimeout(colorCinematic, 500)
  })
})()
