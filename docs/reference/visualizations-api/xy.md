---
applies_to:
  stack: preview 9.4+
  serverless: preview
navigation_title: XY (line, area, bar)
---

# XY (line, area, bar) chart

Top-level configuration fields.

:::{csv-include} _tables/xy.csv
:::

## Axis

:::{csv-include} _tables/xy-axis.csv
:::

## Drilldowns

:::{csv-include} _tables/shared-drilldowns.csv
:::

## Styling

:::{csv-include} _tables/xy-styling.csv
:::

## Layers


Each entry in the `layers` array must match one of the following types.


### Data layer

:::{csv-include} _tables/xy-layer-data.csv
:::

### Reference line layer

:::{csv-include} _tables/xy-layer-reference-line.csv
:::

### Annotation layer

:::{csv-include} _tables/xy-layer-annotation.csv
:::

## Legend


### Legend

:::{csv-include} _tables/xy-legend.csv
:::