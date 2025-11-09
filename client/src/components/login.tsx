import { useState } from 'react';

interface AuthPageProps {
  setIsAuthenticated: (value: boolean) => void;
}

export default function AuthPage({ setIsAuthenticated }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [apiError, setApiError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: ''
  });

  const validateEmail = (email: string) => {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return pattern.test(email);
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return { valid: false, message: "Password must be at least 8 characters long" };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: "Password must contain at least one uppercase letter" };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: "Password must contain at least one lowercase letter" };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: "Password must contain at least one number" };
    }
    return { valid: true, message: "" };
  };

  const validateUsername = (username: string) => {
    if (username.length < 3) {
      return { valid: false, message: "Username must be at least 3 characters long" };
    }
    if (username.length > 20) {
      return { valid: false, message: "Username must be less than 20 characters long" };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { valid: false, message: "Username can only contain letters, numbers, and underscores" };
    }
    return { valid: true, message: "" };
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.valid) {
        newErrors.password = passwordValidation.message;
      }
    }

    if (!isLogin) {
      if (!formData.username) {
        newErrors.username = "Username is required";
      } else {
        const usernameValidation = validateUsername(formData.username);
        if (!usernameValidation.valid) {
          newErrors.username = usernameValidation.message;
        }
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    
    if (!validateForm()) {
      return;
    }

    try {
      if (isLogin) {
        console.log('Logging in:', { email: formData.email, password: formData.password });
        const response = await fetch('http://localhost:5001/api/login', {
          method: "POST",
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          }),
          headers: {
            "Content-Type": "application/json; charset=UTF-8"
          }
        });

        const data = await response.json();
        
        if (!response.ok) {
          setApiError(data.message || 'Invalid email or password');
          return;
        }
        
        console.log('Success:', data);
        console.log('userid:', data.data.user.id);
        console.log('username:', data.data.user.username);
        
        localStorage.setItem('token', data.token || 'dummy-token');
        localStorage.setItem('user', JSON.stringify({ userId: data.data.user.id, username: data.data.user.username, email: formData.email }));
        setIsAuthenticated(true);
        
      } else {
        console.log('Signing up:', formData);
        const response = await fetch('http://localhost:5001/api/signup', {
          method: "POST",
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password
          }),
          headers: {
            "Content-Type": "application/json; charset=UTF-8"
          }
        });

        const data = await response.json();
        
        if (!response.ok) {
          setApiError(data.message || 'Signup failed. Please try again.');
          return;
        }
        
        console.log('Success:', data);
        console.log('userid:', data.data.user.id);
        console.log('username:', data.data.user.username);
        
        localStorage.setItem('token', data.token || 'dummy-token');
        localStorage.setItem('user', JSON.stringify({ userId: data.data.user.id, username: data.data.user.username, email: formData.email }));
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error:', error);
      setApiError('Connection error. Please check your network and try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
    
    if (apiError) {
      setApiError('');
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setApiError('');
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      username: ''
    });
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4" style={{ backgroundColor: '#F9F6EF' }}>
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070')`,
        }}
      >
        <div className="absolute inset-0 backdrop-blur-[2px]" style={{ background: 'linear-gradient(135deg, rgba(91, 163, 225, 0.4) 0%, rgba(61, 126, 207, 0.5) 50%, rgba(244, 162, 97, 0.35) 100%)' }}></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-6xl flex items-center justify-between gap-12">
        {/* Left Side - Branding */}
        <div className="hidden lg:block flex-1 text-white space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="5" r="2" fill="currentColor"/>
            </svg>
            <span className="text-2xl font-bold tracking-wider">FOCUS FLOW</span>
          </div>

          <h1 className="text-6xl font-bold leading-tight">
            EXPLORE<br />HORIZONS
          </h1>
          
          <p className="text-xl font-medium text-gray-50">
            Where Your Dream Destinations<br />Become Reality.
          </p>
          
          <p className="text-base text-gray-100 max-w-md">
            Embark on a journey where every corner of the world is within your reach.
          </p>
        </div>

        {/* Right Side - Form */}
        <div className="w-full max-w-md">
          <div className="backdrop-blur-xl rounded-3xl shadow-2xl p-8 space-y-6 border" style={{ 
            backgroundColor: 'rgba(249, 246, 239, 0.98)',
            borderColor: '#E2E8F0'
          }}>
            {/* API Error Message */}
            {apiError && (
              <div className="border px-4 py-3 rounded-xl flex items-start" style={{ 
                backgroundColor: '#FEE2E2',
                borderColor: '#FCA5A5',
                color: '#991B1B'
              }}>
                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">{apiError}</span>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#4A5568' }}>
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-xl outline-none transition ${
                      errors.username ? 'border-red-500' : ''
                    }`}
                    style={{ 
                      borderColor: errors.username ? '#EF4444' : '#E2E8F0',
                      backgroundColor: '#FFFFFF',
                      color: '#4A5568'
                    }}
                    placeholder="Enter your name"
                    onFocus={(e) => e.target.style.borderColor = '#5BA3E1'}
                    onBlur={(e) => e.target.style.borderColor = errors.username ? '#EF4444' : '#E2E8F0'}
                  />
                  {errors.username && (
                    <p className="mt-1 text-sm flex items-center" style={{ color: '#991B1B' }}>
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.username}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#4A5568' }}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-xl outline-none transition ${
                    errors.email ? 'border-red-500' : ''
                  }`}
                  style={{ 
                    borderColor: errors.email ? '#EF4444' : '#E2E8F0',
                    backgroundColor: '#FFFFFF',
                    color: '#4A5568'
                  }}
                  placeholder="Enter your email"
                  onFocus={(e) => e.target.style.borderColor = '#5BA3E1'}
                  onBlur={(e) => e.target.style.borderColor = errors.email ? '#EF4444' : '#E2E8F0'}
                />
                {errors.email && (
                  <p className="mt-1 text-sm flex items-center" style={{ color: '#991B1B' }}>
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#4A5568' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 pr-12 border rounded-xl outline-none transition ${
                      errors.password ? 'border-red-500' : ''
                    }`}
                    style={{ 
                      borderColor: errors.password ? '#EF4444' : '#E2E8F0',
                      backgroundColor: '#FFFFFF',
                      color: '#4A5568'
                    }}
                    placeholder="••••••••••••"
                    onFocus={(e) => e.target.style.borderColor = '#5BA3E1'}
                    onBlur={(e) => e.target.style.borderColor = errors.password ? '#EF4444' : '#E2E8F0'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition"
                    style={{ color: '#4A5568' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#5BA3E1'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#4A5568'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm flex items-center" style={{ color: '#991B1B' }}>
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.password}
                  </p>
                )}
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#4A5568' }}>
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 pr-12 border rounded-xl outline-none transition ${
                        errors.confirmPassword ? 'border-red-500' : ''
                      }`}
                      style={{ 
                        borderColor: errors.confirmPassword ? '#EF4444' : '#E2E8F0',
                        backgroundColor: '#FFFFFF',
                        color: '#4A5568'
                      }}
                      placeholder="••••••••••••"
                      onFocus={(e) => e.target.style.borderColor = '#5BA3E1'}
                      onBlur={(e) => e.target.style.borderColor = errors.confirmPassword ? '#EF4444' : '#E2E8F0'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition"
                      style={{ color: '#4A5568' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#5BA3E1'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#4A5568'}
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm flex items-center" style={{ color: '#991B1B' }}>
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              )}

              {isLogin && (
                <div className="text-right">
                  <button
                    type="button"
                    className="text-sm font-medium underline transition"
                    style={{ color: '#4A5568' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#3D7ECF'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#4A5568'}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                onClick={handleSubmit}
                className="w-full text-white py-3 rounded-xl font-semibold transition shadow-lg"
                style={{ backgroundColor: '#3D7ECF' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2C5BA8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3D7ECF'}
              >
                {isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
              </button>

              {/* Divider */}
              {/* <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px" style={{ backgroundColor: '#E2E8F0' }}></div>
                <span className="text-sm" style={{ color: '#4A5568' }}>or</span>
                <div className="flex-1 h-px" style={{ backgroundColor: '#E2E8F0' }}></div>
              </div> */}

              {/* Google Sign In */}
              {/* <button
                type="button"
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border rounded-xl transition"
                style={{ 
                  borderColor: '#E2E8F0',
                  backgroundColor: '#FFFFFF'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9F6EF';
                  e.currentTarget.style.borderColor = '#5BA3E1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-medium" style={{ color: '#4A5568' }}>Sign in with Google</span>
              </button> */}
            </div>

            {/* Toggle Login/Signup */}
            <div className="text-center text-sm pt-2">
              <span style={{ color: '#4A5568' }}>
                {isLogin ? "Are you new? " : "Already have an account? "}
              </span>
              <button
                type="button"
                onClick={toggleMode}
                className="font-semibold underline transition"
                style={{ color: '#3D7ECF' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#5BA3E1'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#3D7ECF'}
              >
                {isLogin ? 'Create an Account' : 'Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}