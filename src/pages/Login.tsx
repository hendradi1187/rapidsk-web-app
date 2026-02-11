import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Database, Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

//serviceauth
import * as authService from "@/api/services/auth";

const usernameSchema = z.string().min(1, "Please enter your username");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export default function Login() {
  const [username, setUsername] = useState("");
   const [isLogin, setIsLogin] = useState(true);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await authService.login(username, password); // dari api/services/auth.ts
      authService.setSession(res);
      navigate("/", { replace: true });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: "Invalid username or password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      
      {/* 🔹 LEFT PANEL */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 to-emerald-800 relative overflow-hidden text-white">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />
          
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Data Space Platform</h1>
                <p className="text-sm opacity-80">Enterprise Data Governance</p>
              </div>
            </div>
            
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              Secure Data Sharing &<br />Collaboration
            </h2>
            <p className="text-lg opacity-90 max-w-md">
              Unified platform for data discovery, exchange, and governance across SKK Migas and KKKS organizations.
            </p>
            
            <div className="mt-12 grid grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <p className="text-3xl font-bold">500+</p>
                <p className="text-sm opacity-80">Data Products</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <p className="text-3xl font-bold">50+</p>
                <p className="text-sm opacity-80">Active Connectors</p>
              </div>
            </div>
          </div>
        </div>

      {/* 🔹 RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center p-8">
        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
          <h2 className="text-2xl font-semibold text-center">
            Welcome back
          </h2>
            <div className="text-center mb-8">
            <p className="text-muted-foreground mt-2">
              {isLogin 
                ? 'Sign in to access your data workspace' 
                : 'Get started with your data journey'}
            </p>
            </div>
            <div className="space-y-2">
            <Label htmlFor="Username">Username</Label>
          <Input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          </div>

            <div className="space-y-2">
            <Label htmlFor="Password">Password</Label>
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          </div>

          <Button className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </form>
      </div>    
    </div>
  );
}

