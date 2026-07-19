const REST = "https://yrftjxksukvtllenfnar.supabase.co/rest/v1";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZnRqeGtzdWt2dGxsZW5mbmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNjgxMDIsImV4cCI6MjA5OTk0NDEwMn0.guXwLr28AwjAAg08D5Jmr1DN787y0jrk6oJUuDzMV0g";

const CAPAS_ESQUEMA = [
  {capa:"areas_verdes_ibarra",tipo:"MULTIPOLYGON",color:"#546c04",campo:"geom"},
  {capa:"crv_5m_ibarra",tipo:"MULTILINESTRING",color:"#72716e",campo:"geom"},
  {capa:"equip_ed_ib",tipo:"POINT",color:"#c1e116",campo:"geom"},
  {capa:"equip_sa_ib",tipo:"POINT",color:"#a49c9b",campo:"geom"},
  {capa:"limite_urbano_ibarra",tipo:"MULTIPOLYGON",color:"#54545c",campo:"geom"},
  {capa:"manzanas_ibarra",tipo:"MULTIPOLYGON",color:"#8c9b38",campo:"geom"},
  {capa:"parroquias_urbanas",tipo:"MULTIPOLYGON",color:"#6e7c28",campo:"geom"},
  {capa:"predial_ibarra",tipo:"MULTIPOLYGON",color:"#5c5b57",campo:"geom"},
  {capa:"rios_ibarra",tipo:"MULTILINESTRING",color:"#c9c7d4",campo:"geom"},
  {capa:"uso_de_suelo_ibarra",tipo:"MULTIPOLYGON",color:"#b9c671",campo:"geom"},
  {capa:"vias_ibarra",tipo:"MULTILINESTRING",color:"#969592",campo:"geom"}
];

const CAT_COLORES = {
  ACERAS:"#8c9b38",ILUMINACION:"#c1e116",ARBOLADO:"#546c04",
  MOBILIARIO:"#b9c671",DRENAJE:"#c9c7d4",SEGURIDAD:"#a49c9b",
  REPAVEO:"#72716e",ESPACIO_VERDE:"#6e7c28",SEÑALIZACION:"#dce896",OTROS:"#969592"
};

const CENTER=[0.3517,-78.1223];
function marcarGeoprocesoActivo(){}
function limpiarGeoprocesoActivo(){}

function makeMap(id){
  const m=L.map(id,{zoomControl:true}).setView(CENTER,13);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{maxZoom:20,attribution:"&copy; CARTO"}).addTo(m);
  return m;
}

const mapAnalisis=makeMap("map-analisis");
const mapParticipacion=makeMap("map-participacion");
const mapPriorizacion=makeMap("map-priorizacion");
const mapCapas=makeMap("map-capas");

function getBmLayer(v){return v==="osm"?L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:20,attribution:"&copy; OSM"}):v==="sat"?L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:18,attribution:"&copy; Esri"}):L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{maxZoom:20,attribution:"&copy; CARTO"})}
const bmRefs=[];
function trackBm(m,v){
  const old= bmRefs[m._leaflet_id];
  if(old)try{m.removeLayer(old)}catch(_){}
  const nw=getBmLayer(v);nw.addTo(m);bmRefs[m._leaflet_id]=nw;
}

document.getElementById("selectBasemap").addEventListener("change",function(){
  const v=this.value;
  [mapAnalisis,mapParticipacion,mapPriorizacion,mapCapas].forEach(m=>trackBm(m,v));
});

const grupoCercano=L.layerGroup().addTo(mapAnalisis);
const grupoLejano=L.layerGroup().addTo(mapAnalisis);
const grupoOrigen=L.layerGroup().addTo(mapAnalisis);
const grupoPropuestas=L.layerGroup();
const grupoPriorizacion=L.layerGroup();
const grupoBufferSalud=L.layerGroup();
const grupoBufferEdu=L.layerGroup();
const grupoBufferVerdes=L.layerGroup();
const grupoGrilla=L.layerGroup();
const capasIndependientes={};

let mapIso = null;
let mapQuince = null;
let basemapIso = null;
let basemapQuince = null;
const grupoIso = L.layerGroup();
const grupoQuince = L.layerGroup();
const puntoIso = L.layerGroup();
const puntoQuince = L.layerGroup();
let puntoPendiente = null;
let pendienteModoSeleccion = false;

function initPendienteMaps(){
  if(mapIso)return;
  const center=[0.3517,-78.1223];
  mapIso = L.map("map-isocrona",{zoomControl:false}).setView(center,14);
  mapQuince = L.map("map-quince",{zoomControl:false}).setView(center,14);
  basemapIso = {dark:L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{maxZoom:20,attribution:"&copy; CARTO"}),osm:L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:20,attribution:"&copy; OSM"}),sat:L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:18,attribution:"&copy; Esri"})};
  basemapQuince = {osm:L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:20,attribution:"&copy; OSM"}),dark:L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{maxZoom:20,attribution:"&copy; CARTO"}),sat:L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:18,attribution:"&copy; Esri"})};
  basemapIso.dark.addTo(mapIso);
  basemapQuince.osm.addTo(mapQuince);
  let bmIsoActual=basemapIso.dark;
  let bmQuinceActual=basemapQuince.osm;
  document.getElementById("basemapIsoSelect").addEventListener("change",function(){
    mapIso.removeLayer(bmIsoActual);bmIsoActual=basemapIso[this.value];bmIsoActual.addTo(mapIso);
  });
  document.getElementById("basemapQuinceSelect").addEventListener("change",function(){
    mapQuince.removeLayer(bmQuinceActual);bmQuinceActual=basemapQuince[this.value];bmQuinceActual.addTo(mapQuince);
  });
  grupoIso.addTo(mapIso);
  grupoQuince.addTo(mapQuince);
  puntoIso.addTo(mapIso);
  puntoQuince.addTo(mapQuince);

  mapIso.on("click",function(e){
    if(!pendienteModoSeleccion)return;
    setPendientePoint(e.latlng.lat,e.latlng.lng);
  });
  mapQuince.on("click",function(e){
    if(!pendienteModoSeleccion)return;
    setPendientePoint(e.latlng.lat,e.latlng.lng);
  });

  setTimeout(()=>{mapIso.invalidateSize();mapQuince.invalidateSize()},200);
}

function setPendientePoint(lat,lng){
  puntoPendiente={lat,lng};
  puntoIso.clearLayers();puntoQuince.clearLayers();
  L.circleMarker([lat,lng],{radius:8,color:"#c1e116",weight:3,fillOpacity:0.9}).addTo(puntoIso);
  L.circleMarker([lat,lng],{radius:8,color:"#c1e116",weight:3,fillOpacity:0.9}).addTo(puntoQuince);
  document.getElementById("coordPendiente").textContent="Lat: "+lat.toFixed(6)+" | Lng: "+lng.toFixed(6);
  pendienteModoSeleccion=false;
  document.getElementById("btnPendientePunto").classList.remove("activo");
  document.getElementById("btnPendientePunto").textContent="Seleccionar punto en el mapa";
  mapIso.getContainer().style.cursor="";
  mapQuince.getContainer().style.cursor="";
}

let puntoSeleccionado = null;
let puntoPropuesta = null;
let modoSeleccion = false;
let modoPropuesta = false;
let propuestas = [];
let filtroCatActiva = "TODAS";

function mostrarLoading(texto){document.getElementById("loading-text").textContent=texto||"Cargando...";document.getElementById("loading-overlay").classList.add("visible")}
function ocultarLoading(){document.getElementById("loading-overlay").classList.remove("visible")}

function mensaje(texto,tipo){
  const el=document.getElementById("resultado");
  el.textContent=texto;
  el.className=tipo==="error"?"error":tipo==="exito"?"exito":"";
}

function normalizarGeometria(valor){
  if(!valor)return null;
  if(typeof valor==="object"&&valor.type&&valor.coordinates)return valor;
  if(typeof valor==="string"){try{const o=JSON.parse(valor);if(o.type&&o.coordinates)return o}catch(_){return null}}
  return null;
}

function obtenerGeometria(registro){
  const campos=["geom","geometry","geometria","the_geom","shape"];
  for(const c of campos){
    if(registro[c]!==undefined&&registro[c]!==null){
      const g=normalizarGeometria(registro[c]);if(g)return g;
    }
  }
  for(const v of Object.values(registro)){const g=normalizarGeometria(v);if(g)return g}
  return null;
}

