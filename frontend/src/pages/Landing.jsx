import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Truck, Package, BarChart3 } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white" data-testid="landing-page">
      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="https://customer-assets.emergentagent.com/job_ged-dashboard/artifacts/8aiex40c_Gowda%20egg%20dist%20logo.png"
            alt="Gowda Egg Distributors Logo"
            className="w-12 h-12"
          />
          <div>
            <h1 className="text-xl font-semibold text-primary-950">Gowda Egg Distributors</h1>
            <p className="text-sm text-muted-foreground">Quality Eggs, Delivered Fresh</p>
          </div>
        </div>
        <Button
          onClick={() => navigate("/admin/login")}
          data-testid="admin-login-btn"
          className="rounded-full bg-primary hover:bg-primary-600 text-white"
        >
          Admin Login
          <ArrowRight size={18} className="ml-2" />
        </Button>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-4xl lg:text-5xl font-semibold text-primary-950 leading-tight mb-6">
              Your Trusted Partner for <span className="text-primary">Quality Egg Distribution</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl">
              Serving fresh, high-quality eggs across the region. We ensure timely delivery and maintain the highest standards of quality for all our customers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                onClick={() => navigate("/admin/login")}
                size="lg"
                data-testid="get-started-btn"
                className="rounded-full bg-primary hover:bg-primary-600 text-white text-lg px-8"
              >
                Get Started
                <ArrowRight size={20} className="ml-2" />
              </Button>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <img
              src="https://customer-assets.emergentagent.com/job_ged-dashboard/artifacts/8aiex40c_Gowda%20egg%20dist%20logo.png"
              alt="Gowda Egg Distributors"
              className="w-64 h-64 lg:w-80 lg:h-80 drop-shadow-2xl"
            />
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-border/50 text-center">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Truck size={28} className="text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-primary-950 mb-2">Fast Delivery</h3>
            <p className="text-muted-foreground">
              Timely delivery across all routes ensuring fresh eggs reach your doorstep.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-border/50 text-center">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Package size={28} className="text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-primary-950 mb-2">Quality Products</h3>
            <p className="text-muted-foreground">
              Premium quality eggs sourced from trusted farms with strict quality control.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-border/50 text-center">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <BarChart3 size={28} className="text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-primary-950 mb-2">Easy Management</h3>
            <p className="text-muted-foreground">
              Comprehensive dashboard to manage sales, routes, and inventory efficiently.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-border/50 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted-foreground text-base">
            © {new Date().getFullYear()} Gowda Egg Distributors. All rights reserved.
          </p>
          <p className="text-muted-foreground text-base">
            Quality eggs, delivered with care.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
