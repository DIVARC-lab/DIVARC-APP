/* Marketplace DIVARC — Taxonomie (Chantier 1.2).
 *
 * 10 catégories top-level × 4 niveaux de profondeur. Chaque catégorie a :
 *   - id : slug stable utilisé en DB (category_path[])
 *   - label : libellé FR affiché à l'user
 *   - icon : nom de l'icône Lucide (importée côté UI via dynamic import)
 *   - ui_mode : détermine le rendu de /marketplace/[id] :
 *     · vinted : photos verticales, taille/marque/état mis en avant
 *     · leboncoin : photos horizontales, prix négociable, géoloc
 *     · vehicle_specialized : caractéristiques techniques + financement
 *     · real_estate_specialized : DPE/GES + plans + carte quartier
 *     · service_specialized : tarification + disponibilités calendrier
 *     · job_specialized : intégration module Jobs DIVARC */

export type UiMode =
  | "vinted"
  | "leboncoin"
  | "vehicle_specialized"
  | "real_estate_specialized"
  | "service_specialized"
  | "job_specialized";

export type TaxonomyNode = {
  id: string;
  label: string;
  /* Optional sub-categories (max 4 niveaux : top → L2 → L3 → L4). */
  children?: TaxonomyNode[];
};

export type TopCategory = {
  id: string;
  label: string;
  /* Nom de l'icône Lucide (kebab → PascalCase au moment de l'import). */
  icon: string;
  ui_mode: UiMode;
  children: TaxonomyNode[];
};

/* ===========================================================================
 * TAXONOMIE — 10 catégories top-level
 * =========================================================================== */

