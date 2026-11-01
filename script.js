/* Cultura Brasileira · interações
   Cada página tem <body data-page="...">. A moldura (topo, rodapé, busca, navegação entre
   paradas) é montada aqui a partir da lista CH; o resto só roda se o elemento existir. */
(function(){
'use strict';
const A = window.BC, MAP = window.BC_MAP;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
/* Idioma: o mesmo script serve as páginas em inglês (raiz) e em português (/pt/) */
const EN = document.documentElement.lang.startsWith('en');
const t = (pt, en) => EN ? en : pt;
const LOC = t('pt-BR', 'en');
const fmt = n => n.toLocaleString(LOC);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/* artigo exato (wk, resolvido na Wikipedia de cada idioma; wk vazio = sem artigo, sem link); a busca fica só de reserva */
const wiki = it => it.wk ? 'https://' + it.wk : `https://${t('pt', 'en')}.wikipedia.org/w/index.php?search=` + encodeURIComponent(it.w || it.n);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PAGE = document.body.dataset.page;
let rio; // observer de revelação ao rolar, criado no primeiro uso

/* Paradas: id, arquivo, nome, descrição, cor, cor do texto · arquivo, nome e descrição em inglês */
const CH_ALL = [ [ "famosos", "famosos.html", "Famosos", "Atletas, atores, escritores e criadores", "#7b2fbe", "#fff8ea", "famous-brazilians.html", "Famous Brazilians", "Athletes, actors, writers and creators" ],
  [ "musica", "musica.html", "Música", "Do samba à Anitta, com bossa e tudo", "#ffc72c", "#0c2016", "music.html", "Music", "From samba to Anitta" ],
  [ "telas", "filmes-e-series.html", "Filmes e séries", "De Cidade de Deus às novelas", "#0b3d91", "#fff8ea", "film-and-tv.html", "Film and TV", "From City of God to telenovelas" ],
  [ "marcas", "marcas.html", "Marcas", "Da Havaianas ao Nubank", "#ff6b4a", "#0c2016", "brands.html", "Brands", "From Havaianas to Nubank" ],
  [ "comida", "comida.html", "Comida", "Feijoada, brigadeiro, caipirinha", "#00843d", "#fff8ea", "food.html", "Food", "Feijoada, brigadeiro, caipirinha" ],
  [ "invencoes", "invencoes.html", "Invenções e ciência", "Avião, Pix, urna eletrônica", "#8fd3f4", "#0c2016", "inventions.html", "Inventions and science", "Planes, Pix, electronic ballots" ],
  [ "virais", "virais-e-memes.html", "Virais e memes", "Memes, lendas e comediantes", "#ff8fb1", "#0c2016", "virals-and-memes.html", "Virals and memes", "Memes, legends and comedians" ],
  [ "paixoes", "paixoes-nacionais.html", "Paixões nacionais", "Barzinho, novela, carros e o caramelo", "#d08a3a", "#0c2016", "national-passions.html", "National passions", "Bars, telenovelas, cars and the caramelo" ],
  [ "dicionario", "dicionario.html", "Dicionário Brasileiro", "Saudade, gambiarra, cafuné e mais", "#2e6bff", "#fff8ea", "brazilian-dictionary.html", "Brazilian Dictionary", "Saudade, gambiarra, cafuné and more" ],
  [ "recordes", "recordes.html", "Recordes", "A maior floresta do mundo e mais", "#0a7d4f", "#fff8ea", "records.html", "Records", "The world’s largest rainforest and more" ],
  [ "curiosidades", "curiosidades.html", "Curiosidades", "O nome vem de uma árvore", "#ff9f1c", "#0c2016", "fun-facts.html", "Fun facts", "Named after a tree" ],
  [ "natureza", "natureza.html", "Fauna e flora", "Onças, araras, ipês e capivaras", "#7fc24a", "#0c2016", "wildlife-and-plants.html", "Wildlife and plants", "Jaguars, macaws and capybaras" ],
  [ "cidades", "cidades.html", "Cidades", "As 25 maiores, no mapa", "#102a54", "#fff8ea", "cities.html", "Cities", "The biggest 25, on the map" ],
  [ "lugares", "lugares.html", "Lugares", "Praias, parques, pontes e monumentos", "#f2c14e", "#0c2016", "places.html", "Places", "Beaches, parks, bridges and landmarks" ],
  [ "historia", "historia.html", "História", "13 mil anos em 31 momentos", "#7a3b12", "#fff8ea", "history.html", "History", "13,000 years in 31 moments" ],
  [ "datas", "datas.html", "Datas importantes", "Do Carnaval à Consciência Negra", "#d6176b", "#fff8ea", "key-dates.html", "Key dates", "From Carnival to Black Awareness Day" ],
  [ "politica", "politica-e-economia.html", "Política e economia", "Sistema, partidos, dinheiro e ativistas", "#b3202f", "#fff8ea", "politics-and-economy.html", "Politics and economy", "The system, parties, money and activists" ],
  [ "sites", "sites.html", "Para conhecer mais", "Os sites que explicam o país", "#00727a", "#fff8ea", "websites.html", "Find out more", "The websites that explain the country" ],
  [ "quiz", "quiz.html", "Quiz", "Você tem ginga?", "#c8e04a", "#0c2016", "quiz.html", "Quiz", "Got ginga?" ] ];
const CH = CH_ALL.map(c => EN ? [c[0], c[6], c[7], c[8], c[4], c[5]] : c.slice(0, 6));
const ABOUT = t('sobre.html', 'about.html');
/* a mesma página no outro idioma (o português fica em /pt/) */
const otherLang = id => {
  if (id === 'inicio') return EN ? 'pt/' : '../';
  if (id === 'sobre') return EN ? 'pt/sobre.html' : '../about.html';
  const c = CH_ALL.find(x => x[0] === id);
  return c ? (EN ? 'pt/' + c[1] : '../' + c[6]) : (EN ? 'pt/' : '../');
};
const chOf = id => CH.find(c => c[0] === id);
/* listas que moram dentro da página de outra parada */
const PAGE_OF = {costumes: 'paixoes', esportes: 'paixoes', festas: 'paixoes', carros: 'paixoes', internet: 'paixoes', caramelo: 'paixoes', maisPaixoes: 'paixoes', nacionais: 'famosos', vistos: 'telas', comediantes: 'virais', sistema: 'politica', econ: 'politica', economia: 'politica', magnatas: 'politica', partidos: 'politica', politicos: 'politica', ativistas: 'politica'};
const pad = n => String(n).padStart(2, '0');

/* Ilustrações das paradas (viewBox 200×200). Classes em styles.css:
   o = contorno · k = tinta · w = creme · y = amarelo · r = vermelho · c = cor da parada · s = só traço.
   Os grupos a-* são as partes que se mexem (ver "ATUAÇÃO DAS ILUSTRAÇÕES" no CSS). */
const ART = {
  famosos: `<g class="a-star"><path class="y o" d="M100 20l22 50 54 5-41 36 13 53-48-28-48 28 13-53-41-36 54-5z"/><path class="k" d="M70 96h26v9a10 10 0 0 1-10 10h-6a10 10 0 0 1-10-10zM104 96h26v9a10 10 0 0 1-10 10h-6a10 10 0 0 1-10-10z"/><path class="s" d="M96 100h8"/><path class="s" d="M84 130q16 10 32 0"/></g><g class="a-tw1"><path class="w o" d="M168 24l5 12 12 5-12 5-5 12-5-12-12-5 12-5z"/></g><g class="a-tw2"><path class="w o" d="M30 140l4 9 9 4-9 4-4 9-4-9-9-4 9-4z"/></g>`,
  musica: `<g class="a-spin"><circle class="k o" cx="100" cy="104" r="78"/><circle class="g" cx="100" cy="104" r="64"/><circle class="g" cx="100" cy="104" r="52"/><circle class="y o" cx="100" cy="104" r="30"/><path class="k" d="M106 82l-18 26h12l-6 20 20-28h-12z"/><circle class="w" cx="100" cy="104" r="3"/></g><g class="a-note"><path class="w o" d="M160 22v40a11 11 0 1 1-7-10V34l22-6v10z"/></g>`,
  telas: `<g class="a-board"><rect class="w o" x="36" y="84" width="128" height="86" rx="8"/><rect class="k" x="36" y="84" width="128" height="20"/><path class="w" d="M56 84l-12 20h12l12-20zM88 84l-12 20h12l12-20zM120 84l-12 20h12l12-20zM152 84l-12 20h12l12-20z"/><path class="s" d="M56 126h88M56 148h54"/></g><g class="a-clap"><g transform="rotate(-16 40 78)"><rect class="k o" x="36" y="56" width="128" height="22" rx="4"/><path class="w" d="M56 56l-12 22h12l12-22zM88 56l-12 22h12l12-22zM120 56l-12 22h12l12-22zM152 56l-10 22h10l10-22z"/></g></g>`,
  marcas: `<path class="s" d="M142 52c14-24 34-28 46-26"/><g class="a-swing"><path class="w o" d="M34 96l58-58h66a8 8 0 0 1 8 8v66l-58 58a10 10 0 0 1-14 0l-60-60a10 10 0 0 1 0-14z"/><circle class="c o" cx="142" cy="62" r="10"/><text class="k t" x="98" y="128" transform="rotate(-45 98 118)">R$</text></g>`,
  comida: `<g class="a-pie"><path class="k o" d="M34 92h132v42a34 34 0 0 1-34 34H68a34 34 0 0 1-34-34z"/><path class="s" d="M34 104H18M166 104h16"/><ellipse class="w o" cx="100" cy="92" rx="66" ry="17"/><ellipse class="r" cx="100" cy="92" rx="52" ry="10"/><circle class="k" cx="84" cy="91" r="4"/><circle class="k" cx="104" cy="94" r="4"/><circle class="k" cx="120" cy="90" r="4"/></g><g class="a-steam"><path class="sw" d="M80 62c-9-9 9-15 0-24"/></g><g class="a-steam2"><path class="sw" d="M116 60c-9-9 9-15 0-24"/></g>`,
  invencoes: `<g class="a-bulb"><path class="y o" d="M100 28a46 46 0 0 1 28 82c-6 6-8 12-8 20H80c0-8-2-14-8-20a46 46 0 0 1 28-82z"/><rect class="w o" x="78" y="134" width="44" height="13" rx="4"/><rect class="w o" x="83" y="151" width="34" height="13" rx="4"/><g class="a-wifi"><path class="s" d="M78 82a30 30 0 0 1 44 0"/><path class="s" d="M87 93a17 17 0 0 1 26 0"/></g><circle class="k" cx="100" cy="104" r="6"/></g><g class="a-rays"><path class="s" d="M100 6v10M40 28l8 8M160 28l-8 8M18 78h12M170 78h12"/></g>`,
  virais: `<g class="a-talk1"><path class="w o" d="M28 34h144a14 14 0 0 1 14 14v84a14 14 0 0 1-14 14H90l-38 34 8-34H28a14 14 0 0 1-14-14V48a14 14 0 0 1 14-14z"/><text class="k t" x="100" y="108" style="font-size:54px">kkkk</text></g>`,
  paixoes: `<g class="a-wag"><path class="k o" d="M136 150c22-2 36-20 38-48-8 2-14 10-18 20-4 10-12 14-24 14z" style="fill:#e8a95c"/></g><path class="o" style="fill:#e8a95c" d="M62 182c-4-34 6-66 38-74s52 12 52 36c0 16-2 28-6 38z"/><path class="w" d="M84 182c-2-20 2-40 16-46 12 4 18 26 14 46z"/><g class="a-hop"><path class="o" style="fill:#b86f26" d="M56 44C36 42 24 62 34 90c10 6 22-6 28-24z"/><path class="o" style="fill:#b86f26" d="M144 44c20-2 32 18 22 46-10 6-22-6-28-24z"/><path class="o" style="fill:#e8a95c" d="M100 28c30 0 50 22 50 50s-20 52-50 52-50-24-50-52 20-50 50-50z"/><path class="w" d="M100 76c18 0 30 14 30 28s-14 26-30 26-30-12-30-26 12-28 30-28z"/><circle class="k" cx="80" cy="70" r="6"/><circle class="k" cx="120" cy="70" r="6"/><path class="k" d="M88 90h24c0 8-6 14-12 14s-12-6-12-14z"/><path class="s" d="M100 104v6M100 110c-4 6-12 6-16 2M100 110c4 6 12 6 16 2"/><path class="r o" d="M92 114h16v8a8 8 0 0 1-16 0z"/></g>`,
  recordes: `<g class="a-hop"><path class="y o" d="M58 30h84v42a42 42 0 0 1-84 0z"/><path class="s" d="M58 44H40a20 20 0 0 0 20 36M142 44h18a20 20 0 0 1-20 36"/><rect class="y o" x="89" y="114" width="22" height="22"/><text class="k t" x="100" y="90">1</text><path class="a-shine sw" d="M70 40l-4 20"/></g><rect class="k o" x="60" y="136" width="80" height="28" rx="4"/><rect class="w" x="80" y="145" width="40" height="10" rx="2"/>`,
  curiosidades: `<g class="a-scan"><path class="k o" d="M128 128l42 42" style="stroke-width:16"/><circle class="w o" cx="86" cy="86" r="54"/><circle class="s" cx="86" cy="86" r="40"/><text class="k t" x="86" y="108">?</text><path class="sw" d="M58 62a36 36 0 0 1 18-14"/></g>`,
  cidades: `<circle class="y a-sun" cx="160" cy="30" r="20"/><rect class="k" x="6" y="166" width="188" height="12" rx="3"/><rect style="fill:#2c5468" class="o" x="32" y="70" width="136" height="50"/><path class="sw" style="stroke-width:3" d="M52 72v46M72 72v46M92 72v46M112 72v46M132 72v46M152 72v46"/><rect class="r o" x="14" y="54" width="172" height="18" rx="2"/><rect class="r o" x="14" y="118" width="172" height="14" rx="2"/><rect class="r o" x="14" y="54" width="20" height="112"/><rect class="r o" x="166" y="54" width="20" height="112"/><path class="s" d="M84 166v-16M116 166v-16"/><circle class="k" cx="84" cy="144" r="5"/><circle class="k" cx="116" cy="144" r="5"/>`,
  historia: `<g class="a-flip"><rect class="k o" x="50" y="22" width="100" height="16" rx="4"/><rect class="k o" x="50" y="162" width="100" height="16" rx="4"/><path class="w o" d="M64 38h72c0 40-30 46-30 62s30 22 30 62H64c0-40 30-46 30-62s-30-22-30-62z"/><path class="y" d="M74 52h52c-4 20-22 28-26 40-4-12-22-20-26-40z"/><path class="y" d="M72 158c4-20 20-26 28-30 8 4 24 10 28 30z"/><path class="sy a-sand" d="M100 94v34"/></g>`,
  sites: `<circle class="w o" cx="100" cy="104" r="72"/><circle class="s" cx="100" cy="104" r="58"/><g class="a-needle"><path class="r o" d="M100 46l14 58H86z"/><path class="k o" d="M100 162l14-58H86z"/></g><circle class="y o" cx="100" cy="104" r="9"/><path class="s" d="M100 32v8M100 168v8M28 104h8M164 104h8"/>`,
  natureza: `<path class="s" d="M100 16v44M100 34C78 42 62 50 44 76M100 34c22 8 38 16 56 42"/><path class="lf o a-leaf" style="--d:0s" d="M100 28C76 30 56 22 42 6c26-6 50 2 58 22z"/><path class="lf o a-leaf" style="--d:.2s" d="M100 28c24 2 44-6 58-22-26-6-50 2-58 22z"/><g transform="translate(44 118) scale(0.72)"><path class="r o" d="M0-58c34 0 52 30 52 58 0 30-24 52-52 52s-52-22-52-52c0-28 18-58 52-58z"/><ellipse class="w o" cx="0" cy="4" rx="29" ry="33"/><circle class="k" cx="0" cy="4" r="18"/><circle class="w" cx="-6" cy="-3" r="4"/></g><g transform="translate(156 118) scale(0.72)"><path class="r o" d="M0-58c34 0 52 30 52 58 0 30-24 52-52 52s-52-22-52-52c0-28 18-58 52-58z"/><ellipse class="w o" cx="0" cy="4" rx="29" ry="33"/><circle class="k" cx="0" cy="4" r="18"/><circle class="w" cx="-6" cy="-3" r="4"/></g><g class="a-wattle"><g transform="translate(100 126) scale(1)"><path class="r o" d="M0-58c34 0 52 30 52 58 0 30-24 52-52 52s-52-22-52-52c0-28 18-58 52-58z"/><ellipse class="w o" cx="0" cy="4" rx="29" ry="33"/><circle class="k" cx="0" cy="4" r="18"/><circle class="w" cx="-6" cy="-3" r="4"/></g></g>`,
  sobre: `<circle class="y o a-sunrise" cx="136" cy="62" r="34"/><path class="r o" d="M6 166c14-30 26-66 56-74 22-6 30 26 46 40 20-20 38-44 60-38 12 4 18 40 26 72z"/><rect class="k" x="4" y="162" width="192" height="14" rx="4"/>`,
  politica: `<rect class="k" x="10" y="166" width="180" height="12" rx="4"/><rect class="w o" x="84" y="42" width="14" height="96"/><rect class="w o" x="102" y="42" width="14" height="96"/><rect class="w o" x="26" y="138" width="148" height="28"/><path class="y o" d="M34 138a30 30 0 0 1 56 0z"/><path class="r o" d="M110 112a28 26 0 0 0 56 0z" transform="translate(0 26)"/>`,
  lugares: `<circle class="y a-sun" cx="162" cy="32" r="18"/><g class="a-wave"><path class="sw" d="M-46 150q15-10 30 0t30 0 30 0 30 0 30 0 30 0 30 0 30 0"/></g><path class="y o" d="M8 176c40-16 144-16 184 0v10H8z"/><path class="s" d="M106 60l12 112"/><path class="r" d="M26 100Q106 10 186 100q-13.33-10-26.67 0t-26.67 0-26.67 0-26.67 0-26.67 0-26.66 0z"/><path class="w" d="M106 55L52.67 100q13.33-10 26.67 0zM106 55L106 100q13.33-10 26.67 0zM106 55L159.33 100q13.33-10 26.67 0z"/><path class="s" d="M26 100Q106 10 186 100q-13.33-10-26.67 0t-26.67 0-26.67 0-26.67 0-26.67 0-26.66 0z"/><circle class="k" cx="106" cy="53" r="5"/>`,
  dicionario: `<g class="a-talk1"><path class="w o" d="M24 44h112a14 14 0 0 1 14 14v52a14 14 0 0 1-14 14H76l-26 24 4-24H24a14 14 0 0 1-14-14V58a14 14 0 0 1 14-14z"/><text class="k t" x="80" y="98" style="font-size:40px">E aí?</text></g><g class="a-talk2"><path class="y o" d="M118 112h58a12 12 0 0 1 12 12v30a12 12 0 0 1-12 12h-8l4 18-22-18h-32a12 12 0 0 1-12-12v-30a12 12 0 0 1 12-12z"/><circle class="k" cx="130" cy="139" r="5"/><circle class="k" cx="147" cy="139" r="5"/><circle class="k" cx="164" cy="139" r="5"/></g>`,
  datas: `<g class="a-hop"><rect class="w o" x="34" y="46" width="132" height="120" rx="12"/><path class="r o" d="M34 58a12 12 0 0 1 12-12h108a12 12 0 0 1 12 12v24H34z"/><text class="k t" x="100" y="144" style="font-size:52px">7</text><rect class="k" x="62" y="32" width="10" height="28" rx="5"/><rect class="k" x="128" y="32" width="10" height="28" rx="5"/></g><g class="a-tw1"><path class="y o" d="M168 24l5 12 12 5-12 5-5 12-5-12-12-5 12-5z"/></g>`,
  quem: `<circle class="w o" cx="100" cy="74" r="34"/><path class="w o" d="M40 178c4-48 32-68 60-68s56 20 60 68z"/><path class="s" d="M86 82q14 10 28 0"/><circle class="k" cx="88" cy="68" r="4"/><circle class="k" cx="112" cy="68" r="4"/>`,
  quiz: `<g class="a-hop"><circle class="o" style="fill:#dfeaee" cx="100" cy="104" r="86"/><circle class="s" style="stroke-width:3;opacity:.35" cx="100" cy="104" r="68"/><path class="w o" d="M98 44C62 42 38 70 38 104s24 62 60 60c10-18 12-40 10-60s-2-42-10-60z"/><path class="s" style="stroke:#b9b095;stroke-width:4" d="M62 78l10-3M82 66l8 3M54 104l10 2M80 92l9-3M66 126l9-3M86 118l8 3M78 146l9-2"/><path class="o" style="fill:#5a2d14" d="M102 44c34-2 60 26 60 60s-26 62-60 60c10-18 12-40 10-60s-2-42-10-60z"/><g class="k"><ellipse cx="124" cy="74" rx="8" ry="5" transform="rotate(30 124 74)"/><ellipse cx="144" cy="96" rx="8" ry="5" transform="rotate(-25 144 96)"/><ellipse cx="124" cy="108" rx="8" ry="5" transform="rotate(15 124 108)"/><ellipse cx="142" cy="130" rx="8" ry="5" transform="rotate(40 142 130)"/><ellipse cx="120" cy="142" rx="8" ry="5" transform="rotate(-20 120 142)"/></g></g>`
};
const art = id => `<svg class="art" viewBox="0 0 200 200" aria-hidden="true">${ART[id] || ''}</svg>`;

const ICON = {
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 14 6-6 6 6"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>'
};

/* ---------- moldura comum ---------- */
const me = chOf(PAGE), myIdx = CH.indexOf(me), N = CH.length;
if (me) { document.body.style.setProperty('--c', me[4]); document.body.style.setProperty('--fg', me[5]); }

$('top').innerHTML = `<div class="wrap">
  <a class="logo" href="./" aria-label="${t('Cultura Brasileira, início', 'Brazilian Culture, home')}">
    <svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#00843d"/><circle cx="32" cy="27" r="18" fill="#ffc72c"/><path d="M0 53c16-7 48-7 64 0v11H0z" fill="#0b4f2c"/><circle cx="32" cy="14" r="3.6" fill="#fff8ea"/><path d="M11 20h42v2.6l-16 3.4 1.4 26H25.6L27 26l-16-3.4z" fill="#fff8ea"/></svg>
    <b>${t('Cultura Brasileira', 'Brazilian Culture')}</b>
  </a>
  <span class="spacer"></span>
  <button class="tbtn" id="menuBtn" type="button" aria-expanded="false" aria-controls="menu">${ICON.menu}<span class="lbl">${t('Paradas', 'Stops')}</span></button>
  <button class="tbtn" id="searchBtn" type="button" aria-label="${t('Buscar no guia', 'Search the guide')}">${ICON.search}<span class="lbl">${t('Buscar', 'Search')}</span><kbd>/</kbd></button>
  <a class="tbtn lang" href="${otherLang(PAGE)}" hreflang="${t('en', 'pt-BR')}" lang="${t('en', 'pt-BR')}" aria-label="${t('Read in English', 'Ler em português')}">${t('EN', 'PT')}</a>
  <button class="tbtn" id="themeBtn" type="button" aria-label="${t('Alternar tema', 'Toggle theme')}"></button>
</div>`;
/* idioma: o <head> de cada página redireciona pela escolha guardada (ou pelo navegador na primeira visita);
   trocar pelo botão do cabeçalho grava a nova escolha */
document.querySelector('#top .lang').addEventListener('click', () => { try { localStorage.setItem('bc-lang', EN ? 'pt' : 'en'); } catch (e) {} });
/* transição entre páginas interrompida (clique rápido, voltar) não é erro: só silencia as promessas */
['pageswap', 'pagereveal'].forEach(ev => addEventListener(ev, e => {
  const vt = e.viewTransition;
  if (vt) [vt.ready, vt.finished, vt.updateCallbackDone].forEach(p => p && p.catch(() => {}));
}));
/* atalho de teclado para pular a moldura */
const mainEl = document.querySelector('main');
if (mainEl) {
  mainEl.id ||= 'conteudo';
  mainEl.tabIndex = -1;
  document.body.insertAdjacentHTML('afterbegin', `<a class="skip" href="#${mainEl.id}">${t('Pular para o conteúdo', 'Skip to content')}</a>`);
}
/* o menu fica fora do cabeçalho: o backdrop-filter dele prenderia um position:fixed */
$('top').insertAdjacentHTML('afterend', `<nav class="menu" id="menu" aria-label="${t('Paradas', 'Stops')}" hidden>
  <div class="wrap"><ol>
    <li style="--k:0"><a href="./" style="--c:#06281a;--fg:#fff8ea"${PAGE === 'inicio' ? ' aria-current="page"' : ''}><span class="lq">${t('começo', 'start')}</span><div><b>${t('Início', 'Home')}</b><small>${t('A terra, o tempo, as pessoas', 'The land, time and people')}</small></div>${art('sobre')}</a></li>
    ${CH.map(([id, f, n, d, c, fg], i) =>
    `<li style="--k:${i + 1}"><a href="${f}" style="--c:${c};--fg:${fg}"${id === PAGE ? ' aria-current="page"' : ''}><span class="mono">${pad(i + 1)}</span><div><b>${n}</b><small>${d}</small></div>${art(id)}</a></li>`).join('')}
    <li style="--k:${N + 1}"><a href="${ABOUT}" style="--c:#00843d;--fg:#fff8ea"${PAGE === 'sobre' ? ' aria-current="page"' : ''}><span class="lq">${t('quem fez', 'who made it')}</span><div><b>${t('Sobre', 'About')}</b><small>${t('E outros projetos para visitar', 'And other projects to visit')}</small></div>${art('quem')}</a></li>
  </ol></div>
</nav>`);
$('menuBtn').onclick = () => {
  const m = $('menu'), open = m.hidden;
  // abre logo abaixo do cabeçalho (no topo da página ele ainda está abaixo da superbar)
  if (open) m.style.top = Math.max(0, $('top').getBoundingClientRect().bottom) + 'px';
  m.hidden = !open; $('menuBtn').setAttribute('aria-expanded', open);
  document.body.classList.toggle('menu-open', open);
};
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('menu').hidden) $('menuBtn').click(); });

