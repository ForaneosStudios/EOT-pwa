import { useState } from 'react';
import FormField from '../components/formField.jsx';
import { loginUser } from '../services/authService.js';
import { getApiErrorMessage } from '../services/apiClient.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';

const initialValues = { email: '', password: '' };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginPage({ onLogin, onRegister }) {
  const [formValues, setFormValues] = useState(initialValues);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const isOnline = useOnlineStatus();

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = {
      email: !emailPattern.test(formValues.email.trim()) ? 'Introduce un correo vÃ¡lido.' : '',
      password: !formValues.password ? 'La contraseÃ±a es obligatoria.' : '',
    };
    setFormErrors(errors);
    if (Object.values(errors).some(Boolean) || !isOnline) return;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      await loginUser(formValues);
      onLogin();
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'No se pudo iniciar sesiÃ³n.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldProps = (name) => ({
    id: name,
    value: formValues[name],
    onChange: (event) => setFormValues((values) => ({ ...values, [name]: event.target.value })),
    onBlur: () => setFormErrors((errors) => ({ ...errors, [name]: '' })),
    errorMessage: formErrors[name],
  });

  return (
    <main className="min-h-screen bg-void px-4 py-8 sm:px-8 lg:px-0">
      <div className="mx-auto max-w-3xl">
        <header className="border-b border-gold-dim pb-4">
          <p className="font-display text-xs uppercase text-gold">Portal del Inframundo</p>
          <h1 className="mt-3 font-display text-2xl text-parchment sm:text-3xl">Regreso del Heredero</h1>
        </header>
        <section className="mx-auto mt-6 max-w-md border border-gold-dim bg-panel px-6 pb-10 pt-5 sm:px-12">
          <h2 className="text-center font-display text-base uppercase tracking-wide text-gold">Iniciar sesiÃ³n</h2>
          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5">
            <FormField label="Correo electrÃ³nico" type="email" autoComplete="email" {...getFieldProps('email')} />
            <FormField label="ContraseÃ±a" type="password" autoComplete="current-password" {...getFieldProps('password')} />
            <button type="submit" disabled={isSubmitting || !isOnline} className="mt-5 h-11 w-full cursor-pointer border border-gold bg-crimson-light px-4 text-center font-display text-sm uppercase text-parchment transition-colors hover:bg-crimson disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? 'Iniciando sesiÃ³n...' : 'Iniciar sesiÃ³n'}
            </button>
            {!isOnline && <p role="status" className="border border-warning px-3 py-2 font-body text-sm text-warning">Sin conexiÃ³n. Necesitas internet para iniciar sesiÃ³n.</p>}
            {submitError && <p role="alert" className="border border-error px-3 py-2 font-body text-sm text-error">{submitError}</p>}
          </form>
          <p className="mt-6 text-center font-display text-sm text-parchment">
            Â¿No tienes una cuenta?{' '}
            <button type="button" onClick={onRegister} className="ml-1 cursor-pointer uppercase text-parchment underline-offset-4 hover:text-gold hover:underline">Crear cuenta</button>
          </p>
        </section>
      </div>
    </main>
  );
}

export default LoginPage;
