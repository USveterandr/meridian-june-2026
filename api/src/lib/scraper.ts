import { MAX_IMAGE_BYTES, sniffImageType } from './imageValidation';
import { logger } from './logger';
import type { PriceDrop } from './priceDropAlerts';

export interface ScrapedProperty {
  title: string;
  description: string;
  propertyType: 'house' | 'apartment' | 'condo' | 'villa' | 'land' | 'commercial';
  listingType: 'sale' | 'rent';
  priceCents: number;
  currency: 'USD' | 'DOP';
  address: string;
  city: string;
  country: string;
  bedrooms: number;
  bathrooms: number;
  areaM2: number | null; // DB column allows NULL but rejects 0 (CHECK area_m2 IS NULL OR area_m2 > 0)
  lotM2: number | null;
  features: string[];
  /** Source photo URL, if the scraper captured one. Falls back to a placeholder when absent or unfetchable. */
  imageUrl?: string;
}

// Curated luxury real estate listings from the Dominican Republic
// All properties are $100,000 USD and above
export const CRAWLED_DR_PROPERTIES: ScrapedProperty[] = [
  // ─── PUNTA CANA ───────────────────────────────────────────────
  {
    title: 'Golf View Villa in Cocotal Country Club',
    description: 'Stunning 4-bedroom villa overlooking the championship golf course at Cocotal Country Club in Punta Cana. Features a private pool, extensive outdoor deck, open-plan living areas, and high ceilings. Owners enjoy access to the Meliá hotel beach club, sports courts, and club facilities.',
    propertyType: 'villa',
    listingType: 'sale',
    priceCents: 65000000, // $650k USD
    currency: 'USD',
    address: 'Cocotal Country Club',
    city: 'Punta Cana',
    country: 'DO',
    bedrooms: 4,
    bathrooms: 4,
    areaM2: 380,
    lotM2: 1000,
    features: ['Pool', 'Golf View', 'Gated Community', 'Beach Club Access'],
  },
  {
    title: 'Cap Cana Marina Waterfront Estate',
    description: 'World-class 5-bedroom marina estate in the exclusive enclaves of Cap Cana. Features a private dock for yachts up to 80 feet, custom marble work, infinity pool, wrap-around terraces, staff quarters, and smart home automation. Access to Juanillo Beach and Punta Espada Golf.',
    propertyType: 'villa',
    listingType: 'sale',
    priceCents: 390000000, // $3.9M USD
    currency: 'USD',
    address: 'Marina Enclave, Cap Cana',
    city: 'Cap Cana',
    country: 'DO',
    bedrooms: 5,
    bathrooms: 5.5,
    areaM2: 980,
    lotM2: 2200,
    features: ['Waterfront', 'Marina Dock', 'Pool', 'Infinity Pool', 'Gated Community', 'Smart Home'],
  },
  {
    title: 'Punta Cana Beachfront Condo with Ocean Views',
    description: 'Turnkey 2-bedroom beachfront condo at a prestigious resort community in Bávaro. Recently renovated with Italian tile, custom furniture, and a spectacular terrace overlooking the turquoise Caribbean. Full-service resort amenities including pools, restaurants, spa, tennis, and 24-hour security.',
    propertyType: 'condo',
    listingType: 'sale',
    priceCents: 18500000, // $185k USD
    currency: 'USD',
    address: 'Bávaro Beach',
    city: 'Punta Cana',
    country: 'DO',
    bedrooms: 2,
    bathrooms: 2,
    areaM2: 125,
    lotM2: null,
    features: ['Beachfront', 'Ocean View', 'Pool', 'Furnished', 'Gated Community'],
  },
  {
    title: 'Cap Cana Golf Apartment — Punta Espada Views',
    description: 'Beautiful 3-bedroom apartment nestled inside the gated enclave of Cap Cana, offering direct views over the Punta Espada Golf Course and the sea beyond. Contemporary finishes, an open kitchen, tiled terraces, and access to the Hacienda Beach Club make this an ideal second home or investment.',
    propertyType: 'apartment',
    listingType: 'sale',
    priceCents: 42000000, // $420k USD
    currency: 'USD',
    address: 'Cap Cana Golf Drive',
    city: 'Cap Cana',
    country: 'DO',
    bedrooms: 3,
    bathrooms: 3,
    areaM2: 230,
    lotM2: null,
    features: ['Golf View', 'Ocean View', 'Beach Club Access', 'Gated Community', 'Terrace'],
  },
  {
    title: 'Punta Cana Luxury Penthouse — Bávaro',
    description: 'Spectacular 4-bedroom penthouse in the heart of Bávaro with breathtaking panoramic views. This rooftop residence features an oversized private terrace with an outdoor kitchen and jacuzzi, double-height ceilings inside, and designer interiors throughout. Within walking distance of pristine beaches.',
    propertyType: 'condo',
    listingType: 'sale',
    priceCents: 75000000, // $750k USD
    currency: 'USD',
    address: 'Arena Blanca, Bávaro',
    city: 'Punta Cana',
    country: 'DO',
    bedrooms: 4,
    bathrooms: 4.5,
    areaM2: 420,
    lotM2: null,
    features: ['Penthouse', 'Ocean View', 'Jacuzzi', 'Terrace', 'Rooftop', 'Furnished'],
  },

  // ─── SANTO DOMINGO ────────────────────────────────────────────
  {
    title: 'Luxury Residence in Piantini Tower',
    description: 'Exclusive 2-bedroom luxury apartment located in the heart of Piantini, Santo Domingo. This upscale property offers marble floors, custom hardwood cabinetry, floor-to-ceiling glass windows, and a state-of-the-art kitchen. Building amenities include a panoramic rooftop infinity pool, gym, spa, and concierge.',
    propertyType: 'apartment',
    listingType: 'sale',
    priceCents: 24500000, // $245k USD
    currency: 'USD',
    address: 'Calle Andrés Julio Aybar, Piantini',
    city: 'Santo Domingo',
    country: 'DO',
    bedrooms: 2,
    bathrooms: 2.5,
    areaM2: 150,
    lotM2: null,
    features: ['City View', 'Pool', 'Rooftop Pool', 'Concierge', 'Gated Community', 'Fitness Center'],
  },
  {
    title: 'Naco Downtown Penthouse',
    description: 'Spacious 3-bedroom bi-level penthouse in Naco, Santo Domingo. This contemporary listing offers 350 m² of space, a private terrace with a wooden deck, hot tub, outdoor bar, and gorgeous city views. Fully secure building in a quiet residential street.',
    propertyType: 'apartment',
    listingType: 'sale',
    priceCents: 45000000, // $450k USD
    currency: 'USD',
    address: 'Naco Center',
    city: 'Santo Domingo',
    country: 'DO',
    bedrooms: 3,
    bathrooms: 4,
    areaM2: 350,
    lotM2: null,
    features: ['City View', 'Jacuzzi', 'Penthouse', 'Terrace', 'Private Bar'],
  },
  {
    title: 'Modern Ecohouse in La Romana',
    description: 'Award-winning eco-home in a lush hillside setting near La Romana. Built using sustainable materials and passive cooling architecture, this 3-bedroom residence delivers a serene lifestyle with cutting-edge design. Panoramic valley views, a solar-powered pool, and a private garden complete the picture.',
    propertyType: 'house',
    listingType: 'sale',
    priceCents: 30000000, // $300k USD
    currency: 'USD',
    address: 'Colinas del Río, La Romana',
    city: 'La Romana',
    country: 'DO',
    bedrooms: 3,
    bathrooms: 3,
    areaM2: 280,
    lotM2: 650,
    features: ['Pool', 'Eco-Friendly', 'Solar Power', 'Valley View', 'Garden'],
  },
  {
    title: 'Serralles Luxury Apartment with Mountain Views',
    description: 'Exquisite 4-bedroom apartment in the prestige neighborhood of Serralles, Santo Domingo. Floor-to-ceiling glass walls capture views of the National Botanical Garden. Fine Italian fittings, a Gaggenau kitchen, and access to an award-winning rooftop sky pool and lounge.',
    propertyType: 'apartment',
    listingType: 'sale',
    priceCents: 68000000, // $680k USD
    currency: 'USD',
    address: 'Calle José A. Brea Peña, Serrallés',
    city: 'Santo Domingo',
    country: 'DO',
    bedrooms: 4,
    bathrooms: 4,
    areaM2: 340,
    lotM2: null,
    features: ['Sky Pool', 'Rooftop Lounge', 'Concierge', 'City View', 'Gated Community', 'Fitness Center'],
  },
  {
    title: 'Mirador Sur Colonial Townhouse',
    description: 'Meticulously restored 5-bedroom colonial townhouse in the desirable Mirador Sur residential area. Blending heritage architecture with modern comforts, the property features original terracotta floors, handcrafted ironwork, a shaded courtyard pool, and a wine cellar.',
    propertyType: 'house',
    listingType: 'sale',
    priceCents: 55000000, // $550k USD
    currency: 'USD',
    address: 'Av. Luperón, Mirador Sur',
    city: 'Santo Domingo',
    country: 'DO',
    bedrooms: 5,
    bathrooms: 5,
    areaM2: 520,
    lotM2: 700,
    features: ['Pool', 'Courtyard', 'Wine Cellar', 'Historic Architecture', 'Garden'],
  },

  // ─── LAS TERRENAS ─────────────────────────────────────────────
  {
    title: 'Modern Beachfront Condo at Playa Bonita',
    description: 'Beautiful contemporary 3-bedroom condo located directly on the golden sands of Playa Bonita in Las Terrenas. Features an open-concept kitchen, spacious terrace with ocean views, high-end Italian finishes, and access to a resort-style infinity pool and 24/7 security. Excellent vacation rental history.',
    propertyType: 'condo',
    listingType: 'sale',
    priceCents: 32000000, // $320k USD
    currency: 'USD',
    address: 'Playa Bonita Residences',
    city: 'Las Terrenas',
    country: 'DO',
    bedrooms: 3,
    bathrooms: 3,
    areaM2: 185,
    lotM2: null,
    features: ['Beachfront', 'Pool', 'Ocean View', 'Gated Community', 'Furnished'],
  },
  {
    title: 'Oceanview Hillside Estate in Cosón',
    description: 'Spectacular luxury estate perched on the hills of Cosón, Las Terrenas. Offers breathtaking 180-degree ocean views, a massive infinity-edge pool, multiple covered terraces, professional chef kitchen, and guest bungalow. Fully private and surrounded by lush tropical nature.',
    propertyType: 'villa',
    listingType: 'sale',
    priceCents: 125000000, // $1.25M USD
    currency: 'USD',
    address: 'Cosón Hills',
    city: 'Las Terrenas',
    country: 'DO',
    bedrooms: 5,
    bathrooms: 6,
    areaM2: 650,
    lotM2: 3200,
    features: ['Ocean View', 'Pool', 'Infinity Pool', 'Guest House', 'Private Estate'],
  },
  {
    title: 'Las Terrenas Boutique Villa — Walk to Beach',
    description: 'Charming 3-bedroom boutique villa just 200 meters from the famous Playa Las Terrenas. Surrounded by lush tropical landscaping, this Mediterranean-style property features a wraparound veranda, private pool with sun deck, an outdoor kitchen, and a dedicated staff room.',
    propertyType: 'villa',
    listingType: 'sale',
    priceCents: 48000000, // $480k USD
    currency: 'USD',
    address: 'Barrio La Punta',
    city: 'Las Terrenas',
    country: 'DO',
    bedrooms: 3,
    bathrooms: 3,
    areaM2: 260,
    lotM2: 800,
    features: ['Pool', 'Beach Access', 'Outdoor Kitchen', 'Tropical Garden', 'Veranda'],
  },
  {
    title: 'Las Terrenas Beachfront Land — Development Opportunity',
    description: 'Prime 4,200 m² beachfront land plot on Las Terrenas\'s most sought-after stretch. Fully titled, flat terrain with municipal utilities available at the boundary. Ideal for a boutique hotel, luxury villa development, or private compound. Seller financing available.',
    propertyType: 'land',
    listingType: 'sale',
    priceCents: 85000000, // $850k USD
    currency: 'USD',
    address: 'Playa Cosón',
    city: 'Las Terrenas',
    country: 'DO',
    bedrooms: 0,
    bathrooms: 0,
    areaM2: 4200,
    lotM2: 4200,
    features: ['Beachfront', 'Titled Land', 'Development Opportunity', 'Flat Terrain'],
  },

  // ─── CABARETE ─────────────────────────────────────────────────
  {
    title: 'Cabarete Beachfront Penthouse',
    description: 'Stunning 3-bedroom penthouse with panoramic ocean views situated on the famous Cabarete kite beach. The property boasts high wood-beam ceilings, a private rooftop jacuzzi terrace, gourmet kitchen, and floor-to-ceiling glass doors. Steps from world-class water sports and beach dining.',
    propertyType: 'condo',
    listingType: 'sale',
    priceCents: 58000000, // $580k USD
    currency: 'USD',
    address: 'Kite Beach Road',
    city: 'Cabarete',
    country: 'DO',
    bedrooms: 3,
    bathrooms: 3.5,
    areaM2: 260,
    lotM2: null,
    features: ['Beachfront', 'Ocean View', 'Jacuzzi', 'Penthouse', 'Gated Community'],
  },
  {
    title: 'Cabarete Jungle Eco-Villa',
    description: 'Unique 4-bedroom eco-villa seamlessly woven into the tropical jungle above Cabarete Bay. Open-air architecture with views of the ocean and mountains, natural swimming hole fed by a freshwater spring, solar and rain-collection systems, and an organic fruit garden.',
    propertyType: 'villa',
    listingType: 'sale',
    priceCents: 11500000, // $115k USD
    currency: 'USD',
    address: 'Loma del Viento, Cabarete',
    city: 'Cabarete',
    country: 'DO',
    bedrooms: 4,
    bathrooms: 3,
    areaM2: 320,
    lotM2: 2500,
    features: ['Ocean View', 'Eco-Friendly', 'Solar Power', 'Spring Water', 'Garden'],
  },
  {
    title: 'Luxury Beach Club Condo — Cabarete',
    description: 'Chic 2-bedroom condo within an exclusive beachfront club community in Cabarete. Designer interiors blend driftwood accents with modern amenities. Residents enjoy a beach club, multiple pools, kite storage, dive shop, and a farm-to-table restaurant — all on the property.',
    propertyType: 'condo',
    listingType: 'sale',
    priceCents: 22000000, // $220k USD
    currency: 'USD',
    address: 'Club Cabarete Beach',
    city: 'Cabarete',
    country: 'DO',
    bedrooms: 2,
    bathrooms: 2,
    areaM2: 140,
    lotM2: null,
    features: ['Beachfront', 'Beach Club Access', 'Pool', 'Ocean View', 'Furnished'],
  },

  // ─── SANTIAGO ─────────────────────────────────────────────────
  {
    title: 'Luxury Residence in Cerros de Gurabo',
    description: 'Charming 4-bedroom family residence located in the prestigious Cerros de Gurabo neighborhood in Santiago. The villa features solid mahogany woodwork, marble bathrooms, a pool, a gazebo for barbecues, and beautiful manicured gardens. Outstanding security.',
    propertyType: 'house',
    listingType: 'sale',
    priceCents: 35000000, // $350k USD
    currency: 'USD',
    address: 'Cerros de Gurabo',
    city: 'Santiago',
    country: 'DO',
    bedrooms: 4,
    bathrooms: 4.5,
    areaM2: 450,
    lotM2: 850,
    features: ['Pool', 'Gazebo', 'Gated Community', 'Mahogany Woods', 'Garden'],
  },
  {
    title: 'Santiago Modern Smart Home — Los Jardines',
    description: 'Architecturally striking 4-bedroom contemporary home in the gated enclave of Los Jardines del Norte, Santiago. Dual-volume living spaces, an integrated Crestron smart-home system, a heated lap pool with waterfall, home cinema room, and a rooftop deck with panoramic city views.',
    propertyType: 'house',
    listingType: 'sale',
    priceCents: 52000000, // $520k USD
    currency: 'USD',
    address: 'Los Jardines del Norte',
    city: 'Santiago',
    country: 'DO',
    bedrooms: 4,
    bathrooms: 4,
    areaM2: 480,
    lotM2: 700,
    features: ['Pool', 'Smart Home', 'Home Cinema', 'City View', 'Gated Community', 'Rooftop Deck'],
  },
  {
    title: 'Santiago Upscale Apartment — Bella Vista',
    description: 'Well-appointed 2-bedroom apartment in the coveted Bella Vista residential neighborhood of Santiago. Marble finishes, a well-equipped eat-in kitchen, a spacious balcony with mountain views, and access to a rooftop pool and fitness center.',
    propertyType: 'apartment',
    listingType: 'sale',
    priceCents: 12500000, // $125k USD
    currency: 'USD',
    address: 'Bella Vista, Santiago',
    city: 'Santiago',
    country: 'DO',
    bedrooms: 2,
    bathrooms: 2,
    areaM2: 110,
    lotM2: null,
    features: ['Pool', 'Mountain View', 'Fitness Center', 'Balcony', 'Gated Community'],
  },

  // ─── JARABACOA / MOUNTAIN ──────────────────────────────────────
  {
    title: 'Jarabacoa River Estate with Waterfall',
    description: 'Extraordinary 5-bedroom estate bordering the pristine Jimenoa River in the mountains of Jarabacoa. Natural swimming holes, a private cascading waterfall, horse stables, a coffee grove, and a large pool make this a truly unique highland sanctuary.',
    propertyType: 'house',
    listingType: 'sale',
    priceCents: 27500000, // $275k USD
    currency: 'USD',
    address: 'Carretera Constanza, Jarabacoa',
    city: 'Jarabacoa',
    country: 'DO',
    bedrooms: 5,
    bathrooms: 4,
    areaM2: 550,
    lotM2: 12000,
    features: ['River View', 'Waterfall', 'Pool', 'Stables', 'Coffee Farm', 'Mountain View'],
  },
  {
    title: 'Constanza Mountain Retreat',
    description: 'Rustic-luxury 3-bedroom mountain cabin retreat in the cloud-forest highlands of Constanza. Exposed pine beams, stone fireplaces, handmade furniture, and floor-to-ceiling windows frame views of lush strawberry and flower farms. Ideal for a boutique tourism or wellness project.',
    propertyType: 'house',
    listingType: 'sale',
    priceCents: 10500000, // $105k USD
    currency: 'USD',
    address: 'Valle Nuevo, Constanza',
    city: 'Constanza',
    country: 'DO',
    bedrooms: 3,
    bathrooms: 2,
    areaM2: 180,
    lotM2: 3500,
    features: ['Mountain View', 'Fireplace', 'Farm Land', 'Private', 'Cloud Forest'],
  },

  // ─── SAMANÁ ───────────────────────────────────────────────────
  {
    title: 'Samaná Bay Panoramic Villa',
    description: 'Dramatic 4-bedroom hilltop villa offering jaw-dropping views of Samaná Bay and the surrounding jungle canopy. An infinity pool seems to merge with the bay below. Artisan stone walls, a wine room, a full outdoor kitchen, and al-fresco dining terraces create a world apart.',
    propertyType: 'villa',
    listingType: 'sale',
    priceCents: 79000000, // $790k USD
    currency: 'USD',
    address: 'Loma Cayacoa, Samaná',
    city: 'Samaná',
    country: 'DO',
    bedrooms: 4,
    bathrooms: 4,
    areaM2: 420,
    lotM2: 2800,
    features: ['Bay View', 'Infinity Pool', 'Wine Room', 'Outdoor Kitchen', 'Jungle View'],
  },
  {
    title: 'Las Galeras Beachfront Bungalow',
    description: 'Secluded 3-bedroom beachfront bungalow at the unspoiled fishing village of Las Galeras on the Samaná Peninsula. Soft Caribbean pine floors, vaulted ceilings, a tropical garden, a hammock veranda steps from the water, and stunning views of Playa Rincón.',
    propertyType: 'house',
    listingType: 'sale',
    priceCents: 14500000, // $145k USD
    currency: 'USD',
    address: 'Playa Las Galeras',
    city: 'Samaná',
    country: 'DO',
    bedrooms: 3,
    bathrooms: 2,
    areaM2: 160,
    lotM2: 600,
    features: ['Beachfront', 'Ocean View', 'Garden', 'Veranda', 'Secluded'],
  },

  // ─── LA ROMANA / CASA DE CAMPO ────────────────────────────────
  {
    title: 'Casa de Campo Golf & Beach Villa',
    description: 'Grand 5-bedroom villa inside the legendary Casa de Campo resort community. A stunning colonial façade opens to soaring archways, hand-painted tiles, and a large terrace pool overlooking the Teeth of the Dog golf course. Members enjoy access to 18 polo fields, three golf courses, a beach, a marina, and a shooting range.',
    propertyType: 'villa',
    listingType: 'sale',
    priceCents: 380000000, // $3.8M USD
    currency: 'USD',
    address: 'Casa de Campo Resort',
    city: 'La Romana',
    country: 'DO',
    bedrooms: 5,
    bathrooms: 5,
    areaM2: 780,
    lotM2: 1800,
    features: ['Golf View', 'Beach Club Access', 'Pool', 'Marina Access', 'Gated Community', 'Tennis'],
  },
  {
    title: 'La Romana Modern Townhouse',
    description: 'Brand-new 3-bedroom contemporary townhouse in a gated community near La Romana city center. Clean-line architecture, an open kitchen flowing to a private pool and BBQ deck, rooftop terrace, and covered parking for two vehicles. Close to international schools and the Port of La Romana.',
    propertyType: 'house',
    listingType: 'sale',
    priceCents: 19800000, // $198k USD
    currency: 'USD',
    address: 'Urbanización Costa del Sol, La Romana',
    city: 'La Romana',
    country: 'DO',
    bedrooms: 3,
    bathrooms: 3,
    areaM2: 210,
    lotM2: 300,
    features: ['Pool', 'Rooftop Terrace', 'BBQ Deck', 'Gated Community', 'New Construction'],
  },

  // ─── RENTALS ──────────────────────────────────────────────────
  {
    title: 'Piantini Executive Apartment for Rent',
    description: 'Fully-furnished executive 2-bedroom apartment for long-term lease in the prestigious Piantini district of Santo Domingo. High-end appliances, a dedicated home office room, fiber internet, central air, and access to a rooftop pool and gym. Ideal for corporate relocation.',
    propertyType: 'apartment',
    listingType: 'rent',
    priceCents: 300000, // $3,000/month USD
    currency: 'USD',
    address: 'Calle Rafael Augusto Sánchez, Piantini',
    city: 'Santo Domingo',
    country: 'DO',
    bedrooms: 2,
    bathrooms: 2,
    areaM2: 120,
    lotM2: null,
    features: ['Furnished', 'Pool', 'Gym', 'City View', 'Fiber Internet', 'Gated Community'],
  },
  {
    title: 'Bávaro Vacation Villa for Rent',
    description: 'Gorgeous fully-furnished 4-bedroom villa for short-term and vacation rental in Bávaro, Punta Cana. Private pool, lush tropical garden, golf-cart access to the beach, open-plan kitchen with island, outdoor dining, and weekly housekeeping included.',
    propertyType: 'villa',
    listingType: 'rent',
    priceCents: 700000, // $7,000/month USD
    currency: 'USD',
    address: 'Los Corales, Bávaro',
    city: 'Punta Cana',
    country: 'DO',
    bedrooms: 4,
    bathrooms: 4,
    areaM2: 350,
    lotM2: 600,
    features: ['Pool', 'Furnished', 'Beach Access', 'Garden', 'Housekeeping'],
  },
  {
    title: 'Naco Modern Apartment — Monthly Rental',
    description: 'Bright and beautifully furnished 2-bedroom apartment in the Naco neighborhood of Santo Domingo available for flexible monthly rental. Open living room with a balcony, modern kitchen, in-unit laundry, building gym, sauna, and rooftop BBQ area.',
    propertyType: 'apartment',
    listingType: 'rent',
    priceCents: 175000, // $1,750/month USD
    currency: 'USD',
    address: 'Naco, Santo Domingo',
    city: 'Santo Domingo',
    country: 'DO',
    bedrooms: 2,
    bathrooms: 2,
    areaM2: 95,
    lotM2: null,
    features: ['Furnished', 'Gym', 'Sauna', 'Balcony', 'Laundry'],
  },
  {
    title: 'Santiago Commercial Office Space for Rent',
    description: 'Premium Class-A commercial office floor in Bulevar 27 de Febrero, Santiago. 650 m² of open-plan space with private meeting rooms, fiber-optic infrastructure, backup generator, central HVAC, and 20 covered parking slots. Available for full-floor or partial leases.',
    propertyType: 'commercial',
    listingType: 'rent',
    priceCents: 900000, // $9,000/month USD
    currency: 'USD',
    address: 'Bulevar 27 de Febrero, Santiago',
    city: 'Santiago',
    country: 'DO',
    bedrooms: 0,
    bathrooms: 2,
    areaM2: 650,
    lotM2: null,
    features: ['Office Space', 'Fiber Internet', 'Backup Generator', 'Parking', 'HVAC', 'Meeting Rooms'],
  },

  // ─── PUERTO PLATA ─────────────────────────────────────────────
  {
    title: 'Puerto Plata Oceanfront Condo',
    description: 'Beautiful 2-bedroom oceanfront condo in the historic port city of Puerto Plata on the Dominican Republic\'s North Coast. Features floor-to-ceiling glass walls capturing Atlantic Ocean views, a tiled terrace, and access to a beachfront pool and beach club.',
    propertyType: 'condo',
    listingType: 'sale',
    priceCents: 15800000, // $158k USD
    currency: 'USD',
    address: 'Costa Dorada Beach Resort',
    city: 'Puerto Plata',
    country: 'DO',
    bedrooms: 2,
    bathrooms: 2,
    areaM2: 115,
    lotM2: null,
    features: ['Beachfront', 'Ocean View', 'Beach Club Access', 'Pool', 'Furnished'],
  },
  {
    title: 'Puerto Plata Victorian Mansion — Restored',
    description: 'A rare opportunity to own a fully-restored 6-bedroom Victorian mansion in the National Heritage Zone of Puerto Plata. Original gingerbread woodwork, wrap-around verandas, stained-glass accents, and a lush courtyard garden. Currently operating as a boutique B&B.',
    propertyType: 'commercial',
    listingType: 'sale',
    priceCents: 40000000, // $400k USD
    currency: 'USD',
    address: 'Calle Separación, Centro Histórico',
    city: 'Puerto Plata',
    country: 'DO',
    bedrooms: 6,
    bathrooms: 6,
    areaM2: 680,
    lotM2: 900,
    features: ['Historic Architecture', 'Courtyard', 'Investment Property', 'B&B', 'Garden'],
  },
];