export const TAXONOMY: ReadonlyArray<TopCategory> = [
  /* --- 1. MODE ---------------------------------------------------------- */
  {
    id: "fashion",
    label: "Mode",
    icon: "Shirt",
    ui_mode: "vinted",
    children: [
      {
        id: "fashion.women",
        label: "Femme",
        children: [
          { id: "fashion.women.tops", label: "Hauts" },
          { id: "fashion.women.dresses", label: "Robes" },
          { id: "fashion.women.pants", label: "Pantalons & jeans" },
          { id: "fashion.women.skirts", label: "Jupes" },
          { id: "fashion.women.shoes", label: "Chaussures" },
          { id: "fashion.women.bags", label: "Sacs" },
          { id: "fashion.women.accessories", label: "Accessoires" },
          { id: "fashion.women.jewelry", label: "Bijoux & montres" },
          { id: "fashion.women.beauty", label: "Beauté & cosmétique" },
          { id: "fashion.women.lingerie", label: "Lingerie & maillots" },
        ],
      },
      {
        id: "fashion.men",
        label: "Homme",
        children: [
          { id: "fashion.men.tops", label: "Hauts" },
          { id: "fashion.men.pants", label: "Pantalons & jeans" },
          { id: "fashion.men.suits", label: "Costumes & vestes" },
          { id: "fashion.men.shoes", label: "Chaussures" },
          { id: "fashion.men.bags", label: "Sacs & bagagerie" },
          { id: "fashion.men.accessories", label: "Accessoires" },
          { id: "fashion.men.jewelry", label: "Bijoux & montres" },
          { id: "fashion.men.grooming", label: "Soins & parfums" },
        ],
      },
      {
        id: "fashion.kids",
        label: "Enfant",
        children: [
          { id: "fashion.kids.girls", label: "Vêtements fille" },
          { id: "fashion.kids.boys", label: "Vêtements garçon" },
          { id: "fashion.kids.shoes", label: "Chaussures" },
          { id: "fashion.kids.accessories", label: "Accessoires" },
        ],
      },
      {
        id: "fashion.unisex",
        label: "Unisexe",
        children: [
          { id: "fashion.unisex.streetwear", label: "Streetwear" },
          { id: "fashion.unisex.vintage", label: "Vintage" },
        ],
      },
    ],
  },

  /* --- 2. MAISON & DÉCO ------------------------------------------------- */
  {
    id: "home",
    label: "Maison & Déco",
    icon: "Home",
    ui_mode: "leboncoin",
    children: [
      {
        id: "home.furniture",
        label: "Mobilier",
        children: [
          { id: "home.furniture.sofa", label: "Canapés & fauteuils" },
          { id: "home.furniture.tables", label: "Tables" },
          { id: "home.furniture.chairs", label: "Chaises" },
          { id: "home.furniture.storage", label: "Rangement & étagères" },
          { id: "home.furniture.beds", label: "Lits & literie" },
          { id: "home.furniture.desks", label: "Bureaux" },
        ],
      },
      {
        id: "home.decor",
        label: "Décoration",
        children: [
          { id: "home.decor.art", label: "Art & affiches" },
          { id: "home.decor.lighting", label: "Luminaires" },
          { id: "home.decor.textiles", label: "Textiles & rideaux" },
          { id: "home.decor.plants", label: "Plantes & cache-pots" },
          { id: "home.decor.mirrors", label: "Miroirs & cadres" },
        ],
      },
      {
        id: "home.kitchen",
        label: "Cuisine",
        children: [
          { id: "home.kitchen.cookware", label: "Ustensiles & poêles" },
          { id: "home.kitchen.tableware", label: "Vaisselle" },
          { id: "home.kitchen.appliances", label: "Petit électroménager" },
        ],
      },
      {
        id: "home.bedroom",
        label: "Chambre",
        children: [
          { id: "home.bedroom.bedding", label: "Linge de lit" },
          { id: "home.bedroom.pillows", label: "Coussins & oreillers" },
        ],
      },
      {
        id: "home.bathroom",
        label: "Salle de bain",
        children: [
          { id: "home.bathroom.towels", label: "Serviettes & linge" },
          { id: "home.bathroom.accessories", label: "Accessoires" },
        ],
      },
      {
        id: "home.garden",
        label: "Jardin & extérieur",
        children: [
          { id: "home.garden.furniture", label: "Mobilier de jardin" },
          { id: "home.garden.bbq", label: "Barbecue & planchas" },
          { id: "home.garden.tools", label: "Outils de jardinage" },
          { id: "home.garden.plants", label: "Plantes d'extérieur" },
        ],
      },
      {
        id: "home.diy_tools",
        label: "Bricolage",
        children: [
          { id: "home.diy_tools.electric", label: "Outillage électrique" },
          { id: "home.diy_tools.hand_tools", label: "Outillage à main" },
          { id: "home.diy_tools.hardware", label: "Quincaillerie" },
        ],
      },
      {
        id: "home.appliances",
        label: "Gros électroménager",
        children: [
          { id: "home.appliances.fridge", label: "Réfrigérateurs" },
          { id: "home.appliances.washer", label: "Lave-linge & sèche-linge" },
          { id: "home.appliances.dishwasher", label: "Lave-vaisselle" },
          { id: "home.appliances.oven", label: "Fours & cuisinières" },
        ],
      },
    ],
  },

  /* --- 3. MULTIMÉDIA / TECH -------------------------------------------- */
  {
    id: "tech",
    label: "Multimédia",
    icon: "Smartphone",
    ui_mode: "leboncoin",
    children: [
      {
        id: "tech.smartphones",
        label: "Smartphones",
        children: [
          { id: "tech.smartphones.apple", label: "iPhone" },
          { id: "tech.smartphones.samsung", label: "Samsung Galaxy" },
          { id: "tech.smartphones.android", label: "Autres Android" },
          { id: "tech.smartphones.accessories", label: "Accessoires" },
        ],
      },
      {
        id: "tech.computers",
        label: "Ordinateurs",
        children: [
          { id: "tech.computers.laptops", label: "Portables" },
          { id: "tech.computers.desktops", label: "Tours & iMac" },
          { id: "tech.computers.tablets", label: "Tablettes" },
          { id: "tech.computers.components", label: "Composants" },
          { id: "tech.computers.peripherals", label: "Périphériques" },
        ],
      },
      {
        id: "tech.gaming",
        label: "Gaming",
        children: [
          { id: "tech.gaming.consoles", label: "Consoles" },
          { id: "tech.gaming.games", label: "Jeux vidéo" },
          { id: "tech.gaming.accessories", label: "Accessoires gaming" },
        ],
      },
      {
        id: "tech.audio",
        label: "Audio",
        children: [
          { id: "tech.audio.headphones", label: "Casques & écouteurs" },
          { id: "tech.audio.speakers", label: "Enceintes" },
          { id: "tech.audio.hifi", label: "Hi-Fi & home cinéma" },
          { id: "tech.audio.dj", label: "DJ & studio" },
        ],
      },
      {
        id: "tech.cameras",
        label: "Photo & vidéo",
        children: [
          { id: "tech.cameras.dslr", label: "Reflex & hybrides" },
          { id: "tech.cameras.compact", label: "Compacts" },
          { id: "tech.cameras.lenses", label: "Objectifs" },
          { id: "tech.cameras.drones", label: "Drones" },
          { id: "tech.cameras.accessories", label: "Accessoires photo" },
        ],
      },
      {
        id: "tech.tv",
        label: "TV & vidéoprojecteurs",
        children: [
          { id: "tech.tv.tvs", label: "Télévisions" },
          { id: "tech.tv.projectors", label: "Vidéoprojecteurs" },
        ],
      },
      {
        id: "tech.accessories",
        label: "Accessoires tech",
      },
    ],
  },

  /* --- 4. LOISIRS ------------------------------------------------------ */
  {
    id: "hobbies",
    label: "Loisirs",
    icon: "Heart",
    ui_mode: "leboncoin",
    children: [
      {
        id: "hobbies.books",
        label: "Livres & magazines",
        children: [
          { id: "hobbies.books.fiction", label: "Romans & fiction" },
          { id: "hobbies.books.essays", label: "Essais & sciences humaines" },
          { id: "hobbies.books.kids", label: "Livres enfants" },
          { id: "hobbies.books.comics", label: "BD & mangas" },
          { id: "hobbies.books.textbooks", label: "Scolaire & technique" },
        ],
      },
      {
        id: "hobbies.music_instruments",
        label: "Instruments de musique",
        children: [
          { id: "hobbies.music_instruments.guitar", label: "Guitares" },
          { id: "hobbies.music_instruments.piano", label: "Pianos & claviers" },
          { id: "hobbies.music_instruments.drums", label: "Batterie & percussions" },
          { id: "hobbies.music_instruments.wind", label: "Vents & cuivres" },
        ],
      },
      {
        id: "hobbies.sports",
        label: "Sports",
        children: [
          { id: "hobbies.sports.fitness", label: "Fitness & musculation" },
          { id: "hobbies.sports.cycling", label: "Vélo & cyclisme" },
          { id: "hobbies.sports.team", label: "Sports d'équipe" },
          { id: "hobbies.sports.water", label: "Sports nautiques" },
          { id: "hobbies.sports.winter", label: "Sports d'hiver" },
          { id: "hobbies.sports.racket", label: "Tennis & sports de raquette" },
        ],
      },
      {
        id: "hobbies.outdoor",
        label: "Plein air",
        children: [
          { id: "hobbies.outdoor.camping", label: "Camping & rando" },
          { id: "hobbies.outdoor.fishing", label: "Pêche" },
          { id: "hobbies.outdoor.hunting", label: "Chasse" },
        ],
      },
      {
        id: "hobbies.collectibles",
        label: "Collection",
        children: [
          { id: "hobbies.collectibles.coins", label: "Numismatique" },
          { id: "hobbies.collectibles.stamps", label: "Philatélie" },
          { id: "hobbies.collectibles.trading_cards", label: "Cartes à collectionner" },
          { id: "hobbies.collectibles.figures", label: "Figurines" },
          { id: "hobbies.collectibles.vinyl", label: "Vinyles & K7" },
        ],
      },
      {
        id: "hobbies.art_supplies",
        label: "Matériel d'art",
      },
      {
        id: "hobbies.games_toys",
        label: "Jeux & jouets",
        children: [
          { id: "hobbies.games_toys.board_games", label: "Jeux de société" },
          { id: "hobbies.games_toys.puzzles", label: "Puzzles" },
          { id: "hobbies.games_toys.lego", label: "Lego & construction" },
        ],
      },
    ],
  },

  /* --- 5. VÉHICULES ---------------------------------------------------- */
  {
    id: "vehicles",
    label: "Véhicules",
    icon: "Car",
    ui_mode: "vehicle_specialized",
    children: [
      {
        id: "vehicles.cars",
        label: "Voitures",
        children: [
          { id: "vehicles.cars.sedan", label: "Berlines" },
          { id: "vehicles.cars.suv", label: "SUV & 4x4" },
          { id: "vehicles.cars.station_wagon", label: "Breaks" },
          { id: "vehicles.cars.city", label: "Citadines" },
          { id: "vehicles.cars.coupe", label: "Coupés & cabriolets" },
          { id: "vehicles.cars.minivan", label: "Monospaces" },
          { id: "vehicles.cars.electric", label: "Électriques" },
          { id: "vehicles.cars.collection", label: "Collection & ancêtres" },
        ],
      },
      {
        id: "vehicles.motorcycles",
        label: "Motos & scooters",
        children: [
          { id: "vehicles.motorcycles.road", label: "Routières" },
          { id: "vehicles.motorcycles.trail", label: "Trails & enduro" },
          { id: "vehicles.motorcycles.sport", label: "Sportives" },
          { id: "vehicles.motorcycles.scooter", label: "Scooters" },
          { id: "vehicles.motorcycles.electric", label: "Électriques" },
        ],
      },
      {
        id: "vehicles.bicycles",
        label: "Vélos",
        children: [
          { id: "vehicles.bicycles.road", label: "Vélos de route" },
          { id: "vehicles.bicycles.mtb", label: "VTT" },
          { id: "vehicles.bicycles.urban", label: "Urbains" },
          { id: "vehicles.bicycles.electric", label: "VAE (électriques)" },
        ],
      },
      {
        id: "vehicles.boats",
        label: "Bateaux & nautisme",
        children: [
          { id: "vehicles.boats.motor", label: "Bateaux à moteur" },
          { id: "vehicles.boats.sail", label: "Voiliers" },
          { id: "vehicles.boats.jetski", label: "Jet-ski" },
        ],
      },
      {
        id: "vehicles.parts",
        label: "Pièces détachées",
        children: [
          { id: "vehicles.parts.car", label: "Pièces auto" },
          { id: "vehicles.parts.motorcycle", label: "Pièces moto" },
          { id: "vehicles.parts.bicycle", label: "Pièces vélo" },
          { id: "vehicles.parts.tires", label: "Pneus & jantes" },
        ],
      },
      {
        id: "vehicles.equipment",
        label: "Équipement véhicule",
        children: [
          { id: "vehicles.equipment.gps", label: "GPS & électronique" },
          { id: "vehicles.equipment.helmets", label: "Casques & gear moto" },
          { id: "vehicles.equipment.car_seats", label: "Sièges auto enfants" },
        ],
      },
    ],
  },

  /* --- 6. IMMOBILIER --------------------------------------------------- */
  {
    id: "real_estate",
    label: "Immobilier",
    icon: "Building2",
    ui_mode: "real_estate_specialized",
    children: [
      {
        id: "real_estate.apartment_sale",
        label: "Vente appartement",
      },
      {
        id: "real_estate.house_sale",
        label: "Vente maison",
      },
      {
        id: "real_estate.apartment_rent",
        label: "Location appartement",
      },
      {
        id: "real_estate.house_rent",
        label: "Location maison",
      },
      {
        id: "real_estate.colocation",
        label: "Colocation",
      },
      {
        id: "real_estate.land",
        label: "Terrains",
      },
      {
        id: "real_estate.parking",
        label: "Parking & garage",
      },
      {
        id: "real_estate.commercial",
        label: "Local commercial",
      },
    ],
  },

  /* --- 7. SERVICES ----------------------------------------------------- */
  {
    id: "services",
    label: "Services",
    icon: "HandHelping",
    ui_mode: "service_specialized",
    children: [
      {
        id: "services.lessons",
        label: "Cours & formation",
        children: [
          { id: "services.lessons.languages", label: "Langues" },
          { id: "services.lessons.music", label: "Musique" },
          { id: "services.lessons.academic", label: "Soutien scolaire" },
          { id: "services.lessons.sport", label: "Sport & coaching" },
        ],
      },
      {
        id: "services.events",
        label: "Événementiel",
        children: [
          { id: "services.events.dj", label: "DJ & musiciens" },
          { id: "services.events.catering", label: "Traiteur" },
          { id: "services.events.photo", label: "Photographe & vidéaste" },
          { id: "services.events.rental", label: "Location matériel" },
        ],
      },
      {
        id: "services.transport",
        label: "Transport & déménagement",
        children: [
          { id: "services.transport.moving", label: "Déménageurs" },
          { id: "services.transport.delivery", label: "Livraison" },
          { id: "services.transport.driver", label: "Chauffeurs" },
        ],
      },
      {
        id: "services.home_services",
        label: "Services à domicile",
        children: [
          { id: "services.home_services.cleaning", label: "Ménage" },
          { id: "services.home_services.childcare", label: "Garde d'enfants" },
          { id: "services.home_services.handyman", label: "Bricolage & jardinage" },
          { id: "services.home_services.elderly", label: "Aide à la personne" },
        ],
      },
      {
        id: "services.beauty_wellness",
        label: "Beauté & bien-être",
        children: [
          { id: "services.beauty_wellness.hair", label: "Coiffure" },
          { id: "services.beauty_wellness.makeup", label: "Maquillage" },
          { id: "services.beauty_wellness.massage", label: "Massage & soins" },
        ],
      },
      {
        id: "services.pet_services",
        label: "Services animaliers",
        children: [
          { id: "services.pet_services.walking", label: "Promenade" },
          { id: "services.pet_services.sitting", label: "Pet sitting" },
          { id: "services.pet_services.grooming", label: "Toilettage" },
        ],
      },
      {
        id: "services.professional",
        label: "Services pro",
        children: [
          { id: "services.professional.translation", label: "Traduction" },
          { id: "services.professional.legal", label: "Conseil juridique" },
          { id: "services.professional.accounting", label: "Comptabilité" },
          { id: "services.professional.design", label: "Design & création" },
        ],
      },
    ],
  },

  /* --- 8. EMPLOIS & MISSIONS ------------------------------------------- */
  {
    id: "jobs",
    label: "Emplois & Missions",
    icon: "Briefcase",
    ui_mode: "job_specialized",
    children: [
      { id: "jobs.permanent", label: "CDI" },
      { id: "jobs.fixed_term", label: "CDD" },
      { id: "jobs.freelance", label: "Freelance" },
      { id: "jobs.internship", label: "Stage" },
      { id: "jobs.apprenticeship", label: "Alternance" },
      { id: "jobs.gigs", label: "Missions ponctuelles" },
    ],
  },

  /* --- 9. MATÉRIEL PRO ------------------------------------------------- */
  {
    id: "business",
    label: "Matériel Pro",
    icon: "Briefcase",
    ui_mode: "leboncoin",
    children: [
      {
        id: "business.office_equipment",
        label: "Bureau",
        children: [
          { id: "business.office_equipment.desks", label: "Bureaux & open-space" },
          { id: "business.office_equipment.chairs", label: "Sièges ergonomiques" },
          { id: "business.office_equipment.printers", label: "Imprimantes & copieurs" },
        ],
      },
      {
        id: "business.industrial",
        label: "Industriel",
        children: [
          { id: "business.industrial.machines", label: "Machines & outillage" },
          { id: "business.industrial.handling", label: "Manutention" },
        ],
      },
      {
        id: "business.restaurant_supplies",
        label: "Restauration",
        children: [
          { id: "business.restaurant_supplies.kitchen", label: "Cuisine pro" },
          { id: "business.restaurant_supplies.tables", label: "Mobilier salle" },
        ],
      },
      {
        id: "business.shops",
        label: "Commerce",
        children: [
          { id: "business.shops.fixtures", label: "Agencement & vitrines" },
          { id: "business.shops.tpe", label: "TPE & encaissement" },
        ],
      },
    ],
  },

  /* --- 10. ENFANTS & BÉBÉS --------------------------------------------- */
  {
    id: "kids",
    label: "Enfants & Bébés",
    icon: "Baby",
    ui_mode: "vinted",
    children: [
      {
        id: "kids.clothes",
        label: "Vêtements bébé & enfant",
        children: [
          { id: "kids.clothes.baby_0_2", label: "Bébé 0-2 ans" },
          { id: "kids.clothes.kids_3_12", label: "Enfant 3-12 ans" },
        ],
      },
      {
        id: "kids.toys",
        label: "Jouets",
        children: [
          { id: "kids.toys.baby", label: "Bébé & éveil" },
          { id: "kids.toys.creative", label: "Créatif" },
          { id: "kids.toys.educational", label: "Éducatif" },
          { id: "kids.toys.outdoor", label: "Plein air" },
        ],
      },
      {
        id: "kids.furniture",
        label: "Mobilier",
        children: [
          { id: "kids.furniture.cribs", label: "Lits bébé" },
          { id: "kids.furniture.changing_tables", label: "Tables à langer" },
          { id: "kids.furniture.rooms", label: "Chambres enfants" },
        ],
      },
      {
        id: "kids.strollers",
        label: "Poussettes & sièges auto",
      },
      {
        id: "kids.baby_care",
        label: "Soins & alimentation",
      },
    ],
  },
];

