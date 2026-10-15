import Sidebar from '../components/landing/sidebar.jsx';
import PageHeader from '../components/landing/pageHeader.jsx';
import WelcomeCard from '../components/landing/welcomeCard.jsx';
import SectionCard from '../components/landing/sectionCard.jsx';

// Datos de ejemplo: cuando el login esté listo, el usuario y los logros vendrán del backend
const exampleUser = {
  userName: 'Heredero',
  unlockedAchievements: 5,
  totalAchievements: 12,
};

const navItems = [
  { icon: '⌂', label: 'Inicio', isActive: true },
  { icon: '✦', label: 'Logros' },
  { icon: '◈', label: 'Crónicas' },
  { icon: '▤', label: 'El Archivo' },
  { icon: '☷', label: 'Foro' },
  { icon: '♙', label: 'Mi perfil' },
];

const sections = [
  { icon: '✦', title: 'El Salón de las Hazañas', description: 'Consulta tus logros y reliquias.' },
  { icon: '◈', title: 'Crónicas del Inframundo', description: 'Descubre personajes y secretos.' },
  { icon: '▤', title: 'El Archivo Prohibido', description: 'Arte conceptual y creación.' },
  { icon: '☷', title: 'El Consejo de Almas', description: 'Conversaciones de la comunidad.' },
];

function LandingPage({ user }) {
  return (
    <div className="flex min-h-screen flex-col bg-void md:flex-row">
      <Sidebar navItems={navItems} />

      <main className="flex-1 px-6 py-8 md:px-10">
        <div className="mx-auto max-w-4xl">
          <PageHeader
            eyebrow="Registro I · El despertar"
            title="El Códice del Heredero"
            subtitle="Cada alma conquistada escribe una nueva página de tu historia."
          />

          <div className="mt-6">
            <WelcomeCard
              userName={user?.username ?? exampleUser.userName}
              unlockedAchievements={exampleUser.unlockedAchievements}
              totalAchievements={exampleUser.totalAchievements}
            />
          </div>

          <h2 className="mt-10 font-display text-lg uppercase text-parchment">Los pasajes del reino</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {sections.map((section) => (
              <SectionCard
                key={section.title}
                icon={section.icon}
                title={section.title}
                description={section.description}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default LandingPage;