// Branded "no photo available" placeholder (the interlocking-rings mark on
// the dark brand background) — used whenever a scraper has no source photo,
// or the source photo can't be fetched/validated. This is a real, complete
// PNG (unlike the old 12-byte magic-bytes-only stub this replaced, which
// rendered as a broken image in every browser).
const PLACEHOLDER_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAIAAAABgBAMAAAAnVGd6AAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAtUExURQwPEjIsGzMwI1JHKIR3TqmVWe3Lb/XbjtezUm5cKqmHNJB2M8ebNVNJK6V/Kiojj3EAAAABYktHRACIBR1IAAAAB3RJTUUH6gYUDiETKY/eGwAAAtRJREFUWMPtlc9L22AYx9+2ExrKIIkwWN0hVqYyPGQLOG09jIEbu4lzyNhtTtt5nSX1PCi19dDhZJv2YCmIy4IowlDrRU/aFv+GHQfzj9i7pkm+b/rG3SUfRPLhfZ7nfd4fTQgJCAgICAi42YQGNO2R+F/xo3cyresLC5mZh9eK7+zruv7qxdr458l85rXkK75dhGf1GcV6lDfyaUfCjKznS4pffu4pFlsUuULunpf4PTzPqSBZbWeFK4REzld4+ff1MspLLVmoOjLgiFWh2p0f0adR3tTr9eNVtUss+lA6fFnqlq8fu6QDI21u609Qyp1W6UQCio1Q8LYwhA08ztUtzs884rZwxuaH0lMo05pFqsgKtFBkC/TkULLO404Z5BCOiY6wK/iAK1iWE4mERP+kidOhZVmSpYQsSf2VUwgaOWUKzE6hlAyb4yaI0YSgWAnzw7rKl0hLV0VHGiJEoRABt0DIgvxGucKzM1F68BB7st9ctlHMPQiroERxD6NLkPMTC5xsQdjEL5A7cyhvQQZR4lhgZMsvjJFRLP0Af4Txqm+BRffgjG0Uw7cAu4Q5ifLvGlFG30suSez6Hkp0zk8GUUZw35hNvPUOj3FeczlEOSnjMaII8yiZuovJiAphzK0K5VUUxX02GBEJXwh5tsUX4QIkdoF9otC9wnfccMlp+rg6iOJ3irQ4bkIs42ybUWYEgpgNpeT3UOzByK5H3BVcsvlkeIURuX1x+pNVjzgkvZ+WSKGM0rTeR4YK0lAgwlA8BcgYtjBmva82al1iN1Dz5tOJ8ONX2Kf/+6xpbBHd8b5LsasAieP3Lr5K3x9X+xxpl0RxqRShQqVgmDWu0Et4UuPlk9Bh8RMEtZoiyA+3596r7yLhV6isHnWGQinTbB0pfPHLp6RajT9rmja+aTYOqLR85BrCm2aLstuez5YDxTtyLfS7KKH080cCAgICAgJuKH8BzDCFfXRQiOMAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDYtMjBUMTQ6MzM6MDArMDA6MDAY7vFEAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA2LTIwVDE0OjMzOjAwKzAwOjAwabNJ+AAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wNi0yMFQxNDozMzoxOSswMDowMGeULWoAAAAASUVORK5CYII=';

