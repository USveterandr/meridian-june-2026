import { useLang, type Lang } from '../i18n';
import { useSEO } from '../seo';

interface Section { heading: string; body: string[]; list?: string[] }
interface Content { eyebrow: string; title: string; updated: string; intro: string[]; sections: Section[] }

const CONTENT: Record<Lang, Content> = {
  en: {
    eyebrow: 'Legal',
    title: 'Terms of Service',
    updated: 'Last updated: June 14, 2026',
    intro: [
      'These Terms of Service ("Terms") govern your access to and use of Meridian, a real estate listing and investment platform for the Dominican Republic, including our website, mobile applications, and related services (collectively, the "Service"), operated by Meridian Real Estate ("Meridian", "we", "us", or "our").',
      'By creating an account or using the Service, you agree to these Terms. If you do not agree, please do not use the Service.',
    ],
    sections: [
      {
        heading: '1. Eligibility & Accounts',
        body: [
          'You must be at least 18 years old and able to form a binding contract to use the Service. When you register, you agree to provide accurate, current information and to keep your password secure. You are responsible for all activity that occurs under your account.',
          'Meridian supports multiple account roles, including buyer, renter, investor, seller, landlord, broker, lawyer, notary, and administrator. Each role may have different permissions and is subject to these Terms.',
        ],
      },
      {
        heading: '2. The Service',
        body: [
          'Meridian provides tools to browse, list, search, and inquire about real estate, along with messaging, favorites, analytics, and subscription plans for sellers, landlords, and brokerages.',
          'Meridian is a technology platform. We are not a licensed real estate broker, escrow agent, attorney, or notary, and we are not a party to any transaction between users. Any sale, rental, reservation, or investment arrangement is solely between the users involved, who remain responsible for verifying property details, ownership, legal status, and for obtaining independent legal, tax, and financial advice (including from a licensed attorney or notary in the Dominican Republic) before entering into any agreement.',
        ],
      },
      {
        heading: '3. Listings & User Content',
        body: [
          'If you create a property listing, message, profile, photo, or other content ("User Content"), you confirm that you have the right to share it and that it is accurate and not misleading.',
          'Uploaded images must be genuine photo files; we automatically reject SVG, HTML, and other non-image uploads for security reasons. You retain ownership of your User Content, but you grant Meridian a worldwide, non-exclusive, royalty-free license to host, display, reproduce, and distribute it as needed to operate and promote the Service.',
          'We may remove or restrict any listing or content that we reasonably believe violates these Terms, applicable law, or the rights of others.',
        ],
      },
      {
        heading: '4. Subscriptions, Trials & Billing',
        body: [
          'Some features (such as additional listings, team seats, advanced maps, analytics, or priority support) require a paid subscription plan. Current plans, prices, and features are described on our Pricing page and may change from time to time.',
          'Where a free trial is offered, it will convert to a paid subscription at the end of the trial unless you cancel before the trial ends. Subscriptions renew automatically for successive billing periods (monthly or annual, as selected) until cancelled. You can cancel anytime from your account settings; cancellation takes effect at the end of the current billing period, and we do not provide refunds for partial periods except where required by law.',
          'Payments are processed by third-party payment providers (such as Stripe). Meridian does not store your full payment card details.',
          'Where a plan references commission protection or a reduced commission percentage, this describes the fee structure applicable to transactions you choose to run through Meridian and does not guarantee any sale or outcome.',
        ],
      },
      {
        heading: '5. Acceptable Use',
        body: ['You agree not to:'],
        list: [
          'Post false, fraudulent, or misleading listings, prices, or property information',
          'Impersonate any person or misrepresent your affiliation with any person or entity',
          'Use the Service to harass, defraud, or discriminate against any person',
          'Attempt to bypass rate limits, security controls, or access another user\'s account or data',
          'Scrape, copy, or republish substantial portions of the Service without our written permission',
          'Upload malicious files, viruses, or content that infringes the intellectual property or privacy rights of others',
        ],
      },
      {
        heading: '6. Intellectual Property',
        body: [
          'The Service, including its design, logos, text, and software, is owned by Meridian or its licensors and is protected by intellectual property laws. Except for your own User Content, you may not copy, modify, distribute, or create derivative works from the Service without our prior written consent.',
        ],
      },
      {
        heading: '7. Third-Party Services',
        body: [
          'The Service integrates with third-party services such as Google Maps (for property locations), Stripe (for payments), and WhatsApp (for messaging links). Your use of those services is subject to their own terms and privacy policies, and Meridian is not responsible for their availability or content.',
        ],
      },
      {
        heading: '8. Disclaimers',
        body: [
          'The Service is provided "as is" and "as available," without warranties of any kind, whether express or implied. We do not guarantee that listings are accurate, complete, current, or that any property is legally available for sale or rent. We do not guarantee uninterrupted, secure, or error-free operation of the Service.',
        ],
      },
      {
        heading: '9. Limitation of Liability',
        body: [
          'To the maximum extent permitted by law, Meridian and its officers, employees, and partners will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or goodwill, arising from your use of the Service or any transaction between users, even if we have been advised of the possibility of such damages.',
        ],
      },
      {
        heading: '10. Termination',
        body: [
          'You may stop using the Service and close your account at any time. We may suspend or terminate your access if you violate these Terms, create risk or legal exposure for Meridian, or if required by law. Provisions that by their nature should survive termination (such as intellectual property, disclaimers, and limitation of liability) will continue to apply.',
        ],
      },
      {
        heading: '11. Governing Law',
        body: [
          'These Terms are governed by the laws of the Dominican Republic, without regard to conflict-of-law principles, except where mandatory local consumer-protection laws of your country of residence provide otherwise.',
        ],
      },
      {
        heading: '12. Changes to These Terms',
        body: [
          'We may update these Terms from time to time. If we make material changes, we will update the "Last updated" date above and, where appropriate, notify you through the Service or by email. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.',
        ],
      },
      {
        heading: '13. Contact Us',
        body: [
          'If you have questions about these Terms, contact us at info@investwithmeridian.com.',
        ],
      },
    ],
  },
  es: {
    eyebrow: 'Legal',
    title: 'Términos de Servicio',
    updated: 'Última actualización: 14 de junio de 2026',
    intro: [
      'Estos Términos de Servicio ("Términos") rigen tu acceso y uso de Meridian, una plataforma de listados inmobiliarios e inversión para la República Dominicana, incluyendo nuestro sitio web, aplicaciones móviles y servicios relacionados (colectivamente, el "Servicio"), operado por Meridian Real Estate ("Meridian", "nosotros" o "nuestro").',
      'Al crear una cuenta o usar el Servicio, aceptas estos Términos. Si no estás de acuerdo, por favor no uses el Servicio.',
    ],
    sections: [
      {
        heading: '1. Elegibilidad y Cuentas',
        body: [
          'Debes tener al menos 18 años y capacidad para celebrar contratos vinculantes para usar el Servicio. Al registrarte, aceptas proporcionar información precisa y actualizada, y mantener tu contraseña segura. Eres responsable de toda actividad realizada bajo tu cuenta.',
          'Meridian admite múltiples roles de cuenta, incluyendo comprador, inquilino, inversionista, vendedor, propietario, broker, abogado, notario y administrador. Cada rol puede tener permisos diferentes y está sujeto a estos Términos.',
        ],
      },
      {
        heading: '2. El Servicio',
        body: [
          'Meridian proporciona herramientas para explorar, publicar, buscar y consultar propiedades inmobiliarias, junto con mensajería, favoritos, analítica y planes de suscripción para vendedores, propietarios y brokerages.',
          'Meridian es una plataforma tecnológica. No somos un agente inmobiliario licenciado, agente de fideicomiso (escrow), abogado ni notario, y no somos parte de ninguna transacción entre usuarios. Cualquier venta, alquiler, reserva o acuerdo de inversión es exclusivamente entre los usuarios involucrados, quienes son responsables de verificar los detalles, la titularidad y el estatus legal de la propiedad, y de obtener asesoría legal, fiscal y financiera independiente (incluyendo de un abogado o notario licenciado en la República Dominicana) antes de celebrar cualquier acuerdo.',
        ],
      },
      {
        heading: '3. Listados y Contenido del Usuario',
        body: [
          'Si creas un listado de propiedad, mensaje, perfil, foto u otro contenido ("Contenido del Usuario"), confirmas que tienes el derecho de compartirlo y que es preciso y no engañoso.',
          'Las imágenes cargadas deben ser archivos de foto genuinos; rechazamos automáticamente archivos SVG, HTML y otros formatos que no sean imágenes por razones de seguridad. Conservas la propiedad de tu Contenido del Usuario, pero otorgas a Meridian una licencia mundial, no exclusiva y libre de regalías para alojarlo, mostrarlo, reproducirlo y distribuirlo según sea necesario para operar y promocionar el Servicio.',
          'Podemos eliminar o restringir cualquier listado o contenido que razonablemente creamos que viola estos Términos, la ley aplicable o los derechos de terceros.',
        ],
      },
      {
        heading: '4. Suscripciones, Pruebas y Facturación',
        body: [
          'Algunas funciones (como listados adicionales, cuentas de equipo, mapas avanzados, analítica o soporte prioritario) requieren un plan de suscripción de pago. Los planes, precios y características actuales se describen en nuestra página de Precios y pueden cambiar de vez en cuando.',
          'Cuando se ofrece una prueba gratuita, esta se convertirá en una suscripción de pago al finalizar el período de prueba, a menos que canceles antes de que termine. Las suscripciones se renuevan automáticamente por períodos sucesivos (mensual o anual, según lo seleccionado) hasta que se cancelen. Puedes cancelar en cualquier momento desde la configuración de tu cuenta; la cancelación entra en vigor al final del período de facturación actual, y no ofrecemos reembolsos por períodos parciales salvo cuando la ley lo exija.',
          'Los pagos son procesados por proveedores de pago externos (como Stripe). Meridian no almacena los datos completos de tu tarjeta de pago.',
          'Cuando un plan haga referencia a "protección de comisión" o a un porcentaje de comisión reducido, esto describe la estructura de tarifas aplicable a las transacciones que decidas realizar a través de Meridian, y no garantiza ninguna venta ni resultado.',
        ],
      },
      {
        heading: '5. Uso Aceptable',
        body: ['Te comprometes a no:'],
        list: [
          'Publicar listados, precios o información de propiedades falsos, fraudulentos o engañosos',
          'Suplantar a cualquier persona o tergiversar tu afiliación con cualquier persona o entidad',
          'Usar el Servicio para acosar, defraudar o discriminar a cualquier persona',
          'Intentar eludir límites de tasa, controles de seguridad, o acceder a la cuenta o datos de otro usuario',
          'Extraer (scraping), copiar o republicar partes sustanciales del Servicio sin nuestro permiso por escrito',
          'Cargar archivos maliciosos, virus o contenido que infrinja los derechos de propiedad intelectual o privacidad de terceros',
        ],
      },
      {
        heading: '6. Propiedad Intelectual',
        body: [
          'El Servicio, incluyendo su diseño, logos, texto y software, es propiedad de Meridian o de sus licenciantes y está protegido por leyes de propiedad intelectual. Salvo por tu propio Contenido del Usuario, no puedes copiar, modificar, distribuir ni crear trabajos derivados del Servicio sin nuestro consentimiento previo por escrito.',
        ],
      },
      {
        heading: '7. Servicios de Terceros',
        body: [
          'El Servicio se integra con servicios de terceros como Google Maps (para ubicaciones de propiedades), Stripe (para pagos) y WhatsApp (para enlaces de mensajería). Tu uso de esos servicios está sujeto a sus propios términos y políticas de privacidad, y Meridian no es responsable de su disponibilidad o contenido.',
        ],
      },
      {
        heading: '8. Exenciones de Responsabilidad',
        body: [
          'El Servicio se proporciona "tal cual" y "según disponibilidad", sin garantías de ningún tipo, ya sean expresas o implícitas. No garantizamos que los listados sean precisos, completos, actuales, ni que alguna propiedad esté legalmente disponible para venta o alquiler. No garantizamos un funcionamiento ininterrumpido, seguro o libre de errores del Servicio.',
        ],
      },
      {
        heading: '9. Limitación de Responsabilidad',
        body: [
          'En la máxima medida permitida por la ley, Meridian y sus directivos, empleados y socios no serán responsables por daños indirectos, incidentales, especiales, consecuentes o punitivos, ni por pérdida de ganancias, ingresos, datos o reputación, que surjan de tu uso del Servicio o de cualquier transacción entre usuarios, incluso si se nos ha advertido sobre la posibilidad de tales daños.',
        ],
      },
      {
        heading: '10. Terminación',
        body: [
          'Puedes dejar de usar el Servicio y cerrar tu cuenta en cualquier momento. Podemos suspender o terminar tu acceso si violas estos Términos, generas riesgo o exposición legal para Meridian, o si la ley lo exige. Las disposiciones que por su naturaleza deban subsistir tras la terminación (como propiedad intelectual, exenciones de responsabilidad y limitación de responsabilidad) seguirán aplicándose.',
        ],
      },
      {
        heading: '11. Ley Aplicable',
        body: [
          'Estos Términos se rigen por las leyes de la República Dominicana, sin tener en cuenta principios de conflicto de leyes, salvo cuando las leyes de protección al consumidor obligatorias de tu país de residencia dispongan lo contrario.',
        ],
      },
      {
        heading: '12. Cambios a Estos Términos',
        body: [
          'Podemos actualizar estos Términos de vez en cuando. Si realizamos cambios significativos, actualizaremos la fecha de "Última actualización" indicada arriba y, cuando corresponda, te notificaremos a través del Servicio o por correo electrónico. El uso continuado del Servicio después de que los cambios entren en vigor constituye la aceptación de los Términos revisados.',
        ],
      },
      {
        heading: '13. Contáctanos',
        body: [
          'Si tienes preguntas sobre estos Términos, contáctanos en info@investwithmeridian.com.',
        ],
      },
    ],
  },
};

export default function Terms() {
  const { lang } = useLang();
  const c = CONTENT[lang];

  useSEO({
    title: { en: 'Terms of Service', es: 'Términos de Servicio' },
    description: {
      en: 'Read the Meridian Terms of Service for our real estate listing and investment platform in the Dominican Republic.',
      es: 'Lee los Términos de Servicio de Meridian para nuestra plataforma de listados inmobiliarios e inversión en la República Dominicana.',
    },
    canonical: 'https://investwithmeridian.com/terms',
  });

  return (
    <main>
      <section className="section">
        <div className="container legal-page">
          <p className="eyebrow">{c.eyebrow}</p>
          <h1>{c.title}</h1>
          <p className="legal-updated">{c.updated}</p>

          {c.intro.map((p, i) => <p key={i}>{p}</p>)}

          {c.sections.map((s) => (
            <div key={s.heading}>
              <h2>{s.heading}</h2>
              {s.body.map((p, i) => <p key={i}>{p}</p>)}
              {s.list && (
                <ul>
                  {s.list.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
