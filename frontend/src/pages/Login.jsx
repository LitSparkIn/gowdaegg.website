import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, LogIn } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password,
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      
      toast.success("Login successful!", {
        description: `Welcome back, ${response.data.user.name}!`,
      });
      
      navigate("/admin/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed", {
        description: error.response?.data?.detail || "Invalid email or password",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" data-testid="login-page">
      {/* Left side - Hero image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1665538941694-e1705e52d1b2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwyfHxmcmVzaCUyMGVnZ3MlMjBmYXJtJTIwbWluaW1hbGlzdHxlbnwwfHx8fDE3NjgwMzYyNTV8MA&ixlib=rb-4.1.0&q=85"
          alt="Fresh eggs"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 login-hero-overlay flex flex-col items-center justify-center p-12">
          <img
            src="https://customer-assets.emergentagent.com/job_ged-dashboard/artifacts/8aiex40c_Gowda%20egg%20dist%20logo.png"
            alt="Gowda Egg Distributors Logo"
            className="w-32 h-32 mb-8 drop-shadow-2xl"
          />
          <h1 className="text-4xl font-semibold text-white mb-4 text-center tracking-tight">
            Gowda Egg Distributors
          </h1>
          <p className="text-green-100 text-lg text-center max-w-md font-light">
            Your trusted partner for quality eggs. Manage your sales, routes, and inventory all in one place.
          </p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-green-50 to-white">
        <Card className="w-full max-w-md border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-4 text-center pb-2">
            {/* Mobile logo */}
            <div className="lg:hidden flex justify-center mb-4">
              <img
                src="https://customer-assets.emergentagent.com/job_ged-dashboard/artifacts/8aiex40c_Gowda%20egg%20dist%20logo.png"
                alt="Gowda Egg Distributors Logo"
                className="w-20 h-20"
              />
            </div>
            <h2 className="text-2xl font-semibold text-primary-950 tracking-tight">
              Welcome Back
            </h2>
            <p className="text-muted-foreground text-sm font-light">
              Sign in to your account to continue
            </p>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-primary-900">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="login-email-input"
                  className="h-11 bg-white/50 border-green-200 focus:border-primary focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-primary-900">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="login-password-input"
                    className="h-11 pr-10 bg-white/50 border-green-200 focus:border-primary focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    data-testid="toggle-password-visibility"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                data-testid="login-submit-button"
                className="w-full h-11 rounded-full bg-primary hover:bg-primary-600 text-white font-medium btn-primary"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn size={18} />
                    Sign In
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