function decodePlaceholder(): Uint8Array {
  const raw = atob(PLACEHOLDER_PNG_BASE64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Fetches a scraper-supplied photo URL and validates it's a real image. Returns null on any failure — caller falls back to the placeholder. */
async function fetchExternalImage(
  url: string
): Promise<{ bytes: Uint8Array; ext: 'jpg' | 'png' | 'webp'; contentType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_IMAGE_BYTES) return null;
    const bytes = new Uint8Array(buf);
    const sniffed = sniffImageType(bytes);
    if (!sniffed) return null;
    return { bytes, ...sniffed };
  } catch {
    return null;
  }
}

export async function importListings(
  db: any,
  assets: any,
  minPriceUSD: number,
  ownerId: number
): Promise<number> {
  const minPriceCents = minPriceUSD * 100;
  const items = CRAWLED_DR_PROPERTIES.filter((item) => item.priceCents >= minPriceCents);
  const result = await importScrapedProperties(db, assets, items, ownerId);
  return result.imported;
}


export interface ImportResult {
  imported: number;
  priceDrops: PriceDrop[];
}

/** Inserts a list of already-normalized properties, skipping duplicates by title. A failure on one item (e.g. its photo can't be uploaded) is logged and skipped rather than aborting the rest of the batch. */
export async function importScrapedProperties(
  db: any,
  assets: any,
  items: ScrapedProperty[],
  ownerId: number
): Promise<ImportResult> {
  let count = 0;
  const priceDrops: PriceDrop[] = [];

  for (const item of items) {
    try {
      // 1. Check if already exists (prevent duplicate imports)
      const existing = (await db
        .prepare('SELECT id, price_cents, currency FROM properties WHERE title = ?')
        .bind(item.title)
        .first()) as { id: number; price_cents: number; currency: string } | null;

      if (existing) {
        // Detect price drop and update price in DB
        if (item.priceCents < existing.price_cents) {
          await db
            .prepare(`UPDATE properties SET price_cents = ?, updated_at = datetime('now') WHERE id = ?`)
            .bind(item.priceCents, existing.id)
            .run();
          priceDrops.push({
            propertyId: existing.id,
            title: item.title,
            city: item.city,
            oldPriceCents: existing.price_cents,
            newPriceCents: item.priceCents,
            currency: item.currency,
          });
        }
        continue;
      }

      // 2. Insert property listing
      const inserted = await db
        .prepare(
          `INSERT INTO properties
             (owner_id, title, description, property_type, listing_type, price_cents, currency,
              address, city, country, bedrooms, bathrooms, area_m2, lot_m2, features, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active') RETURNING id`
        )
        .bind(
          ownerId,
          item.title,
          item.description,
          item.propertyType,
          item.listingType,
          item.priceCents,
          item.currency,
          item.address,
          item.city,
          item.country,
          item.bedrooms,
          item.bathrooms,
          item.areaM2,
          item.lotM2,
          JSON.stringify(item.features)
        )
        .first() as unknown as { id: number } | null;

      if (!inserted?.id) continue;

      // 3. Fetch the real source photo if we have one; fall back to the
      // branded placeholder if there isn't one or it can't be fetched.
      const fetched = item.imageUrl ? await fetchExternalImage(item.imageUrl) : null;
      const ext = fetched?.ext ?? 'png';
      const contentType = fetched?.contentType ?? 'image/png';
      const bytes = fetched?.bytes ?? decodePlaceholder();

      const r2Key = `properties/${inserted.id}/${crypto.randomUUID()}.${ext}`;
      await assets.put(r2Key, bytes, { httpMetadata: { contentType } });

      // 4. Insert image record in D1
      await db
        .prepare(
          'INSERT INTO property_images (property_id, r2_key, content_type, position) VALUES (?, ?, ?, 0)'
        )
        .bind(inserted.id, r2Key, contentType)
        .run();

      count++;
    } catch (err) {
      logger.error('Failed to import scraped property', { error: err, title: item.title });
    }
  }

  return { imported: count, priceDrops };
}