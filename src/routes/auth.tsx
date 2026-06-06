import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Войти — Smeg Armenia" }] }),
  component: AuthPage,
});

const emailSchema = z.string().email("Некорректный email").max(255);
const passwordSchema = z
  .string()
  .min(8, "Пароль минимум 8 символов")
  .max(72, "Слишком длинный пароль");

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const emailParsed = emailSchema.safeParse(email.trim());
    if (!emailParsed.success) return toast.error(emailParsed.error.issues[0].message);
    const passParsed = passwordSchema.safeParse(password);
    if (!passParsed.success) return toast.error(passParsed.error.issues[0].message);

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: emailParsed.data,
          password: passParsed.data,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim() || undefined },
          },
        });
        if (error) throw error;
        toast.success("Аккаунт создан. Проверьте почту для подтверждения.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailParsed.data,
          password: passParsed.data,
        });
        if (error) throw error;
        navigate({ to: "/admin", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось войти");
    } finally {
      setLoading(false);
    }
  }

  async function signInGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/admin",
      });
      if (result.error) {
        toast.error("Не удалось войти через Google");
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/admin", replace: true });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="block text-center text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground">
          ← На главную
        </Link>
        <div className="mt-8 rounded-sm border border-border bg-background p-8">
          <h1 className="font-serif text-3xl">
            {mode === "login" ? "Вход" : "Регистрация"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Smeg Armenia · панель управления
          </p>

          <button
            type="button"
            onClick={signInGoogle}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-sm border border-border bg-background px-4 py-3 text-sm hover:bg-secondary disabled:opacity-50"
          >
            Продолжить с Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> или <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="eyebrow mb-1.5 block text-muted-foreground">Имя</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={120}
                  className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground"
                />
              </div>
            )}
            <div>
              <label className="eyebrow mb-1.5 block text-muted-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground"
              />
            </div>
            <div>
              <label className="eyebrow mb-1.5 block text-muted-foreground">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-foreground"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-sm bg-foreground px-4 py-3 text-xs uppercase tracking-[0.2em] text-background hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "..." : mode === "login" ? "Войти" : "Создать аккаунт"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="mt-6 block w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "login" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
          </button>
        </div>
      </div>
    </div>
  );
}