function atributosHTML(registro){
  let html="<div style='max-height:200px;overflow:auto'>";
  for(const[k,v]of Object.entries(registro)){
    if(["geom","geometry","geometria","the_geom","shape","id"].includes(k))continue;
    html+="<strong>"+k+":</strong> "+String(v??"")+"<br>";
  }
  return html+"</div>";
}

function distanciaPuntoLinea(origen,coords){
  const linea=turf.lineString(coords);
  return turf.pointToLineDistance(origen,linea,{units:"kilometers"})*1000;
}

function distanciaPuntoMultiLinea(origen,coords){
  let min=Infinity;
  for(const l of coords){if(!Array.isArray(l)||l.length<2)continue;
    const d=distanciaPuntoLinea(origen,l);if(d<min)min=d;}
  return min;
}

function distanciaPuntoPoligono(origen,coords){
  const poly=turf.polygon(coords);
  if(turf.booleanPointInPolygon(origen,poly))return 0;
  let min=Infinity;
  for(const anillo of coords){
    if(!Array.isArray(anillo)||anillo.length<2)continue;
    const d=distanciaPuntoLinea(origen,anillo);if(d<min)min=d;}
  return min;
}

function distanciaPuntoMultiPoligono(origen,coords){
  let min=Infinity;
  for(const poly of coords){
    const d=distanciaPuntoPoligono(origen,poly);
    if(d===0)return 0;if(d<min)min=d;}
  return min;
}

function calcularDistancia(origen,feature){
  const tipo=feature.geometry.type;
  const coords=feature.geometry.coordinates;
  switch(tipo){
    case "Point":return turf.distance(origen,feature,{units:"kilometers"})*1000;
    case "MultiPoint":{let min=Infinity;for(const c of coords){
      const d=turf.distance(origen,turf.point(c),{units:"kilometers"})*1000;
      if(d<min)min=d;}return min;}
    case "LineString":return distanciaPuntoLinea(origen,coords);
    case "MultiLineString":return distanciaPuntoMultiLinea(origen,coords);
    case "Polygon":return distanciaPuntoPoligono(origen,coords);
    case "MultiPolygon":return distanciaPuntoMultiPoligono(origen,coords);
    default:return Infinity;
  }
}

async function consultarTablaCompleta(nombreTabla){
  const registros=[];const tam=1000;let inicio=0;
  while(true){
    const fin=inicio+tam-1;
    const resp=await fetch(REST+"/"+encodeURIComponent(nombreTabla)+"?select=*",{
      method:"GET",headers:{apikey:KEY,Authorization:"Bearer "+KEY,Accept:"application/json",Range:inicio+"-"+fin,Prefer:"count=exact"}
    });
    const texto=await resp.text();
    if(!resp.ok)throw new Error("Error consultando '"+nombreTabla+"': HTTP "+resp.status+". "+texto);
    let pagina;try{pagina=JSON.parse(texto)}catch(_){throw new Error("Respuesta no válida de '"+nombreTabla+"'")}
    if(!Array.isArray(pagina))throw new Error("Respuesta de '"+nombreTabla+"' no es una lista");
    registros.push(...pagina);
    if(pagina.length<tam)break;
    inicio+=tam;
  }
  return registros;
}

function limpiarAnalisis(){
  grupoCercano.clearLayers();grupoLejano.clearLayers();grupoOrigen.clearLayers();
  limpiarGeoprocesoActivo("analisis");
  puntoSeleccionado=null;modoSeleccion=false;
  const b=document.getElementById("btnSeleccionarPunto");
  b.classList.remove("activo");b.textContent="Seleccionar punto en el mapa";
  document.getElementById("coordenadaSeleccionada").textContent="Ningún punto seleccionado";
  mapAnalisis.getContainer().style.cursor="";
  mensaje("");
}

function obtenerCapa(){
  const manual=document.getElementById("capaManual").value.trim();
  return manual||document.getElementById("capa").value;
}

function dibujarAnalisis(lat,lng,cercano,lejano){
  limpiarAnalisis();

  const origen=L.circleMarker([lat,lng],{radius:8,color:"#c1e116",weight:3,fillOpacity:1})
    .bindPopup("<strong>PUNTO DE ORIGEN</strong><br>Lat: "+lat.toFixed(6)+"<br>Lng: "+lng.toFixed(6))
    .addTo(grupoOrigen);

  L.geoJSON(cercano.feature,{style:{color:"#546c04",weight:4,fillOpacity:0.4},
    pointToLayer:(_,ll)=>L.circleMarker(ll,{radius:9,color:"#546c04",weight:4,fillOpacity:0.9}),
    onEachFeature:(_,l)=>l.bindPopup("<strong>MÁS CERCANO</strong><br>Distancia: "+cercano.distancia.toFixed(2)+" m<hr>"+atributosHTML(cercano.registro))
  }).addTo(grupoCercano);

  L.geoJSON(lejano.feature,{style:{color:"#a49c9b",weight:4,fillOpacity:0.4},
    pointToLayer:(_,ll)=>L.circleMarker(ll,{radius:9,color:"#a49c9b",weight:4,fillOpacity:0.9}),
    onEachFeature:(_,l)=>l.bindPopup("<strong>MÁS LEJANO</strong><br>Distancia: "+lejano.distancia.toFixed(2)+" m<hr>"+atributosHTML(lejano.registro))
  }).addTo(grupoLejano);

  const bounds=L.latLngBounds([origen.getLatLng()]);
  const g1=L.geoJSON(cercano.feature);if(g1.getBounds().isValid())bounds.extend(g1.getBounds());
  const g2=L.geoJSON(lejano.feature);if(g2.getBounds().isValid())bounds.extend(g2.getBounds());
  mapAnalisis.fitBounds(bounds,{padding:[30,30]});
}

async function calcular(){
  const capa=obtenerCapa();
  if(!puntoSeleccionado){mensaje("Primero seleccione un punto en el mapa.",true);return}
  if(!capa){mensaje("Seleccione o escriba una capa.",true);return}
  mensaje("Consultando '"+capa+"' y calculando distancias...");
  mostrarLoading("Calculando análisis de proximidad...");
  try{
    const registros=await consultarTablaCompleta(capa);
    if(registros.length===0)throw new Error("La tabla '"+capa+"' no devolvió registros.");
    const origen=turf.point([puntoSeleccionado.lng,puntoSeleccionado.lat]);
    let cercano=null,lejano=null,validos=0;
    for(const reg of registros){
      const geom=obtenerGeometria(reg);if(!geom)continue;
      const feature={type:"Feature",geometry:geom,properties:reg};
      const dist=calcularDistancia(origen,feature);
      if(!Number.isFinite(dist))continue;
      validos++;
      if(!cercano||dist<cercano.distancia)cercano={registro:reg,feature,distancia:dist};
      if(!lejano||dist>lejano.distancia)lejano={registro:reg,feature,distancia:dist};
    }
    if(!cercano||!lejano)throw new Error("No se encontraron geometrías válidas en '"+capa+"'");
    dibujarAnalisis(puntoSeleccionado.lat,puntoSeleccionado.lng,cercano,lejano);
    mensaje("Capa: "+capa+" | Evaluados: "+validos+" | Cercano: "+cercano.distancia.toFixed(2)+" m | Lejano: "+lejano.distancia.toFixed(2)+" m","exito");
  }catch(e){console.error(e);mensaje("Error: "+e.message,true)}
  finally{ocultarLoading()}
}

function activarSeleccionPunto(){
  modoSeleccion=!modoSeleccion;
  const b=document.getElementById("btnSeleccionarPunto");
  if(modoSeleccion){b.classList.add("activo");b.textContent="Haga clic en el mapa";mapAnalisis.getContainer().style.cursor="crosshair";modoPropuesta=false;
    document.getElementById("btnUbicarPropuesta").classList.remove("activo");document.getElementById("btnUbicarPropuesta").textContent="Ubicar punto en el mapa";
  }else{b.classList.remove("activo");b.textContent="Seleccionar punto en el mapa";mapAnalisis.getContainer().style.cursor=""}
}

function activarSeleccionPropuesta(){
  modoPropuesta=!modoPropuesta;
  const b=document.getElementById("btnUbicarPropuesta");
  if(modoPropuesta){b.classList.add("activo");b.textContent="Haga clic en el mapa";mapParticipacion.getContainer().style.cursor="crosshair";modoSeleccion=false;
    document.getElementById("btnSeleccionarPunto").classList.remove("activo");document.getElementById("btnSeleccionarPunto").textContent="Seleccionar punto en el mapa";
  }else{b.classList.remove("activo");b.textContent="Ubicar punto en el mapa";mapParticipacion.getContainer().style.cursor=""}
}