if (me) {
  $('phArt').innerHTML = art(PAGE);
  const nx = CH[myIdx + 1];
  const ns = $('nextStop');
  if (nx) {
    ns.href = nx[1];
    ns.style.setProperty('--c', nx[4]); ns.style.setProperty('--fg', nx[5]);
    ns.innerHTML = `<div class="wrap"><div><span class="mono">${t('Próxima parada', 'Next stop')} · ${pad(myIdx + 2)}</span><b>${nx[2]}</b><span class="d">${nx[3]}</span><span class="go">${t('Seguir viagem', 'Keep travelling')} →</span></div>${art(nx[0])}</div>`;
  } else {
    ns.href = ABOUT;
    ns.style.setProperty('--c', '#00843d'); ns.style.setProperty('--fg', '#fff8ea');
    ns.innerHTML = `<div class="wrap"><div><span class="mono">${t('Fim da viagem', 'End of the road')}</span><b>Valeu, gente!</b><span class="d">${t('Obrigado por viajar com a gente. Conheça quem fez o guia e outros projetos.', 'Thanks for travelling with us. Meet the people behind the guide and our other projects.')}</span><span class="go">${t('Sobre o guia', 'About the guide')} →</span></div>${art('sobre')}</div>`;
  }
  /* barra de paradas colada embaixo do cabeçalho: mostra onde a pessoa está na viagem */
  const pv = CH[myIdx - 1];
  $('top').insertAdjacentHTML('afterend', `<nav class="levels" aria-label="${t('Paradas', 'Stops')}"><div class="wrap">
    ${pv ? `<a class="lv-arr" href="${pv[1]}" aria-label="${t('Parada anterior', 'Previous stop')}: ${pv[2]}">${ICON.prev}</a>` : `<a class="lv-arr" href="./" aria-label="${t('Início', 'Home')}">${ICON.prev}</a>`}
    <ol class="lv-list" id="lvList">${CH.map(([id, f, n, , c, fg], i) => {
      const here = id === PAGE, done = i < myIdx;
      return `<li><a href="${f}" style="--c:${c};--fg:${fg}" class="${here ? 'now' : done ? 'done' : ''}" title="${pad(i + 1)} · ${n}"${here ? ' aria-current="page"' : ''}><span class="n">${pad(i + 1)}</span>${here ? `<span class="nm">${n}</span>` : `<span class="sr">${n}</span>`}</a></li>`;
    }).join('')}</ol>
    ${nx ? `<a class="lv-arr" href="${nx[1]}" aria-label="${t('Próxima parada', 'Next stop')}: ${nx[2]}">${ICON.next}</a>` : `<a class="lv-arr" href="./" aria-label="${t('Início', 'Home')}">${ICON.next}</a>`}
  </div></nav>`);
  const now = $('lvList').querySelector('.now');
  if (now) $('lvList').scrollLeft = now.offsetLeft - $('lvList').clientWidth / 2 + now.offsetWidth / 2;
}

