# Commander Image Color

Recolor the static commander images on the loading cinematic, and randomly on the start
screen and in the armory.

Armory thumbnails each get their own random primary/secondary pair. The pair is keyed on
the commander's thumbnail path plus a salt drawn once per visit, so the grid is stable
while you scroll but differs each time you open it.

It's not a cheap operation and there well be visual hiccups - trying again with webgl shaders is left as an exercise for the reader.

There are a number of [known pixel issues](https://github.com/JustinLove/commander_image_color/issues) (and surely more I haven't noticed) that could use refinement of selection or replacement

Since one of the base colors is yellow, I don't believe it's possible to avoid the construction stripes without an image-specific exclusion area.

[Working discussion](https://forums.uberent.com/threads/recoloring-static-images.64585/)