mapAnalisis.on("click",function(e){
  if(!modoSeleccion)return;
  puntoSeleccionado={lat:e.latlng.lat,lng:e.latlng.lng};
  modoSeleccion=false;
  const b=document.getElementById("btnSeleccionarPunto");
  b.classList.remove("activo");b.textContent="Cambiar punto seleccionado";
  mapAnalisis.getContainer().style.cursor="";
  grupoOrigen.clearLayers();
  L.circleMarker(e.latlng,{radius:8,color:"#c1e116",weight:3,fillOpacity:1})
    .bindPopup("<strong>ORIGEN SELECCIONADO</strong><br>Lat: "+puntoSeleccionado.lat.toFixed(6)+"<br>Lng: "+puntoSeleccionado.lng.toFixed(6))
    .addTo(grupoOrigen).openPopup();
  document.getElementById("coordenadaSeleccionada").textContent="Lat: "+puntoSeleccionado.lat.toFixed(6)+" | Lng: "+puntoSeleccionado.lng.toFixed(6);
  mensaje("Punto seleccionado. Elija capa y calcule.");
});

mapParticipacion.on("click",function(e){
  if(!modoPropuesta)return;
  puntoPropuesta={lat:e.latlng.lat,lng:e.latlng.lng};
  modoPropuesta=false;
  const b=document.getElementById("btnUbicarPropuesta");
  b.classList.remove("activo");b.textContent="Cambiar ubicación";
  mapParticipacion.getContainer().style.cursor="";
  document.getElementById("coordPropuesta").textContent="Lat: "+puntoPropuesta.lat.toFixed(6)+" | Lng: "+puntoPropuesta.lng.toFixed(6);
});

async function cargarPropuestas(){
  try{
    const resp=await fetch(REST+"/propuestas_ciudadanas?select=*&order=fecha.desc",{
      method:"GET",headers:{apikey:KEY,Authorization:"Bearer "+KEY,Accept:"application/json"}
    });
    if(!resp.ok)throw new Error("HTTP "+resp.status);
    const data=await resp.json();
    propuestas=data.map(p=>({
      id:p.id,lat:p.lat,lng:p.lng,categoria:p.categoria,titulo:p.titulo,
      descripcion:p.descripcion,prioridad:p.prioridad,autor:p.autor,
      fecha:p.fecha,votos:p.votos
    }));
  }catch(e){console.error("Error cargando propuestas:",e)}
}

async function guardarPropuesta(){
  if(!puntoPropuesta){alert("Primero ubique el punto en el mapa.");return}
  const titulo=document.getElementById("tituloPropuesta").value.trim();
  if(!titulo){alert("Escriba un título para la propuesta.");return}
  const prop={
    lat:puntoPropuesta.lat,
    lng:puntoPropuesta.lng,
    categoria:document.getElementById("catPropuesta").value,
    titulo:titulo,
    descripcion:document.getElementById("descPropuesta").value.trim(),
    prioridad:parseInt(document.getElementById("prioridadPropuesta").value),
    autor:document.getElementById("autorPropuesta").value.trim()||"Anónimo",
    votos:0
  };
  try{
    const resp=await fetch(REST+"/propuestas_ciudadanas",{
      method:"POST",
      headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json",Prefer:"return=representation"},
      body:JSON.stringify(prop)
    });
    if(!resp.ok)throw new Error("HTTP "+resp.status);
    const guardada=await resp.json();
    propuestas.unshift(guardada[0]);
    agregarPropuestaAlMapa(guardada[0]);
    document.getElementById("tituloPropuesta").value="";
    document.getElementById("descPropuesta").value="";
    document.getElementById("coordPropuesta").textContent="Sin ubicación";
    puntoPropuesta=null;
    document.getElementById("btnUbicarPropuesta").textContent="Ubicar punto en el mapa";
  }catch(e){alert("Error guardando: "+e.message)}
}

function agregarPropuestaAlMapa(prop){
  const color=CAT_COLORES[prop.categoria]||"#78909c";
  L.circleMarker([prop.lat,prop.lng],{radius:7,color:color,weight:2,fillOpacity:0.85})
    .bindPopup("<strong>MICROINTERVENCIÓN</strong><br><span style='color:"+color+";font-weight:700'>"+prop.titulo+"</span><br>"+prop.categoria+"<br>"+prop.descripcion+"<hr><em>Autor: "+prop.autor+"</em>")
    .addTo(grupoPropuestas);
}

function renderPropuestas(){
  const contenedor=document.getElementById("listaPropuestas");
  const filtroCont=document.getElementById("filtroCategorias");
  document.getElementById("countPropuestas").textContent=propuestas.length;

  const cats=["TODAS",...new Set(propuestas.map(p=>p.categoria))];
  filtroCont.innerHTML="";
  cats.forEach(c=>{
    const btn=document.createElement("button");
    btn.className="outline"+(filtroCatActiva===c?" active":"");
    btn.textContent=c==="TODAS"?"Todas":c;
    btn.onclick=()=>{filtroCatActiva=c;renderPropuestas()};
    filtroCont.appendChild(btn);
  });

  const filtradas=filtroCatActiva==="TODAS"?propuestas:propuestas.filter(p=>p.categoria===filtroCatActiva);
  contenedor.innerHTML="";
  if(filtradas.length===0){  contenedor.innerHTML='<p style="font-size:12px;color:#72716e">No hay propuestas registradas.</p>';return}

  filtradas.sort((a,b)=>b.prioridad-a.prioridad).forEach(p=>{
    const color=CAT_COLORES[p.categoria]||"#78909c";
    const div=document.createElement("div");
    div.className="propuesta";
    div.innerHTML='<span class="cat" style="background:'+color+'">'+p.categoria+'</span>'
      +'<div class="titulo">'+p.titulo+'</div>'
      +(p.descripcion?'<div class="desc">'+p.descripcion+'</div>':'')
      +'<div class="meta"><span>'+p.autor+'</span><span>'+new Date(p.fecha).toLocaleDateString()+'</span><span>Votos: '+p.votos+'</span></div>'
      +'<div class="prioridad-bar"><div class="fill" style="width:'+((p.prioridad/5)*100)+'%;background:'+color+'"></div></div>';
    div.onclick=()=>{mapParticipacion.setView([p.lat,p.lng],16);L.popup().setLatLng([p.lat,p.lng]).setContent("<strong>MICROINTERVENCIÓN</strong><br><span style='color:"+color+"'>"+p.titulo+"</span><br>"+p.categoria).openOn(mapParticipacion)};
    contenedor.appendChild(div);
  });

  grupoPropuestas.clearLayers();
  propuestas.forEach(p=>agregarPropuestaAlMapa(p));
  actualizarDashboard();
}

async function votarPropuesta(id,dir){
  const p=propuestas.find(x=>x.id===id);
  if(!p)return;
  const nuevoVotos=Math.max(0,p.votos+dir);
  try{
    const resp=await fetch(REST+"/propuestas_ciudadanas?id=eq."+id,{
      method:"PATCH",
      headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json",Prefer:"return=representation"},
      body:JSON.stringify({votos:nuevoVotos})
    });
    if(!resp.ok)throw new Error("HTTP "+resp.status);
    p.votos=nuevoVotos;
    renderPropuestas();
  }catch(e){console.error("Error votando:",e)}
}