/* página Sobre: ilustração e convite para começar a viagem */
if (PAGE === 'sobre') {
  $('phArt').innerHTML = art('sobre');
  const f = CH[0], ns = $('nextStop');
  ns.href = f[1]; ns.style.setProperty('--c', f[4]); ns.style.setProperty('--fg', f[5]);
  ns.innerHTML = `<div class="wrap"><div><span class="mono">${t('Comece a viagem', 'Start the journey')} · 01</span><b>${f[2]}</b><span class="d">${f[3]}</span><span class="go">${t('Seguir viagem', 'Keep travelling')} →</span></div>${art(f[0])}</div>`;
}

/* fontes de cada parada, no fim do texto que as usa */
const cites = A.fontes[PAGE];
if (cites && document.querySelector('.page')) document.querySelector('.page').insertAdjacentHTML('beforeend',
  `<p class="cite">${t('Fontes', 'Sources')}: ${cites.map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener">${esc(n)}</a>`).join(', ')}.</p>`);

$('foot').innerHTML = `<div class="wrap">
  <p class="foot-big">Até mais, <em>volte sempre.</em></p>
  <p class="lead">${t('O projeto <strong>Cultura Brasileira</strong> foi idealizado por Julio Cesar Prava e é um projeto especial da <strong>BiblioVerse</strong>.', '<strong>Brazilian Culture</strong> was created by Julio Cesar Prava and is a special project of <strong>BiblioVerse</strong>.')}</p>
  <div class="acts">
    <a href="${ABOUT}">${t('Sobre', 'About')}</a>
    <a href="${ABOUT}#${t('privacidade', 'privacy')}">${t('Privacidade', 'Privacy')}</a>
    <a href="https://www.linkedin.com/company/biblioverse.org" rel="noopener noreferrer" target="_blank">LinkedIn</a>
    <button id="favBtn" type="button">${t('Favoritar', 'Bookmark')}</button>
    <button id="shareBtn" type="button">${t('Compartilhar', 'Share')}</button>
    <a href="https://biblioverse.org" rel="noopener noreferrer" target="_blank">BiblioVerse</a>
  </div>
  <p class="small">${t('Última atualização', 'Last updated')}: ${esc(A.updated)} · ${t('Acesse as bibliotecas de outros temas no BiblioVerse. Obrigado pela visita!', 'Explore libraries on other topics at BiblioVerse. Thanks for visiting!')}</p>
  <p class="small">© ${new Date().getFullYear()} BiblioVerse · Julio Cesar Prava. ${t('Todos os direitos reservados.', 'All rights reserved.')}</p>
  <p class="small ack">${t('Reconhecemos os povos indígenas como os primeiros habitantes desta terra, e os milhões de africanos trazidos à força, sem os quais a cultura brasileira não existiria.', 'We acknowledge Indigenous peoples as the first inhabitants of this land, and the millions of Africans brought here by force, without whom Brazilian culture would not exist.')}</p>
</div>`;
document.body.insertAdjacentHTML('beforeend', `
<dialog class="search" id="searchDlg" aria-label="${t('Buscar no guia', 'Search the guide')}">
  <div class="in">${ICON.search}<input id="q" type="text" role="searchbox" enterkeyhint="search" placeholder="${t('Busque um nome, comida, marca, ano...', 'Search a name, food, brand, year...')}" autocomplete="off"/><button class="x" id="qClose" type="button">Esc</button></div>
  <ul id="qRes"></ul>
