# BACKUP - Geoportal Participativo Microintervenciones Ibarra

> **Archivos:** `index.html` (HTML), `styles.css` (CSS), `app.js` (JavaScript)
> **Script SQL:** `sql_propuestas_ciudadanas.sql`
> **Fecha de backup:** Julio 2026

---

## 1. CONFIGURACION SUPABASE

```
URL REST: https://yrftjxksukvtllenfnar.supabase.co/rest/v1
Project ID: yrftjxksukvtllenfnar
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZnRqeGtzdWt2dGxsZW5mbmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNjgxMDIsImV4cCI6MjA5OTk0NDEwMn0.guXwLr28AwjAAg08D5Jmr1DN787y0jrk6oJUuDzMV0g
```

### 11 capas en Supabase:
| Capa | Tipo | Campo |
|---|---|---|
| areas_verdes_ibarra | MULTIPOLYGON | geom |
| crv_5m_ibarra | MULTILINESTRING | geom |
| equip_ed_ib | POINT | geom |
| equip_sa_ib | POINT | geom |
| limite_urbano_ibarra | MULTIPOLYGON | geom |
| manzanas_ibarra | MULTIPOLYGON | geom |
| parroquias_urbanas | MULTIPOLYGON | geom |
| predial_ibarra | MULTIPOLYGON | geom |
| rios_ibarra | MULTILINESTRING | geom |
| uso_de_suelo_ibarra | MULTIPOLYGON | geom |
| vias_ibarra | MULTILINESTRING | geom |

### Tabla adicional (requiere crear):
`propuestas_ciudadanas` - ver `sql_propuestas_ciudadanas.sql`

---

## 2. PALETA DE COLORES

```
Background:    #0b0b09
Accent Lime:   #c1e116
Texto:         #ece9e4
Bordes:        #5c5b57
Cards:         #1a1a1c
```

---

## 3. ESTRUCTURA DE ARCHIVOS

```
index.html     - Estructura HTML + referencias a CSS/JS
styles.css     - Todos los estilos CSS (~150 lineas)
app.js         - Toda la logica JavaScript (~1100 lineas)
```

### Dependencias CDN:
- Leaflet CSS: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.css`
- Leaflet JS: `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js`
- Turf.js: `https://cdn.jsdelivr.net/npm/@turf/turf@7.2.0/turf.min.js`

---

## 4. PESTANAS (6 tabs)

Orden de botones: CAPAS - ANALISIS - PRIORIZACION - PARTICIPACION - PENDIENTE - DASHBOARD

### Tab order en HTML (lineas 159-164):
```html
<button data-tab="capas">Capas</button>
<button class="activo" data-tab="analisis">Analisis</button>
<button data-tab="pendiente">Pendiente</button>
<button data-tab="priorizacion">Priorizacion</button>
<button data-tab="participacion">Participacion</button>
<button data-tab="dashboard">Dashboard</button>
```

---

## 5. ARQUITECTURA DE MAPAS (CRITICO)

### 4 mapas independientes creados al cargar pagina:
```javascript
function makeMap(id){
  const m=L.map(id,{zoomControl:true}).setView(CENTER,13);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",...).addTo(m);
  return m;
}
const mapAnalisis=makeMap("map-analisis");
const mapParticipacion=makeMap("map-participacion");
const mapPriorizacion=makeMap("map-priorizacion");
const mapCapas=makeMap("map-capas");
```

### BUG CRITICO RESUELTO: Basemap compartido
- **Problema:** `bmDark` era UNA sola instancia. Leaflet remueve la capa del mapa anterior al hacer `addTo()`.
- **Solucion:** Cada mapa crea su propio tile layer en `makeMap()`.
- **Selector de basemap:** `getBmLayer(v)` crea instancias NUEVAS por mapa. `trackBm(m,v)` reemplaza correctamente.

### Mapa Pendiente (lazy):
```javascript
let mapIso = null;
let mapQuince = null;
// Se crean solo al abrir pestana Pendiente via initPendienteMaps()
```

