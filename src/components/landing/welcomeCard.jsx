import ProgressBar from './progressBar.jsx';

function WelcomeCard({ userName, unlockedAchievements, totalAchievements }) {
  return (
    <section className="border border-gold-dim bg-panel p-6">
      <p className="font-display text-xs uppercase tracking-wide text-gold">✦ Bienvenido, {userName}</p>
      <h2 className="mt-2 font-display text-xl uppercase text-parchment md:text-2xl">Tu camino hacia el trono</h2>
      <p className="mt-3 font-display text-sm uppercase text-muted">
        La oscuridad recuerda tus hazañas. Continúa tu legado.
      </p>

      <div className="mt-6">
        <ProgressBar label="Logros conquistados" current={unlockedAchievements} total={totalAchievements} />
      </div>
    </section>
  );
}

export default WelcomeCard;