async function ejecutarPriorizacion(){
  mostrarLoading("Paso 1/4: Cargando capas de Supabase...");
  const resGrilla=parseFloat(document.getElementById("resGrilla").value)||200;
  const bufSalud=parseFloat(document.getElementById("bufferSalud").value)||500;
  const bufEdu=parseFloat(document.getElementById("bufferEdu").value)||400;
  const bufVerdes=parseFloat(document.getElementById("bufferVerdes").value)||300;
  const contenedor=document.getElementById("resultadosPriorizacion");
  const MAX_PUNTOS=500;

  try{
    const [saludData,eduData,verdesData,viasData,limiteData]=await Promise.all([
      consultarTablaCompleta("equip_sa_ib"),
      consultarTablaCompleta("equip_ed_ib"),
      consultarTablaCompleta("areas_verdes_ibarra"),
      consultarTablaCompleta("vias_ibarra"),
      consultarTablaCompleta("limite_urbano_ibarra")
    ]);

    mostrarLoading("Paso 2/4: Convirtiendo geometrías...");
    const featuresSalud=saludData.map(r=>{const g=obtenerGeometria(r);return g?{type:"Feature",geometry:g,properties:r}:null}).filter(Boolean);
    const featuresEdu=eduData.map(r=>{const g=obtenerGeometria(r);return g?{type:"Feature",geometry:g,properties:r}:null}).filter(Boolean);
    const featuresVerdes=verdesData.map(r=>{const g=obtenerGeometria(r);return g?{type:"Feature",geometry:g,properties:r}:null}).filter(Boolean);
    const featuresVias=viasData.map(r=>{const g=obtenerGeometria(r);return g?{type:"Feature",geometry:g,properties:r}:null}).filter(Boolean);
    const featuresLimite=limiteData.map(r=>{const g=obtenerGeometria(r);return g?{type:"Feature",geometry:g,properties:r}:null}).filter(Boolean);

    const coordsSalud=featuresSalud.map(f=>f.geometry.coordinates);
    const coordsEdu=featuresEdu.map(f=>f.geometry.coordinates);

    mostrarLoading("Paso 3/4: Generando buffers y grilla...");
    grupoBufferSalud.clearLayers();grupoBufferEdu.clearLayers();grupoBufferVerdes.clearLayers();grupoGrilla.clearLayers();

    const bufS=featuresSalud.map(f=>{try{return turf.buffer(f,bufSalud/1000,{units:"kilometers"})}catch(_){return null}}).filter(Boolean);
    const bufE=featuresEdu.map(f=>{try{return turf.buffer(f,bufEdu/1000,{units:"kilometers"})}catch(_){return null}});
    const bufV=featuresVerdes.map(f=>{try{return turf.buffer(f,bufVerdes/1000,{units:"kilometers"})}catch(_){return null}});

    if(document.getElementById("showBufferSalud").checked){bufS.forEach(b=>{try{L.geoJSON(b,{style:{color:"#a49c9b",weight:1,fillColor:"#a49c9b",fillOpacity:0.1,dashArray:"4 4"}}).addTo(grupoBufferSalud)}catch(_){}})}
    if(document.getElementById("showBufferEdu").checked){bufE.forEach(b=>{try{L.geoJSON(b,{style:{color:"#c1e116",weight:1,fillColor:"#c1e116",fillOpacity:0.1,dashArray:"4 4"}}).addTo(grupoBufferEdu)}catch(_){}})}
    if(document.getElementById("showBufferVerdes").checked){bufV.forEach(b=>{try{L.geoJSON(b,{style:{color:"#546c04",weight:1,fillColor:"#546c04",fillOpacity:0.1,dashArray:"4 4"}}).addTo(grupoBufferVerdes)}catch(_){}})}

    const unionLimite=featuresLimite.length>0?unirFeatures(featuresLimite):null;
    let grillaPts=[];
    if(unionLimite){
      const bbox=turf.bbox(unionLimite);
      const pasoLng=resGrilla/111000/Math.cos(((bbox[1]+bbox[3])/2)*Math.PI/180);
      const pasoLat=resGrilla/111000;
      for(let lng=bbox[0];lng<=bbox[2];lng+=pasoLng){
        for(let lat=bbox[1];lat<=bbox[3];lat+=pasoLat){
          if(grillaPts.length>=MAX_PUNTOS)break;
          const pt=turf.point([lng,lat]);
          try{if(turf.booleanPointInPolygon(pt,unionLimite))grillaPts.push(pt)}catch(_){}
        }
        if(grillaPts.length>=MAX_PUNTOS)break;
      }
    }
    if(grillaPts.length===0){
      const center=[-78.1223,0.3517];
      const rango=0.015;
      const pasoLng=resGrilla/111000/Math.cos(center[1]*Math.PI/180);
      const pasoLat=resGrilla/111000;
      for(let lng=center[0]-rango;lng<=center[0]+rango;lng+=pasoLng){
        for(let lat=center[1]-rango;lat<=center[1]+rango;lat+=pasoLat){
          grillaPts.push(turf.point([lng,lat]));
          if(grillaPts.length>=MAX_PUNTOS)break;
        }
        if(grillaPts.length>=MAX_PUNTOS)break;
      }
    }

    if(document.getElementById("showGrilla").checked){
      grillaPts.forEach(p=>{L.circleMarker([p.geometry.coordinates[1],p.geometry.coordinates[0]],{radius:2,color:"#54545c",weight:0,fillOpacity:0.4}).addTo(grupoGrilla)});
    }

    mostrarLoading("Paso 4/4: Scoring multicriterio ("+grillaPts.length+" puntos)...");
    const candidatos=[];
    propuestas.forEach(p=>{candidatos.push({lat:p.lat,lng:p.lng,fuente:"ciudadana",titulo:p.titulo,categoria:p.categoria})});

    for(const f of grillaPts){
      const lng=f.geometry.coordinates[0];const lat=f.geometry.coordinates[1];
      let enCobertura=false;
      for(const b of bufS){try{if(turf.booleanPointInPolygon(f,b)){enCobertura=true;break}}catch(_){}}
      if(!enCobertura){for(const b of bufE){try{if(turf.booleanPointInPolygon(f,b)){enCobertura=true;break}}catch(_){}}}
      if(!enCobertura){candidatos.push({lat,lng,fuente:"computacional",titulo:"Zona sin cobertura"})}
    }

    const scored=candidatos.map(c=>{
      const pt=turf.point([c.lng,c.lat]);
      let dentroSalud=false;
      for(const b of bufS){try{if(turf.booleanPointInPolygon(pt,b)){dentroSalud=true;break}}catch(_){}}
      let dentroEdu=false;
      for(const b of bufE){try{if(turf.booleanPointInPolygon(pt,b)){dentroEdu=true;break}}catch(_){}}
      let dentroVerde=false;
      for(const b of bufV){try{if(turf.booleanPointInPolygon(pt,b)){dentroVerde=true;break}}catch(_){}}

      const distSalud=c.fuente==="ciudadana"?menorDistanciaPuntosRapido(pt,coordsSalud):Infinity;
      const distEdu=c.fuente==="ciudadana"?menorDistanciaPuntosRapido(pt,coordsEdu):Infinity;
      const distVerde=menorDistanciaFeaturesRapido(pt,featuresVerdes);
      const distVias=menorDistanciaFeaturesRapido(pt,featuresVias);

      const score=calcularScoreGeoproceso(
        dentroSalud?0:distSalud,dentroEdu?0:distEdu,dentroVerde?0:distVerde,distVias,
        dentroSalud,dentroEdu,dentroVerde,c.fuente==="ciudadana");
      return{...c,distSalud,distEdu,distVerde,distVias,dentroSalud,dentroEdu,dentroVerde,score};
    });

    scored.sort((a,b)=>b.score-a.score);
    const top=scored.filter(c=>c.score>0).slice(0,30);

    grupoPriorizacion.clearLayers();
    grupoBufferSalud.addTo(mapPriorizacion);grupoBufferEdu.addTo(mapPriorizacion);grupoBufferVerdes.addTo(mapPriorizacion);grupoGrilla.addTo(mapPriorizacion);
    if(!mapPriorizacion.hasLayer(grupoPriorizacion))grupoPriorizacion.addTo(mapPriorizacion);
    marcarGeoprocesoActivo("priorizacion");

    top.forEach((c,i)=>{
      const color=colorPrioridad(c.score);
      L.circleMarker([c.lat,c.lng],{radius:9,color:color,weight:2,fillOpacity:0.85})
        .bindPopup("<strong>ZONA PRIORIDAD #"+(i+1)+"</strong><br>Score: "+c.score.toFixed(1)+"<hr>"
          +"<strong>"+c.titulo+"</strong><br>Fuente: "+c.fuente+"<br><br>"
          +"Salud: "+(c.dentroSalud?"EN COBERTURA":"FUERA")+" ("+c.distSalud.toFixed(0)+"m)<br>"
          +"Educación: "+(c.dentroEdu?"EN COBERTURA":"FUERA")+" ("+c.distEdu.toFixed(0)+"m)<br>"
          +"Verde: "+(c.dentroVerde?"CERCANO":"LEJANO")+" ("+c.distVerde.toFixed(0)+"m)<br>"
          +"Vía: "+c.distVias.toFixed(0)+"m")
        .addTo(grupoPriorizacion);
    });

    contenedor.innerHTML="<strong style='color:#c1e116'>Geoproceso completado</strong>"
      +"<div style='font-size:11px;color:#969592;margin:4px 0'>"+featuresSalud.length+" salud | "+featuresEdu.length+" educación | "+featuresVerdes.length+" verdes | "+featuresVias.length+" vías</div>"
      +"<div style='font-size:11px;color:#969592;margin-bottom:8px'>Buffers: "+bufSalud+"m | "+bufEdu+"m | "+bufVerdes+"m | Grilla: "+resGrilla+"m ("+grillaPts.length+" pts)</div>"
      +"<strong style='color:#dce896'>Top 30 zonas prioritarias</strong><br><br>"
      +top.map((c,i)=>{
        const col=colorPrioridad(c.score);
        return'<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;padding:5px;border-radius:4px;background:'+(i<5?'#1a2a10':i<15?'#1a1a1c':'#0b0b09')+';border:1px solid '+(i<5?col:'#5c5b57')+'">'
          +'<span style="font-weight:700;width:24px;text-align:center;color:'+col+'">#'+(i+1)+'</span>'
          +'<span style="flex:1;color:#c0bebb;font-size:11px">'+c.titulo+'</span>'
          +'<span style="font-weight:700;color:'+col+';font-size:12px">'+c.score.toFixed(0)+'</span>'
          +'</div>';
      }).join("");

    if(top.length>0){mapPriorizacion.fitBounds(top.map(c=>[c.lat,c.lng]),{padding:[40,40]})}
  }catch(e){contenedor.innerHTML="<span style='color:#a49c9b'>Error: "+e.message+"</span>";console.error(e)}
  finally{ocultarLoading()}
}

