import { useState } from 'react';
import FormField from '../components/formField.jsx';
import { loginUser, registerUser } from '../services/authService.js';
import { getApiErrorMessage } from '../services/apiClient.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';

const initialValues = { userName: '', email: '', password: '' };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateField(fieldName, value) {
  const trimmedValue = value.trim();

  if (fieldName === 'userName') {
    if (!trimmedValue) return 'El nombre de usuario es obligatorio.';
    if (trimmedValue.length < 3) return 'Debe tener al menos 3 caracteres.';
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedValue)) return 'Solo letras, números y guion bajo.';
  }

  if (fieldName === 'email') {
    if (!trimmedValue) return 'El correo electrónico es obligatorio.';
    if (!emailPattern.test(trimmedValue)) return 'Introduce un correo válido.';
  }

  if (fieldName === 'password') {
    if (!value) return 'La contraseña es obligatoria.';
    if (value.length < 8) return 'Debe tener al menos 8 caracteres.';
    if (!/[A-Z]/.test(value) || !/\d/.test(value)) return 'Incluye al menos una mayúscula y un número.';
  }

  return '';
}

function validateAll(values) {
  return Object.fromEntries(
    Object.keys(values).map((fieldName) => [fieldName, validateField(fieldName, values[fieldName])]),
  );
}

function RegisterPage({ onLogin }) {
  const [formValues, setFormValues] = useState(initialValues);
  const [formErrors, setFormErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [registeredUser, setRegisteredUser] = useState(null);
  const isOnline = useOnlineStatus();

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((previousValues) => ({ ...previousValues, [name]: value }));
    if (touchedFields[name]) {
      setFormErrors((previousErrors) => ({ ...previousErrors, [name]: validateField(name, value) }));
    }
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;
    setTouchedFields((previousTouched) => ({ ...previousTouched, [name]: true }));
    setFormErrors((previousErrors) => ({ ...previousErrors, [name]: validateField(name, value) }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateAll(formValues);
    setFormErrors(nextErrors);
    setTouchedFields({ userName: true, email: true, password: true });

    if (Object.values(nextErrors).some(Boolean) || !isOnline) return;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const createdUser = await registerUser(formValues);
      await loginUser({ email: createdUser.email, password: formValues.password });
      setRegisteredUser(createdUser);
      setFormValues(initialValues);
      setTouchedFields({});
      onLogin();
    } catch (error) {
      setSubmitError(getApiErrorMessage(error, 'No se pudo crear la cuenta.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldProps = (fieldName) => ({
    id: fieldName,
    value: formValues[fieldName],
    onChange: handleChange,
    onBlur: handleBlur,
    errorMessage: touchedFields[fieldName] ? formErrors[fieldName] : '',
    isValid: touchedFields[fieldName] && !formErrors[fieldName],
  });

  return (
    <main className="min-h-screen bg-void px-4 py-8 sm:px-8 lg:px-0">
      <div className="mx-auto max-w-3xl">
        <header className="border-b border-gold-dim pb-4">
          <p className="font-display text-xs uppercase text-gold">Portal del Inframundo</p>
          <h1 className="mt-3 font-display text-2xl text-parchment sm:text-3xl">Inscripción del Heredero</h1>
          <p className="mt-3 font-display text-sm text-parchment/90">
            Crea tu cuenta para formar parte del Consejo de las Almas.
          </p>
        </header>

        <section className="mx-auto mt-6 max-w-md border border-gold-dim bg-panel px-6 pb-10 pt-5 sm:px-12">
          <h2 className="text-center font-display text-base uppercase tracking-wide text-gold">
            ✦ Crea tu legado ✦
          </h2>

          <form onSubmit={handleSubmit} noValidate className="mt-6 flex flex-col gap-5">
            <FormField label="Nombre de usuario" autoComplete="username" {...getFieldProps('userName')} />
            <FormField label="Correo electrónico" type="email" autoComplete="email" {...getFieldProps('email')} />
            <FormField label="Contraseña" type="password" autoComplete="new-password" {...getFieldProps('password')} />

            <button
              type="submit"
              disabled={isSubmitting || !isOnline}
              className="mt-5 h-11 w-full cursor-pointer border border-gold bg-crimson-light px-4 text-center font-display text-sm uppercase text-parchment transition-colors hover:bg-crimson focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>

            {!isOnline && (
              <p role="status" className="border border-warning px-3 py-2 font-body text-sm text-warning">
                Sin conexión. Necesitas internet para crear tu cuenta.
              </p>
            )}

            {submitError && (
              <p role="alert" className="border border-error px-3 py-2 font-body text-sm text-error">
                {submitError}
              </p>
            )}
            {registeredUser && (
              <p role="status" className="border border-success px-3 py-2 font-body text-sm text-success">
                Cuenta creada. Ya puedes iniciar sesión.
              </p>
            )}
          </form>

          <p className="mt-6 text-center font-display text-sm text-parchment">
            ¿Ya tienes una cuenta?{' '}
            <button type="button" onClick={() => onLogin('login')} className="ml-1 cursor-pointer uppercase text-parchment underline-offset-4 hover:text-gold hover:underline">
              Iniciar sesión
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}

export default RegisterPage;