</dialog>
<button class="totop" id="toTop" type="button" aria-label="${t('Voltar ao topo', 'Back to top')}">${ICON.up}</button>
<div class="toast" id="toast" role="status"></div>`);

/* ================= INÍCIO: a narrativa ================= */

/* Movimento: as curvas seguem os princípios clássicos de animação.
   OUT = desaceleração (chegadas), IN = aceleração (saídas), SPRING = passa do ponto e volta (exagero). */
const EASE = {OUT: 'cubic-bezier(.16,1,.3,1)', IN: 'cubic-bezier(.7,0,.84,0)', INOUT: 'cubic-bezier(.65,0,.35,1)', SPRING: 'cubic-bezier(.34,1.56,.64,1)'};
const anim = (el, kf, o) => (reduced || !el || !el.animate) ? null : el.animate(kf, Object.assign({fill: 'both'}, o));
/* comprimir ao tocar o chão e esticar no ar: a "pancada" de quem aterrissa */
const land = (el, delay = 0) => anim(el, [
  {transform: 'translateY(-14px) scale(.96,1.06)'},
  {transform: 'translateY(0) scale(1.06,.92)', offset: .45},
  {transform: 'translateY(0) scale(.98,1.02)', offset: .75},
  {transform: 'none'}], {duration: 520, delay, easing: EASE.OUT});

/* Rolagem até um ponto, para quem não usa a roda do mouse */
const goY = y => scrollTo({top: y, behavior: reduced ? 'auto' : 'smooth'});
const goEl = el => goY(el.getBoundingClientRect().top + scrollY - (parseInt(getComputedStyle(document.documentElement).scrollPaddingTop) || 0));

/* Abertura: o cafézinho de boas-vindas (uma vez por sessão) */
if ($('gate')) {
  let seen = false;
  try { seen = sessionStorage.getItem('bc-ack') === '1'; } catch (e) {}
  if (!seen) {
    $('gate').hidden = false;
    document.body.classList.add('gated');
    $('gateBtn').focus();
    $('gateBtn').onclick = () => {
      try { sessionStorage.setItem('bc-ack', '1'); } catch (e) {}
      const g = $('gate'), b = $('gateBtn');
      // antecipação: o botão afunda antes do pano subir
      anim(b, [{transform: 'none'}, {transform: 'scale(.92,.86)', offset: .4}, {transform: 'scale(1.04)'}], {duration: 260, easing: EASE.INOUT});
      // sobreposição: cada linha sai um pouco depois da anterior
      [...g.querySelectorAll('.gate-in > *')].forEach((el, i) =>
        anim(el, [{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'translateY(-40px)'}], {duration: 420, delay: 140 + i * 50, easing: EASE.IN}));
      let closed = false;
      const done = () => { if (closed) return; closed = true; g.hidden = true; document.body.classList.remove('gated'); heroIntro(); };
      const a = anim(g, [{transform: 'translateY(0)'}, {transform: 'translateY(-102%)'}], {duration: 900, delay: 380, easing: EASE.INOUT});
      if (a) { a.onfinish = done; setTimeout(done, 1600); } else done(); // garantia se a aba estiver em segundo plano
    };
  }
}

/* Abertura da capa: o sol nasce em arco, as letras caem e aterrissam uma a uma */
let heroDone = false;
function heroIntro(){
  if (heroDone || !$('hero') || document.body.classList.contains('gated')) return;
  heroDone = true;
  const h = $('hero');
  h.classList.add('play');
  if (reduced) return;
  const intro = [];
  anim($('sun'), [
    {transform: 'translate(-26%, 46%) scale(.82)', opacity: 0},
    {transform: 'translate(-8%, 10%) scale(.96)', opacity: 1, offset: .55},
    {transform: 'translate(0,0) scale(1)', opacity: 1}], {duration: 2200, easing: EASE.OUT, fill: 'backwards'});
  anim(h.querySelector('.cristo'), [{transform: 'translateY(40px)', opacity: 0}, {transform: 'none', opacity: 1}], {duration: 1600, easing: EASE.OUT});
  h.querySelectorAll('h1 .ch').forEach((c, i) => {
    intro.push(anim(c, [
      {transform: 'translateY(-120%) scale(.9,1.2)', opacity: 0},
      {transform: 'translateY(0) scale(1.12,.84)', opacity: 1, offset: .55},
      {transform: 'translateY(-6%) scale(.97,1.04)', offset: .78},
      {transform: 'none', opacity: 1}], {duration: 760, delay: 300 + i * 55, easing: EASE.OUT, fill: 'backwards'}));
  });
  [...h.querySelectorAll('.hero-in > :not(h1)')].forEach((el, i) =>
    intro.push(anim(el, [{opacity: 0, transform: 'translateY(24px)'}, {opacity: 1, transform: 'none'}], {duration: 900, delay: 900 + i * 140, easing: EASE.OUT, fill: 'backwards'})));
  // a arara entra em cena um segundo antes de o último texto pousar
  const end = Math.max(0, ...intro.filter(Boolean).map(a => { const k = a.effect.getTiming(); return k.delay + k.duration; }));
  setTimeout(() => h.classList.add('arara-go'), Math.max(0, end - 1000));
}
if ($('hero')) {
  // o título vira letras soltas para poderem aterrissar uma a uma
  $('hero').querySelectorAll('h1 .ln > *').forEach(w => {
    w.innerHTML = [...w.textContent].map(ch => `<span class="ch">${ch === ' ' ? '&nbsp;' : esc(ch)}</span>`).join('');
  });
  heroIntro();
  // em telas estreitas o enquadramento fecha no Cristo, para a estátua caber inteira
  const ul = $('hero').querySelector('.cristo');
  const frame = () => {
    // o enquadramento acompanha o tamanho real da ilustração, para o Cristo nunca perder a cabeça
    const r = ul.getBoundingClientRect(), vw = 420 * r.width / r.height;
    const x = innerWidth < 1024 && vw < 1440 ? clamp(1040 - vw / 2, 0, 1440 - vw) : 1440 - vw;
    ul.setAttribute('viewBox', `${x.toFixed(1)} 0 ${vw.toFixed(1)} 420`);
  };
  frame(); addEventListener('resize', frame);
}

/* Faixa com gírias */
if ($('mq')) {
  const words = ['saudades', 'eita', 'tá ligado', 'cafuné', 'valeu', 'oxente', 'uai', 'bah', 'tamo junto', 'gambiarra', 'cafézinho', 'show de bola', 'partiu', 'jeitinho', 'nossa', 'sextou'];
  const run = words.map(w => `<span>${esc(w)}</span><i aria-hidden="true">✶</i>`).join('');
  $('mq').innerHTML = run + run;
}

/* A terra: o mapa que muda conforme o texto */
function brMap(withEu){
  const p = MAP.proj, c = Math.cos(p.lat0 * Math.PI / 180);
  const xy = (la, lo) => [(lo - p.lon0) * c * p.k, (p.latTop - la) * p.k];
  const max = A.cidades[0][1];
  /* no mapa das cidades, cada bolinha leva a posição no ranking: dentro das grandes, ao lado das pequenas.
     O lado de cada número (l = esquerda, r = direita, u/d = sobe/desce) evita encavalar nas regiões cheias. */
  const SIDE = {13: 'ru', 14: 'l', 18: 'r', 21: 'ld', 22: 'lu', 23: 'ld', 25: 'rd', 20: 'ru', 24: 'ru', 16: 'rd'};
  const nums = []; // os números vão numa camada acima de todas as bolinhas, para nenhum ficar escondido
  const dots = A.cidades.map(([n, v, s, la, lo, ap, uf], i) => {
    const [x, y] = xy(la, lo), r = 2.2 + Math.sqrt(v / max) * 13, k = i + 1;
    let num = '';
    if (!withEu) {
      if (r >= 5.8 && !SIDE[k]) num = `<text class="dot-n in" data-s="${s}" x="${x.toFixed(1)}" y="${(y + 3.2).toFixed(1)}">${k}</text>`;
      else {
        const sd = SIDE[k] || 'r', dx = sd[0] === 'l' ? -(r + 2.5) : r + 2.5, dy = sd.includes('u') ? -3 : sd.includes('d') ? 7 : 3.2;
        num = `<text class="dot-n" data-s="${s}" x="${(x + dx).toFixed(1)}" y="${(y + dy).toFixed(1)}" text-anchor="${sd[0] === 'l' ? 'end' : 'start'}">${k}</text>`;
      }
    }
    nums.push(num);
    return `<g class="dot" data-s="${s}" style="--i:${i}"><circle class="ring" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"/><title>${k}. ${esc(n)} (${esc(uf)}) · ${fmt(v)}</title></g>`;
  }).join('');
  const lab = (la, lo, t, cls) => { const [x, y] = xy(la, lo); return `<text class="${cls}" x="${x.toFixed(0)}" y="${y.toFixed(0)}">${t}</text>`; };
  const vb = withEu ? MAP.vb.join(' ') : `-10 -10 ${MAP.w + 20} ${MAP.h + 20}`;
  return `<svg viewBox="${vb}" role="img" aria-label="${withEu ? t('Mapa do Brasil comparado à Europa inteira, com as maiores cidades', 'Map of Brazil compared with all of Europe, with the biggest cities') : t('Mapa do Brasil com as 25 maiores cidades', 'Map of Brazil with the 25 biggest cities')}">
    <path class="land" d="${MAP.br}"/>
    ${withEu ? `<path class="other" d="${MAP.eu}"/>
    ${lab(-9, -63, t('Amazônia', 'Amazon'), 'lbl-out')}
    <g class="pop"><text class="pop-br" x="${MAP.w * .5}" y="${MAP.h * .36}"><tspan class="pl" x="${MAP.w * .5}" dy="0">${t('Brasil', 'Brazil')}</tspan><tspan x="${MAP.w * .5}" dy="50">${t('213 mi', '213m')}</tspan></text>
      <text class="pop-au" x="${MAP.w * .5}" y="${MAP.h * .36 + 110}"><tspan class="pl" x="${MAP.w * .5}" dy="0">${t('Europa', 'Europe')}</tspan><tspan x="${MAP.w * .5}" dy="40">${t('745 mi', '745m')}</tspan></text></g>` : ''}
    <g class="dots">${dots}</g><g class="nums">${nums.join('')}</g></svg>`;
}
if ($('landFig') && MAP) {
  $('landFig').innerHTML = brMap(true);
  const fig = $('landFig'), steps = [...document.querySelectorAll('.step')];
  /* a Europa só aparece nos passos da comparação; fora deles o enquadramento volta a fechar no Brasil */
  const figSvg = fig.querySelector('svg'), BRVB = [-10, -10, MAP.w + 20, MAP.h + 20];
  const vbOf = s => s === '1' || s === '2' ? MAP.vb : BRVB;
  let vbNow = BRVB, vbRaf = 0;
  figSvg.setAttribute('viewBox', BRVB.join(' '));
  const zoomMap = s => {
    const from = vbNow, to = vbOf(s), t0 = performance.now();
    cancelAnimationFrame(vbRaf);
    const step = now => {
      const q = reduced ? 1 : Math.min(1, (now - t0) / 800), e = q < .5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
      vbNow = from.map((v, i) => v + (to[i] - v) * e);
      figSvg.setAttribute('viewBox', vbNow.join(' '));
      if (q < 1) vbRaf = requestAnimationFrame(step);
    };
    vbRaf = requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting || fig.dataset.step === e.target.dataset.step) return;
    fig.dataset.step = e.target.dataset.step;
    zoomMap(e.target.dataset.step);
    // o mapa "respira" a cada troca: encolhe um pouco e volta, como quem toma fôlego
    anim(fig.querySelector('svg'), [{transform: 'scale(1)'}, {transform: 'scale(.97)', offset: .3}, {transform: 'scale(1)'}], {duration: 600, easing: EASE.INOUT});
  }), {rootMargin: '-45% 0px -45% 0px'});
  steps.forEach((s, i) => {
    io.observe(s);
    const b = s.querySelector('.nextbtn');
    if (b) b.onclick = () => b.dataset.to ? goEl($(b.dataset.to)) : goY(steps[i + 1].getBoundingClientRect().top + scrollY - innerHeight * .35);
  });
}

