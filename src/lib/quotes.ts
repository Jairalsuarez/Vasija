export const QUOTES = [
  {
    text: 'Donde esté vuestro tesoro, allí estará también vuestro corazón.',
    author: 'Mateo 6:21',
  },
  {
    text: 'El amor es la fuerza motivadora más poderosa del mundo. No tiene límites.',
    author: 'Gordon B. Hinckley',
  },
  {
    text: 'La familia es la unidad más importante de la sociedad y del reino de Dios.',
    author: 'Thomas S. Monson',
  },
  {
    text: 'La honestidad es la base de toda confianza y seguridad financiera.',
    author: 'David A. Bednar',
  },
  {
    text: 'El Señor ama al dador alegre, y también al ahorrador sabio.',
    author: 'Proverbios 21:20',
  },
  {
    text: 'No debáis a nadie nada, sino el amaros unos a otros.',
    author: 'Romanos 13:8',
  },
  {
    text: 'La economía en el hogar comienza con la disciplina personal.',
    author: 'Marvin J. Ashton',
  },
  {
    text: 'El diezmo es la llave que abre las ventanas de los cielos.',
    author: 'Malaquías 3:10',
  },
  {
    text: 'El matrimonio no es solo una ceremonia, es un pacto eterno.',
    author: 'Russell M. Nelson',
  },
  {
    text: 'La deuda es una esclavitud que impide la libertad financiera.',
    author: 'Ezra Taft Benson',
  },
  {
    text: 'El que es fiel en lo poco, también en lo mucho es fiel.',
    author: 'Lucas 16:10',
  },
  {
    text: 'Trabajad juntos como equipo, y vuestro hogar será bendecido.',
    author: 'Dieter F. Uchtdorf',
  },
];

export function getRandomQuote(): (typeof QUOTES)[0] {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