/* ===========================================================================
 * HELPERS
 * =========================================================================== */

/* Construit un index plat : id → { node, parent, top, depth }
 * (lazy via memoization au premier appel). */
type IndexedNode = {
  id: string;
  label: string;
  children?: TaxonomyNode[];
  /* Le top-level ancêtre (= la TopCategory). */
  top: TopCategory;
  /* Profondeur : 0 = top-level, 1/2/3 = sub-levels. */
  depth: number;
  /* Chemin complet d'IDs depuis le top (incluant l'ID courant). */
  path: string[];
};

let _index: Map<string, IndexedNode> | null = null;

function buildIndex(): Map<string, IndexedNode> {
  const map = new Map<string, IndexedNode>();
  for (const top of TAXONOMY) {
    walk(top, top, 0, [top.id], map);
  }
  return map;
}

function walk(
  node: TaxonomyNode,
  top: TopCategory,
  depth: number,
  path: string[],
  map: Map<string, IndexedNode>,
): void {
  map.set(node.id, {
    id: node.id,
    label: node.label,
    children: node.children,
    top,
    depth,
    path,
  });
  if (node.children) {
    for (const child of node.children) {
      walk(child, top, depth + 1, [...path, child.id], map);
    }
  }
}

function getIndex(): Map<string, IndexedNode> {
  if (!_index) _index = buildIndex();
  return _index;
}

