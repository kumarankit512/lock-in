import { useState } from 'react';
import logo from '/logo.png';

interface AuthPageProps {
  setIsAuthenticated: (value: boolean) => void;
}

export default function AuthPage({ setIsAuthenticated }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [apiError, setApiError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: ''
  });

  const validateEmail = (email: string) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);

  const validatePassword = (password: string) => {
    if (password.length < 8) return { valid: false, message: "Password must be at least 8 characters long" };
    if (!/[A-Z]/.test(password)) return { valid: false, message: "Password must contain at least one uppercase letter" };
    if (!/[a-z]/.test(password)) return { valid: false, message: "Password must contain at least one lowercase letter" };
    if (!/[0-9]/.test(password)) return { valid: false, message: "Password must contain at least one number" };
    return { valid: true, message: "" };
  };

  const validateUsername = (username: string) => {
    if (username.length < 3) return { valid: false, message: "Username must be at least 3 characters long" };
    if (username.length > 20) return { valid: false, message: "Username must be less than 20 characters long" };
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return { valid: false, message: "Username can only contain letters, numbers, and underscores" };
    return { valid: true, message: "" };
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.email) newErrors.email = "Email is required";
    else if (!validateEmail(formData.email)) newErrors.email = "Please enter a valid email address";

    if (!formData.password) newErrors.password = "Password is required";
    else {
      const pv = validatePassword(formData.password);
      if (!pv.valid) newErrors.password = pv.message;
    }

    if (!isLogin) {
      if (!formData.username) newErrors.username = "Username is required";
      else {
        const uv = validateUsername(formData.username);
        if (!uv.valid) newErrors.username = uv.message;
      }
      if (!formData.confirmPassword) newErrors.confirmPassword = "Please confirm your password";
      else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validateForm()) return;

    try {
      if (isLogin) {
        const response = await fetch('https://lock-in-sable.vercel.app/api/login', {
          method: "POST",
          body: JSON.stringify({ email: formData.email, password: formData.password }),
          headers: { "Content-Type": "application/json; charset=UTF-8" }
        });
        const data = await response.json();
        if (!response.ok) { setApiError(data.message || 'Invalid email or password'); return; }
        localStorage.setItem('token', data.token || 'dummy-token');
        localStorage.setItem('user', JSON.stringify({ userId: data.data.user.id, username: data.data.user.username, email: formData.email }));
        setIsAuthenticated(true);
      } else {
        const response = await fetch('https://lock-in-sable.vercel.app/api/signup', {
          method: "POST",
          body: JSON.stringify({ username: formData.username, email: formData.email, password: formData.password }),
          headers: { "Content-Type": "application/json; charset=UTF-8" }
        });
        const data = await response.json();
        if (!response.ok) { setApiError(data.message || 'Signup failed. Please try again.'); return; }
        localStorage.setItem('token', data.token || 'dummy-token');
        localStorage.setItem('user', JSON.stringify({ userId: data.data.user.id, username: data.data.user.username, email: formData.email }));
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error(error);
      setApiError('Connection error. Please check your network and try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
    if (apiError) setApiError('');
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setApiError('');
    setFormData({ email: '', password: '', confirmPassword: '', username: '' });
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-4"
      style={{ backgroundColor: '#0B1A1C', fontFamily: '"Press Start 2P", monospace' }} // pixel font
    >
      {/* FULL-BLEED BACKGROUND (fills viewport, may crop) */}
      <img
        src={`${import.meta.env.BASE_URL}background.jpg`} // /public/background.png
        alt=""
        className="absolute inset-0 z-0 w-full h-full object-cover select-none"
        draggable={false}
        style={{ imageRendering: 'pixelated' as any }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl flex items-center justify-between gap-12">
        {/* Left: Brand copy */}
        <div className="hidden lg:block flex-1 text-white space-y-6" style={{ textShadow: '0 2px 8px rgba(0,0,0,.35)' }}>
          <div className="flex items-center gap-4 mb-6">
            <img
              src={'logo.png'}   // /public/logo.png
              alt="Lock In"
              className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 object-contain"
              draggable={false}
              decoding="async"
              style={{
                imageRendering: 'pixelated',
                filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.35))'
              }}
            />
            <span
              className="text-2xl md:text-3xl lg:text-4xl"
              style={{ letterSpacing: '0.18em' }}
            >
              LOCK IN
            </span>
          </div>

          <h1
            className="leading-tight"
            style={{
              fontSize: '40px',
              letterSpacing: '0.06em',
              lineHeight: 1.15,
              maxWidth: 700,
            }}
          >
            FOR THOSE WHO NEVER SETTLE
            <br />
          </h1>

          <p className="text-base text-white/90">
            Real-time focus coach with gentle habit nudges.
          </p>

          <p className="text-xs text-white/85 max-w-md">
            On-device face landmarks detect Focused/Not Focused and flag stress habits
            (hair, nose, eye, nail) so you study calmer, longer — no video saved(complete privacy).
          </p>
        </div>

        {/* Right: Auth form */}
        <div className="w-full max-w-md">
          <div
            className="rounded-3xl shadow-2xl p-8 space-y-6 border"
            style={{ backgroundColor: 'rgba(255,255,255,0.80)', borderColor: '#D0D7DE' }}
          >
            {apiError && (
              <div
                className="border px-4 py-3 rounded-xl flex items-start"
                style={{ backgroundColor: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B' }}
              >
                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{apiError}</span>
              </div>
            )}

            <div className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-xs mb-2">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition ${errors.username ? 'border-red-500' : ''}`}
                    style={{ borderColor: errors.username ? '#EF4444' : '#D0D7DE', backgroundColor: '#FFFFFF' }}
                    placeholder="your_name"
                  />
                  {errors.username && <p className="mt-1 text-xs" style={{ color: '#991B1B' }}>{errors.username}</p>}
                </div>
              )}

              <div>
                <label className="block text-xs mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-xl outline-none transition ${errors.email ? 'border-red-500' : ''}`}
                  style={{ borderColor: errors.email ? '#EF4444' : '#D0D7DE', backgroundColor: '#FFFFFF' }}
                  placeholder="user@game.io"
                />
                {errors.email && <p className="mt-1 text-xs" style={{ color: '#991B1B' }}>{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 pr-12 border rounded-xl outline-none transition ${errors.password ? 'border-red-500' : ''}`}
                    style={{ borderColor: errors.password ? '#EF4444' : '#D0D7DE', backgroundColor: '#FFFFFF' }}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    aria-label="toggle password"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs" style={{ color: '#991B1B' }}>{errors.password}</p>}
              </div>
              {!isLogin && (
                <div>
                  <label className="block text-xs mb-2">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      autoComplete="new-password"
                      className={`w-full px-4 py-3 pr-12 border rounded-xl outline-none transition ${
                        errors.confirmPassword ? 'border-red-500' : ''
                      }`}
                      style={{
                        borderColor: errors.confirmPassword ? '#EF4444' : '#D0D7DE',
                        backgroundColor: '#FFFFFF'
                      }}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      aria-label="toggle confirm password"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs" style={{ color: '#991B1B' }}>
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              )}


              {isLogin && (
                <div className="text-right">
                  <button type="button" className="text-[10px] underline">Forgot password?</button>
                </div>
              )}

              <button
                onClick={handleSubmit}
                className="w-full text-white py-3 rounded-xl font-semibold transition shadow-lg"
                style={{ backgroundColor: '#3D7ECF' }}
              >
                {isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
              </button>
            </div>

            <div className="text-center text-xs pt-2">
              <span>{isLogin ? "Are you new? " : "Already have an account? "}</span>
              <button type="button" onClick={toggleMode} className="underline ml-1">
                {isLogin ? 'Create an Account' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}