/* O tempo: o contador de anos guiado pela rolagem */
const MS = EN ? [
  [-11000, 'The first peoples are already living here.'],
  [1500, 'Cabral’s fleet reaches Bahia.'],
  [1549, 'Salvador becomes the first capital.'],
  [1695, 'Quilombo dos Palmares falls with the death of Zumbi.'],
  [1808, 'The Portuguese court flees Napoleon for Rio.'],
  [1822, 'Independence: the Empire of Brazil is born.'],
  [1888, 'Abolition: the last country in the Americas to end slavery.'],
  [1958, 'Brazil wins its first World Cup, with Pelé aged 17.'],
  [1960, 'Brasília opens in the middle of the Cerrado.'],
  [1964, 'The military coup: 21 years of dictatorship begin.'],
  [1988, 'The Citizen Constitution restores democracy.'],
  [1994, 'The Real Plan ends hyperinflation.'],
  [2025, 'Belém hosts COP30 at the mouth of the Amazon.']
] : [
  [-11000, 'Os primeiros povos já vivem por aqui.'],
  [1500, 'A frota de Cabral chega à Bahia.'],
  [1549, 'Salvador vira a primeira capital.'],
  [1695, 'Cai o Quilombo dos Palmares, com a morte de Zumbi.'],
  [1808, 'A corte portuguesa foge de Napoleão para o Rio.'],
  [1822, 'A Independência: nasce o Império do Brasil.'],
  [1888, 'A Abolição: o último país das Américas a acabar com a escravidão.'],
  [1958, 'O Brasil ganha sua primeira Copa do Mundo, com Pelé aos 17 anos.'],
  [1960, 'Brasília é inaugurada no meio do Cerrado.'],
  [1964, 'O golpe militar: começam 21 anos de ditadura.'],
  [1988, 'A Constituição Cidadã devolve a democracia.'],
  [1994, 'O Plano Real acaba com a hiperinflação.'],
  [2025, 'Belém recebe a COP30, na foz do Amazonas.']
];
const yearTxt = y => y < 0 ? fmt(Math.round(-y / 1000) * 1000) + t(' a.C.', ' BC') : String(Math.round(y));
const PHONE = matchMedia('(max-width: 760px)');
if ($('timeTrack')) {
  /* cada marco tem uma bolinha na barra e o ano logo abaixo, nas mesmas posições: é onde a rolagem para */
  const pos = i => (i / (MS.length - 1) * 100).toFixed(3) + '%';
  $('yrBar').parentElement.insertAdjacentHTML('beforeend', MS.map((_, i) => `<span class="yr-dot" style="--p:${pos(i)}" aria-hidden="true"></span>`).join(''));
  const dots = [...document.querySelectorAll('.yr-dot')];
  $('yrTicks').innerHTML = MS.map(([y, tx], i) => `<li data-i="${i}" style="--p:${pos(i)}"><b>${yearTxt(y)}</b><span>${esc(tx)}</span></li>`).join('');
  const ticks = [...$('yrTicks').children], tr = $('timeTrack'), LAST = MS.length - 1;
  const span = () => tr.offsetHeight - innerHeight;
  const posOf = () => clamp(-tr.getBoundingClientRect().top / span(), 0, 1) * LAST; // 0 = 1º marco, LAST = último
  const yAt = k => tr.getBoundingClientRect().top + scrollY + span() * k / LAST;
  let last = -1, wasMoving = false;
  const onTime = () => {
    const f = posOf(), i = Math.min(LAST - 1, Math.floor(f)), fr = f - i;
    // o ano conta de um marco ao outro (acelera e desacelera); a legenda é sempre a do marco mais próximo,
    // então nunca há dois anos diferentes parados com o mesmo texto
    const e = fr < .5 ? 4 * fr * fr * fr : 1 - Math.pow(-2 * fr + 2, 3) / 2;
    // no celular a rolagem é solta, então a janela do marco é um pouco maior; fora dela a legenda some
    const pad = PHONE.matches ? .06 : .02, moving = fr > pad && fr < 1 - pad, k = Math.round(f);
    $('yr').textContent = yearTxt(moving ? MS[i][0] + (MS[i + 1][0] - MS[i][0]) * e : MS[k][0]);
    $('yrLabel').classList.toggle('moving', moving);
    // a legenda entra quando o ano para no marco; sem preencher depois (fill none), quem decide se ela
    // aparece durante a rolagem é a classe .moving (no celular ela some por completo)
    const showLabel = () => anim($('yrLabel'), [{opacity: 0, transform: 'translateY(14px)'}, {opacity: 1, transform: 'none'}], {duration: 450, easing: EASE.OUT, fill: 'none'});
    if (wasMoving && !moving) { land($('yr')); if (k === last) showLabel(); } // o ano "aterrissa" em cada marco
    if (k !== last) {
      last = k; $('yrLabel').textContent = MS[k][1];
      [ticks, dots].forEach(l => l.forEach((el, j) => { el.classList.toggle('on', j <= k); el.classList.toggle('now', j === k); }));
      if (!moving) showLabel();
    }
    wasMoving = moving;
    $('yrBar').style.width = (f / LAST * 100).toFixed(2) + '%';
    $('yrNext').innerHTML = k < LAST ? t('Próximo marco', 'Next milestone') + ' <span aria-hidden="true">↓</span>' : t('Seguir', 'Keep going') + ' <span aria-hidden="true">↓</span>';
  };
  /* Um toque na roda do mouse (ou uma tecla) = um marco. A rolagem é animada aqui,
     com aceleração e desaceleração, e os toques extras durante o movimento são ignorados. */
  let busy = false, quietUntil = 0;
  const tween = (to, dur = 760) => {
    busy = true;
    const from = scrollY, t0 = performance.now();
    const step = now => {
      const q = Math.min(1, (now - t0) / dur), e = q < .5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
      scrollTo(0, from + (to - from) * e);
      if (q < 1) requestAnimationFrame(step); else { busy = false; quietUntil = performance.now() + 260; }
    };
    requestAnimationFrame(step);
  };
  const stepTo = dir => {
    const r = tr.getBoundingClientRect();
    if (r.top > 1) return r.top < innerHeight * .6 && dir > 0 ? 0 : null;           // chegando por cima: para no 1º marco
    if (r.bottom < innerHeight - 1) return r.bottom > innerHeight * .4 && dir < 0 ? LAST : null; // voltando por baixo
    const f = posOf(), k = dir > 0 ? Math.floor(f + .02) + 1 : Math.ceil(f - .02) - 1;
    return k < 0 || k > LAST ? null : k; // nas pontas, a página segue rolando normalmente
  };
  const onStep = (dir, ev) => {
    const k = stepTo(dir);
    if (k == null) return;
    ev.preventDefault();
    if (busy || performance.now() < quietUntil) return;
    tween(yAt(k));
  };
  if (reduced) document.body.classList.add('static-time');
  else {
    addEventListener('wheel', e => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) onStep(Math.sign(e.deltaY), e); }, {passive: false});
    addEventListener('keydown', e => {
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || e.altKey || e.ctrlKey || e.metaKey) return;
      const dir = ['ArrowDown', 'PageDown', ' '].includes(e.key) && !e.shiftKey ? 1 : ['ArrowUp', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey) ? -1 : 0;
      if (dir) onStep(dir, e);
    });
    addEventListener('scroll', onTime, {passive: true}); addEventListener('resize', onTime); onTime();
  }
  // a seta leva ao próximo marco ou, no fim, ao texto seguinte
  $('yrNext').onclick = () => {
    const f = posOf(), k = Math.floor(f + .02) + 1;
    if (k > LAST) return goEl($('clock'));
    if (reduced) goY(yAt(k)); else tween(yAt(k));
  };
}

/* As pessoas: 100 pontos, 55 se declaram pretos ou pardos */
if ($('waffle')) {
  $('waffle').innerHTML = Array.from({length: 100}, (_, i) => `<i style="--i:${i}"${i < 55 ? ' class="f"' : ''}></i>`).join('');
  const io = new IntersectionObserver(es => {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    $('waffle').classList.add('go');
    // cada ponto aceso pula: estica ao subir, achata ao cair (comprimir e esticar)
    $('waffle').querySelectorAll('.f').forEach((d, i) => anim(d, [
      {transform: 'scale(.4)'}, {transform: 'scale(.9,1.25) translateY(-30%)', offset: .4},
      {transform: 'scale(1.2,.82)', offset: .7}, {transform: 'scale(1.08)'}], {duration: 520, delay: 200 + i * 35, easing: EASE.OUT}));
  }, {threshold: .4});
  io.observe($('waffle'));
}