/* Récupère une node depuis son id (ex: "fashion.women.dresses"). */
export function getCategoryById(id: string): IndexedNode | null {
  return getIndex().get(id) ?? null;
}

/* Récupère la TopCategory racine pour un category_path (utilisé pour
 * déterminer le ui_mode côté UI). */
export function getTopCategory(categoryPath: string[]): TopCategory | null {
  if (categoryPath.length === 0) return null;
  const node = getCategoryById(categoryPath[0]!);
  return node?.top ?? null;
}

/* Retourne le ui_mode pour un category_path donné (ou 'leboncoin' fallback). */
export function getUiMode(categoryPath: string[]): UiMode {
  return getTopCategory(categoryPath)?.ui_mode ?? "leboncoin";
}

/* Construit un breadcrumb depuis un category_path (ex: pour affichage
 * "Mode › Femme › Robes"). */
export function getBreadcrumb(categoryPath: string[]): Array<{
  id: string;
  label: string;
}> {
  const crumbs: Array<{ id: string; label: string }> = [];
  for (const id of categoryPath) {
    const node = getCategoryById(id);
    if (node) crumbs.push({ id: node.id, label: node.label });
  }
  return crumbs;
}

/* Liste des top-categories pour affichage en home page (avec icône). */
export function listTopCategories(): ReadonlyArray<TopCategory> {
  return TAXONOMY;
}

/* Recherche les enfants directs d'une node (ex: pour drill-down dans le
 * wizard de création d'annonce). */
export function getDirectChildren(id: string): TaxonomyNode[] {
  return getCategoryById(id)?.children ?? [];
}

/* Helper de migration : map les anciennes catégories FR (legacy) vers les
 * nouvelles top-categories. Utilisé pour backfill ou affichage transitoire. */
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  mode: "fashion",
  mobilier: "home",
  electronique: "tech",
  vehicules: "vehicles",
  livres: "hobbies.books",
  sport: "hobbies.sports",
  musique: "hobbies.music_instruments",
  enfants: "kids",
  jardinage: "home.garden",
  alimentation: "home.kitchen",
  artisanat: "hobbies.art_supplies",
  services: "services",
  autre: "home", // fallback
};

export function mapLegacyCategory(legacy: string): string | null {
  return LEGACY_CATEGORY_MAP[legacy] ?? null;
}
