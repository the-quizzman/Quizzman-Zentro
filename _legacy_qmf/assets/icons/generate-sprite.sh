#!/bin/bash
# Generate SVG sprite from individual icons
OUTPUT="sprite.svg"
ICON_DIR="svg"

echo '<?xml version="1.0" encoding="UTF-8"?>' > $OUTPUT
echo '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">' >> $OUTPUT
echo '  <defs>' >> $OUTPUT

for svg in $ICON_DIR/*.svg; do
    name=$(basename "$svg" .svg)
    # Extract path content and wrap in symbol
    content=$(cat "$svg" | sed 's/<svg[^>]*>//g' | sed 's/<\/svg>//g')
    echo "    <symbol id=\"icon-$name\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">" >> $OUTPUT
    echo "      $content" >> $OUTPUT
    echo "    </symbol>" >> $OUTPUT
done

echo '  </defs>' >> $OUTPUT
echo '</svg>' >> $OUTPUT
echo "Generated sprite.svg with $(ls $ICON_DIR/*.svg | wc -l) icons"