function unirFeatures(features){
  if(features.length===0)return null;
  if(features.length===1)return features[0];
  try{const c={type:"FeatureCollection",features:features};return turf.union(c)}catch(_){return features[0]}
}

function menorDistanciaPuntosRapido(pt,coordsArray){
  let min=Infinity;const px=pt.geometry.coordinates[0];const py=pt.geometry.coordinates[1];
  for(const c of coordsArray){
    const dx=(px-c[0])*111000*Math.cos(py*Math.PI/180);const dy=(py-c[1])*111000;
    const d=dx*dx+dy*dy;if(d<min)min=d;
  }
  return Math.sqrt(min);
}

function menorDistanciaFeaturesRapido(pt,features){
  let min=Infinity;const px=pt.geometry.coordinates[0];const py=pt.geometry.coordinates[1];
  for(const f of features){
    const coords=f.geometry.coordinates;
    if(f.geometry.type==="Point"){const dx=(px-coords[0])*111000*Math.cos(py*Math.PI/180);const dy=(py-coords[1])*111000;const d=dx*dx+dy*dy;if(d<min)min=d}
    else if(f.geometry.type==="Polygon"){for(const anillo of coords){for(const c of anillo){const dx=(px-c[0])*111000*Math.cos(py*Math.PI/180);const dy=(py-c[1])*111000;const d=dx*dx+dy*dy;if(d<min)min=d}}}
    else if(f.geometry.type==="MultiPolygon"){for(const poly of coords){for(const anillo of poly){for(const c of anillo){const dx=(px-c[0])*111000*Math.cos(py*Math.PI/180);const dy=(py-c[1])*111000;const d=dx*dx+dy*dy;if(d<min)min=d}}}}
    else if(f.geometry.type==="LineString"){for(const c of coords){const dx=(px-c[0])*111000*Math.cos(py*Math.PI/180);const dy=(py-c[1])*111000;const d=dx*dx+dy*dy;if(d<min)min=d}}
    else if(f.geometry.type==="MultiLineString"){for(const line of coords){for(const c of line){const dx=(px-c[0])*111000*Math.cos(py*Math.PI/180);const dy=(py-c[1])*111000;const d=dx*dx+dy*dy;if(d<min)min=d}}}
  }
  return Math.sqrt(min);
}

function calcularScoreGeoproceso(distSalud,distEdu,distVerde,distVias,dentroSalud,dentroEdu,dentroVerde,esCiudadana){
  let score=0;let pesoTotal=0;
  const wSalud=parseInt(document.getElementById("pesoSalud").value);
  const wEdu=parseInt(document.getElementById("pesoEdu").value);
  const wVerde=parseInt(document.getElementById("pesoVerde").value);
  const wVia=parseInt(document.getElementById("pesoVia").value);
  const wDemanda=parseInt(document.getElementById("pesoDemanda").value);

  if(document.getElementById("cProxSalud").checked){score+=(dentroSalud?0:normalizar(distSalud,0,2000)*wSalud);pesoTotal+=wSalud}
  if(document.getElementById("cProxEdu").checked){score+=(dentroEdu?0:normalizar(distEdu,0,2000)*wEdu);pesoTotal+=wEdu}
  if(document.getElementById("cProxVerde").checked){score+=(dentroVerde?0:normalizar(distVerde,0,1500)*wVerde);pesoTotal+=wVerde}
  if(document.getElementById("cCobertura").checked){score+=normalizar(distVias,0,500)*wVia;pesoTotal+=wVia}
  if(document.getElementById("cDemanda").checked&&esCiudadana){score+=wDemanda;pesoTotal+=wDemanda}
  return pesoTotal>0?(score/pesoTotal)*100:0;
}

function colorPrioridad(score){
  if(score>=80)return"#c1e116";
  if(score>=60)return"#dce896";
  if(score>=40)return"#b9c671";
  if(score>=20)return"#8c9b38";
  return"#72716e";
}

function obtenerCentroide(geom){
  try{const f=turf.centroid({type:"Feature",geometry:geom});return f?f.geometry.coordinates:null}catch(_){return null}
}

function normalizar(valor,min,max){return Math.min(1,Math.max(0,(valor-min)/(max-min)))}

function limpiarPriorizacion(){
  grupoPriorizacion.clearLayers();
  grupoBufferSalud.clearLayers();try{mapPriorizacion.removeLayer(grupoBufferSalud)}catch(_){}
  grupoBufferEdu.clearLayers();try{mapPriorizacion.removeLayer(grupoBufferEdu)}catch(_){}
  grupoBufferVerdes.clearLayers();try{mapPriorizacion.removeLayer(grupoBufferVerdes)}catch(_){}
  grupoGrilla.clearLayers();try{mapPriorizacion.removeLayer(grupoGrilla)}catch(_){}
  limpiarGeoprocesoActivo("priorizacion");
  document.getElementById("resultadosPriorizacion").innerHTML="Ejecute el geoproceso para ver resultados.";
}

function actualizarDashboard(){
  const total=propuestas.length;
  const votos=propuestas.reduce((s,p)=>s+p.votos,0);
  const cats=new Set(propuestas.map(p=>p.categoria)).size;
  const alta=propuestas.filter(p=>p.prioridad>=4).size;
  const priProm=total>0?(propuestas.reduce((s,p)=>s+p.prioridad,0)/total).toFixed(1):"—";

  document.getElementById("metricasGenerales").innerHTML=[
    {v:total,e:"Propuestas",c:"#c1e116"},
    {v:votos,e:"Votos totales",c:"#dce896"},
    {v:cats,e:"Categorías",c:"#b9c671"},
    {v:alta,e:"Alta prioridad",c:"#a49c9b"},
    {v:priProm,e:"Prioridad prom.",c:"#8c9b38"}
  ].map(m=>'<div class="metrica"><div class="valor" style="color:'+m.c+'">'+m.v+'</div><div class="etiqueta">'+m.e+'</div></div>').join("");

  const porCat={};propuestas.forEach(p=>{porCat[p.categoria]=(porCat[p.categoria]||0)+1});
  const maxCat=Math.max(1,...Object.values(porCat));
  const sortedCats=Object.entries(porCat).sort((a,b)=>b[1]-a[1]);
  document.getElementById("graficoCategoriasH").innerHTML=sortedCats.length>0?sortedCats.map(([cat,cant])=>{
    const pct=total>0?Math.round(cant/total*100):0;
    const col=CAT_COLORES[cat]||"#72716e";
    return'<div class="cat-hbar">'
      +'<span class="cat-label" title="'+cat+'">'+cat.replace(/_/g," ")+'</span>'
      +'<div class="cat-track"><div class="cat-fill" style="width:'+((cant/maxCat)*100)+'%;background:'+col+'"><span>'+cant+'</span></div></div>'
      +'<span class="cat-pct">'+pct+'%</span></div>';
  }).join(""):'<p style="font-size:12px;color:#72716e">Sin datos de propuestas</p>';

  const porPri={1:0,2:0,3:0,4:0,5:0};
  propuestas.forEach(p=>{porPri[p.prioridad]=(porPri[p.prioridad]||0)+1});
  const maxPri=Math.max(1,...Object.values(porPri));
  const priLabels=["","Baja","Med-Baja","Media","Med-Alta","Alta"];
  const priColors=["","#546c04","#8c9b38","#b9c671","#dce896","#c1e116"];
  document.getElementById("graficoPrioridad").innerHTML=[1,2,3,4,5].map(n=>
    '<div class="barra"><div class="barra-valor">'+porPri[n]+'</div><div class="barra-fill" style="height:'+((porPri[n]/maxPri)*100)+'%;background:'+priColors[n]+'"></div><div class="barra-label">'+priLabels[n]+'</div></div>'
  ).join("");

  dibujarHeatmap();

  calcularCoberturaDashboard();

  document.getElementById("infoCapas").innerHTML=CAPAS_ESQUEMA.map(c=>
    '<div style="display:flex;align-items:center;gap:8px;font-size:12px;margin-bottom:4px;color:#c0bebb"><div class="legend-color" style="background:'+c.color+'"></div><span>'+c.capa+'</span><span style="color:#72716e">('+c.tipo+')</span></div>'
  ).join("");
}

