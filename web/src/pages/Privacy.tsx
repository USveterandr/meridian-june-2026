import { useLang, type Lang } from '../i18n';
import { useSEO } from '../seo';

interface Section { heading: string; body: string[]; list?: string[] }
interface Content { eyebrow: string; title: string; updated: string; intro: string[]; sections: Section[] }

const CONTENT: Record<Lang, Content> = {
  en: {
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    updated: 'Last updated: June 14, 2026',
    intro: [
      'This Privacy Policy explains how Meridian Real Estate ("Meridian", "we", "us", or "our") collects, uses, shares, and protects information when you use our website, mobile applications, and related services (collectively, the "Service").',
      'By using the Service, you agree to the collection and use of information as described here. If you have questions, contact us at info@investwithmeridian.com.',
    ],
    sections: [
      {
        heading: '1. Information We Collect',
        body: ['We collect the following categories of information:'],
        list: [
          'Account information: name, email address, phone number, password (stored as a salted PBKDF2-SHA256 hash, never in plain text), preferred language, role (e.g., buyer, seller, broker), and notification preferences.',
          'Listing & property data: property details, addresses, prices, descriptions, and photos you upload (uploads are verified by file content, not just file name, and SVG/HTML files are rejected).',
          'Communications: messages you send to other users through our messaging feature, and inquiries you send through contact forms or WhatsApp links.',
          'Subscription & billing information: your selected plan, trial and renewal dates, and billing status. Payment card details are handled directly by our payment processor (Stripe) — we do not receive or store full card numbers.',
          'Usage & device information: pages visited, search filters used, approximate location derived from IP address, browser type, and similar technical data, collected automatically to operate and secure the Service.',
        ],
      },
      {
        heading: '2. How We Use Your Information',
        body: ['We use the information we collect to:'],
        list: [
          'Create and manage your account, and authenticate you when you sign in',
          'Display and manage your property listings, favorites, and saved searches',
          'Enable messaging between buyers, renters, investors, and listing owners',
          'Process subscription sign-ups, trials, renewals, and payments',
          'Show property locations using mapping services',
          'Send service-related notifications (e.g., new messages, matching listings), where you have enabled them',
          'Detect, prevent, and respond to fraud, abuse, and security incidents (including rate limiting and request monitoring)',
          'Improve and maintain the Service',
        ],
      },
      {
        heading: '3. Cookies & Local Storage',
        body: [
          'We use your browser\'s local storage to keep you signed in (a session token valid for 24 hours) and to remember your display preferences, such as language (English/Spanish) and light/dark theme. These are essential to how the Service works and are not used for third-party advertising.',
        ],
      },
      {
        heading: '4. How We Share Information',
        body: [
          'We do not sell your personal information. We share information only in the following circumstances:',
        ],
        list: [
          'With other users, as necessary for the Service to function — for example, your name and listing details are visible to users who view your listing, and your messages are visible to the recipient.',
          'With service providers who help us operate the Service, such as Cloudflare (hosting, database, and file storage), Stripe (payment processing), and Google Maps (location display). These providers only receive the information needed to perform their function and are bound by their own privacy and security obligations.',
          'To comply with law, respond to lawful requests from public authorities, or protect the rights, property, or safety of Meridian, our users, or others.',
          'In connection with a merger, acquisition, or sale of assets, subject to confidentiality obligations.',
        ],
      },
      {
        heading: '5. Data Security',
        body: [
          'We use industry-standard safeguards to protect your information, including encrypted connections (HTTPS), salted PBKDF2-SHA256 password hashing, parameterized database queries to prevent injection attacks, magic-byte verification of uploaded files, and rate limiting on sensitive endpoints such as login and registration.',
          'No method of transmission or storage is 100% secure, but we work to continually review and improve our security practices.',
        ],
      },
      {
        heading: '6. Data Retention',
        body: [
          'We retain your account information for as long as your account is active. If you close your account, we will delete or anonymize your personal information within a reasonable period, except where we are required to retain certain records (e.g., billing records) for legal, tax, or accounting purposes.',
        ],
      },
      {
        heading: '7. Your Rights & Choices',
        body: [
          'Depending on your location, you may have the right to access, correct, export, or delete your personal information, and to object to or restrict certain processing. You can update most account information directly from your profile settings.',
          'To request deletion of your account or other privacy-related requests, email us at info@investwithmeridian.com. We will respond within a reasonable timeframe and may need to verify your identity before completing certain requests.',
        ],
      },
      {
        heading: '8. Children\'s Privacy',
        body: [
          'The Service is not directed to individuals under 18, and we do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us so we can delete it.',
        ],
      },
      {
        heading: '9. International Data Transfers',
        body: [
          'Meridian operates on a global cloud infrastructure (Cloudflare). As a result, your information may be processed and stored in countries other than your own, which may have different data protection laws. We take steps to ensure your information remains protected wherever it is processed, consistent with this Policy.',
        ],
      },
      {
        heading: '10. Changes to This Policy',
        body: [
          'We may update this Privacy Policy from time to time. If we make material changes, we will update the "Last updated" date above and, where appropriate, notify you through the Service or by email. Continued use of the Service after changes take effect constitutes acceptance of the revised Policy.',
        ],
      },
      {
        heading: '11. Contact Us',
        body: [
          'If you have questions or requests regarding this Privacy Policy or your personal information, contact us at info@investwithmeridian.com.',
        ],
      },
    ],
  },
  es: {
    eyebrow: 'Legal',
    title: 'Política de Privacidad',
    updated: 'Última actualización: 14 de junio de 2026',
    intro: [
      'Esta Política de Privacidad explica cómo Meridian Real Estate ("Meridian", "nosotros" o "nuestro") recopila, utiliza, comparte y protege la información cuando usas nuestro sitio web, aplicaciones móviles y servicios relacionados (colectivamente, el "Servicio").',
      'Al usar el Servicio, aceptas la recopilación y el uso de información tal como se describe aquí. Si tienes preguntas, contáctanos en info@investwithmeridian.com.',
    ],
    sections: [
      {
        heading: '1. Información que Recopilamos',
        body: ['Recopilamos las siguientes categorías de información:'],
        list: [
          'Información de la cuenta: nombre, correo electrónico, número de teléfono, contraseña (almacenada como un hash PBKDF2-SHA256 con salt, nunca en texto plano), idioma preferido, rol (por ejemplo, comprador, vendedor, broker) y preferencias de notificación.',
          'Datos de listados y propiedades: detalles de la propiedad, direcciones, precios, descripciones y fotos que subas (las cargas se verifican por el contenido del archivo, no solo por el nombre, y se rechazan archivos SVG/HTML).',
          'Comunicaciones: mensajes que envías a otros usuarios a través de nuestra función de mensajería, y consultas enviadas mediante formularios de contacto o enlaces de WhatsApp.',
          'Información de suscripción y facturación: tu plan seleccionado, fechas de prueba y renovación, y estado de facturación. Los datos de la tarjeta de pago son manejados directamente por nuestro procesador de pagos (Stripe) — no recibimos ni almacenamos los números completos de tarjetas.',
          'Información de uso y dispositivo: páginas visitadas, filtros de búsqueda utilizados, ubicación aproximada derivada de tu dirección IP, tipo de navegador y datos técnicos similares, recopilados automáticamente para operar y proteger el Servicio.',
        ],
      },
      {
        heading: '2. Cómo Usamos tu Información',
        body: ['Usamos la información que recopilamos para:'],
        list: [
          'Crear y gestionar tu cuenta, y autenticarte cuando inicias sesión',
          'Mostrar y gestionar tus listados de propiedades, favoritos y búsquedas guardadas',
          'Permitir la mensajería entre compradores, inquilinos, inversionistas y propietarios de listados',
          'Procesar registros de suscripción, pruebas, renovaciones y pagos',
          'Mostrar la ubicación de las propiedades usando servicios de mapas',
          'Enviar notificaciones relacionadas con el Servicio (por ejemplo, nuevos mensajes, listados coincidentes), cuando las hayas habilitado',
          'Detectar, prevenir y responder a fraude, abuso e incidentes de seguridad (incluyendo límites de tasa y monitoreo de solicitudes)',
          'Mejorar y mantener el Servicio',
        ],
      },
      {
        heading: '3. Cookies y Almacenamiento Local',
        body: [
          'Usamos el almacenamiento local de tu navegador para mantenerte con la sesión iniciada (un token de sesión válido por 24 horas) y para recordar tus preferencias de visualización, como el idioma (inglés/español) y el tema claro/oscuro. Estos son esenciales para el funcionamiento del Servicio y no se utilizan para publicidad de terceros.',
        ],
      },
      {
        heading: '4. Cómo Compartimos tu Información',
        body: [
          'No vendemos tu información personal. Solo compartimos información en las siguientes circunstancias:',
        ],
        list: [
          'Con otros usuarios, según sea necesario para el funcionamiento del Servicio — por ejemplo, tu nombre y los detalles de tu listado son visibles para los usuarios que vean tu propiedad, y tus mensajes son visibles para el destinatario.',
          'Con proveedores de servicios que nos ayudan a operar el Servicio, como Cloudflare (hosting, base de datos y almacenamiento de archivos), Stripe (procesamiento de pagos) y Google Maps (visualización de ubicaciones). Estos proveedores solo reciben la información necesaria para realizar su función y están sujetos a sus propias obligaciones de privacidad y seguridad.',
          'Para cumplir con la ley, responder a solicitudes legales de autoridades públicas, o proteger los derechos, la propiedad o la seguridad de Meridian, nuestros usuarios u otras personas.',
          'En relación con una fusión, adquisición o venta de activos, sujeto a obligaciones de confidencialidad.',
        ],
      },
      {
        heading: '5. Seguridad de los Datos',
        body: [
          'Utilizamos medidas de seguridad estándar de la industria para proteger tu información, incluyendo conexiones cifradas (HTTPS), hash de contraseñas PBKDF2-SHA256 con salt, consultas parametrizadas a la base de datos para prevenir ataques de inyección, verificación de archivos cargados mediante "magic bytes" y límites de tasa en endpoints sensibles como inicio de sesión y registro.',
          'Ningún método de transmisión o almacenamiento es 100% seguro, pero trabajamos para revisar y mejorar continuamente nuestras prácticas de seguridad.',
        ],
      },
      {
        heading: '6. Retención de Datos',
        body: [
          'Conservamos la información de tu cuenta mientras esté activa. Si cierras tu cuenta, eliminaremos o anonimizaremos tu información personal dentro de un período razonable, excepto cuando debamos conservar ciertos registros (por ejemplo, registros de facturación) por motivos legales, fiscales o contables.',
        ],
      },
      {
        heading: '7. Tus Derechos y Opciones',
        body: [
          'Según tu ubicación, puedes tener derecho a acceder, corregir, exportar o eliminar tu información personal, y a oponerte o restringir ciertos procesamientos. Puedes actualizar la mayoría de la información de tu cuenta directamente desde la configuración de tu perfil.',
          'Para solicitar la eliminación de tu cuenta u otras solicitudes relacionadas con la privacidad, escríbenos a info@investwithmeridian.com. Responderemos dentro de un plazo razonable y podríamos necesitar verificar tu identidad antes de completar ciertas solicitudes.',
        ],
      },
      {
        heading: '8. Privacidad de Menores',
        body: [
          'El Servicio no está dirigido a personas menores de 18 años, y no recopilamos a sabiendas información personal de menores. Si crees que un menor nos ha proporcionado información personal, contáctanos para que podamos eliminarla.',
        ],
      },
      {
        heading: '9. Transferencias Internacionales de Datos',
        body: [
          'Meridian opera sobre una infraestructura de nube global (Cloudflare). Como resultado, tu información puede ser procesada y almacenada en países distintos al tuyo, los cuales pueden tener leyes de protección de datos diferentes. Tomamos medidas para garantizar que tu información permanezca protegida dondequiera que sea procesada, de acuerdo con esta Política.',
        ],
      },
      {
        heading: '10. Cambios a Esta Política',
        body: [
          'Podemos actualizar esta Política de Privacidad de vez en cuando. Si realizamos cambios significativos, actualizaremos la fecha de "Última actualización" indicada arriba y, cuando corresponda, te notificaremos a través del Servicio o por correo electrónico. El uso continuado del Servicio después de que los cambios entren en vigor constituye la aceptación de la Política revisada.',
        ],
      },
      {
        heading: '11. Contáctanos',
        body: [
          'Si tienes preguntas o solicitudes sobre esta Política de Privacidad o tu información personal, contáctanos en info@investwithmeridian.com.',
        ],
      },
    ],
  },
};

export default function Privacy() {
  const { lang } = useLang();
  const c = CONTENT[lang];

  useSEO({
    title: { en: 'Privacy Policy', es: 'Política de Privacidad' },
    description: {
      en: 'Learn how Meridian collects, uses, and protects your information across our real estate listing and investment platform.',
      es: 'Conoce cómo Meridian recopila, usa y protege tu información en nuestra plataforma de listados inmobiliarios e inversión.',
    },
    canonical: 'https://investwithmeridian.com/privacy',
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