### CSS de mapas (en styles.css):
```css
.geo-map{display:none;position:absolute;top:0;left:420px;right:0;bottom:0}
.geo-map.visible{display:block}
#pendiente-container{display:none;flex:1;flex-direction:row;min-height:0}
#pendiente-container.visible{display:flex}
```

### Cambio de basemap (lineas 602-613):
```javascript
function getBmLayer(v){return v==="osm"?L.tileLayer(...):v==="sat"?L.tileLayer(...):L.tileLayer(...)}
const bmRefs=[];
function trackBm(m,v){
  const old=bmRefs[m._leaflet_id];
  if(old)try{m.removeLayer(old)}catch(_){}
  const nw=getBmLayer(v);nw.addTo(m);bmRefs[m._leaflet_id]=nw;
}
```

---

## 6. LAYER GROUPS

```javascript
// Analisis
const grupoCercano=L.layerGroup().addTo(mapAnalisis);
const grupoLejano=L.layerGroup().addTo(mapAnalisis);
const grupoOrigen=L.layerGroup().addTo(mapAnalisis);

// Participacion
const grupoPropuestas=L.layerGroup();

// Priorizacion
const grupoPriorizacion=L.layerGroup();
const grupoBufferSalud=L.layerGroup();
const grupoBufferEdu=L.layerGroup();
const grupoBufferVerdes=L.layerGroup();
const grupoGrilla=L.layerGroup();

// Capas independientes
const capasIndependientes={};

// Pendiente
const grupoIso=L.layerGroup();
const grupoQuince=L.layerGroup();
const puntoIso=L.layerGroup();
const puntoQuince=L.layerGroup();
```

---

## 7. FUNCIONES POR GEOPROCESO

### Analisis de Proximidad
- `activarSeleccionPunto()` - Activa modo seleccion en mapAnalisis
- `calcular()` - Consulta capa, calcula cercano/lejano con Turf.js
- `dibujarAnalisis()` - Dibuja origen, cercano, lejano en grupoOrigen/grupoCercano/grupoLejano
- `limpiarAnalisis()` - Limpia layer groups

### Participacion Ciudadana
- `cargarPropuestas()` - GET de Supabase a propuestas_ciudadanas
- `guardarPropuesta()` - POST a Supabase
- `votarPropuesta(id,dir)` - PATCH votos en Supabase
- `renderPropuestas()` - Renderiza lista + filtros + mapa (incluye `grupoPropuestas.clearLayers()` antes de agregar)
- `agregarPropuestaAlMapa(prop)` - Agrega marker individual
- `togglePropuestasEnMapa()` / `mostrarPropuestasEnMapa()` / `ocultarPropuestasDelMapa()`
- `activarSeleccionPropuesta()` - Activa modo seleccion en mapParticipacion

### Priorizacion Multicriterio
- `ejecutarPriorizacion()` - Geoproceso completo: carga 5 capas, genera buffers, grilla, scoring
- `calcularScoreGeoproceso()` - Scoring con pesos normalizados (sliders 0-100)
- `limpiarPriorizacion()` - Limpia todos los layer groups
- Funciones auxiliares: `unirFeatures()`, `menorDistanciaPuntosRapido()`, `menorDistanciaFeaturesRapido()`, `colorPrioridad()`, `normalizar()`

### Pendiente (Comparacion Tobler vs 15min)
- `initPendienteMaps()` - Lazy init de mapIso y mapQuince
- `ejecutarPendiente()` - Funcion de Tobler con variacion pseudoaleatoria
- `limpiarPendiente()` - Limpia layer groups
- `setPendientePoint(lat,lng)` - Ubica punto de partida
- `toblerSpeed(slopePercent)` - v = 6 * exp(-3.5 * |m + 0.05|)
- `semillaDeterminista(i)` - Genera variacion pseudoaleatoria

