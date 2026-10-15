
import { useState } from "react";

export default function Login({ onRegister, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Completa todos los campos para continuar.");
      return;
    }

    if (!onLogin) {
      setError("La autenticación aún no está conectada.");
      return;
    }

    try {
      await onLogin({ email, password });
    } catch {
      setError("No fue posible iniciar sesión. Inténtalo nuevamente.");
    }
  };

  const inputStyles = `
    h-[52px] w-full border border-[#775139]
    bg-[#1c1416] px-4 text-sm text-[#e9dcc5]
    placeholder:text-[#6e6666]
    outline-none transition-colors
    focus:border-[#c49a61]
  `;

  return (
    <main
      className="min-h-screen bg-[#100d0f] px-5 py-10
                 text-[#e9dcc5] sm:px-10"
      style={{ fontFamily: "'Cinzel', serif" }}
    >
      <div className="mx-auto w-full max-w-[1000px]">
        <header>
          <p className="text-sm tracking-wide text-[#c49a61]">
            PORTAL DEL INFRAMUNDO
          </p>

          <h1 className="mt-4 text-[28px] leading-tight
                         sm:text-[32px]">
            El Umbral del Heredero
          </h1>

          <p className="mt-5 text-base text-[#bba994]">
            Inicia sesión para consultar tus logros y
            participar en el Consejo.
          </p>

          <div className="mt-6 h-[2px] bg-[#775139]" />
        </header>

        <section
          aria-labelledby="login-title"
          className="mx-auto mt-12 w-full max-w-[710px]
                     border border-[#775139] bg-[#26191b]
                     px-6 py-10 sm:px-12 sm:py-12
                     lg:px-[79px]"
        >
          <h2
            id="login-title"
            className="text-center text-lg text-[#c49a61]
                       sm:text-xl"
          >
            ✦ ENTRA AL REINO ✦
          </h2>

          <form onSubmit={handleSubmit} className="mt-12">
            <div>
              <label
                htmlFor="login-email"
                className="mb-3 block text-sm text-[#c49a61]"
              >
                CORREO ELECTRÓNICO
              </label>

              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="Escribe aquí…"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputStyles}
              />
            </div>

            <div className="mt-9">
              <label
                htmlFor="login-password"
                className="mb-3 block text-sm text-[#c49a61]"
              >
                CONTRASEÑA
              </label>

              <input
                id="login-password"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Escribe aquí…"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={inputStyles}
              />
            </div>

            {error && (
              <p role="alert" className="mt-5 text-sm text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="mt-14 h-[46px] w-full cursor-pointer
                         border border-[#c49a61] bg-[#a52b34]
                         px-5 text-left text-sm text-[#e9dcc5]
                         transition-colors hover:bg-[#8c222b]
                         focus-visible:outline-2
                         focus-visible:outline-offset-2
                         focus-visible:outline-[#c49a61]"
            >
              INICIAR SESIÓN
            </button>
          </form>

          <p className="mt-9 text-center text-sm leading-7
                        sm:text-base">
            ¿Aún no tienes cuenta?{" "}
            <button
              type="button"
              onClick={onRegister}
              disabled={!onRegister}
              className="text-[#c49a61] underline-offset-4
                         hover:underline
                         disabled:cursor-not-allowed
                         disabled:opacity-60"
            >
              REGÍSTRATE
            </button>
          </p>

          <p className="mt-6 text-center text-xs text-[#bba994]">
            La comunidad puede leerse sin iniciar sesión.
          </p>
        </section>
      </div>
    </main>
  );
}