function dibujarHeatmap(){
  const canvas=document.getElementById("heatmapCanvas");
  if(!canvas)return;
  const ctx=canvas.getContext("2d");
  const W=canvas.width,H=canvas.height;
  ctx.clearRect(0,0,W,H);

  if(propuestas.length===0){
    ctx.fillStyle="#54545c";ctx.font="12px Consolas,monospace";ctx.textAlign="center";
    ctx.fillText("Sin propuestas para visualizar",W/2,H/2);return;
  }

  const lats=propuestas.map(p=>p.lat),lngs=propuestas.map(p=>p.lng);
  const minLat=Math.min(...lats),maxLat=Math.max(...lats);
  const minLng=Math.min(...lngs),maxLng=Math.max(...lngs);
  const padLat=(maxLat-minLat)*0.12||0.005;
  const padLng=(maxLng-minLng)*0.12||0.005;
  const bMinLat=minLat-padLat,bMaxLat=maxLat+padLat;
  const bMinLng=minLng-padLng,bMaxLng=maxLng+padLng;

  ctx.fillStyle="#1a1a1c";ctx.fillRect(0,0,W,H);

  const densidad={};
  propuestas.forEach(p=>{
    const gx=Math.floor((p.lng-bMinLng)/(bMaxLng-bMinLng)*19);
    const gy=Math.floor((p.lat-bMinLat)/(bMaxLat-bMinLat)*13);
    const key=gx+","+gy;
    densidad[key]=(densidad[key]||0)+1;
  });
  const maxDens=Math.max(1,...Object.values(densidad));

  Object.entries(densidad).forEach(([key,cant])=>{
    const[gx,gy]=key.split(",").map(Number);
    const x=(gx+0.5)/20*W;
    const y=(1-(gy+0.5)/14)*H;
    const ratio=cant/maxDens;
    const r=8+ratio*30;
    const grad=ctx.createRadialGradient(x,y,0,x,y,r);
    const alpha=0.15+ratio*0.5;
    if(ratio>0.6){grad.addColorStop(0,"rgba(193,225,22,"+alpha+")");grad.addColorStop(1,"rgba(193,225,22,0)")}
    else if(ratio>0.3){grad.addColorStop(0,"rgba(185,198,113,"+alpha+")");grad.addColorStop(1,"rgba(185,198,113,0)")}
    else{grad.addColorStop(0,"rgba(84,108,4,"+alpha+")");grad.addColorStop(1,"rgba(84,108,4,0)")}
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  });

  propuestas.forEach(p=>{
    const x=(p.lng-bMinLng)/(bMaxLng-bMinLng)*W;
    const y=(1-(p.lat-bMinLat)/(bMaxLat-bMinLat))*H;
    const col=CAT_COLORES[p.categoria]||"#72716e";
    ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
    ctx.strokeStyle="#0b0b09";ctx.lineWidth=1;ctx.stroke();
  });

  ctx.fillStyle="#54545c";ctx.font="9px Consolas,monospace";ctx.textAlign="left";
  ctx.fillText(bMinLat.toFixed(4)+"°S",4,H-4);ctx.textAlign="right";ctx.fillText(bMaxLat.toFixed(4)+"°S",4,12);
  ctx.textAlign="left";ctx.fillText(bMinLng.toFixed(4)+"°O",4,H-14);

  document.getElementById("heatmapLeyenda").innerHTML=
    '<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#546c04;vertical-align:middle"></span> Baja densidad</span>'
    +'<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#b9c671;vertical-align:middle"></span> Media</span>'
    +'<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#c1e116;vertical-align:middle"></span> Alta densidad</span>'
    +'<span>'+propuestas.length+' propuestas en total</span>';
}

async function calcularCoberturaDashboard(){
  const cont=document.getElementById("indicadoresCobertura");
  if(!cont)return;
  if(propuestas.length===0){cont.innerHTML='<p style="font-size:12px;color:#72716e">Sin propuestas para evaluar cobertura</p>';return}

  cont.innerHTML='<div style="font-size:11px;color:#969592">Calculando cobertura...</div>';

  try{
    const [saludData,eduData,verdesData]=await Promise.all([
      consultarTablaCompleta("equip_sa_ib"),
      consultarTablaCompleta("equip_ed_ib"),
      consultarTablaCompleta("areas_verdes_ibarra")
    ]);

    const fSalud=saludData.map(r=>{const g=obtenerGeometria(r);return g?{type:"Feature",geometry:g}:null}).filter(Boolean);
    const fEdu=eduData.map(r=>{const g=obtenerGeometria(r);return g?{type:"Feature",geometry:g}:null}).filter(Boolean);
    const fVerdes=verdesData.map(r=>{const g=obtenerGeometria(r);return g?{type:"Feature",geometry:g}:null}).filter(Boolean);

    const bufSalud=500,bufEdu=400,bufVerdes=300;

    const bufS=fSalud.map(f=>{try{return turf.buffer(f,bufSalud/1000,{units:"kilometers"})}catch(_){return null}}).filter(Boolean);
    const bufE=fEdu.map(f=>{try{return turf.buffer(f,bufEdu/1000,{units:"kilometers"})}catch(_){return null}}).filter(Boolean);
    const bufV=fVerdes.map(f=>{try{return turf.buffer(f,bufVerdes/1000,{units:"kilometers"})}catch(_){return null}}).filter(Boolean);

    let nSalud=0,nEdu=0,nVerdes=0;
    propuestas.forEach(p=>{
      const pt=turf.point([p.lng,p.lat]);
      if(bufS.some(b=>{try{return turf.booleanPointInPolygon(pt,b)}catch(_){return false}}))nSalud++;
      if(bufE.some(b=>{try{return turf.booleanPointInPolygon(pt,b)}catch(_){return false}}))nEdu++;
      if(bufV.some(b=>{try{return turf.booleanPointInPolygon(pt,b)}catch(_){return false}}))nVerdes++;
    });

    const pSalud=Math.round(nSalud/propuestas.length*100);
    const pEdu=Math.round(nEdu/propuestas.length*100);
    const pVerdes=Math.round(nVerdes/propuestas.length*100);

    cont.innerHTML=[
      {label:"Salud ("+bufSalud+"m)",pct:pSalud,color:"#a49c9b",icon:fSalud.length+" equip.",det:nSalud+"/"+propuestas.length+" propuestas"},
      {label:"Educación ("+bufEdu+"m)",pct:pEdu,color:"#c1e116",icon:fEdu.length+" equip.",det:nEdu+"/"+propuestas.length+" propuestas"},
      {label:"Áreas verdes ("+bufVerdes+"m)",pct:pVerdes,color:"#546c04",icon:fVerdes.length+" zonas",det:nVerdes+"/"+propuestas.length+" propuestas"}
    ].map(c=>{
      const col=c.pct>=70?"#546c04":c.pct>=40?"#b9c671":"#a49c9b";
      return'<div>'
        +'<div class="cobertura-bar">'
        +'<span class="cob-label">'+c.label+'</span>'
        +'<div class="cob-track"><div class="cob-fill" style="width:'+c.pct+'%;background:'+c.color+'"><span>'+c.pct+'%</span></div></div>'
        +'<span class="cob-pct" style="color:'+col+'">'+c.pct+'%</span>'
        +'</div>'
        +'<div style="font-size:10px;color:#72716e;margin-left:98px;margin-top:2px">'+c.icon+' | '+c.det+'</div>'
        +'</div>';
    }).join("");
  }catch(e){
    cont.innerHTML='<p style="font-size:11px;color:#a49c9b">Error calculando cobertura: '+e.message+'</p>';
  }
}