/* O jeito: cartões que andam para o lado e se inclinam com o movimento */
const WAY = EN ? [
  ['Jeitinho', 'There’s always a way. It can be the creativity that solves the impossible or a rule bent with a chat. The country is proud and ashamed of it at the same time.'],
  ['Saudade', 'Missing someone, somewhere or some time, with love. It’s the language’s favourite word, sung in every samba and every heartache song.'],
  ['Human warmth', 'A kiss on the cheek, a tight hug and chatting to strangers in the queue. After five minutes you’re “my friend” and invited to “drop by the house”.'],
  ['Zoeira', 'Everything becomes a joke, even a national tragedy. Brazil’s internet invades comment sections worldwide: “zoeira never ends”.'],
  ['Gambiarra', 'Fixed it with tape and it works? Sorted. Short on money, rich in creativity. From the TV aerial with steel wool to the car repaired with wire.'],
  ['Everything’s a party', 'Carnival, June festivals, barbecues, birthdays, even a team’s match: a reason to gather family, neighbours and whoever turns up. There’s always room for one more.'],
  ['Cafézinho, rapidinho', 'The diminutive softens everything: um minutinho (a little minute), um favorzinho (a little favour). And nobody believes “a little minute” really lasts a minute.']
] : [
  ['Jeitinho', 'Sempre se dá um jeito. Pode ser a criatividade que resolve o impossível ou a regra contornada na conversa. O país tem orgulho e vergonha disso ao mesmo tempo.'],
  ['Saudade', 'Sentir falta de alguém, de um lugar ou de um tempo, com carinho. É a palavra favorita da língua, cantada em todo samba e toda sofrência.'],
  ['Calor humano', 'Beijo no rosto, abraço apertado e conversa com desconhecidos na fila. Depois de cinco minutos, você já é “meu amigo”, e o convite é “passa lá em casa”.'],
  ['Zoeira', 'Tudo vira piada, inclusive a tragédia nacional. A internet brasileira invade os comentários do mundo inteiro: é a “zoeira never ends”.'],
  ['Gambiarra', 'Prendeu com fita, funcionou? Está resolvido. Falta dinheiro, sobra criatividade. Da antena de TV com bombril ao conserto do carro com arame.'],
  ['Tudo vira festa', 'Carnaval, São João, churrasco, aniversário e até jogo do time: motivo para reunir a família, os vizinhos e quem mais chegar. Sempre cabe mais um.'],
  ['Cafézinho, rapidinho', 'O diminutivo suaviza tudo: um minutinho, um favorzinho, um beijinho. E ninguém acredita que “um minutinho” dure mesmo um minuto.']
];
const WAYC = ['#00843d', '#ffc72c', '#0b3d91', '#ff8fb1', '#7b2fbe', '#0a7d4f', '#ff6b4a'];
if ($('wayRow')) {
  $('wayRow').innerHTML = WAY.map(([t, d], i) => {
    const c = WAYC[i], dark = ['#ffc72c', '#ff8fb1', '#ff6b4a'].includes(c);
    return `<article class="way-card ticket" style="--c:${c};--fg:${dark ? '#0c2016' : '#fff8ea'};--r:${i % 2 ? 1 : -1.2}deg"><span class="mono">${pad(i + 1)}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`;
  }).join('');
  const track = $('wayTrack'), row = $('wayRow'), cards = [...row.children];
  const horiz = () => !reduced && innerWidth > 760;
  const span = () => track.offsetHeight - innerHeight;
  const size = () => {
    if (!horiz()) { track.style.height = ''; row.style.transform = ''; return; }
    track.style.height = (row.scrollWidth - innerWidth + innerHeight * 1.2) + 'px';
  };
  let x = 0, tilt = 0, raf = 0;
  const target = () => horiz() ? -clamp(-track.getBoundingClientRect().top / span(), 0, 1) * (row.scrollWidth - innerWidth + 32) : 0;
  // o trilho segue a rolagem com um pequeno atraso (desaceleração) e os cartões
  // se inclinam conforme a velocidade, voltando ao lugar depois (acompanhamento)
  const tick = () => {
    const tx = target(), v = tx - x;
    x += v * .14; tilt += (clamp(v * .05, -7, 7) - tilt) * .18;
    row.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
    cards.forEach((c, i) => c.style.setProperty('--tilt', (tilt * (1 + i * .06)).toFixed(2) + 'deg'));
    raf = Math.abs(v) > .3 || Math.abs(tilt) > .05 ? requestAnimationFrame(tick) : 0;
  };
  const kick = () => { if (horiz() && !raf) raf = requestAnimationFrame(tick); };
  size(); x = target(); tick();
  addEventListener('resize', () => { size(); kick(); });
  addEventListener('scroll', kick, {passive: true});
  // a seta avança um cartão por vez (ou rola até o fim no celular)
  $('wayNext').onclick = () => {
    if (!horiz()) { row.scrollBy({left: cards[0].offsetWidth + 22, behavior: reduced ? 'auto' : 'smooth'}); return; }
    const p = clamp(-track.getBoundingClientRect().top / span(), 0, 1), stepP = 1 / (cards.length - 1);
    if (p >= .999) return goEl($('paradas'));
    goY(track.getBoundingClientRect().top + scrollY + span() * Math.min(1, (Math.floor(p / stepP + .01) + 1) * stepP) + 1);
  };
}

/* A viagem: os selos das paradas */
if ($('stamps')) {
  $('stamps').innerHTML = CH.map(([id, f, n, d, c, fg], i) =>
    `<li class="rv" style="--i:${i % 4}"><a class="stamp ticket" href="${f}" style="--c:${c};--fg:${fg}">
      <span class="mono">${pad(i + 1)}</span>${art(id)}<b>${n}</b><small>${d}</small></a></li>`).join('');
}
/* Pular a introdução: aparece depois da capa e some ao chegar nas paradas */
if ($('hero') && $('paradas')) {
  document.body.insertAdjacentHTML('beforeend', `<button class="skipintro" id="skipIntro" type="button">${t('Pular introdução', 'Skip the intro')} <span aria-hidden="true">↓</span></button>`);
  const b = $('skipIntro'), hero = $('hero'), stops = $('paradas');
  const sync = () => b.classList.toggle('on', hero.getBoundingClientRect().bottom < innerHeight * .5 && stops.getBoundingClientRect().top > innerHeight * .9);
  addEventListener('scroll', sync, {passive: true}); sync();
  b.onclick = () => goEl(stops);
}
/* O sol se põe atrás do Corcovado enquanto se rola (o céu acompanha) */
if ($('sun') && !reduced) {
  const sun = $('sun'), hero = $('hero');
  addEventListener('scroll', () => {
    const y = scrollY; if (y > innerHeight * 1.4) return;
    const p = clamp(y / (hero.offsetHeight * .8), 0, 1);
    sun.style.translate = `0 ${(p * 55).toFixed(1)}vh`;
    hero.style.setProperty('--dusk', p.toFixed(3));
  }, {passive: true});
}

/* ================= PARADAS ================= */

/* listas com filtro e busca */
const card = (sec, it, i) => sec === 'dicionario'
  ? `<article class="card term rv" id="${sec}-${i}"><h3 lang="pt-BR">${esc(it.n)}</h3><p>${esc(it.d)}</p>${it.e ? `<p class="en" lang="en">${t('Em inglês', 'In English')}: ${esc(it.e)}</p>` : ''}</article>`
  : sec === 'sites'
  ? `<article class="card site rv" id="${sec}-${i}">
      <div class="meta">${esc(it.t)}</div><h3>${esc(it.n)}</h3><p class="org">${esc(it.o)}</p><p>${esc(it.d)}</p>
      <a class="more" href="${it.u}" target="_blank" rel="noopener">${esc(it.u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</a></article>`
  : `<article class="card rv" id="${sec}-${i}">
      <div class="meta">${esc(it.t || '')}${it.y ? ` <span class="ano">${esc(it.y)}</span>` : ''}</div>
      <h3>${esc(it.n)}</h3>
      <p>${esc(it.d)}</p>
      ${it.c ? `<p class="crit"><b>${t('Outro olhar', 'Another view')}</b>${esc(it.c)}</p>` : ''}
      ${it.ig ? `<a class="more" href="https://www.instagram.com/${it.ig}/" target="_blank" rel="noopener">@${esc(it.ig)}</a>` : it.wk === '' ? '' : `<a class="more" href="${wiki(it)}" target="_blank" rel="noopener">${t('Saiba mais', 'Find out more')}</a>`}</article>`;

const ALL = t('Todos', 'All'), NONE = t('Nada encontrado. Tente outra palavra.', 'Nothing found. Try another word.');
const byYear = (a, b) => (parseInt(a.y) || -1) - (parseInt(b.y) || -1);
A.invencoes.sort(byYear);
const LABEL = EN
  ? {sistema: 'the system', economia: 'the economy', magnatas: 'tycoons', partidos: 'parties', politicos: 'politicians', ativistas: 'activists', famosos: 'famous Brazilians', musica: 'artists', telas: 'films, series and animation', vistos: 'shows and broadcasts', comediantes: 'comedians', marcas: 'brands', comida: 'food', invencoes: 'inventions', virais: 'memes', sites: 'websites', natureza: 'animals and plants', lugares: 'places', dicionario: 'terms', datas: 'dates', nacionais: 'national icons', costumes: 'customs', esportes: 'sports', festas: 'parties and events', carros: 'cars', internet: 'internet habits', caramelo: 'caramelo facts', maisPaixoes: 'other passions'}
  : {sistema: 'o sistema', economia: 'a economia', magnatas: 'magnatas', partidos: 'partidos', politicos: 'políticos', ativistas: 'ativistas', famosos: 'famosos', musica: 'artistas', telas: 'filmes, séries e animações', vistos: 'programas e transmissões', comediantes: 'comediantes', marcas: 'marcas', comida: 'comidas', invencoes: 'invenções', virais: 'memes', sites: 'sites', natureza: 'animais e plantas', lugares: 'lugares', dicionario: 'termos', datas: 'datas', nacionais: 'ícones nacionais', costumes: 'costumes', esportes: 'esportes', festas: 'festas e eventos', carros: 'carros', internet: 'hábitos na internet', caramelo: 'curiosidades do caramelo', maisPaixoes: 'outras paixões'};
document.querySelectorAll('[data-list]').forEach(host => {
  const sec = host.dataset.list, items = A[sec];
  const tags = [...new Set(items.map(x => x.t))];
  const st = {tag: '', q: ''};
  // sem um h2 na seção, a lista ganha um título invisível para os cards (h3) não pularem nível
  const before = [...document.querySelectorAll('main h1, main h2')].filter(h => h.compareDocumentPosition(host) & Node.DOCUMENT_POSITION_FOLLOWING).pop();
  const needH2 = !before || before.tagName === 'H1';
  host.innerHTML = `${needH2 ? `<h2 class="vh">${t('Lista de', 'List of')} ${LABEL[sec]}</h2>` : ''}<div class="bar-ctl">${['', ...tags].map(tg =>
    `<button class="chip" type="button" data-t="${esc(tg)}">${tg ? esc(tg) : ALL}<small>${tg ? items.filter(x => x.t === tg).length : items.length}</small></button>`).join('')}
    <input class="find" type="search" placeholder="${t('Filtrar', 'Filter')} ${LABEL[sec]}..." aria-label="${t('Filtrar', 'Filter')}"/></div>
    <div class="count" aria-live="polite"></div><div class="grid"></div>`;
  const grid = host.querySelector('.grid'), count = host.querySelector('.count');
  function render(){
    host.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c.dataset.t === st.tag));
    const q = norm(st.q);
    const rows = items.map((it, i) => [it, i]).filter(([it]) =>
      (!st.tag || it.t === st.tag) && (!q || norm(it.n + ' ' + it.d + ' ' + (it.y || '') + ' ' + (it.o || '')).includes(q)));
    grid.innerHTML = rows.length ? rows.map(([it, i]) => card(sec, it, i)).join('') : `<div class="empty">${NONE}</div>`;
    count.textContent = `${rows.length} ${rows.length === 1 ? 'item' : (EN ? 'items' : 'itens')}`;
    reveal(grid);
  }
  host.querySelector('.bar-ctl').addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    st.tag = c.dataset.t; render();
  });
  host.querySelector('.find').addEventListener('input', e => { st.q = e.target.value; render(); });
  render();
});

/* gráficos de barras e chips */
function bars(host, rows, max){
  host.innerHTML = rows.map((r, i) => `<div class="br" data-g="${esc(r.g)}"><span class="rk">${i + 1}</span>
    <span class="nm">${esc(r.n)}<small>${esc(r.g)}</small>${r.ind ? `<em class="ind">${esc(r.ind)}</em>` : ''}</span><span class="tr"><i data-w="${(r.v / max * 100).toFixed(1)}"></i></span><b class="vl">${r.l}</b></div>`).join('');
  const go = () => host.querySelectorAll('i[data-w]').forEach(i => i.style.width = i.dataset.w + '%');
  if (reduced || !('IntersectionObserver' in window)) return go();
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { go(); io.disconnect(); } }, {threshold: .1});
  io.observe(host);
}
function chipRow(host, opts, onPick){
  let cur = '';
  const box = document.createElement('span');
  box.style.display = 'contents';
  host.prepend(box);
  const draw = () => box.innerHTML = ['', ...opts].map(o =>
    `<button class="chip" type="button" data-v="${esc(o)}" aria-pressed="${o === cur}">${o ? esc(o) : ALL}</button>`).join('');
  box.addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    cur = c.dataset.v; draw(); onPick(cur);
  });
  draw();
}