### Capas Independientes
- `renderCapasDisponibles()` - Genera checkboxes por cada capa en CAPAS_ESQUEMA
- Cada checkbox carga desde Supabase y agrega a mapCapas
- `encenderTodasCapas()` / `apagarTodasCapas()`

### Dashboard (4 secciones)
- `actualizarDashboard()` - Orquesta las 4 secciones
- `dibujarHeatmap()` - Canvas HTML5 con grid de densidad + burbujas radiales
- `calcularCoberturaDashboard()` - Calcula % propuestas dentro de buffers (salud 500m, edu 400m, verdes 300m)

---

## 8. TAB SWITCHING (en app.js, ~linea 560)

```javascript
// Clave: sidebar se expande a 100% en dashboard
const sidebar=document.getElementById("sidebar");
if(tabActual==="dashboard"){
  sidebar.classList.add("dashboard-full");
  panel.classList.add("dashboard-grid");
}else{
  sidebar.classList.remove("dashboard-full");
}
```

### CSS dashboard (en styles.css):
```css
#sidebar.dashboard-full{width:100%;min-width:100%}
.tab-panel.dashboard-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));grid-auto-rows:1fr;gap:12px;padding:16px;align-content:start}
.dash-wide{grid-column:1/-1}
.dash-tall{grid-row:span 2}
```

---

## 9. DASHBOARD - DISTRIBUCION DE CARDS

```
[Fila 1] Resumen General .................. (dash-wide, todas las columnas)
[Fila 2] Distribucion de Prioridad ........ | Propuestas por Categoria (dash-tall) | Mapa de Calor (dash-tall)
[Fila 3] Capas Disponibles ............... | [mismo card arriba] .................. | [mismo card arriba]
```

Cards con `dash-tall` ocupan 2 filas de altura.

---

## 10. BUGS RESUELTOS

### Bug 1: Basemap compartido
- **Problema:** Una instancia de tile layer movida entre 4 mapas
- **Solucion:** Cada mapa crea su propio tile layer; selector crea instancias nuevas

### Bug 2: Marcadores duplicados
- **Problema:** `renderPropuestas()` agregaba marcadores sin limpiar
- **Solucion:** `grupoPropuestas.clearLayers()` antes del loop

### Bug 3: Funciones faltantes
- **Problema:** `marcarGeoprocesoActivo()` y `limpiarGeoprocesoActivo()` eliminadas accidentalmente
- **Solucion:** Restauradas como funciones vacias

---

## 11. DEPENDENCIAS CDN

```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<link rel="stylesheet" href="styles.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@turf/turf@7.2.0/turf.min.js"></script>
<script src="app.js"></script>
```

---

## 12. CATEGORIAS DE PROPUESTAS

```javascript
const CAT_COLORES = {
  ACERAS:"#8c9b38", ILUMINACION:"#c1e116", ARBOLADO:"#546c04",
  MOBILIARIO:"#b9c671", DRENAJE:"#c9c7d4", SEGURIDAD:"#a49c9b",
  REPAVEO:"#72716e", ESPACIO_VERDE:"#6e7c28", SEÑALIZACION:"#dce896", OTROS:"#969592"
};
```

---

## 13. CENTER MAPA

```javascript
const CENTER=[0.3517,-78.1223]; // Ibarra, Ecuador
```

---

## 14. COMO REVERTIR

1. Copiar estos 3 archivos como respaldo: `index.html`, `styles.css`, `app.js`
2. Si se rompe algo, restaurar desde este backup
3. Los cambios criticos que NO deben tocarse:
   - Arquitectura de mapas independientes (4 `L.map()` separados en `makeMap()`)
   - Sistema de basemap con `getBmLayer()` + `trackBm()` (nunca compartir instancias)
   - `grupoPropuestas.clearLayers()` en `renderPropuestas()`
   - Funciones vacias `marcarGeoprocesoActivo()` y `limpiarGeoprocesoActivo()`
