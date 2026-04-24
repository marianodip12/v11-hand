# Responsive Design Guide — Handball Pro v11

## Breakpoints (Tailwind)

- **Mobile**: default (< 768px)
- **Tablet** (`md:`): ≥ 768px
- **Desktop** (`lg:`): ≥ 1024px

## Layout Containers

### MaxWidthContainer
Limita contenido a `max-w-7xl` en desktop, full-width con padding en mobile.
```tsx
<MaxWidthContainer>
  {/* Contenido que se limita en desktop */}
</MaxWidthContainer>
```

### Stack
Flex column con gaps adaptativos: `space-y-3 md:space-y-4`.
```tsx
<Stack gap="md"> {/* sm | md | lg | xl */}
  {/* Items apilados verticalmente */}
</Stack>
```

### ResponsiveGrid
Grilla que adapta cols: 1 mobile → 2 tablet → 3 desktop.
```tsx
<ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md">
  <GridItem>Carta 1</GridItem>
  <GridItem>Carta 2</GridItem>
</ResponsiveGrid>
```

## Typography Scale

- **h1** (headings): `text-2xl md:text-3xl lg:text-4xl`
- **h2** (subheadings): `text-xl md:text-2xl`
- **body**: `text-sm md:text-base`
- **labels**: `text-[10px] md:text-xs`

Ejemplo:
```tsx
<h1 className="text-3xl md:text-4xl font-semibold">
  Mi Página
</h1>
```

## Spacing System

### Gap/Space
- **sm**: `gap-2` / `space-y-2` (8px)
- **md**: `gap-3` / `space-y-3` (12px) → escalado a `gap-4` / `space-y-4` (16px) en md+
- **lg**: `gap-4` / `space-y-4` (16px) → escalado a `gap-6` / `space-y-6` (24px) en md+

Ejemplo:
```tsx
<Stack gap="lg" className="pb-4">
  {/* Estos items tienen space-y-4 en mobile, space-y-6 en desktop */}
</Stack>
```

### Padding
- **Cards**: `p-3 md:p-4` (mobile 12px → desktop 16px)
- **Sections**: `px-4 md:px-6 lg:px-8` (horizontal padding aumenta en desktop)

## Header Pattern

**Mobile-First Header:**
```tsx
<header className="flex items-start justify-between flex-col md:flex-row md:gap-4">
  <div>
    <h1 className="text-3xl md:text-4xl font-semibold">
      🤾 Partidos
    </h1>
  </div>
  <Button>Acción</Button>
</header>
```

En mobile: stack vertical. En tablet+: lado a lado con gap.

## Grid Layouts

### Match Cards (Historial)
```tsx
<ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 2 }} gap="md">
  {matches.map((m) => <MatchCard key={m.id} match={m} />)}
</ResponsiveGrid>
```
→ 1 columna móvil, 2 columnas desktop

### Stats Tiles
```tsx
<ResponsiveGrid cols={{ mobile: 3, tablet: 4, desktop: 4 }} gap="md">
  <StatTile value={10} label="PJ" />
  <StatTile value={7} label="PG" />
  {/* ... */}
</ResponsiveGrid>
```
→ 3 cols móvil (pequeños), 4 cols desktop

## SVG Charts

Todos los charts usan `w-full h-auto` con viewBox responsivo:
```tsx
<svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
  {/* Content */}
</svg>
```

Esto escala automáticamente según ancho del contenedor.

## Components Already Responsive

- ✓ **Evolution** — gráficos SVG + MaxWidthContainer + headers escalables
- ✓ **Stats** — ídem
- ✓ **Match Analysis** — max-w-6xl en lg
- ✓ **Matches Page** — ResponsiveGrid para historial
- ✓ **Teams Page** — MaxWidthContainer
- ✓ **Live Match** — ya tiene LiveMatchLayout

## Common Patterns

### Full-Width with Max-Width
```tsx
<MaxWidthContainer>
  <Stack gap="md" className="pb-4">
    {/* Content */}
  </Stack>
</MaxWidthContainer>
```

### Flex Row that Wraps on Mobile
```tsx
<div className="flex flex-col md:flex-row gap-3 md:gap-4">
  {/* Items stack on mobile, row on desktop */}
</div>
```

### Conditional Display
```tsx
<div className="hidden md:block">
  {/* Only visible on tablet+ */}
</div>
<div className="md:hidden">
  {/* Only visible on mobile */}
</div>
```

## Testing Responsive

Chrome DevTools:
1. Ctrl+Shift+M (Toggle device toolbar)
2. Test at: 375px (mobile), 768px (tablet), 1024px (desktop)

Common issues:
- Content too wide → add MaxWidthContainer
- Cramped on desktop → adjust spacing with `md:` classes
- SVGs not scaling → add `w-full h-auto` and proper viewBox

## Pages Status

- **Matches** ✓ responsive
- **Teams** ✓ responsive
- **Live Match** ✓ (has LiveMatchLayout)
- **Match Analysis** ✓ responsive
- **Evolution** ✓ responsive
- **Stats** ✓ responsive

Nav inferior stays fixed en todos los viewports.