/* Instagram */
if ($('igBars')) {
  const ig = A.instagram.map(([n, v, g]) => ({n, v, g, l: v.toLocaleString(LOC) + t(' mi', 'm')}));
  bars($('igBars'), ig, ig[0].v);
  chipRow($('igChips'), [...new Set(ig.map(x => x.g))], v =>
    $('igBars').querySelectorAll('.br').forEach(b => b.classList.toggle('dim', !!v && b.dataset.g !== v)));
}

/* Rock */

/* Gêmeas */
const twin = {cat: '', q: ''};
function renderTwins(){
  const q = norm(twin.q);
  const rows = A.gemeas.filter(([c, b, a]) => (!twin.cat || c === twin.cat) && (!q || norm(b + ' ' + a).includes(q)));
  $('twList').innerHTML = rows.length ? rows.map(([c, b, a]) =>
    `<div class="tw"><span class="br-n">${esc(b)}</span><span class="ar" aria-hidden="true">→</span><span class="au-n">${esc(a)}</span><span class="cat">${esc(c)}</span></div>`).join('')
    : `<div class="empty">${t('Essa marca ainda não está na lista.', 'That brand isn’t on the list yet.')}</div>`;
}
if ($('twList')) {
  chipRow($('twChips'), [...new Set(A.gemeas.map(x => x[0]))], v => { twin.cat = v; renderTwins(); });
  $('twChips').insertAdjacentHTML('beforeend', `<input class="find" id="twFind" type="search" placeholder="${t('Ex.: Amazon, Uber Eats, Oreo...', 'E.g. Amazon, Uber Eats, Oreo...')}" aria-label="${t('Buscar marca', 'Search a brand')}"/>`);
  $('twFind').addEventListener('input', e => { twin.q = e.target.value; renderTwins(); });
  renderTwins();
}

/* Comida do dia a dia */
if ($('staples')) $('staples').innerHTML = A.staples.map(([n, d], i) => `<div class="rv"><span class="mono">${pad(i + 1)}</span><b>${esc(n)}</b><span>${esc(d)}</span></div>`).join('');

/* Política e economia: os números em destaque */
if ($('econNums')) {
  $('econNums').innerHTML = A.econ.map((r, i) =>
    `<article class="rec rv" id="econ-${i}"><span class="k">${esc(r.k)}</span><h3>${esc(r.n)}</h3><p>${esc(r.d)}</p><div class="meta">${esc(r.t)}</div></article>`).join('');
  reveal($('econNums'));
}

/* Comparação com o Brasil: só a página em português tem os blocos e os dados */
const cmp = (id, rows) => {
  if (!$(id) || !rows) return;
  $(id).innerHTML = rows.map((r, i) => `<article class="cmp-row rv" id="${id}-${i}">
    <div class="cmp-pair"><p><span class="mono">${t('Brasil', 'Brazil')}</span><b>${esc(r.a)}</b></p><span class="cmp-eq" aria-hidden="true">≈</span><p><span class="mono">${t('Lá fora', 'Abroad')}</span><b>${esc(r.b)}</b></p></div>
    <p class="cmp-e">${esc(r.e)}</p><p class="cmp-d">${esc(r.d)}</p></article>`).join('');
  reveal($(id));
};
cmp('cmpPartidos', A.comparaPartidos);
cmp('cmpLideres', A.comparaLideres);

/* Recordes */
function renderRecs(tag){
  if (!$('recs').previousElementSibling?.matches('h2.vh') && !$('recs').closest('section')?.querySelector('h2')) $('recs').insertAdjacentHTML('beforebegin', `<h2 class="vh">${t('Lista de recordes', 'List of records')}</h2>`);
  $('recs').innerHTML = A.recordes.map((r, i) => [r, i]).filter(([r]) => !tag || r.t === tag).map(([r, i]) =>
    `<article class="rec rv" id="recordes-${i}"><span class="k">${esc(r.k)}</span><h3>${esc(r.n)}</h3><p>${esc(r.d)}</p>
     <div class="meta">${esc(r.t)}${r.wk === '' ? '' : ` · <a class="more" href="${wiki(r)}" target="_blank" rel="noopener">${t('Saiba mais', 'Find out more')}</a>`}</div></article>`).join('');
  reveal($('recs'));
}
if ($('recs')) {
  chipRow($('recChips'), [...new Set(A.recordes.map(r => r.t))], renderRecs);
  renderRecs('');
}

/* Curiosidades */
let spotI = -1;
function spot(i){
  const c = A.curiosidades;
  if (i == null) { do { i = Math.floor(Math.random() * c.length); } while (c.length > 1 && i === spotI); }
  spotI = i;
  const f = c[i], el = $('spot');
  el.innerHTML = `<span class="big" aria-hidden="true">${pad(i + 1)}</span><div><h2>${esc(f.n)}</h2><p>${esc(f.d)}</p></div>
    <button type="button" id="spotBtn">${t('Sortear outra', 'Show me another')}</button>`;
  el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap');
  $('spotBtn').onclick = () => spot();
}
if ($('spot')) {
  spot(0);
  $('facts').innerHTML = A.curiosidades.map((f, i) =>
    `<li class="rv"><button class="fact" type="button" id="curiosidades-${i}" data-i="${i}"><b>${esc(f.n)}</b><span>${esc(f.d)}</span></button></li>`).join('');
  $('facts').addEventListener('click', e => {
    const b = e.target.closest('.fact'); if (!b) return;
    spot(+b.dataset.i); $('spot').scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block: 'center'});
  });
}

/* Cidades: mapa, ranking e capitais */
/* estado e apelido da cidade */
const indOf = c => c[5] ? `${c[6]} · ${c[5]}` : c[6];
const cityOf = name => A.cidades.find(c => c[0] === name);
function renderProfiles(s){
  $('cityBars').querySelectorAll('.br').forEach(b => b.classList.toggle('dim', !!s && b.dataset.g !== s));
  $('cityMap').querySelectorAll('.dot, .dot-n').forEach(d => d.classList.toggle('dim', !!s && d.dataset.s !== s));
  const ps = A.perfis.map((p, i) => [p, i]).filter(([p]) => !s || p.s === s);
  $('profiles').innerHTML = ps.length ? ps.map(([p, i]) =>
    `<article class="prof rv" id="cidades-${i}"><span class="a">${esc(p.a)}</span><h3>${esc(p.n)}<small>${p.s}</small></h3>${cityOf(p.n) ? `<p class="ind">${esc(indOf(cityOf(p.n)))}</p>` : ''}<p>${esc(p.d)}</p></article>`).join('')
    : `<div class="empty">${t('Sem perfil de cidade para este filtro.', 'No city profile for this filter.')}</div>`;
  reveal($('profiles'));
}
if ($('cityBars')) {
  const cities = A.cidades.map(c => ({n: c[0], v: c[1], g: c[2], l: fmt(c[1]), ind: indOf(c)}));
  bars($('cityBars'), cities, cities[0].v);
  if (MAP) $('cityMap').innerHTML = brMap(false) + `<figcaption class="note">${t('Cada círculo é uma cidade, do tamanho da sua população. Passe o mouse ou toque para ver o nome.', 'Each circle is a city, sized by population. Hover or tap to see its name.')}</figcaption>`;
  chipRow($('cityChips'), EN ? ['North', 'Northeast', 'Centre-West', 'Southeast', 'South'] : ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'], renderProfiles);
  renderProfiles('');
}

/* História */
function renderHistory(tag){
  if (!$('timeline').previousElementSibling?.matches('h2.vh')) $('timeline').insertAdjacentHTML('beforebegin', `<h2 class="vh">${t('Linha do tempo', 'Timeline')}</h2>`);
  $('timeline').innerHTML = A.historia.map((h, i) => [h, i]).filter(([h]) => !tag || h.t === tag).map(([h, i]) =>
    `<article class="ev rv" id="historia-${i}"><span class="y">${esc(h.y)}</span><h3>${esc(h.n)}</h3><p>${esc(h.d)}</p><div class="meta">${esc(h.t)}</div></article>`).join('');
  reveal($('timeline'));
}
if ($('timeline')) {
  chipRow($('hisChips'), [...new Set(A.historia.map(h => h.t))], renderHistory);
  renderHistory('');
}

/* Quiz */
const Q = {i: 0, ok: 0, order: []};
function quizStart(){
  Q.order = A.quiz.map((_, i) => i).sort(() => Math.random() - .5).slice(0, 10);
  Q.i = 0; Q.ok = 0; quizDraw();
}
function quizDraw(){
  const box = $('quizBox'), n = Q.order.length;
  if (Q.i >= n) {
    const p = Q.ok / n;
    const msg = p === 1 ? t('Arretado! Você tem ginga: é brasileiro de coração.', 'Arretado! You’ve got ginga: Brazilian at heart.')
      : p >= .7 ? t('Show de bola! Já dá para se virar em qualquer churrasco.', 'Show de bola! You’d hold your own at any churrasco.')
      : p >= .4 ? t('Tá quase! Mais uma volta pelo guia e você chega lá.', 'Almost! One more lap of the guide and you’ll get there.')
      : t('Vixe... Vale reler o guia com um cafézinho na mão.', 'Vixe... Worth another read of the guide, cafézinho in hand.');
    box.innerHTML = `<div class="res"><div class="sc">${Q.ok}/${n}</div><p>${msg}</p>
      <button class="btn" type="button" id="qAgain">${t('Jogar de novo', 'Play again')}</button></div>`;
    $('qAgain').onclick = quizStart;
    land(box.querySelector('.sc'), 100); // o placar cai e assenta
    return;
  }
  const q = A.quiz[Q.order[Q.i]];
  box.innerHTML = `<div class="qtop"><span class="mono">${t('Pergunta', 'Question')} ${Q.i + 1} ${t('de', 'of')} ${n}</span><span class="mono">${Q.ok} ${EN ? 'correct' : (Q.ok === 1 ? 'acerto' : 'acertos')}</span></div>
    <div class="prog"><i style="width:${Q.i / n * 100}%"></i></div><h2>${esc(q.q)}</h2>
    <div class="opts">${q.o.map((o, i) => `<button class="opt" type="button" data-i="${i}"><span class="mono">${'ABCD'[i]}</span>${esc(o)}</button>`).join('')}</div>`;
  box.querySelector('.opts').addEventListener('click', e => {
    const b = e.target.closest('.opt'); if (!b || b.disabled) return;
    const pick = +b.dataset.i;
    box.querySelectorAll('.opt').forEach((o, i) => { o.disabled = true; if (i === q.a) o.classList.add('ok'); });
    const ok = box.querySelectorAll('.opt')[q.a];
    if (pick === q.a) {
      Q.ok++;
      // acerto: antecipa (afunda), pula esticando e cai achatando
      anim(ok, [{transform: 'none'}, {transform: 'scale(1.03,.9)', offset: .15}, {transform: 'translateY(-10px) scale(.97,1.06)', offset: .45},
        {transform: 'scale(1.04,.94)', offset: .75}, {transform: 'none'}], {duration: 620, easing: EASE.OUT});
    } else {
      b.classList.add('no');
      // erro: um "não" com a cabeça, exagerado e amortecido
      anim(b, [0, -12, 10, -7, 4, -2, 0].map(x => ({transform: `translateX(${x}px)`})), {duration: 520, easing: EASE.OUT});
    }
    box.insertAdjacentHTML('beforeend', `<button class="btn next" type="button" id="qNext">${Q.i + 1 < n ? t('Próxima', 'Next') + ' →' : t('Ver resultado', 'See my score')}</button>`);
    $('qNext').onclick = () => { Q.i++; quizDraw(); };
    $('qNext').focus();
  });
}
if ($('quizBox')) quizStart();

/* ================= BUSCA GLOBAL (leva à página certa) ================= */
const IDX = [];
const add = (sec, list, f) => list.forEach((it, i) => IDX.push(Object.assign({sec, a: `${sec}-${i}`}, f(it, i))));
['famosos', 'nacionais', 'musica', 'telas', 'marcas', 'comida', 'invencoes', 'virais'].forEach(sec =>
  add(sec, A[sec], it => ({n: it.n, d: it.d, x: it.t + ' ' + (it.y || '')})));
['costumes', 'esportes', 'festas', 'carros', 'internet', 'caramelo', 'maisPaixoes'].forEach(sec => add(sec, A[sec], it => ({n: it.n, d: it.d, x: it.t + ' ' + (it.y || '')})));
add('vistos', A.vistos, it => ({n: it.n, d: it.d, x: it.t + ' ' + (it.y || '')}));
['sistema', 'economia', 'magnatas', 'partidos', 'politicos', 'ativistas'].forEach(sec => add(sec, A[sec], it => ({n: it.n, d: it.d, x: it.t + ' ' + (it.y || '')})));
add('econ', A.econ, r => ({n: r.n, d: r.k + ' · ' + r.d, x: r.t}));
add('comediantes', A.comediantes, it => ({n: it.n, d: it.d, x: it.t + ' ' + (it.ig || '')}));
add('sites', A.sites, s => ({n: s.n, d: s.o + ' · ' + s.d, x: s.t + ' ' + s.u}));
add('natureza', A.natureza, it => ({n: it.n, d: it.d, x: it.t + ' ' + it.s + ' ' + (it.o || '') + ' ' + (it.w || '')}));
add('recordes', A.recordes, r => ({n: r.n, d: r.k + ' · ' + r.d, x: r.t}));
add('curiosidades', A.curiosidades, c => ({n: c.n, d: c.d, x: ''}));
add('historia', A.historia, h => ({n: h.n, d: h.y + ' · ' + h.d, x: h.y + ' ' + h.t}));
add('datas', A.datas, it => ({n: it.n, d: it.d, x: it.t + ' ' + it.y + ' ' + (it.c || '')}));
add('dicionario', A.dicionario, it => ({n: it.n, d: it.d, x: (it.e || '')}));
add('lugares', A.lugares, it => ({n: it.n, d: it.d, x: it.t + ' ' + it.y + ' ' + (it.w || '')}));
add('cidades', A.perfis, p => ({n: p.n, d: p.a + ' · ' + p.d, x: p.s}));
(A.gemeas || []).forEach(([c, b, a]) => IDX.push({sec: 'marcas', a: 'gemea=' + encodeURIComponent(b), n: `${b} → ${a}`, d: t('Marcas gêmeas', 'Brand twins') + ' · ' + c, x: ''}));
IDX.forEach(r => r.k = norm(r.n + ' ' + r.d + ' ' + r.x));

const dlg = $('searchDlg'), qi = $('q'), qr = $('qRes');
let act = 0;
function search(){
  const terms = norm(qi.value).split(/\s+/).filter(Boolean);
  if (!terms.length) { qr.innerHTML = t('<li class="hint">Experimente: <b>feijoada</b>, <b>Pelé</b>, <b>1888</b>, <b>capivara</b>, <b>saudade</b>, <b>Anitta</b>...</li>', '<li class="hint">Try: <b>feijoada</b>, <b>Pelé</b>, <b>1888</b>, <b>capybara</b>, <b>saudade</b>, <b>Anitta</b>...</li>'); return; }
  const hits = IDX.filter(r => terms.every(t => r.k.includes(t)))
    .map(r => { const n = norm(r.n); return [r, n.startsWith(terms[0]) ? 2 : terms.every(t => n.includes(t)) ? 1 : 0]; })
    .sort((a, b) => b[1] - a[1]).map(x => x[0]).slice(0, 40);
  act = 0;
  qr.innerHTML = hits.length ? hits.map((h, i) => { const c = chOf(PAGE_OF[h.sec] || h.sec);
    return `<li><a href="${c[1]}#${h.a}" class="${i ? '' : 'act'}" style="--c:${c[4]}"><div><b>${esc(h.n)}</b><span>${esc(h.d)}</span></div><small>${c[2]}</small></a></li>`; }).join('')
    : `<li class="hint">${NONE}</li>`;
}
function openSearch(){ dlg.showModal(); qi.value = ''; search(); qi.focus(); }
/* mesma página: o link só troca o hash e o hashchange cuida do resto */
qi.addEventListener('input', search);
qi.addEventListener('keydown', e => {
  const as = qr.querySelectorAll('a');
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); if (!as.length) return;
    as[act].classList.remove('act'); act = (act + (e.key === 'ArrowDown' ? 1 : -1) + as.length) % as.length;
    as[act].classList.add('act'); as[act].scrollIntoView({block: 'nearest'});
  } else if (e.key === 'Enter' && as[act]) { e.preventDefault(); as[act].click(); }
});
qr.addEventListener('click', e => { if (e.target.closest('a')) dlg.close(); });
$('qClose').onclick = () => dlg.close();
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
$('searchBtn').onclick = openSearch;
document.addEventListener('keydown', e => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); openSearch(); }
});

