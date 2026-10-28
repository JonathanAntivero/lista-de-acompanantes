// =====================================================
//  CONFIGURACIÓN — editá solo este archivo
// =====================================================
window.CONFIG = {
  // 1) Datos de tu proyecto de Supabase (Project Settings → API).
  //    Si los dejás vacíos, la app funciona en "modo demo"
  //    (los datos se guardan solo en tu teléfono, no se comparten).
  SUPABASE_URL: "https://htkoqgplsbejwibbbiay.supabase.co/rest/v1/",
  SUPABASE_ANON_KEY: "sb_publishable_3uOgje0l6MQtLxfqcpLElg_55GDUVTs",

  // 2) Código de acceso compartido. Dejalo vacío ("") para no pedir código.
  //    OJO: es una barrera simple, no una seguridad fuerte (ver README).
  CODIGO_ACCESO: "",

  // 3) Horarios disponibles para anotarse (formato 24 h).
  HORAS: [
    "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00",
    "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
  ],

  // 4) Días que se muestran: 0 = lunes ... 6 = domingo.
  DIAS: [0, 1, 2, 3, 4, 5, 6],

  // 5) Título que se usa al copiar el resumen para WhatsApp.
  TITULO_RESUMEN: "Disponibilidad para acompañar a los misioneros"
};