function renderCapasDisponibles(){
  const cont=document.getElementById("listaCapasSidebar");
  if(!cont)return;
  cont.innerHTML="";
  CAPAS_ESQUEMA.forEach(info=>{
    const row=document.createElement("div");
    row.style.cssText="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid #f0f0f0";
    const dot=document.createElement("span");
    dot.style.cssText="width:10px;height:10px;border-radius:50%;background:"+info.color+";flex-shrink:0";
    const chk=document.createElement("input");
    chk.type="checkbox";chk.id="lyr_"+info.capa;
    chk.style.cssText="width:auto;margin:0";
    const lbl=document.createElement("label");
    lbl.htmlFor="lyr_"+info.capa;
    lbl.style.cssText="flex:1;cursor:pointer;font-size:12px;margin:0";
    lbl.textContent=info.capa.replace(/_/g," ");
    const status=document.createElement("span");
    status.id="status_"+info.capa;
    status.style.cssText="font-size:10px;color:#72716e";
    status.textContent="";
    row.appendChild(dot);row.appendChild(chk);row.appendChild(lbl);row.appendChild(status);
    cont.appendChild(row);

    chk.addEventListener("change",async function(){
      if(this.checked){
        if(capasIndependientes[info.capa]){
           capasIndependientes[info.capa].capa.addTo(mapCapas);
           capasIndependientes[info.capa].visible=true;
         }else{
           status.textContent="cargando...";status.style.color="#c1e116";
           try{
             const registros=await consultarTablaCompleta(info.capa);
             const features=[];
             for(const reg of registros){const geom=obtenerGeometria(reg);if(!geom)continue;features.push({type:"Feature",geometry:geom,properties:reg})}
             if(features.length===0){status.textContent="sin datos";status.style.color="#72716e";this.checked=false;return}
             const capa=L.geoJSON({type:"FeatureCollection",features},{
               style:{color:info.color,weight:1.5,fillOpacity:0.18},
               pointToLayer:(_,ll)=>L.circleMarker(ll,{radius:5,color:info.color,weight:2,fillOpacity:0.75}),
               onEachFeature:(f,l)=>l.bindPopup("<strong>"+info.capa.replace(/_/g," ").toUpperCase()+"</strong><hr>"+atributosHTML(f.properties))
             }).addTo(mapCapas);
             capasIndependientes[info.capa]={capa,info,features,visible:true};
             status.textContent=features.length+" features";status.style.color="#546c04";
           }catch(e){status.textContent="error";status.style.color="#a49c9b";this.checked=false;console.error(e)}
         }
       }else{
         if(capasIndependientes[info.capa]){
           mapCapas.removeLayer(capasIndependientes[info.capa].capa);
           capasIndependientes[info.capa].visible=false;
         }
       }
    });
  });
}

async function encenderTodasCapas(){
  const checks=document.querySelectorAll("#listaCapasSidebar input[type=checkbox]");
  for(const chk of checks){if(!chk.checked){chk.checked=true;chk.dispatchEvent(new Event("change"))}}
}

function apagarTodasCapas(){
  const checks=document.querySelectorAll("#listaCapasSidebar input[type=checkbox]");
  for(const chk of checks){if(chk.checked){chk.checked=false;chk.dispatchEvent(new Event("change"))}}
}

function toblerSpeed(slopePercent){
  const m=slopePercent/100;
  return 6*Math.exp(-3.5*Math.abs(m+0.05));
}

function semillaDeterminista(i){
  let x=Math.sin(i*127.1+311.7)*43758.5453;
  return x-Math.floor(x);
}

function ejecutarPendiente(){
  if(!puntoPendiente){alert("Primero seleccione un punto de partida.");return}
  initPendienteMaps();
  const lat=puntoPendiente.lat,lng=puntoPendiente.lng;
  const tiempoMin=parseFloat(document.getElementById("pendTiempo").value)||15;
  const velPlana=parseFloat(document.getElementById("pendVelPlana").value)||4.5;
  const pendienteBase=parseFloat(document.getElementById("pendPendiente").value)||15;
  const nRayos=parseInt(document.getElementById("pendRayos").value)||36;
  const distPlana=velPlana*(tiempoMin/60)*1000;

  grupoIso.clearLayers();grupoQuince.clearLayers();

  const puntosIso=[];
  const rayosData=[];
  for(let i=0;i<nRayos;i++){
    const angulo=(i/nRayos)*2*Math.PI;
    const variacion=semillaDeterminista(i)*0.6-0.3;
    const pendRayo=pendienteBase*(1+variacion);
    const velRayo=toblerSpeed(pendRayo);
    const distRayo=velRayo*(tiempoMin/60)*1000;
    const latR=lat+(distRayo/111000)*Math.cos(angulo);
    const lngR=lng+(distRayo/(111000*Math.cos(lat*Math.PI/180)))*Math.sin(angulo);
    puntosIso.push([lngR,latR]);
    rayosData.push({angulo,pendiente:pendRayo,velocidad:velRayo,distancia:distRayo});
  }
  puntosIso.push(puntosIso[0]);

  const isoPolygon=turf.polygon([puntosIso]);
  L.geoJSON(isoPolygon,{style:{color:"#a49c9b",weight:2,fillColor:"#a49c9b",fillOpacity:0.15,dashArray:"6 4"}}).addTo(grupoIso);

  const centroIso=turf.centroid(isoPolygon);
  L.circleMarker([centroIso.geometry.coordinates[1],centroIso.geometry.coordinates[0]],{radius:6,color:"#a49c9b",weight:2,fillOpacity:0.9}).addTo(grupoIso);

  rayosData.forEach(r=>{
    const finLat=lat+(r.distancia/111000)*Math.cos(r.angulo);
    const finLng=lng+(r.distancia/(111000*Math.cos(lat*Math.PI/180)))*Math.sin(r.angulo);
    L.polyline([[lat,lng],[finLat,finLng]],{color:"#5c5b57",weight:0.8,opacity:0.5}).addTo(grupoIso);
  });

  const circulo15=turf.circle([lng,lat],distPlana/1000,{units:"kilometers",steps:64});
  L.geoJSON(circulo15,{style:{color:"#c1e116",weight:2,fillColor:"#c1e116",fillOpacity:0.12,dashArray:"6 4"}}).addTo(grupoQuince);
  L.circleMarker([lat,lng],{radius:6,color:"#c1e116",weight:2,fillOpacity:0.9}).addTo(grupoQuince);

  const distMediaIso=rayosData.reduce((s,r)=>s+r.distancia,0)/rayosData.length;
  const velMediaIso=rayosData.reduce((s,r)=>s+r.velocidad,0)/rayosData.length;
  const reduccion=((1-distMediaIso/distPlana)*100).toFixed(1);

  document.getElementById("statDistIso").textContent=Math.round(distMediaIso)+"m";
  document.getElementById("statDist15").textContent=Math.round(distPlana)+"m";
  document.getElementById("statDiff").textContent="-"+reduccion+"%";

  document.getElementById("detallesPendiente").innerHTML=
    "<div style='margin-bottom:4px'><strong style='color:#a49c9b'>Isócrona (con pendiente):</strong></div>"
    +"<div>Radio promedio: <strong>"+Math.round(distMediaIso)+" m</strong></div>"
    +"<div>Velocidad promedio: <strong>"+velMediaIso.toFixed(1)+" km/h</strong></div>"
    +"<div>Pendiente base: <strong>"+pendienteBase+"%</strong></div>"
    +"<div style='margin-top:6px'><strong style='color:#c1e116'>Ciudad 15 min (sin pendiente):</strong></div>"
    +"<div>Radio: <strong>"+Math.round(distPlana)+" m</strong></div>"
    +"<div>Velocidad: <strong>"+velPlana+" km/h</strong></div>"
    +"<div style='margin-top:6px;border-top:1px solid #5c5b57;padding-top:6px'><strong style='color:#dce896'>Pérdida por pendiente: -"+reduccion+"%</strong></div>"
    +"<div style='font-size:10px;color:#72716e;margin-top:2px'>El peatón cubre "+Math.round(distPlana-distMediaIso)+"m menos debido a la pendiente</div>";

  const bounds=turf.bbox(turf.featureCollection([isoPolygon,circulo15]));
  mapIso.fitBounds([[bounds[1],bounds[0]],[bounds[3],bounds[2]]],{padding:[30,30]});
  mapQuince.fitBounds([[bounds[1],bounds[0]],[bounds[3],bounds[2]]],{padding:[30,30]});
}