/* ao chegar com #âncora: mostra o item, destacado */
function focusHash(e){
  const smooth = !!e && !reduced; // na chegada (sem evento) o pulo é direto
  const h = decodeURIComponent(location.hash.slice(1));
  if (!h) return;
  let el;
  if (h.startsWith('gemea=') && $('twList')) {
    twin.q = h.slice(6); $('twFind').value = twin.q; renderTwins(); el = $('twList');
  } else if (/^curiosidades-\d+$/.test(h) && $('spot')) {
    spot(+h.split('-')[1]); el = $('spot');
  } else el = $(h);
  if (!el) return;
  el.classList.add('in');
  setTimeout(() => {
    el.scrollIntoView({behavior: smooth ? 'smooth' : 'auto', block: 'center'});
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }, 60);
}
addEventListener('hashchange', focusHash);

/* ================= TEMA, REVELAR, TOPO ================= */
const root = document.documentElement;
const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
const themeIcon = () => { $('themeBtn').innerHTML = isDark() ? ICON.sun : ICON.moon; };
$('themeBtn').onclick = () => {
  root.dataset.theme = isDark() ? 'light' : 'dark';
  try { localStorage.setItem('bc-theme', root.dataset.theme); } catch (e) {}
  themeIcon();
};
themeIcon();

function reveal(scope){
  const els = (scope || document).querySelectorAll('.rv:not(.in)');
  if (reduced || !('IntersectionObserver' in window)) return els.forEach(e => e.classList.add('in'));
  rio = rio || new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } }), {rootMargin: '0px 0px -6% 0px'});
  els.forEach(e => rio.observe(e));
}
reveal();
/* espera o carregamento: antes disso o navegador ainda reposiciona a página */
if (document.readyState === 'complete') focusHash(); else addEventListener('load', () => focusHash());
addEventListener('scroll', () => $('toTop').classList.toggle('on', scrollY > 900), {passive: true});
$('toTop').onclick = () => scrollTo({top: 0, behavior: reduced ? 'auto' : 'smooth'});

/* favoritar e compartilhar */
const toast = m => { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2400); };
$('favBtn').onclick = () => toast(t('Aperte ', 'Press ') + (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl') + t(' + D para favoritar', ' + D to bookmark'));
$('shareBtn').onclick = async () => {
  const data = {title: document.title, url: location.href.split('#')[0]};
  try {
    if (navigator.share) await navigator.share(data);
    else { await navigator.clipboard.writeText(data.url); toast(t('Link copiado!', 'Link copied!')); }
  } catch (e) {}
};
/* Índice da página: aparece quando há duas ou mais seções (h2) e acompanha a rolagem.
   No computador é uma aba na lateral esquerda que abre e fecha (e lembra a escolha);
   no celular, um botão flutuante que abre a lista por baixo e fecha ao escolher. */
(() => {
  const hs = [...document.querySelectorAll('main .page h2.sub')];
  if (hs.length < 2) return;
  hs.forEach(h => { if (!h.id) h.id = 'sec-' + norm(h.textContent).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); });
  const KEY = 'bc-toc', label = t('Nesta página', 'On this page');
  const phone = matchMedia('(max-width: 760px)');
  let pref = null;
  try { pref = localStorage.getItem(KEY); } catch (e) {}
  document.body.insertAdjacentHTML('beforeend', `<nav class="toc" id="toc" aria-label="${label}">
    <button class="toc-btn" id="tocBtn" type="button" aria-expanded="false" aria-controls="tocPanel">${ICON.list}<span>${label}</span></button>
    <div class="toc-panel" id="tocPanel"><p class="toc-h">${label}</p>
      <ol>${hs.map((h, i) => `<li><a href="#${h.id}"><span class="mono">${pad(i + 1)}</span>${esc(h.textContent)}</a></li>`).join('')}</ol></div></nav>`);
  const nav = $('toc'), btn = $('tocBtn'), links = [...nav.querySelectorAll('a')];
  const set = (on, remember) => {
    nav.classList.toggle('open', on); btn.setAttribute('aria-expanded', on);
    if (remember && !phone.matches) try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
  };
  // telas muito largas têm espaço ao lado do conteúdo: começa aberto, a não ser que a pessoa tenha fechado
  set(!phone.matches && (pref ? pref === '1' : innerWidth >= 1720), false);
  btn.onclick = () => set(!nav.classList.contains('open'), true);
  links.forEach(a => a.addEventListener('click', () => { if (phone.matches) set(false, false); }));
  addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open') && phone.matches) set(false, false); });
  document.addEventListener('click', e => { if (phone.matches && nav.classList.contains('open') && !nav.contains(e.target)) set(false, false); });
  // posição logo abaixo da barra de paradas e destaque da seção atual
  // fica sempre abaixo do que estiver mais embaixo no topo: o cabeçalho ou a barra de paradas
  const lv = document.querySelector('.levels'), top = $('top');
  let raf = 0;
  const sync = () => {
    raf = 0;
    if (!phone.matches) nav.style.top = Math.round(Math.max(top.getBoundingClientRect().bottom, lv ? lv.getBoundingClientRect().bottom : 0, 0) + 18) + 'px';
    else nav.style.top = '';
    const line = innerHeight * .35;
    let cur = 0;
    hs.forEach((h, i) => { if (h.getBoundingClientRect().top <= line) cur = i; });
    links.forEach((a, i) => { a.classList.toggle('now', i === cur); if (i === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    nav.classList.toggle('seen', hs[0].getBoundingClientRect().top < innerHeight);
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(sync); }, {passive: true});
  addEventListener('resize', sync);
  sync();
})();
})();