function limpiarPendiente(){
  grupoIso.clearLayers();grupoQuince.clearLayers();puntoIso.clearLayers();puntoQuince.clearLayers();
  puntoPendiente=null;
  document.getElementById("coordPendiente").textContent="Ningún punto seleccionado";
  document.getElementById("statDistIso").textContent="—";
  document.getElementById("statDist15").textContent="—";
  document.getElementById("statDiff").textContent="—";
  document.getElementById("detallesPendiente").innerHTML="";
}

const mapaDeTab={analisis:mapAnalisis,participacion:mapParticipacion,priorizacion:mapPriorizacion,capas:mapCapas};

document.querySelectorAll("nav button").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll("nav button").forEach(b=>b.classList.remove("activo"));
    btn.classList.add("activo");
    document.querySelectorAll(".tab-panel").forEach(p=>{p.classList.remove("visible");p.classList.remove("dashboard-grid")});
    const panel=document.getElementById("panel-"+btn.dataset.tab);
    panel.classList.add("visible");
    const tabActual=btn.dataset.tab;

    const sidebar=document.getElementById("sidebar");
    if(tabActual==="dashboard"){
      sidebar.classList.add("dashboard-full");
      panel.classList.add("dashboard-grid");
    }else{
      sidebar.classList.remove("dashboard-full");
    }

    document.querySelectorAll(".geo-map").forEach(m=>m.classList.remove("visible"));
    document.getElementById("pendiente-container").classList.remove("visible");

    if(tabActual==="pendiente"){
      document.getElementById("pendiente-container").classList.add("visible");
      initPendienteMaps();
    }else if(mapaDeTab[tabActual]){
      document.getElementById("map-"+tabActual).classList.add("visible");
    }

    if(tabActual==="participacion"){mostrarPropuestasEnMapa()}
    else{ocultarPropuestasDelMapa()}
    if(tabActual==="dashboard")actualizarDashboard();

    setTimeout(()=>{
      const m=mapaDeTab[tabActual];
      if(m)m.invalidateSize();
      if(mapIso)mapIso.invalidateSize();
      if(mapQuince)mapQuince.invalidateSize();
    },300);
  });
});

let propuestasVisibles=false;

function togglePropuestasEnMapa(){
  propuestasVisibles=!propuestasVisibles;
  const btn=document.getElementById("btnTogglePropuestas");
  if(propuestasVisibles){
    grupoPropuestas.addTo(mapParticipacion);
    btn.textContent="Ocultar propuestas del mapa";
    btn.classList.add("activo");
  }else{
    mapParticipacion.removeLayer(grupoPropuestas);
    btn.textContent="Mostrar propuestas en mapa";
    btn.classList.remove("activo");
  }
}

function ocultarPropuestasDelMapa(){
  try{mapParticipacion.removeLayer(grupoPropuestas)}catch(_){}
  propuestasVisibles=false;
  const btn=document.getElementById("btnTogglePropuestas");
  if(btn){btn.textContent="Mostrar propuestas en mapa";btn.classList.remove("activo")}
}

function mostrarPropuestasEnMapa(){
  if(!propuestasVisibles){
    grupoPropuestas.addTo(mapParticipacion);
    propuestasVisibles=true;
    const btn=document.getElementById("btnTogglePropuestas");
    if(btn){btn.textContent="Ocultar propuestas del mapa";btn.classList.add("activo")}
  }
}

document.getElementById("btnTogglePropuestas").addEventListener("click",togglePropuestasEnMapa);
document.getElementById("btnSeleccionarPunto").addEventListener("click",activarSeleccionPunto);
document.getElementById("btnUbicarPropuesta").addEventListener("click",activarSeleccionPropuesta);
document.getElementById("btnCalcular").addEventListener("click",calcular);
document.getElementById("btnLimpiar").addEventListener("click",limpiarAnalisis);
document.getElementById("btnGuardarPropuesta").addEventListener("click",guardarPropuesta);
document.getElementById("btnEncenderTodas").addEventListener("click",encenderTodasCapas);
document.getElementById("btnApagarTodas").addEventListener("click",apagarTodasCapas);
document.getElementById("btnPriorizar").addEventListener("click",ejecutarPriorizacion);
document.getElementById("btnLimpiarPriorizacion").addEventListener("click",limpiarPriorizacion);

document.getElementById("btnPendientePunto").addEventListener("click",function(){
  pendienteModoSeleccion=!pendienteModoSeleccion;
  this.classList.toggle("activo",pendienteModoSeleccion);
  this.textContent=pendienteModoSeleccion?"Haga clic en cualquier mapa...":"Seleccionar punto en el mapa";
  if(mapIso){mapIso.getContainer().style.cursor=pendienteModoSeleccion?"crosshair":"";mapQuince.getContainer().style.cursor=pendienteModoSeleccion?"crosshair":""}
});
document.getElementById("btnPendienteEjecutar").addEventListener("click",ejecutarPendiente);
document.getElementById("btnPendienteLimpiar").addEventListener("click",limpiarPendiente);

function actualizarPesoTotal(){
  let total=0;
  if(document.getElementById("cProxSalud").checked)total+=parseInt(document.getElementById("pesoSalud").value);
  if(document.getElementById("cProxEdu").checked)total+=parseInt(document.getElementById("pesoEdu").value);
  if(document.getElementById("cProxVerde").checked)total+=parseInt(document.getElementById("pesoVerde").value);
  if(document.getElementById("cCobertura").checked)total+=parseInt(document.getElementById("pesoVia").value);
  if(document.getElementById("cDemanda").checked)total+=parseInt(document.getElementById("pesoDemanda").value);
  document.getElementById("pesoTotalDisplay").textContent=total;
}

["pesoSalud","pesoEdu","pesoVerde","pesoVia","pesoDemanda"].forEach(id=>{
  document.getElementById(id).addEventListener("input",function(){
    document.getElementById(id+"Val").textContent=this.value;
    actualizarPesoTotal();
  });
});
["cProxSalud","cProxEdu","cProxVerde","cCobertura","cDemanda"].forEach(id=>{
  document.getElementById(id).addEventListener("change",actualizarPesoTotal);
});
actualizarPesoTotal();

cargarPropuestas().then(()=>{
  renderPropuestas();
  actualizarDashboard();
  renderCapasDisponibles();
});

const sidebarEl=document.getElementById("sidebar");
const toggleBtn=document.getElementById("sidebar-toggle");
if(toggleBtn){
  function isMobile(){return window.innerWidth<=768}
  function invalidateAllMaps(){
    setTimeout(()=>{
      [mapAnalisis,mapParticipacion,mapPriorizacion,mapCapas].forEach(m=>m.invalidateSize());
      if(mapIso)mapIso.invalidateSize();
      if(mapQuince)mapQuince.invalidateSize();
    },350);
  }
  if(isMobile()){
    toggleBtn.classList.add("btn-left");
  }
  toggleBtn.addEventListener("click",function(){
    if(isMobile()){
      sidebarEl.classList.toggle("sidebar-open");
      this.innerHTML=sidebarEl.classList.contains("sidebar-open")?"&#10005;":"&#9776;";
    }else{
      sidebarEl.classList.toggle("sidebar-hidden");
      const hidden=sidebarEl.classList.contains("sidebar-hidden");
      this.innerHTML=hidden?"&#9654;":"&#9664;";
      if(hidden){
        this.classList.add("sidebar-hidden");
      }else{
        this.classList.remove("sidebar-hidden");
      }
    }
    invalidateAllMaps();
  });
  document.querySelectorAll("nav button").forEach(btn=>{
    btn.addEventListener("click",function(){
      if(isMobile()){
        sidebarEl.classList.remove("sidebar-open");
        toggleBtn.innerHTML="&#9776;";
      }
    });
  });
  window.addEventListener("resize",function(){
    if(isMobile()){
      sidebarEl.classList.remove("sidebar-hidden");
      toggleBtn.classList.remove("sidebar-hidden");
      toggleBtn.classList.add("btn-left");
      toggleBtn.innerHTML=sidebarEl.classList.contains("sidebar-open")?"&#10005;":"&#9776;";
    }else{
      sidebarEl.classList.remove("sidebar-open");
      if(!sidebarEl.classList.contains("sidebar-hidden")){
        toggleBtn.innerHTML="&#9664;";
        toggleBtn.classList.remove("sidebar-hidden");
      }
    }
    invalidateAllMaps();
  });
}
